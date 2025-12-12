/**
 * Config API Routes
 * 
 * Provides runtime configuration management.
 */

import { Router } from 'express';
import config, { updateConfig, getConfig } from '../../config.mjs';

const router = Router();

// GET /api/v2/config - Get current config
router.get('/', (req, res) => {
  res.json(getConfig());
});

// GET /api/v2/config/automation - Get automation settings
router.get('/automation', (req, res) => {
  res.json(config.automation);
});

// GET /api/v2/config/limits - Get limits
router.get('/limits', (req, res) => {
  res.json(config.limits);
});

// PATCH /api/v2/config - Update config at runtime
router.patch('/', (req, res) => {
  try {
    const updated = updateConfig(req.body);
    console.log('📝 Config updated:', JSON.stringify(req.body));
    res.json({ success: true, config: getConfig() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/v2/config/automation/enable - Enable all automation
router.post('/automation/enable', (req, res) => {
  updateConfig({
    automation: {
      enabled: true,
      autoQueueOnDevComplete: true,
      autoQueueOnQaPass: true,
      autoDispatchOnBlock: true,
    }
  });
  console.log('🤖 Automation ENABLED');
  res.json({ success: true, automation: config.automation });
});

// POST /api/v2/config/automation/disable - Disable all automation
router.post('/automation/disable', (req, res) => {
  updateConfig({
    automation: {
      enabled: false,
      autoQueueOnDevComplete: false,
      autoQueueOnQaPass: false,
      autoDispatchOnBlock: false,
    }
  });
  console.log('🔒 Automation DISABLED');
  res.json({ success: true, automation: config.automation });
});

// POST /api/v2/config/limits - Update limits
router.post('/limits', (req, res) => {
  try {
    updateConfig({ limits: req.body });
    console.log('📝 Limits updated:', JSON.stringify(req.body));
    res.json({ success: true, limits: config.limits });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
