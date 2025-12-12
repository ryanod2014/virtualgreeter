/**
 * Agent Launcher Service
 * 
 * Manages launching and tracking agent processes.
 * Consolidates tmux session management, worktree setup, file lock acquisition.
 */

import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.mjs';
import { eventBus } from '../events/eventBus.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database module - will be injected
let db = null;

class AgentLauncher {
  constructor() {
    this.projectRoot = config.paths.projectRoot;
  }

  /**
   * Set the database module (dependency injection)
   */
  setDB(dbModule) {
    db = dbModule;
  }

  /**
   * Get count of running agents by type
   */
  getRunningCount(agentType = null) {
    if (!db?.sessions) return 0;
    const running = db.sessions.getRunning();
    if (agentType) {
      return running.filter(s => s.agent_type === agentType).length;
    }
    return running.length;
  }

  /**
   * Clean up conflicting worktrees
   */
  cleanupConflictingWorktrees(ticketId, branch) {
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      const lines = output.split('\n');
      let currentWorktree = null;
      const ticketPattern = ticketId.toUpperCase();

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentWorktree = line.substring(9);
        } else if (line.startsWith('branch ') && currentWorktree) {
          const branchName = line.substring(7);
          const wtName = currentWorktree.split('/').pop() || '';

          if (wtName.toUpperCase().includes(ticketPattern) || branchName.includes(ticketId.toLowerCase())) {
            if (currentWorktree !== this.projectRoot) {
              console.log(`🧹 Removing conflicting worktree: ${currentWorktree}`);
              try {
                execSync(`git worktree remove "${currentWorktree}" --force`, {
                  cwd: this.projectRoot,
                  encoding: 'utf8'
                });
              } catch (e) {
                execSync(`rm -rf "${currentWorktree}"`, { encoding: 'utf8' });
                execSync('git worktree prune', { cwd: this.projectRoot, encoding: 'utf8' });
              }
            }
          }
        }
      }

      execSync('git worktree prune', { cwd: this.projectRoot, encoding: 'utf8' });
    } catch (e) {
      console.error('Worktree cleanup error:', e.message);
    }
  }

  /**
   * Launch a dev agent
   */
  async launchDev(ticket) {
    const ticketId = ticket.id;
    const scriptPath = join(this.projectRoot, 'scripts/launch-agents.sh');

    if (!existsSync(scriptPath)) {
      throw new Error('Dev launch script not found');
    }

    // Create DB session record
    let session = null;
    if (db?.sessions) {
      session = db.sessions.create({
        ticket_id: ticketId,
        agent_type: 'dev',
        tmux_session: `agent-${ticketId}`,
      });

      // Acquire file locks
      const files = ticket.files_to_modify || [];
      if (files.length > 0 && db.locks) {
        const lockResult = db.locks.acquire(session.id, ticketId, files);
        if (!lockResult.success) {
          db.sessions.crash(session.id, `File lock conflict: ${lockResult.conflicts.join(', ')}`);
          throw new Error(`File lock conflict: ${lockResult.conflicts.join(', ')}`);
        }
      }
    }

    // Clean up conflicting worktrees
    console.log(`🧹 Cleaning up conflicting worktrees for ${ticketId}...`);
    this.cleanupConflictingWorktrees(ticketId, ticket.branch);

    console.log(`🛠️ Launching Dev agent for ${ticketId}...`);

    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath, ticketId], {
        cwd: this.projectRoot,
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      proc.on('close', (code) => {
        if (session && db?.sessions) {
          if (code === 0) {
            db.sessions.start(session.id, `agent-${ticketId}`, null);
          } else {
            db.sessions.crash(session.id, 'Launch script failed');
          }
        }

        eventBus.emit('agent:started', { ticketId, agentType: 'dev', success: code === 0 });

        if (code === 0) {
          resolve({ launched: true, sessionId: session?.id, output: stdout.slice(-2000) });
        } else {
          resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
        }
      });

      proc.on('error', (err) => {
        if (session && db?.sessions) {
          db.sessions.crash(session.id, err.message);
        }
        reject(err);
      });
    });
  }

  /**
   * Launch a QA agent
   */
  async launchQa(ticket) {
    const ticketId = ticket.id;
    const scriptPath = join(this.projectRoot, 'scripts/launch-qa-agents.sh');

    if (!existsSync(scriptPath)) {
      throw new Error('QA launch script not found');
    }

    // Create DB session record
    let session = null;
    if (db?.sessions) {
      session = db.sessions.create({
        ticket_id: ticketId,
        agent_type: 'qa',
        tmux_session: `qa-${ticketId}`,
      });
    }

    // Clean up conflicting worktrees
    console.log(`🧹 Cleaning up conflicting worktrees for ${ticketId}...`);
    this.cleanupConflictingWorktrees(ticketId, ticket.branch);

    console.log(`🔍 Launching QA agent for ${ticketId}...`);

    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath, ticketId], {
        cwd: this.projectRoot,
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      proc.on('close', (code) => {
        if (session && db?.sessions) {
          if (code === 0) {
            db.sessions.start(session.id, `qa-${ticketId}`, null);
          } else {
            db.sessions.crash(session.id, 'Launch script failed');
          }
        }

        eventBus.emit('agent:started', { ticketId, agentType: 'qa', success: code === 0 });

        if (code === 0) {
          resolve({ launched: true, sessionId: session?.id, output: stdout.slice(-2000) });
        } else {
          resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
        }
      });

      proc.on('error', (err) => {
        if (session && db?.sessions) {
          db.sessions.crash(session.id, err.message);
        }
        reject(err);
      });
    });
  }

  /**
   * Launch Test agent
   */
  async launchTest(ticket) {
    const ticketId = ticket.id;
    const scriptPath = join(this.projectRoot, 'scripts/launch-test-agent.sh');

    if (!existsSync(scriptPath)) {
      console.log(`⚠️ Test agent script not found, skipping`);
      return { launched: true, note: 'Script not found - placeholder completion' };
    }

    console.log(`🧪 Launching Test agent for ${ticketId}...`);

    return this._runAgentScript(scriptPath, ticketId, 'test');
  }

  /**
   * Launch Doc agent
   */
  async launchDoc(ticket) {
    const ticketId = ticket.id;
    const scriptPath = join(this.projectRoot, 'scripts/launch-doc-agent.sh');

    if (!existsSync(scriptPath)) {
      console.log(`⚠️ Doc agent script not found, skipping`);
      return { launched: true, note: 'Script not found - placeholder completion' };
    }

    console.log(`📚 Launching Doc agent for ${ticketId}...`);

    return this._runAgentScript(scriptPath, ticketId, 'doc');
  }

  /**
   * Generic agent script runner
   */
  _runAgentScript(scriptPath, ticketId, agentType) {
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath, ticketId], {
        cwd: this.projectRoot,
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      proc.on('close', (code) => {
        eventBus.emit('agent:completed', { ticketId, agentType, success: code === 0 });

        if (code === 0) {
          resolve({ launched: true, output: stdout.slice(-2000) });
        } else {
          resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Kill an agent session
   */
  async kill(ticketId, agentType = 'dev') {
    const sessionName = agentType === 'qa' ? `qa-${ticketId}` : `agent-${ticketId}`;

    return new Promise((resolve) => {
      spawn('tmux', ['kill-session', '-t', sessionName], {
        stdio: 'ignore',
      }).on('close', (code) => {
        // Mark session as crashed in DB
        if (db?.sessions) {
          const dbSession = db.sessions.getByTmux?.(sessionName);
          if (dbSession) {
            db.sessions.crash(dbSession.id, 'Killed by user');
          }
        }
        resolve({ killed: code === 0 });
      });
    });
  }

  /**
   * Kill all agent sessions
   */
  async killAll() {
    return new Promise((resolve) => {
      spawn('tmux', ['kill-server'], {
        stdio: 'ignore',
      }).on('close', () => {
        // Mark all running sessions as crashed
        if (db?.sessions) {
          const running = db.sessions.getRunning();
          for (const s of running) {
            db.sessions.crash(s.id, 'Killed by killAll');
          }
          resolve({ killed: running.length });
        } else {
          resolve({ killed: 0 });
        }
      });
    });
  }

  /**
   * List running tmux sessions
   */
  async listSessions() {
    return new Promise((resolve) => {
      const proc = spawn('tmux', ['list-sessions', '-F', '#{session_name}'], {
        stdio: ['ignore', 'pipe', 'ignore'],
      });

      let output = '';
      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.on('close', () => {
        const sessions = output.trim().split('\n').filter(Boolean);
        resolve(sessions);
      });
    });
  }
}

export const agentLauncher = new AgentLauncher();
export default agentLauncher;
