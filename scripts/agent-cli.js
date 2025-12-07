#!/usr/bin/env node
/**
 * =============================================================================
 * Agent CLI Backend
 * =============================================================================
 * Node.js backend for the agent CLI tool.
 * Communicates with the dashboard API to manage workflow state.
 * =============================================================================
 */

const http = require('http');
const https = require('https');

// Configuration
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3456';
const SESSION_ID = process.env.AGENT_SESSION_ID;

// =============================================================================
// HTTP Client
// =============================================================================

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, DASHBOARD_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(body);
          }
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// =============================================================================
// CLI Commands
// =============================================================================

const commands = {
  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------
  
  async start(args) {
    const ticketId = getArg(args, '--ticket', '-t');
    const featureId = getArg(args, '--feature', '-f');
    const agentType = getArg(args, '--type') || 'dev';
    const tmuxSession = getArg(args, '--tmux');
    const worktreePath = getArg(args, '--worktree');
    
    if (!ticketId && !featureId) {
      throw new Error('Either --ticket or --feature is required');
    }
    
    const result = await request('POST', '/api/v2/agents/start', {
      ticket_id: ticketId,
      feature_id: featureId,
      agent_type: agentType,
      tmux_session: tmuxSession,
      worktree_path: worktreePath,
    });
    
    console.log(`Session started: ${result.id}`);
    console.log(`Status: ${result.status}`);
    
    // Output session ID for shell capture
    if (process.env.AGENT_CLI_MACHINE_OUTPUT) {
      console.log(`SESSION_ID=${result.id}`);
    }
    
    return result;
  },
  
  async heartbeat(args) {
    const sessionId = getArg(args, '--session', '-s') || SESSION_ID;
    
    if (!sessionId) {
      throw new Error('--session is required (or set AGENT_SESSION_ID)');
    }
    
    const result = await request('POST', `/api/v2/agents/${sessionId}/heartbeat`);
    console.log(`Heartbeat: ${result.last_heartbeat}`);
    return result;
  },
  
  async complete(args) {
    const sessionId = getArg(args, '--session', '-s') || SESSION_ID;
    const reportPath = getArg(args, '--report', '-r');
    
    if (!sessionId) {
      throw new Error('--session is required (or set AGENT_SESSION_ID)');
    }
    
    const result = await request('POST', `/api/v2/agents/${sessionId}/complete`, {
      completion_file: reportPath,
    });
    
    console.log(`Session completed: ${result.id}`);
    console.log(`Status: ${result.status}`);
    return result;
  },
  
  async block(args) {
    const sessionId = getArg(args, '--session', '-s') || SESSION_ID;
    const reason = getArg(args, '--reason', '-r');
    const blockerType = getArg(args, '--type') || 'clarification';
    const blockerFile = getArg(args, '--file', '-f');
    
    if (!sessionId) {
      throw new Error('--session is required (or set AGENT_SESSION_ID)');
    }
    if (!reason) {
      throw new Error('--reason is required');
    }
    
    const result = await request('POST', `/api/v2/agents/${sessionId}/block`, {
      blocker_type: blockerType,
      summary: reason,
      blocker_file: blockerFile,
    });
    
    console.log(`Session blocked: ${result.id}`);
    console.log(`Blocker type: ${result.blocker_type}`);
    return result;
  },
  
  // ---------------------------------------------------------------------------
  // Findings
  // ---------------------------------------------------------------------------
  
  async 'add-finding'(args) {
    const title = getArg(args, '--title', '-t');
    const description = getArg(args, '--description', '-d');
    const severity = getArg(args, '--severity', '-s') || 'medium';
    const type = getArg(args, '--type') || 'bug';
    const file = getArg(args, '--file', '-f');
    const feature = getArg(args, '--feature');
    const sessionId = getArg(args, '--session') || SESSION_ID;
    
    if (!title && !description) {
      throw new Error('--title or --description is required');
    }
    
    const result = await request('POST', '/api/v2/findings', {
      title: title || description.substring(0, 80),
      issue: description,
      severity: severity,
      category: type,
      location: file,
      feature: feature,
      source_agent: 'dev_agent',
      source_session_id: sessionId,
      status: 'staging',
    });
    
    console.log(`Finding created: ${result.id}`);
    console.log(`Severity: ${result.severity}`);
    return result;
  },
  
  async 'list-findings'(args) {
    const status = getArg(args, '--status', '-s');
    const severity = getArg(args, '--severity');
    
    let url = '/api/v2/findings';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    if (params.toString()) url += '?' + params.toString();
    
    const result = await request('GET', url);
    
    console.log(`Found ${result.count} findings:`);
    for (const f of result.findings.slice(0, 20)) {
      console.log(`  [${f.severity}] ${f.id}: ${f.title}`);
    }
    if (result.count > 20) {
      console.log(`  ... and ${result.count - 20} more`);
    }
    
    return result;
  },
  
  // ---------------------------------------------------------------------------
  // Tickets
  // ---------------------------------------------------------------------------
  
  async 'get-ticket'(args) {
    const ticketId = args[0] || getArg(args, '--id', '-i');
    
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }
    
    const result = await request('GET', `/api/v2/tickets/${ticketId.toUpperCase()}`);
    
    console.log(`Ticket: ${result.id}`);
    console.log(`Title: ${result.title}`);
    console.log(`Status: ${result.status}`);
    console.log(`Priority: ${result.priority}`);
    console.log(`Files to modify: ${(result.files_to_modify || []).join(', ')}`);
    
    return result;
  },
  
  async 'list-tickets'(args) {
    const status = getArg(args, '--status', '-s');
    const priority = getArg(args, '--priority', '-p');
    
    let url = '/api/v2/tickets';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (params.toString()) url += '?' + params.toString();
    
    const result = await request('GET', url);
    
    console.log(`Found ${result.count} tickets:`);
    for (const t of result.tickets.slice(0, 20)) {
      console.log(`  [${t.status}] ${t.id}: ${t.title}`);
    }
    if (result.count > 20) {
      console.log(`  ... and ${result.count - 20} more`);
    }
    
    return result;
  },
  
  async 'update-ticket'(args) {
    const ticketId = args[0] || getArg(args, '--id', '-i');
    const status = getArg(args, '--status', '-s');
    const branch = getArg(args, '--branch', '-b');
    
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }
    
    const data = {};
    if (status) data.status = status;
    if (branch) data.branch = branch;
    
    const result = await request('PUT', `/api/v2/tickets/${ticketId.toUpperCase()}`, data);
    
    console.log(`Ticket updated: ${result.id}`);
    console.log(`Status: ${result.status}`);
    
    return result;
  },
  
  // ---------------------------------------------------------------------------
  // Locks
  // ---------------------------------------------------------------------------
  
  async 'check-locks'(args) {
    const result = await request('GET', '/api/v2/locks');
    
    if (result.count === 0) {
      console.log('No active file locks');
    } else {
      console.log(`Active locks (${result.count}):`);
      for (const lock of result.locks) {
        console.log(`  ${lock.file_path} - locked by ${lock.ticket_id || lock.session_id}`);
      }
    }
    
    return result;
  },
  
  async 'acquire-locks'(args) {
    const sessionId = getArg(args, '--session', '-s') || SESSION_ID;
    const ticketId = getArg(args, '--ticket', '-t');
    const files = args.filter(a => !a.startsWith('-') && a !== ticketId);
    
    if (!sessionId) {
      throw new Error('--session is required (or set AGENT_SESSION_ID)');
    }
    if (files.length === 0) {
      throw new Error('At least one file path is required');
    }
    
    const result = await request('POST', '/api/v2/locks/acquire', {
      session_id: sessionId,
      ticket_id: ticketId,
      files: files,
    });
    
    if (result.success) {
      console.log(`Locks acquired for ${files.length} files`);
    } else {
      console.error(`Lock conflict: ${result.conflicts.join(', ')}`);
      process.exit(1);
    }
    
    return result;
  },
  
  async 'release-locks'(args) {
    const sessionId = getArg(args, '--session', '-s') || SESSION_ID;
    
    if (!sessionId) {
      throw new Error('--session is required (or set AGENT_SESSION_ID)');
    }
    
    const result = await request('POST', '/api/v2/locks/release', {
      session_id: sessionId,
    });
    
    console.log('Locks released');
    return result;
  },
  
  // ---------------------------------------------------------------------------
  // Status/Info
  // ---------------------------------------------------------------------------
  
  async status(args) {
    const result = await request('GET', '/api/v2/agents?running=true');
    
    console.log('Running agents:');
    if (result.count === 0) {
      console.log('  None');
    } else {
      for (const s of result.sessions) {
        console.log(`  ${s.tmux_session || s.id} - ${s.agent_type} - ${s.ticket_id || s.feature_id}`);
      }
    }
    
    // Also check for stalled
    const stalled = await request('GET', '/api/v2/agents?stalled=true');
    if (stalled.count > 0) {
      console.log('\n⚠️  Stalled agents:');
      for (const s of stalled.sessions) {
        console.log(`  ${s.tmux_session || s.id} - ${s.agent_type} - last heartbeat: ${s.last_heartbeat}`);
      }
    }
    
    return { running: result, stalled };
  },
  
  async events(args) {
    const limit = getArg(args, '--limit', '-n') || 20;
    
    const result = await request('GET', `/api/v2/events?limit=${limit}`);
    
    console.log(`Recent events (${result.count}):`);
    for (const e of result.events) {
      const time = new Date(e.created_at).toLocaleTimeString();
      console.log(`  [${time}] ${e.event_type} - ${e.actor} - ${e.entity_type}:${e.entity_id}`);
    }
    
    return result;
  },
  
  // ---------------------------------------------------------------------------
  // Help
  // ---------------------------------------------------------------------------
  
  help() {
    console.log(`
Agent CLI - Interface for agents to interact with the workflow database

USAGE:
  agent-cli.sh <command> [options]

SESSION COMMANDS:
  start                 Register a new agent session
    --ticket, -t        Ticket ID (for dev/qa agents)
    --feature, -f       Feature ID (for doc/review agents)
    --type              Agent type: dev, qa, doc, test_lock, review, triage, dispatch
    --tmux              Tmux session name
    --worktree          Worktree path
  
  heartbeat             Update session heartbeat
    --session, -s       Session ID (or use AGENT_SESSION_ID env var)
  
  complete              Mark session as complete
    --session, -s       Session ID
    --report, -r        Path to completion report
  
  block                 Mark session as blocked
    --session, -s       Session ID
    --reason, -r        Blocker reason/summary
    --type              Blocker type: clarification, environment, ci_failure, qa_failure
    --file, -f          Path to blocker file

FINDING COMMANDS:
  add-finding           Create a new finding
    --title, -t         Finding title
    --description, -d   Detailed description
    --severity, -s      Severity: critical, high, medium, low
    --type              Category/type
    --file, -f          Related file path
    --feature           Related feature
  
  list-findings         List findings
    --status, -s        Filter by status: staging, inbox, ticketed
    --severity          Filter by severity

TICKET COMMANDS:
  get-ticket <ID>       Get ticket details
  list-tickets          List tickets
    --status, -s        Filter by status: draft, ready, in_progress, etc.
    --priority, -p      Filter by priority
  update-ticket <ID>    Update ticket
    --status, -s        New status
    --branch, -b        Git branch

LOCK COMMANDS:
  check-locks           Show active file locks
  acquire-locks         Acquire file locks
    --session, -s       Session ID
    --ticket, -t        Ticket ID
    <files...>          File paths to lock
  release-locks         Release all session locks
    --session, -s       Session ID

STATUS COMMANDS:
  status                Show running and stalled agents
  events                Show recent events
    --limit, -n         Number of events (default: 20)

ENVIRONMENT:
  AGENT_SESSION_ID      Default session ID for commands
  DASHBOARD_URL         API URL (default: http://localhost:3456)

EXAMPLES:
  # Start a dev agent session
  agent-cli.sh start --ticket TKT-006 --type dev --tmux agent-TKT-006
  
  # Send heartbeat
  export AGENT_SESSION_ID=<session_id>
  agent-cli.sh heartbeat
  
  # Report completion
  agent-cli.sh complete --report docs/agent-output/completions/TKT-006.md
  
  # Add a finding
  agent-cli.sh add-finding --title "Bug found" --severity high --description "Details..."
`);
  },
};

// =============================================================================
// Argument Parsing
// =============================================================================

function getArg(args, ...names) {
  for (const name of names) {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
  }
  return null;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    commands.help();
    return;
  }
  
  const command = args[0];
  const commandArgs = args.slice(1);
  
  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help for usage');
    process.exit(1);
  }
  
  try {
    await commands[command](commandArgs);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
