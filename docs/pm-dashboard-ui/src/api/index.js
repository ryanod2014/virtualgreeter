/**
 * Express API Setup
 * 
 * Configures Express app with middleware and routes.
 */

import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import ticketsRouter from './routes/tickets.js';
import jobsRouter from './routes/jobs.js';
import agentsRouter from './routes/agents.js';
import dashboardRouter from './routes/dashboard.js';
import configRouter from './routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp() {
  const app = express();

  // ═══════════════════════════════════════════════════════════════════════════
  // MIDDLEWARE
  // ═══════════════════════════════════════════════════════════════════════════

  // Parse JSON bodies
  app.use(express.json());

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // CORS headers for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    if (process.env.DEBUG_REQUESTS === 'true') {
      console.log(`${req.method} ${req.path}`);
    }
    next();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // API ROUTES (v2)
  // ═══════════════════════════════════════════════════════════════════════════

  app.use('/api/v2/tickets', ticketsRouter);
  app.use('/api/v2/jobs', jobsRouter);
  app.use('/api/v2/agents', agentsRouter);
  app.use('/api/v2/dashboard', dashboardRouter);
  app.use('/api/v2/config', configRouter);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC FILES
  // ═══════════════════════════════════════════════════════════════════════════

  // Serve static files from dashboard root (where index.html is)
  const dashboardRoot = join(__dirname, '../..');
  app.use(express.static(dashboardRoot));

  // Serve index.html for root
  app.get('/', (req, res) => {
    res.sendFile(join(dashboardRoot, 'index.html'));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  // 404 handler
  app.use((req, res, next) => {
    // Only return 404 for API routes, let static files fall through
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    next();
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  return app;
}

export default createApp;
