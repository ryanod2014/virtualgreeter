/**
 * Actions API Routes
 * 
 * Provides action endpoints for launching agents, running tests, etc.
 * These map to legacy /api/launch-agent, /api/run-regression, etc.
 */

import { Router } from 'express';
import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import config from '../../config.mjs';
import { agentLauncher } from '../../services/agentLauncher.mjs';
import { regressionRunner } from '../../services/regressionRunner.mjs';

const router = Router();

// Database module - will be injected
let db = null;

const PROJECT_ROOT = config.paths.projectRoot;

/**
 * Initialize with database module
 */
export function initActionsRoutes(dbModule) {
  db = dbModule;
}

// POST /api/v2/actions/launch-agent - Launch dev agent
router.post('/launch-agent', async (req, res) => {
  try {
    const { ticketId } = req.body;
    
    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId required' });
    }
    
    const ticket = db?.tickets?.get(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${ticketId} not found` });
    }
    
    const result = await agentLauncher.launchDev(ticket);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/actions/launch-dispatch - Launch dispatch agent
router.post('/launch-dispatch', async (req, res) => {
  try {
    const scriptPath = join(PROJECT_ROOT, 'scripts/run-dispatch-agent.sh');
    
    if (!existsSync(scriptPath)) {
      return res.status(404).json({ error: 'Dispatch script not found' });
    }
    
    const proc = spawn('bash', [scriptPath], {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: 'ignore'
    });
    
    proc.unref();
    
    res.json({ success: true, message: 'Dispatch agent launched' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/actions/run-regression - Run regression tests
router.post('/run-regression', async (req, res) => {
  try {
    const { ticketId, branch } = req.body;
    
    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId required' });
    }
    
    const result = await regressionRunner.run(ticketId, branch);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/actions/create-ci-blocker - Create CI blocker file
router.post('/create-ci-blocker', async (req, res) => {
  try {
    const { ticketId, branch, output, error } = req.body;
    
    const blockerDir = join(PROJECT_ROOT, 'docs/agent-output/blocked');
    if (!existsSync(blockerDir)) {
      mkdirSync(blockerDir, { recursive: true });
    }
    
    const blockerPath = join(blockerDir, `CI-${ticketId}-${Date.now()}.json`);
    const blocker = {
      ticket_id: ticketId,
      type: 'ci_failure',
      branch,
      created_at: new Date().toISOString(),
      output: output?.slice(-10000) || '',
      error: error || ''
    };
    
    writeFileSync(blockerPath, JSON.stringify(blocker, null, 2));
    
    res.json({ success: true, path: blockerPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/actions/setup-worktrees - Setup worktrees for tickets
router.post('/setup-worktrees', async (req, res) => {
  try {
    const { ticketIds } = req.body;
    
    if (!ticketIds || !Array.isArray(ticketIds)) {
      return res.status(400).json({ error: 'ticketIds array required' });
    }
    
    const results = [];
    const scriptPath = join(PROJECT_ROOT, 'scripts/setup-agent-worktree.sh');
    
    for (const ticketId of ticketIds) {
      try {
        if (existsSync(scriptPath)) {
          execSync(`bash "${scriptPath}" "${ticketId}"`, {
            cwd: PROJECT_ROOT,
            encoding: 'utf8',
            timeout: 60000
          });
          results.push({ ticketId, success: true });
        } else {
          results.push({ ticketId, success: false, error: 'Script not found' });
        }
      } catch (e) {
        results.push({ ticketId, success: false, error: e.message });
      }
    }
    
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v2/actions/file - Read file content
router.get('/file', async (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ error: 'path query parameter required' });
    }
    
    // Security: only allow reading from docs/ directory
    const fullPath = filePath.startsWith('/') ? filePath : join(PROJECT_ROOT, filePath);
    
    if (!fullPath.includes('/docs/') && !fullPath.includes('/agent-output/')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = readFileSync(fullPath, 'utf8');
    res.json({ content, path: fullPath });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
