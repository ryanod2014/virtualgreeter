/**
 * Data API Routes
 * 
 * Provides comprehensive data endpoint matching legacy /api/data structure.
 * This is the main endpoint the dashboard uses to fetch all data.
 */

import { Router } from 'express';
import { join } from 'path';
import { execSync } from 'child_process';
import { existsSync, readdirSync, writeFileSync } from 'fs';
import config from '../../config.mjs';
import { readJSON, scanFeaturesDir, scanAgentOutputsLocal, buildDevStatus } from '../../utils/fileScanner.mjs';
import eventBus from '../../events/eventBus.mjs';

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

/**
 * Check worktrees for QA reports and auto-commit/progress them
 * 
 * This failsafe ensures tickets progress even if the QA agent
 * forgot to commit or signal completion.
 */
function checkWorktreeQAReports() {
  if (!db?.tickets) return { progressed: 0 };
  
  try {
    // Get tickets stuck in qa_pending
    const qaPendingTickets = db.tickets.list?.()?.filter(t => t.status === 'qa_pending') || [];
    let progressed = 0;
    
    const WORKTREE_BASE = join(config.paths.projectRoot, '..', 'agent-worktrees');
    
    for (const ticket of qaPendingTickets) {
      const ticketId = ticket.id;
      const worktreeDir = join(WORKTREE_BASE, ticketId);
      const qaResultsDir = join(worktreeDir, 'docs', 'agent-output', 'qa-results');
      
      try {
        // Check if worktree exists
        if (!existsSync(worktreeDir)) continue;
        
        // Look for QA-PASSED report
        if (existsSync(qaResultsDir)) {
          const files = readdirSync(qaResultsDir);
          const passedReport = files.find(f => 
            f.toUpperCase().includes(ticketId.toUpperCase()) && 
            f.toUpperCase().includes('PASSED') &&
            f.endsWith('.md')
          );
          
          if (passedReport) {
            console.log(`📋 Found uncommitted QA report for ${ticketId}: ${passedReport}`);
            
            // Auto-commit the report
            try {
              const reportPath = join(qaResultsDir, passedReport);
              
              // Get the branch name
              const branch = execSync(`cd "${worktreeDir}" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim();
              
              // Stage and commit
              execSync(`cd "${worktreeDir}" && git add "${reportPath}" 2>/dev/null`, { encoding: 'utf8' });
              execSync(`cd "${worktreeDir}" && git commit -m "qa(${ticketId.toLowerCase()}): QA passed (auto-committed by pipeline)" --allow-empty 2>/dev/null || true`, { encoding: 'utf8' });
              
              // Push to remote
              if (branch && branch !== 'HEAD') {
                execSync(`cd "${worktreeDir}" && git push origin HEAD:${branch} 2>/dev/null || true`, { encoding: 'utf8' });
              }
              
              console.log(`✅ Auto-committed QA report for ${ticketId}`);
            } catch (gitErr) {
              console.log(`⚠️ Could not auto-commit for ${ticketId}: ${gitErr.message}`);
            }
            
            // Update ticket status to qa_passed
            try {
              db.tickets.updateStatus(ticketId, 'qa_passed');
              progressed++;
              console.log(`✅ Progressed ${ticketId} to qa_passed`);
            } catch (dbErr) {
              console.log(`⚠️ Could not update ${ticketId} status: ${dbErr.message}`);
            }
          }
          
          // Also check for FAILED reports
          const failedReport = files.find(f => 
            f.toUpperCase().includes(ticketId.toUpperCase()) && 
            f.toUpperCase().includes('FAILED') &&
            (f.endsWith('.md') || f.endsWith('.json'))
          );
          
          if (failedReport && !passedReport) {
            console.log(`❌ Found QA FAILED report for ${ticketId}: ${failedReport}`);
            try {
              db.tickets.updateStatus(ticketId, 'qa_failed');
              progressed++;
              console.log(`⚠️ Marked ${ticketId} as qa_failed`);
            } catch (dbErr) {
              console.log(`⚠️ Could not update ${ticketId} status: ${dbErr.message}`);
            }
          }
        }
      } catch (ticketErr) {
        // Skip this ticket on error
      }
    }
    
    return { progressed };
  } catch (e) {
    return { progressed: 0, error: e.message };
  }
}

/**
 * Check worktrees for Test/Doc agent completion reports and auto-commit them
 * 
 * For tickets in docs_tests_pending, checks if:
 * - Test agent wrote: docs/agent-output/test-lock/TKT-XXX-*.md
 * - Doc agent wrote: docs/agent-output/doc-tracker/TKT-XXX-*.md
 * 
 * Auto-commits the reports and marks sessions as complete.
 */
function checkWorktreeDocsTestsReports() {
  if (!db?.tickets || !db?.sessions) return { completed: 0 };
  
  try {
    // Get tickets in docs_tests_pending
    const pendingTickets = db.tickets.list?.()?.filter(t => t.status === 'docs_tests_pending') || [];
    let completed = 0;
    
    const WORKTREE_BASE = join(config.paths.projectRoot, '..', 'agent-worktrees');
    
    for (const ticket of pendingTickets) {
      const ticketId = ticket.id;
      const worktreeDir = join(WORKTREE_BASE, ticketId);
      
      if (!existsSync(worktreeDir)) continue;
      
      // Check for test-lock completion report
      const testLockDir = join(worktreeDir, 'docs', 'agent-output', 'test-lock');
      let testReportFound = false;
      
      if (existsSync(testLockDir)) {
        try {
          const files = readdirSync(testLockDir);
          const testReport = files.find(f => 
            f.toUpperCase().includes(ticketId.toUpperCase()) && 
            f.endsWith('.md')
          );
          
          if (testReport) {
            testReportFound = true;
            console.log(`🧪 Found test-lock report for ${ticketId}: ${testReport}`);
            
            // Check if we have an incomplete test_lock session
            const sessions = db.sessions.getByTicket?.(ticketId) || [];
            const testSession = sessions.find(s => 
              s.agent_type === 'test_lock' && s.status !== 'completed'
            );
            
            if (testSession) {
              // Auto-commit
              try {
                execSync(`cd "${worktreeDir}" && git add docs/agent-output/test-lock/ 2>/dev/null || true`, { encoding: 'utf8' });
                execSync(`cd "${worktreeDir}" && git add "*.test.ts" "*.test.tsx" 2>/dev/null || true`, { encoding: 'utf8' });
                execSync(`cd "${worktreeDir}" && git commit -m "test(${ticketId.toLowerCase()}): Add tests (auto-committed by pipeline)" 2>/dev/null || true`, { encoding: 'utf8' });
                
                const branch = execSync(`cd "${worktreeDir}" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim();
                if (branch && branch !== 'HEAD') {
                  execSync(`cd "${worktreeDir}" && git push origin HEAD:${branch} 2>/dev/null || true`, { encoding: 'utf8' });
                }
                console.log(`✅ Auto-committed test files for ${ticketId}`);
              } catch (e) {
                // Ignore git errors
              }
              
              // Mark session complete and emit event to trigger merge check
              try {
                db.sessions.complete(testSession.id, `docs/agent-output/test-lock/${testReport}`);
                completed++;
                console.log(`✅ Marked test_lock session complete for ${ticketId}`);
                
                // Emit event so merge logic can react
                eventBus.emit('agent:session:completed', {
                  ticketId,
                  agentType: 'test_lock',
                  sessionId: testSession.id
                });
              } catch (e) {
                // Ignore
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Check for doc-tracker completion report
      const docTrackerDir = join(worktreeDir, 'docs', 'agent-output', 'doc-tracker');
      let docReportFound = false;
      
      if (existsSync(docTrackerDir)) {
        try {
          const files = readdirSync(docTrackerDir);
          const docReport = files.find(f => 
            f.toUpperCase().includes(ticketId.toUpperCase()) && 
            f.endsWith('.md')
          );
          
          if (docReport) {
            docReportFound = true;
            console.log(`📝 Found doc-tracker report for ${ticketId}: ${docReport}`);
            
            // Check if we have an incomplete doc session
            const sessions = db.sessions.getByTicket?.(ticketId) || [];
            const docSession = sessions.find(s => 
              s.agent_type === 'doc' && s.status !== 'completed'
            );
            
            if (docSession) {
              // Auto-commit
              try {
                execSync(`cd "${worktreeDir}" && git add docs/ 2>/dev/null || true`, { encoding: 'utf8' });
                execSync(`cd "${worktreeDir}" && git commit -m "docs(${ticketId.toLowerCase()}): Update docs (auto-committed by pipeline)" 2>/dev/null || true`, { encoding: 'utf8' });
                
                const branch = execSync(`cd "${worktreeDir}" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo ""`, { encoding: 'utf8' }).trim();
                if (branch && branch !== 'HEAD') {
                  execSync(`cd "${worktreeDir}" && git push origin HEAD:${branch} 2>/dev/null || true`, { encoding: 'utf8' });
                }
                console.log(`✅ Auto-committed doc files for ${ticketId}`);
              } catch (e) {
                // Ignore git errors
              }
              
              // Mark session complete and emit event to trigger merge check
              try {
                db.sessions.complete(docSession.id, `docs/agent-output/doc-tracker/${docReport}`);
                completed++;
                console.log(`✅ Marked doc session complete for ${ticketId}`);
                
                // Emit event so merge logic can react
                eventBus.emit('agent:session:completed', {
                  ticketId,
                  agentType: 'doc',
                  sessionId: docSession.id
                });
              } catch (e) {
                // Ignore
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    }
    
    return { completed };
  } catch (e) {
    return { completed: 0, error: e.message };
  }
}

/**
 * Auto-route blocked/failed tickets to Ticket Agent for continuation
 * 
 * When QA fails, creates a continuation ticket so dev can fix the issues.
 */
function routeBlockedTicketsToTicketAgent() {
  if (!db?.tickets) return { routed: 0 };
  
  try {
    // Get tickets stuck in blocked or qa_failed status
    const blockedTickets = db.tickets.list?.()?.filter(t => 
      t.status === 'blocked' || t.status === 'qa_failed'
    ) || [];
    
    let routed = 0;
    const PROJECT_ROOT = config.paths.projectRoot;
    
    for (const ticket of blockedTickets) {
      const ticketId = ticket.id;
      
      // Check if we've already tried to route this ticket (avoid infinite loops)
      // Look for existing continuation ticket or blocker handling
      const continuationMarker = join(PROJECT_ROOT, 'docs', 'agent-output', 'blocked', `ROUTED-${ticketId}.json`);
      
      if (existsSync(continuationMarker)) {
        continue; // Already routed
      }
      
      console.log(`🔄 Routing blocked ticket ${ticketId} to Ticket Agent...`);
      
      try {
        // Try to create continuation via ticket-agent-cli
        execSync(
          `node scripts/ticket-agent-cli.js continue --ticket ${ticketId}`,
          { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 30000 }
        );
        
        // Mark as routed
        writeFileSync(continuationMarker, JSON.stringify({
          ticket_id: ticketId,
          routed_at: new Date().toISOString(),
          original_status: ticket.status
        }));
        
        routed++;
        console.log(`✅ Created continuation for ${ticketId}`);
      } catch (e) {
        console.log(`⚠️ Could not route ${ticketId}: ${e.message}`);
        
        // Still mark as attempted to avoid retry spam
        try {
          writeFileSync(continuationMarker, JSON.stringify({
            ticket_id: ticketId,
            routed_at: new Date().toISOString(),
            error: e.message
          }));
        } catch (writeErr) {
          // Ignore
        }
      }
    }
    
    return { routed };
  } catch (e) {
    return { routed: 0, error: e.message };
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
    
    // Auto-detect and progress QA reports in worktrees (failsafe)
    const qaResult = checkWorktreeQAReports();
    if (qaResult.progressed > 0) {
      console.log(`📋 Auto-progressed ${qaResult.progressed} ticket(s) from worktree QA reports`);
    }
    
    // Auto-detect and complete Docs/Tests agents from worktree reports (failsafe)
    const docsTestsResult = checkWorktreeDocsTestsReports();
    if (docsTestsResult.completed > 0) {
      console.log(`📋 Auto-completed ${docsTestsResult.completed} docs/test session(s) from worktree reports`);
    }
    
    // Auto-route blocked/failed tickets to Ticket Agent (failsafe)
    const routeResult = routeBlockedTicketsToTicketAgent();
    if (routeResult.routed > 0) {
      console.log(`🔄 Auto-routed ${routeResult.routed} blocked ticket(s) to Ticket Agent`);
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
