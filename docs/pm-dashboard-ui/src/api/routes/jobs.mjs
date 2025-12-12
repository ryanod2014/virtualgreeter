/**
 * Jobs API Routes
 * 
 * Manages the job queue for background processing.
 */

import { Router } from 'express';
import { scheduler } from '../../core/scheduler.mjs';

const router = Router();

// Database module - will be injected
let db = null;

/**
 * Initialize with database module
 */
export function initJobsRoutes(dbModule) {
  db = dbModule;
  scheduler.setDB(dbModule);
}

// GET /api/v2/jobs - List jobs
router.get('/', (req, res) => {
  if (!db?.jobs) {
    return res.status(503).json({ error: 'Database not available' });
  }

  const filters = {
    status: req.query.status,
    job_type: req.query.job_type,
  };

  Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);

  const list = db.jobs.list(filters);
  res.json({ jobs: list, count: list.length });
});

// GET /api/v2/jobs/status - Get scheduler status
router.get('/status', (req, res) => {
  const status = scheduler.getStatus();
  res.json(status);
});

// GET /api/v2/jobs/:id - Get single job
router.get('/:id', (req, res) => {
  if (!db?.jobs) {
    return res.status(503).json({ error: 'Database not available' });
  }

  // Get from DB by iterating list (no direct get by id in original)
  const allJobs = db.jobs.list({});
  const job = allJobs.find(j => j.id === req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ job });
});

// POST /api/v2/jobs - Create job
router.post('/', (req, res) => {
  try {
    const job = scheduler.enqueue({
      type: req.body.job_type,
      ticketId: req.body.ticket_id,
      branch: req.body.branch,
      payload: req.body.payload,
      priority: req.body.priority,
    });
    res.status(201).json({ success: true, job });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/jobs/start - Start scheduler
router.post('/start', (req, res) => {
  scheduler.start();
  res.json({ success: true, status: scheduler.getStatus() });
});

// POST /api/v2/jobs/stop - Stop scheduler
router.post('/stop', (req, res) => {
  scheduler.stop();
  res.json({ success: true, status: scheduler.getStatus() });
});

// POST /api/v2/jobs/pause - Pause scheduler
router.post('/pause', (req, res) => {
  scheduler.pause();
  res.json({ success: true, status: scheduler.getStatus() });
});

// POST /api/v2/jobs/resume - Resume scheduler
router.post('/resume', (req, res) => {
  scheduler.resume();
  res.json({ success: true, status: scheduler.getStatus() });
});

// POST /api/v2/jobs/process-one - Process single job manually
router.post('/process-one', async (req, res) => {
  try {
    const result = await scheduler.processNext();
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/v2/jobs/pending - Clear all pending jobs
router.delete('/pending', (req, res) => {
  try {
    const count = scheduler.clearPending();
    res.json({ success: true, cancelled: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
