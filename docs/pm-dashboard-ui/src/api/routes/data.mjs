/**
 * Data API Routes
 * 
 * Provides comprehensive data endpoint matching legacy /api/data structure.
 * This is the main endpoint the dashboard uses to fetch all data.
 */

import { Router } from 'express';
import { join } from 'path';
import { execSync } from 'child_process';
import config from '../../config.mjs';
import { readJSON, scanFeaturesDir, scanAgentOutputsLocal, buildDevStatus } from '../../utils/fileScanner.mjs';

const router = Router();

// Database module - will be injected
let db = null;

/**
 * Initialize with database module
 */
export function initDataRoutes(dbModule) {
  db = dbModule;
}

/**
 * Get list of active tmux session names
 */
function getActiveTmuxSessions() {
  try {
    const output = execSync('tmux list-sessions -F "#{session_name}" 2>/dev/null', { encoding: 'utf8' });
    return new Set(output.trim().split('\n').filter(Boolean));
  } catch (e) {
    return new Set(); // No tmux sessions
  }
}

/**
 * Clean up orphaned sessions (in DB but tmux session gone)
 * 
 * IMPORTANT: Only cleans up sessions older than 2 minutes to avoid
 * race conditions where the session is registered but tmux hasn't started yet.
 */
function cleanupOrphanedSessions() {
  if (!db?.sessions) return { cleaned: 0 };
  
  try {
    const runningSessions = db.sessions.getRunning() || [];
    const activeTmux = getActiveTmuxSessions();
    let cleaned = 0;
    const now = Date.now();
    const MIN_AGE_MS = 2 * 60 * 1000; // 2 minutes grace period
    
    for (const session of runningSessions) {
      const tmuxName = session.tmux_session;
      
      // Check session age - don't clean up newly created sessions
      const sessionAge = now - new Date(session.started_at).getTime();
      if (sessionAge < MIN_AGE_MS) {
        // Session is too new, skip cleanup (tmux might still be starting)
        continue;
      }
      
      // If no tmux session name or tmux session doesn't exist, clean it up
      if (!tmuxName || !activeTmux.has(tmuxName)) {
        try {
          db.sessions.complete(session.id, null);
          cleaned++;
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
    
    return { cleaned };
  } catch (e) {
    return { cleaned: 0, error: e.message };
  }
}

// GET /api/v2/data - Comprehensive data endpoint (matches legacy /api/data)
router.get('/', async (req, res) => {
  try {
    const PROJECT_ROOT = config.paths.projectRoot;
    const DOCS_DIR = join(PROJECT_ROOT, 'docs');
    
    // Auto-cleanup orphaned sessions on each data fetch
    const cleanupResult = cleanupOrphanedSessions();
    if (cleanupResult.cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleanupResult.cleaned} orphaned session(s)`);
    }
    
    // Scan features directory
    const featuresDir = join(DOCS_DIR, 'features');
    let featuresList = [];
    try {
      featuresList = scanFeaturesDir(featuresDir);
      
      // Merge with DB feature status if available
      if (db?.features) {
        const dbFeatures = db.features.list?.() || [];
        const dbFeatureMap = new Map(dbFeatures.map(f => [f.id, f]));
        
        featuresList = featuresList.map(f => {
          const fileName = f.fileName?.replace('.md', '') || '';
          const dbFeature = dbFeatureMap.get(fileName);
          if (dbFeature) {
            return {
              ...f,
              documented: !!dbFeature.documented,
              reviewed: !!dbFeature.reviewed,
              tested: !!dbFeature.tested,
              last_documented: dbFeature.last_documented,
              last_reviewed: dbFeature.last_reviewed,
              last_tested: dbFeature.last_tested
            };
          }
          return f;
        });
      }
    } catch (e) {
      console.error('Error scanning features:', e.message);
    }

    // Scan agent outputs from filesystem
    let agentOutputs = { reviews: [], completions: [], blocked: [], docTracker: [], started: [], findings: [], testLock: [], qaResults: [] };
    try {
      agentOutputs = scanAgentOutputsLocal();
    } catch (e) {
      console.error('Error scanning agent outputs:', e.message);
    }

    // Read staging data
    const stagingData = readJSON('findings-staging.json');
    const stagingCount = stagingData?.findings?.length || 0;

    // Get data from DB
    if (db) {
      try {
        // Get tickets from DB
        const dbTickets = db.tickets?.list?.() || [];
        
        // Get sessions from DB
        const runningSessions = db.sessions?.getRunning?.() || [];
        const stalledSessions = db.sessions?.getStalled?.() || [];
        
        // Get active locks from DB
        const activeLocks = db.locks?.getActive?.() || [];
        
        // Get findings from DB - filter out staging findings (only show triaged ones)
        const allDbFindings = db.findings?.list?.() || [];
        const dbFindings = allDbFindings.filter(f => f.status !== 'staging');
        
        // Get staging count from DB
        const stagingFindings = allDbFindings.filter(f => f.status === 'staging');
        const dbStagingCount = stagingFindings.length;
        
        // Get decisions from DB
        const dbDecisions = db.decisions?.list?.() || [];
        const decisionThreads = dbDecisions.map(d => {
          const fullThread = db.decisions.get?.(d.id);
          return {
            finding_id: d.finding_id,
            status: d.status || 'pending',
            messages: (fullThread?.messages || []).map(msg => ({
              role: msg.role,
              text: msg.content,
              timestamp: msg.created_at
            })),
            decision: d.decision_type ? {
              option_id: d.decision_type,
              option_label: d.decision_summary || '',
              timestamp: d.resolved_at || d.updated_at
            } : null
          };
        });

        // Build devStatus from DB sessions + tickets (source of truth)
        const devStatus = buildDevStatus(agentOutputs, runningSessions, stalledSessions, dbTickets);

        // Read doc status from file
        const docStatus = readJSON('doc-status.json') || { meta: {}, features: {} };

        // Calculate staging severity breakdown
        const stagingBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const f of stagingFindings) {
          const sev = f.severity || 'medium';
          if (stagingBySeverity[sev] !== undefined) {
            stagingBySeverity[sev]++;
          }
        }

        res.json({
          findings: { 
            findings: dbFindings,
            meta: { total: dbFindings.length }
          },
          decisions: { threads: decisionThreads },
          tickets: { tickets: dbTickets },
          summary: {
            meta: { total_features: featuresList.length },
            by_priority: {},
            by_category: {}
          },
          devStatus,
          docStatus,
          featuresList,
          agentOutputs,
          staging: {
            count: dbStagingCount,
            bySeverity: stagingBySeverity
          },
          activeLocks,
          runningSessions,
          source: 'database',
          dbAvailable: true
        });
      } catch (e) {
        console.error('Error getting DB data:', e.message);
        throw e;
      }
    } else {
      // Fallback to JSON files
      const ticketsData = readJSON('tickets.json') || { tickets: [] };
      const findingsData = readJSON('findings.json') || { findings: [] };
      const decisionsData = readJSON('decisions.json') || { threads: [] };
      const docStatus = readJSON('doc-status.json') || { meta: {}, features: {} };
      const devStatusData = readJSON('dev-status.json') || { in_progress: [], completed: [], merged: [] };

      res.json({
        findings: findingsData,
        decisions: decisionsData,
        tickets: ticketsData,
        summary: { meta: {}, by_priority: {}, by_category: {} },
        devStatus: devStatusData,
        docStatus,
        featuresList,
        agentOutputs,
        staging: {
          count: stagingCount,
          bySeverity: stagingData?.summary || { critical: 0, high: 0, medium: 0, low: 0 }
        },
        activeLocks: [],
        runningSessions: [],
        source: 'json',
        dbAvailable: false
      });
    }
  } catch (e) {
    console.error('Error in /api/v2/data:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/data/decisions - Save decisions
router.post('/decisions', async (req, res) => {
  try {
    const decisions = req.body;
    
    if (db?.decisions && decisions.threads) {
      // Save to DB
      for (const thread of decisions.threads) {
        // Update or create decision thread
        const existing = db.decisions.getByFinding?.(thread.finding_id);
        if (existing) {
          // Update existing
          if (thread.decision) {
            db.decisions.resolve?.(existing.id, thread.decision.option_id, thread.decision.option_label);
          }
        }
      }
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/data/dev-status - Save dev status
router.post('/dev-status', async (req, res) => {
  try {
    // Dev status is derived from DB sessions, so we don't save it directly
    // But we can acknowledge the request
    res.json({ success: true, message: 'Dev status is derived from DB sessions' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
