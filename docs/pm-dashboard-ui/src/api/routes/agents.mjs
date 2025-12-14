/**
 * Agents API Routes
 * 
 * Manages running agent sessions.
 */

import { Router } from 'express';
import { agentLauncher } from '../../services/agentLauncher.mjs';

const router = Router();

// Database module - will be injected
let db = null;

/**
 * Initialize with database module
 */
export function initAgentsRoutes(dbModule) {
  db = dbModule;
  agentLauncher.setDB(dbModule);
}

// GET /api/v2/agents - List running agents
router.get('/', async (req, res) => {
  try {
    // Get from DB
    const dbSessions = db?.sessions?.getRunning() || [];
    
    // Also get from tmux
    const tmuxSessions = await agentLauncher.listSessions();
    
    res.json({
      sessions: dbSessions,
      tmuxSessions,
      counts: {
        dev: dbSessions.filter(s => s.agent_type === 'dev').length,
        qa: dbSessions.filter(s => s.agent_type === 'qa').length,
        total: dbSessions.length,
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v2/agents/:ticketId - Get agents for a ticket
router.get('/:ticketId', (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const sessions = db.sessions.list({ ticket_id: req.params.ticketId });
  res.json({ sessions });
});

// POST /api/v2/agents/start - Start an agent session (records in DB)
router.post('/start', (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { ticket_id, feature_id, agent_type, tmux_session, worktree_path } = req.body;

    // Check for existing running session for this ticket + agent type
    // If found, return that session instead of creating a duplicate
    const existingSessions = db.sessions.list({ ticket_id });
    const runningSession = existingSessions.find(s => 
      s.agent_type === agent_type && 
      s.status === 'running'
    );
    
    if (runningSession) {
      console.log(`⚠️ Reusing existing session ${runningSession.id} for ${ticket_id} (${agent_type})`);
      
      // Update tmux_session if provided
      if (tmux_session && !runningSession.tmux_session) {
        db.sessions.start(runningSession.id, tmux_session, worktree_path);
      }
      
      return res.status(200).json({ success: true, id: runningSession.id, session: runningSession, reused: true });
    }

    const session = db.sessions.create({
      ticket_id,
      feature_id,
      agent_type,
    });

    if (tmux_session) {
      db.sessions.start(session.id, tmux_session, worktree_path);
    }

    // Return id at top level for launch script compatibility
    res.status(201).json({ success: true, id: session.id, session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/agents/:sessionId/heartbeat - Update heartbeat
router.post('/:sessionId/heartbeat', (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const session = db.sessions.heartbeat(req.params.sessionId);
    res.json({ success: true, session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/agents/:sessionId/complete - Mark session complete
router.post('/:sessionId/complete', async (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { completion_file } = req.body;
    const session = db.sessions.complete(req.params.sessionId, completion_file);
    
    // NOTE: File locks are NOT released here - they persist until ticket is merged
    // This prevents other agents from modifying the same files during QA/review
    
    // Emit session completed event for other modules to react
    const { eventBus } = await import('../../events/eventBus.mjs');
    eventBus.emit('agent:session:completed', {
      ticketId: session.ticket_id,
      agentType: session.agent_type,
      sessionId: session.id
    });
    
    // If this was a dev agent, transition ticket to dev_complete
    if (session.agent_type === 'dev' && session.ticket_id) {
      try {
        const { transition, STATES } = await import('../../core/stateMachine.mjs');
        const ticket = db.tickets.get(session.ticket_id);
        if (ticket && ticket.status === 'in_progress') {
          transition(session.ticket_id, STATES.DEV_COMPLETE);
          console.log(`📋 ${session.ticket_id}: in_progress → dev_complete (auto-transition on session complete)`);
        }
      } catch (e) {
        console.error(`Failed to auto-transition ${session.ticket_id}: ${e.message}`);
      }
    }
    
    res.json({ success: true, session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/agents/:sessionId/crash - Mark session crashed
router.post('/:sessionId/crash', (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { reason } = req.body;
    const session = db.sessions.crash(req.params.sessionId, reason);
    
    // Release file locks on crash so other tickets can work
    if (db.locks) {
      db.locks.release(req.params.sessionId);
      console.log(`🔓 Released file locks for crashed session ${req.params.sessionId}`);
    }
    
    res.json({ success: true, session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/agents/:sessionId/block - Mark session blocked (agent hit a blocker)
router.post('/:sessionId/block', (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { blocker_type, summary } = req.body;
    
    // Mark session as blocked/failed
    const session = db.sessions.crash(req.params.sessionId, `${blocker_type}: ${summary}`);
    
    // Release file locks so continuation ticket or other tickets can work
    if (db.locks) {
      db.locks.release(req.params.sessionId);
      console.log(`🔓 Released file locks for blocked session ${req.params.sessionId}`);
    }
    
    res.json({ success: true, session });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v2/agents/:ticketId - Kill agent for ticket
router.delete('/:ticketId', async (req, res) => {
  try {
    const agentType = req.query.type || 'dev';
    const result = await agentLauncher.kill(req.params.ticketId, agentType);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/v2/agents - Kill all agents
router.delete('/', async (req, res) => {
  try {
    const result = await agentLauncher.killAll();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/agents/cleanup - Clean up stale/orphaned sessions
// Only cleans sessions older than 2 minutes to avoid race conditions
router.post('/cleanup', async (req, res) => {
  if (!db?.sessions) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Get all "running" sessions from DB
    const runningSessions = db.sessions.getRunning() || [];
    
    // Get actual tmux sessions
    const tmuxSessions = await agentLauncher.listSessions();
    const activeTmuxNames = new Set(tmuxSessions.map(s => s.name));
    
    // Find orphaned sessions (in DB but not in tmux)
    const orphaned = [];
    const cleaned = [];
    const skipped = [];
    const now = Date.now();
    const MIN_AGE_MS = 2 * 60 * 1000; // 2 minutes grace period
    
    for (const session of runningSessions) {
      const tmuxName = session.tmux_session;
      const isActive = tmuxName && activeTmuxNames.has(tmuxName);
      
      if (!isActive) {
        // Check session age - don't clean up newly created sessions
        const sessionAge = now - new Date(session.started_at).getTime();
        if (sessionAge < MIN_AGE_MS) {
          skipped.push({ id: session.id, ticket_id: session.ticket_id, age_seconds: Math.round(sessionAge / 1000) });
          continue;
        }
        
        orphaned.push(session);
        // Mark as completed (agent finished without proper cleanup)
        try {
          db.sessions.complete(session.id, null);
          cleaned.push(session.id);
        } catch (e) {
          console.error(`Failed to clean session ${session.id}:`, e.message);
        }
      }
    }
    
    res.json({
      success: true,
      orphanedCount: orphaned.length,
      cleanedCount: cleaned.length,
      skippedCount: skipped.length,
      orphanedSessions: orphaned.map(s => ({ id: s.id, ticket_id: s.ticket_id, agent_type: s.agent_type })),
      skippedSessions: skipped,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/agents/qa-result - Report QA result (called by QA agent)
router.post('/qa-result', async (req, res) => {
  try {
    const { ticket_id, passed, failures, recommendation, qa_report } = req.body;
    
    if (!ticket_id) {
      return res.status(400).json({ error: 'ticket_id is required' });
    }
    
    // Import orchestrator dynamically to avoid circular deps
    const { processQaResult } = await import('../../core/orchestrator.mjs');
    
    const ticket = processQaResult(ticket_id, passed, {
      failures: failures || [],
      recommendation: recommendation || '',
      qa_report: qa_report || null
    });
    
    res.json({
      success: true,
      ticket_id,
      passed,
      new_status: ticket.status,
      message: passed 
        ? `QA passed! Ticket moved to ${ticket.status}` 
        : `QA failed. Blocker created for Dispatch.`
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
