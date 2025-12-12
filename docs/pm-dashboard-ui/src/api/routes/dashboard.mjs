/**
 * Dashboard API Routes
 * 
 * Provides dashboard overview and stats.
 */

import { Router } from 'express';
import config from '../../config.mjs';

const router = Router();

// Database module - will be injected
let db = null;

/**
 * Initialize with database module
 */
export function initDashboardRoutes(dbModule) {
  db = dbModule;
}

// GET /api/v2/dashboard - Get dashboard overview
router.get('/', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Get ticket counts by status
    const allTickets = db.tickets?.list({}) || [];
    const statusCounts = {};
    for (const ticket of allTickets) {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    }

    // Get running sessions
    const runningSessions = db.sessions?.getRunning() || [];
    
    // Get pending jobs
    const pendingJobs = db.jobs?.getPendingCounts() || [];

    // Get recent events
    const recentEvents = db.getDB?.()
      ?.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 20')
      ?.all() || [];

    res.json({
      tickets: {
        total: allTickets.length,
        byStatus: statusCounts,
      },
      agents: {
        running: runningSessions.length,
        dev: runningSessions.filter(s => s.agent_type === 'dev').length,
        qa: runningSessions.filter(s => s.agent_type === 'qa').length,
      },
      jobs: {
        pending: pendingJobs,
      },
      automation: config.automation,
      limits: config.limits,
      recentEvents: recentEvents.slice(0, 10),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v2/dashboard/dev-status - Get dev status overview
router.get('/dev-status', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const allTickets = db.tickets?.list({}) || [];
    
    // Group by status
    const byStatus = {
      ready: allTickets.filter(t => t.status === 'ready'),
      in_progress: allTickets.filter(t => t.status === 'in_progress'),
      dev_complete: allTickets.filter(t => t.status === 'dev_complete'),
      in_review: allTickets.filter(t => t.status === 'in_review'),
      qa_pending: allTickets.filter(t => t.status === 'qa_pending'),
      qa_approved: allTickets.filter(t => t.status === 'qa_approved'),
      qa_failed: allTickets.filter(t => t.status === 'qa_failed'),
      finalizing: allTickets.filter(t => t.status === 'finalizing'),
      ready_to_merge: allTickets.filter(t => t.status === 'ready_to_merge'),
      blocked: allTickets.filter(t => t.status === 'blocked'),
      merged: allTickets.filter(t => t.status === 'merged'),
    };

    res.json({
      summary: {
        total: allTickets.length,
        active: allTickets.filter(t => !['merged', 'cancelled', 'draft'].includes(t.status)).length,
        readyToWork: byStatus.ready.length,
        inProgress: byStatus.in_progress.length,
        blocked: byStatus.blocked.length,
        readyToMerge: byStatus.ready_to_merge.length,
      },
      byStatus,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v2/dashboard/pipeline - Get pipeline status
router.get('/pipeline', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const allTickets = db.tickets?.list({}) || [];
    const runningSessions = db.sessions?.getRunning() || [];
    
    // Pipeline stages with labels and colors
    const stages = [
      { id: 'ready', label: 'Ready', color: 'blue', tickets: [] },
      { id: 'in_progress', label: 'In Progress', color: 'yellow', tickets: [] },
      { id: 'dev_complete', label: 'Dev Complete', color: 'cyan', tickets: [] },
      { id: 'in_review', label: 'Regression', color: 'purple', tickets: [] },
      { id: 'qa_pending', label: 'QA Pending', color: 'orange', tickets: [] },
      { id: 'qa_approved', label: 'QA Approved', color: 'green', tickets: [] },
      { id: 'qa_failed', label: 'QA Failed', color: 'red', tickets: [] },
      { id: 'blocked', label: 'Blocked', color: 'red', tickets: [] },
      { id: 'finalizing', label: 'Finalizing', color: 'cyan', tickets: [] },
      { id: 'ready_to_merge', label: 'Ready to Merge', color: 'green', tickets: [] },
      { id: 'merged', label: 'Merged', color: 'gray', tickets: [] },
      { id: 'done', label: 'Done', color: 'gray', tickets: [] },
    ];

    const stageMap = new Map(stages.map(s => [s.id, s]));

    for (const ticket of allTickets) {
      const stage = stageMap.get(ticket.status);
      if (stage) {
        stage.tickets.push({
          id: ticket.id,
          title: ticket.title,
          priority: ticket.priority,
          iteration: ticket.iteration,
          hasAgent: runningSessions.some(s => s.ticket_id === ticket.id),
          updated_at: ticket.updated_at,
        });
      }
    }

    // Add counts
    stages.forEach(s => s.count = s.tickets.length);

    // Summary
    const summary = {
      total: allTickets.length,
      active: allTickets.filter(t => !['merged', 'done', 'cancelled', 'draft'].includes(t.status)).length,
      needsAttention: allTickets.filter(t => ['blocked', 'qa_failed'].includes(t.status)).length,
      readyToMerge: stageMap.get('ready_to_merge').count,
      completed: stageMap.get('merged').count + stageMap.get('done').count,
    };

    res.json({ stages, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
