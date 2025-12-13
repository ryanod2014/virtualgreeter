/**
 * Tickets API Routes
 * 
 * Stateless HTTP handlers. All business logic in orchestrator/stateMachine.
 */

import { Router } from 'express';
import { transition, forceTransition, getNextStates, setDB as setStateMachineDB } from '../../core/stateMachine.mjs';
import orchestrator from '../../core/orchestrator.mjs';
import { eventBus } from '../../events/eventBus.mjs';

const router = Router();

// Database module - will be injected
let db = null;

/**
 * Initialize with database module
 */
export function initTicketsRoutes(dbModule) {
  db = dbModule;
  setStateMachineDB(dbModule);
}

// GET /api/v2/tickets - List tickets
router.get('/', (req, res) => {
  if (!db?.tickets) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const filters = {
    status: req.query.status,
    priority: req.query.priority,
    feature: req.query.feature,
  };

  // Remove undefined filters
  Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);

  const list = db.tickets.list(filters);
  res.json({ tickets: list, count: list.length });
});

// GET /api/v2/tickets/:id - Get single ticket
router.get('/:id', (req, res) => {
  if (!db?.tickets) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const ticket = db.tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  res.json({
    ticket,
    nextStates: getNextStates(req.params.id),
  });
});

// POST /api/v2/tickets - Create ticket
router.post('/', (req, res) => {
  if (!db?.tickets) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const ticket = db.tickets.create(req.body);
    res.status(201).json({ success: true, ticket });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/v2/tickets/:id - Update ticket
router.put('/:id', (req, res) => {
  if (!db?.tickets) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Get current ticket to detect status changes
    const currentTicket = db.tickets.get(req.params.id);
    const oldStatus = currentTicket?.status;
    
    const ticket = db.tickets.update(req.params.id, req.body);
    
    // If status changed, emit event so orchestrator can react
    if (req.body.status && req.body.status !== oldStatus) {
      console.log(`📋 ${req.params.id}: ${oldStatus} → ${req.body.status} (via PUT)`);
      
      // Release file locks when transitioning to retry/failure states
      // This ensures dev agent can acquire locks on the next iteration
      const lockReleaseStatuses = ['qa_failed', 'blocked', 'continuation_ready'];
      if (lockReleaseStatuses.includes(req.body.status) && db.locks && db.sessions) {
        const sessions = db.sessions.list({ ticket_id: req.params.id });
        let locksReleased = 0;
        for (const s of sessions) {
          const released = db.locks.release(s.id);
          if (released > 0) locksReleased += released;
        }
        if (locksReleased > 0) {
          console.log(`🔓 Released ${locksReleased} file locks for ${req.params.id} (status → ${req.body.status})`);
        }
      }
      
      // Log event if available
      if (db.logEvent) {
        db.logEvent('ticket_status_changed', 'system', 'ticket', req.params.id, {
          from: oldStatus,
          to: req.body.status,
        });
      }
      
      // Emit event for orchestrator to queue jobs
      eventBus.emit('ticket:transitioned', {
        ticketId: req.params.id,
        fromStatus: oldStatus,
        toStatus: req.body.status,
        ticket,
      });
    }
    
    res.json({ success: true, ticket });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/transition - Change status (validated)
router.post('/:id/transition', (req, res) => {
  try {
    const { toStatus, force, reason, ...metadata } = req.body;

    let updated;
    if (force) {
      updated = forceTransition(req.params.id, toStatus, reason, metadata);
    } else {
      updated = transition(req.params.id, toStatus, metadata);
    }

    res.json({ success: true, ticket: updated, nextStates: getNextStates(req.params.id) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/launch - Launch dev agent
router.post('/:id/launch', async (req, res) => {
  try {
    const result = await orchestrator.launchDevAgent(req.params.id);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/regression - Run regression tests
router.post('/:id/regression', async (req, res) => {
  try {
    const result = await orchestrator.runRegression(req.params.id);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/qa - Launch QA agent
router.post('/:id/qa', async (req, res) => {
  try {
    const result = await orchestrator.launchQaAgent(req.params.id);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/qa-result - Process QA result
router.post('/:id/qa-result', (req, res) => {
  try {
    const { passed, details } = req.body;
    const result = orchestrator.processQaResult(req.params.id, passed, details);
    res.json({ success: true, ticket: result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/approve-ui - Approve UI review
router.post('/:id/approve-ui', (req, res) => {
  try {
    const result = orchestrator.approveUiReview(req.params.id);
    res.json({ success: true, ticket: result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/finalize - Start finalizing
router.post('/:id/finalize', (req, res) => {
  try {
    const result = orchestrator.startFinalizing(req.params.id);
    res.json({ success: true, ticket: result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/ready-to-merge - Mark ready to merge
router.post('/:id/ready-to-merge', (req, res) => {
  try {
    const result = orchestrator.markReadyToMerge(req.params.id);
    res.json({ success: true, ticket: result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/merge - Complete merge
router.post('/:id/merge', (req, res) => {
  try {
    const result = orchestrator.completeMerge(req.params.id);
    res.json({ success: true, ticket: result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/tickets/:id/block - Block ticket
router.post('/:id/block', (req, res) => {
  try {
    const { reason } = req.body;
    const result = orchestrator.blockTicket(req.params.id, reason);
    res.json({ success: true, ticket: result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/v2/tickets/:id - Delete ticket
router.delete('/:id', (req, res) => {
  if (!db?.tickets) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    db.tickets.delete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
