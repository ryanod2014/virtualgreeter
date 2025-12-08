#!/usr/bin/env node

/**
 * PM Dashboard Server
 * 
 * Serves the dashboard AND auto-saves decisions to JSON files.
 * Now with SQLite database support via /api/v2/* endpoints!
 * 
 * Usage: node docs/pm-dashboard-ui/server.js
 * Then visit: http://localhost:3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// =============================================================================
// DATABASE MODULE (v2 API)
// =============================================================================
let db = null;
let dbModule = null;

// Try to load the database module (may not be installed yet)
async function loadDBModule() {
  try {
    // Dynamic import for ES module
    const dbPath = path.join(__dirname, '../../scripts/db/db.js');
    if (fs.existsSync(dbPath)) {
      dbModule = await import(`file://${dbPath}`);
      db = dbModule.initDB();
      console.log('✅ Database module loaded');
      return true;
    }
  } catch (e) {
    console.log(`ℹ️ Database module not available: ${e.message}`);
    console.log('   v2 API endpoints will be disabled');
    console.log('   Run: cd scripts/db && npm install && npm run init');
  }
  return false;
}

// Initialize DB on startup (async)
loadDBModule();

// =============================================================================
// BLOCKER FILE WATCHER
// Automatically detects new blocker files and triggers dispatch
// =============================================================================
let blockerWatcherInterval = null;
let lastBlockerCheck = new Map();  // Track file mtimes

function startBlockerWatcher() {
  if (blockerWatcherInterval) return;
  
  console.log('👁️ Blocker watcher started (checking every 30s)');
  
  // Check every 30 seconds
  blockerWatcherInterval = setInterval(scanForNewBlockers, 30000);
  
  // Initial scan after 5 seconds
  setTimeout(scanForNewBlockers, 5000);
}

function scanForNewBlockers() {
  const blockedDir = path.join(__dirname, '../..', 'docs/agent-output/blocked');
  const qaResultsDir = path.join(__dirname, '../..', 'docs/agent-output/qa-results');
  
  // Scan for blockers (QA failures)
  try {
    if (fs.existsSync(blockedDir)) {
      const files = fs.readdirSync(blockedDir).filter(f => f.endsWith('.json'));
      let newBlockers = 0;
      
      for (const file of files) {
        const filePath = path.join(blockedDir, file);
        const stat = fs.statSync(filePath);
        const mtime = stat.mtime.getTime();
        
        // Check if this is a new file we haven't seen
        if (!lastBlockerCheck.has(file) || lastBlockerCheck.get(file) < mtime) {
          lastBlockerCheck.set(file, mtime);
          newBlockers++;
          
          // Parse the blocker to get ticket ID
          try {
            const blocker = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const ticketId = blocker.ticket_id?.toUpperCase();
            
            if (ticketId && dbModule?.tickets) {
              console.log(`🚨 New blocker detected: ${file} for ${ticketId}`);
              
              // Update ticket status to trigger dispatch
              const ticket = dbModule.tickets.get(ticketId);
              if (ticket && !['blocked', 'qa_failed'].includes(ticket.status)) {
                const oldStatus = ticket.status;
                dbModule.tickets.update(ticketId, { status: 'qa_failed' });
                // Trigger status change handler to queue dispatch agent
                handleTicketStatusChange(ticketId, oldStatus, 'qa_failed', ticket);
              }
            }
          } catch (e) {
            console.error(`Error parsing blocker ${file}:`, e.message);
          }
        }
      }
      
      if (newBlockers > 0) {
        console.log(`📋 Found ${newBlockers} new blocker(s), dispatch will be queued`);
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  // Scan for QA PASS reports - trigger merge
  try {
    if (fs.existsSync(qaResultsDir)) {
      const files = fs.readdirSync(qaResultsDir).filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        const filePath = path.join(qaResultsDir, file);
        const stat = fs.statSync(filePath);
        const mtime = stat.mtime.getTime();
        
        // Check if this is a new file we haven't processed
        const cacheKey = `qa-${file}`;
        if (!lastBlockerCheck.has(cacheKey) || lastBlockerCheck.get(cacheKey) < mtime) {
          lastBlockerCheck.set(cacheKey, mtime);
          
          // Check if it's a PASS/APPROVED report
          // STRICT CHECK: filename must contain PASSED AND content must show approval
          try {
            // Only process files with PASSED in filename
            if (!file.includes('PASSED')) continue;
            
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Content must indicate approval AND not indicate failure
            const hasApproval = content.includes('APPROVED') || 
                               content.includes('Status:** APPROVED') ||
                               content.includes('Status: APPROVED') ||
                               content.includes('**Status:** ✅') ||
                               content.includes('PASSED ✅') ||
                               content.includes('- PASSED');
            const hasFailure = content.includes('FAILED') || 
                              content.includes('BLOCKED') ||
                              content.includes('Status:** FAILED') ||
                              content.includes('Status: BLOCKED');
            
            const isApproved = hasApproval && !hasFailure;
            
            // Extract ticket ID from filename (QA-TKT-XXX-*.md or QA-SEC-XXX-*.md)
            const match = file.match(/QA-((?:TKT|SEC)-\d+[a-zA-Z]?)/i);
            if (match && isApproved && dbModule?.tickets) {
              const ticketId = match[1].toUpperCase();
              const ticket = dbModule.tickets.get(ticketId);
              
              // Only merge if ticket is in a state that needs merging
              // Skip terminal states: merged, done, blocked, qa_failed
              const terminalStates = ['merged', 'done', 'blocked', 'qa_failed'];
              const shouldMerge = ticket && 
                                  !terminalStates.includes(ticket.status) && 
                                  ticket.branch;  // Must have a branch to merge
              
              if (shouldMerge) {
                console.log(`✅ QA PASS detected for ${ticketId} - triggering merge`);
                
                // Merge the branch
                const mergeResult = mergeBranchToMain(ticketId, ticket.branch);
                
                if (mergeResult.success) {
                  dbModule.tickets.update(ticketId, { status: 'merged' });
                  
                  // Release any locks held by sessions for this ticket
                  const sessions = dbModule.sessions.list({ ticket_id: ticketId });
                  for (const session of sessions) {
                    dbModule.locks.release(session.id);
                  }
                  console.log(`🎉 ${ticketId} merged to main! (locks released)`);
                } else {
                  console.error(`❌ Merge failed for ${ticketId}: ${mergeResult.error}`);
                }
              }
            }
          } catch (e) {
            console.error(`Error processing QA result ${file}:`, e.message);
          }
        }
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

// Start the blocker watcher when DB is loaded
setTimeout(() => {
  if (dbModule) {
    startBlockerWatcher();
  }
}, 3000);

const PORT = 3456;
const DOCS_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(DOCS_DIR, 'data');

// MIME types
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

// Track last sync time to avoid redundant syncs
let lastTicketsSyncTime = 0;
const SYNC_COOLDOWN_MS = 60000; // Only sync once per minute

// Status progression order - never downgrade a ticket's status
const STATUS_ORDER = ['ready', 'in_progress', 'dev_complete', 'in_review', 'qa_approved', 'finalizing', 'qa_pending', 'blocked', 'qa_failed', 'merged', 'done'];

function getStatusRank(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : -1;
}

// Sync tickets.json to database (ensures DB stays in sync with JSON changes)
function syncTicketsToDb() {
  if (!dbModule) return { synced: 0, created: 0, updated: 0, skipped: 0 };
  
  const now = Date.now();
  if (now - lastTicketsSyncTime < SYNC_COOLDOWN_MS) {
    return { synced: 0, skipped: 'cooldown' };
  }
  lastTicketsSyncTime = now;
  
  try {
    const ticketsData = readJSON('tickets.json');
    if (!ticketsData?.tickets) return { synced: 0, error: 'No tickets in JSON' };
    
    let created = 0, updated = 0, unchanged = 0;
    
    for (const ticket of ticketsData.tickets) {
      try {
        const existing = dbModule.tickets.get(ticket.id);
        
        if (!existing) {
          // Create new ticket in DB
          dbModule.tickets.create(ticket);
          created++;
        } else {
          // Don't downgrade status - only sync if JSON has a more advanced status
          const existingRank = getStatusRank(existing.status);
          const jsonRank = getStatusRank(ticket.status);
          
          if (jsonRank > existingRank) {
            // JSON has more advanced status, update DB
            dbModule.tickets.update(ticket.id, { status: ticket.status });
            updated++;
          } else {
            unchanged++;
          }
        }
      } catch (e) {
        console.error(`Error syncing ticket ${ticket.id}:`, e.message);
      }
    }
    
    if (created > 0 || updated > 0) {
      console.log(`📥 Synced tickets to DB: ${created} created, ${updated} updated, ${unchanged} unchanged`);
    }
    
    return { synced: created + updated, created, updated, unchanged };
  } catch (e) {
    console.error('Error syncing tickets to DB:', e.message);
    return { synced: 0, error: e.message };
  }
}

// =============================================================================
// INBOX SYSTEM
// Routes items to human inbox for review (e.g., UI screenshot review)
// =============================================================================

/**
 * Create an inbox item for human review
 * Used for UI changes that need screenshot approval
 */
function createInboxItem(ticketId, data) {
  const inboxDir = path.join(__dirname, '../agent-output/inbox');
  
  // Ensure inbox directory exists
  if (!fs.existsSync(inboxDir)) {
    fs.mkdirSync(inboxDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `INBOX-${ticketId}-${timestamp}.json`;
  const filepath = path.join(inboxDir, filename);
  
  const inboxItem = {
    id: `INBOX-${ticketId}-${timestamp}`,
    ticket_id: ticketId,
    type: data.type || 'review',
    message: data.message || 'Review required',
    branch: data.branch || null,
    files: data.files || [],
    created_at: new Date().toISOString(),
    status: 'pending'
  };
  
  fs.writeFileSync(filepath, JSON.stringify(inboxItem, null, 2));
  console.log(`📬 Created inbox item: ${filename}`);
  
  // Log event
  if (dbModule?.logEvent) {
    dbModule.logEvent('inbox_item_created', 'system', 'ticket', ticketId, inboxItem);
  }
  
  return inboxItem;
}

// =============================================================================
// JOB QUEUE SYSTEM
// Event-driven automation - no external scripts needed
// =============================================================================

const { spawn } = require('child_process');
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * Handle ticket status changes - queue appropriate jobs
 * THIS IS THE AUTONOMOUS LOOP - each status triggers the next step
 */
function handleTicketStatusChange(ticketId, oldStatus, newStatus, ticket) {
  if (!dbModule?.jobs) {
    console.log('⚠️ Jobs module not available, skipping automation');
    return;
  }
  
  console.log(`📋 Ticket ${ticketId}: ${oldStatus} → ${newStatus}`);
  
  // =========================================================================
  // STEP 1: Dev completed → Queue regression tests
  // =========================================================================
  if (newStatus === 'dev_complete') {
    console.log(`🧪 Queueing regression tests for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'regression_test',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 3,
      payload: { triggered_by: 'dev_complete' }
    });
    startJobWorker();
  }
  
  // =========================================================================
  // STEP 2: Regression passed → Queue QA agent launch
  // =========================================================================
  if (newStatus === 'in_review') {
    console.log(`🔍 Queueing QA agent for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'qa_launch',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 5,
      payload: { triggered_by: 'regression_passed' }
    });
    startJobWorker();
  }
  
  // =========================================================================
  // STEP 3: QA failed OR blocked → Queue dispatch agent
  // =========================================================================
  if (newStatus === 'qa_failed' || newStatus === 'blocked') {
    console.log(`📨 Queueing dispatch agent for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'dispatch',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 4,
      payload: { triggered_by: newStatus }
    });
    startJobWorker();
  }
  
  // =========================================================================
  // STEP 4: Continuation ready → Queue dev agent launch
  // =========================================================================
  if (newStatus === 'continuation_ready') {
    console.log(`🛠️ Queueing dev agent for continuation ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'dev_launch',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 3,
      payload: { triggered_by: 'continuation_created' }
    });
    startJobWorker();
  }
  
  // =========================================================================
  // STEP 5: QA approved → Check for UI changes, route accordingly
  // =========================================================================
  if (newStatus === 'qa_approved') {
    // Check if ticket has UI changes
    const filesToModify = ticket.files_to_modify || [];
    const hasUIChanges = filesToModify.some(f => 
      f.includes('/components/') || 
      f.includes('/app/') || 
      f.endsWith('.tsx') ||
      f.endsWith('.css')
    );
    
    if (hasUIChanges) {
      console.log(`🖼️ UI changes detected for ${ticketId} - routing to inbox for screenshot review`);
      // Create inbox item for human screenshot review
      createInboxItem(ticketId, {
        type: 'ui_review',
        message: 'UI changes detected - please review screenshots',
        branch: ticket.branch,
        files: filesToModify.filter(f => f.endsWith('.tsx') || f.endsWith('.css'))
      });
      // Don't auto-proceed - wait for human approval via inbox
    } else {
      // No UI changes - proceed directly to finalizing
      console.log(`📝 No UI changes for ${ticketId} - proceeding to finalizing`);
      dbModule.tickets.update(ticketId, { status: 'finalizing' });
      // Recursively call to trigger finalizing handler
      handleTicketStatusChange(ticketId, 'qa_approved', 'finalizing', ticket);
    }
  }
  
  // =========================================================================
  // STEP 6: Finalizing → Queue Test Agent + Doc Agent
  // =========================================================================
  if (newStatus === 'finalizing') {
    console.log(`🧪 Queueing Test Agent for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'test_agent',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 2,
      payload: { triggered_by: 'finalizing' }
    });
    
    console.log(`📚 Queueing Doc Agent for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'doc_agent',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 2,
      payload: { triggered_by: 'finalizing' }
    });
    
    startJobWorker();
  }
}

// Job worker state
let jobWorkerRunning = false;
let jobWorkerInterval = null;

/**
 * Start the job worker if not already running
 */
function startJobWorker() {
  if (jobWorkerRunning) return;
  
  jobWorkerRunning = true;
  console.log('🔄 Job worker started');
  
  // Poll for jobs every 2 seconds
  jobWorkerInterval = setInterval(processNextJob, 2000);
  
  // Process first job immediately
  processNextJob();
}

/**
 * Stop the job worker
 */
function stopJobWorker() {
  if (jobWorkerInterval) {
    clearInterval(jobWorkerInterval);
    jobWorkerInterval = null;
  }
  jobWorkerRunning = false;
  console.log('⏹️ Job worker stopped');
}

/**
 * Process the next pending job
 */
async function processNextJob() {
  if (!dbModule?.jobs) return;
  
  const job = dbModule.jobs.getNext();
  if (!job) {
    // No pending jobs, stop the worker
    stopJobWorker();
    return;
  }
  
  // Claim the job
  const claimed = dbModule.jobs.claim(job.id);
  if (!claimed) return;  // Another worker got it
  
  console.log(`⚡ Processing job: ${claimed.job_type} for ${claimed.ticket_id || 'N/A'}`);
  
  try {
    let result;
    
    switch (claimed.job_type) {
      case 'regression_test':
        result = await runRegressionTest(claimed);
        break;
      case 'qa_launch':
        result = await launchQAAgent(claimed);
        break;
      case 'dev_launch':
        result = await launchDevAgent(claimed);
        break;
      case 'dispatch':
        result = await runDispatchAgent(claimed);
        break;
      case 'worktree_cleanup':
        cleanupConflictingWorktrees(claimed.ticket_id, claimed.branch);
        result = { cleaned: true };
        break;
      case 'test_agent':
        result = await launchTestAgent(claimed);
        break;
      case 'doc_agent':
        result = await launchDocAgent(claimed);
        break;
      case 'cleanup_tests':
        result = await runCleanupTests(claimed);
        break;
      case 'cleanup_docs':
        result = await runCleanupDocs(claimed);
        break;
      default:
        throw new Error(`Unknown job type: ${claimed.job_type}`);
    }
    
    dbModule.jobs.complete(claimed.id, result);
    console.log(`✅ Job ${claimed.job_type} completed`);
    
  } catch (error) {
    console.error(`❌ Job ${claimed.job_type} failed:`, error.message);
    const status = dbModule.jobs.fail(claimed.id, error.message);
    if (status === 'pending') {
      console.log(`🔄 Will retry job ${claimed.id}`);
    }
  }
}

/**
 * Run regression tests for a ticket (shell-based, non-AI)
 */
function runRegressionTest(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/run-regression-tests.sh');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error('Regression test script not found'));
      return;
    }
    
    console.log(`🧪 Running regression tests for ${job.ticket_id}...`);
    
    const proc = spawn('bash', [scriptPath, job.ticket_id, job.branch || ''], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, DASHBOARD_URL: `http://localhost:${PORT}` }
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      // Stream output to console
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        // Tests passed → Update ticket status to in_review
        console.log(`✅ Regression tests passed for ${job.ticket_id}`);
        
        if (dbModule?.tickets) {
          const ticket = dbModule.tickets.get(job.ticket_id);
          dbModule.tickets.update(job.ticket_id, { status: 'in_review' });
          // Trigger status change handler to queue QA launch
          handleTicketStatusChange(job.ticket_id, ticket?.status, 'in_review', { ...ticket, branch: job.branch });
        }
        
        resolve({ passed: true, output: stdout.slice(-5000) });
      } else {
        // Tests failed → Update ticket status to blocked
        console.log(`❌ Regression tests failed for ${job.ticket_id}`);
        
        if (dbModule?.tickets) {
          const ticket = dbModule.tickets.get(job.ticket_id);
          dbModule.tickets.update(job.ticket_id, { status: 'blocked' });
          // Trigger status change handler to queue dispatch
          handleTicketStatusChange(job.ticket_id, ticket?.status, 'blocked', { ...ticket, branch: job.branch });
        }
        
        // Create blocker file for dispatch agent
        createRegressionBlocker(job, stdout + stderr);
        
        resolve({ passed: false, output: (stdout + stderr).slice(-5000) });
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create a blocker file for regression failures
 */
function createRegressionBlocker(job, output) {
  const blockerDir = path.join(PROJECT_ROOT, 'docs/agent-output/blocked');
  const blockerPath = path.join(blockerDir, `REGRESSION-${job.ticket_id}-${Date.now()}.json`);
  
  const blocker = {
    ticket_id: job.ticket_id,
    blocker_type: 'regression_failure',
    branch: job.branch,
    blocked_at: new Date().toISOString(),
    summary: 'Regression tests failed - dev broke code outside ticket scope',
    output: output.slice(-10000),
    dispatch_action: 'create_continuation_ticket'
  };
  
  try {
    if (!fs.existsSync(blockerDir)) {
      fs.mkdirSync(blockerDir, { recursive: true });
    }
    fs.writeFileSync(blockerPath, JSON.stringify(blocker, null, 2));
    console.log(`📝 Created blocker: ${blockerPath}`);
  } catch (e) {
    console.error('Failed to create blocker file:', e.message);
  }
}

/**
 * Run dispatch agent to process blockers and create continuation tickets
 */
function runDispatchAgent(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/run-dispatch-agent.sh');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error('Dispatch script not found'));
      return;
    }
    
    console.log(`📨 Running dispatch agent...`);
    
    const proc = spawn('bash', [scriptPath], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      // After dispatch completes, check for new continuation tickets
      // and queue dev_launch for each
      setTimeout(() => checkForNewContinuationTickets(), 5000);
      
      resolve({ 
        completed: code === 0, 
        output: (stdout + stderr).slice(-3000) 
      });
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Check for new continuation tickets and queue dev agents
 */
function checkForNewContinuationTickets() {
  const promptsDir = path.join(PROJECT_ROOT, 'docs/prompts/active');
  
  try {
    const files = fs.readdirSync(promptsDir);
    
    for (const file of files) {
      if (!file.startsWith('dev-agent-') || !file.endsWith('.md')) continue;
      
      // Extract ticket ID (e.g., "dev-agent-TKT-062-v5.md" → "TKT-062")
      const match = file.match(/dev-agent-(TKT-\d+)/i);
      if (!match) continue;
      
      const ticketId = match[1].toUpperCase();
      
      // Check if this ticket already has a dev_launch job pending/running
      if (dbModule?.jobs) {
        const existingJobs = dbModule.jobs.getForTicket(ticketId);
        const hasPending = existingJobs.some(j => 
          j.job_type === 'dev_launch' && 
          (j.status === 'pending' || j.status === 'running')
        );
        
        if (!hasPending) {
          // Check ticket status - only queue if it needs work
          const ticket = dbModule.tickets?.get(ticketId);
          if (ticket && ['ready', 'blocked', 'qa_failed', 'continuation_ready'].includes(ticket.status)) {
            console.log(`📋 Found continuation ticket: ${file}, queueing dev agent`);
            dbModule.jobs.create({
              job_type: 'dev_launch',
              ticket_id: ticketId,
              branch: ticket.branch,
              priority: 3,
              payload: { triggered_by: 'continuation_detected', prompt_file: file }
            });
            startJobWorker();
          }
        }
      }
    }
  } catch (e) {
    console.error('Error checking for continuation tickets:', e.message);
  }
}

/**
 * Merge a branch to main after QA passes
 * Uses code (not AI) to do the merge
 */
function mergeBranchToMain(ticketId, branch) {
  const { execSync } = require('child_process');
  
  if (!branch) {
    console.error(`❌ No branch specified for ${ticketId}`);
    return { success: false, error: 'No branch specified' };
  }
  
  // Merge lock to prevent race conditions when multiple tickets pass QA simultaneously
  if (global.mergeInProgress) {
    console.log(`⏳ Merge already in progress, queueing ${ticketId}...`);
    // Wait up to 60 seconds for the lock to be released
    let waitTime = 0;
    while (global.mergeInProgress && waitTime < 60000) {
      require('child_process').execSync('sleep 2');
      waitTime += 2000;
    }
    if (global.mergeInProgress) {
      console.error(`❌ Merge lock timeout for ${ticketId}`);
      return { success: false, error: 'Merge lock timeout' };
    }
  }
  global.mergeInProgress = ticketId;
  
  try {
    console.log(`🔀 Merging ${branch} to main...`);
    
    // Make sure we're on main and it's up to date
    execSync('git checkout main', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    execSync('git pull origin main', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    
    // Fetch the latest from the branch
    execSync(`git fetch origin ${branch}`, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    
    // Merge the branch (no-ff to keep history clear)
    const commitMsg = `Merge ${branch} - ${ticketId} QA approved`;
    execSync(`git merge origin/${branch} --no-ff -m "${commitMsg}"`, { 
      cwd: PROJECT_ROOT, 
      encoding: 'utf8' 
    });
    
    // Push to origin
    execSync('git push origin main', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    
    console.log(`✅ Successfully merged ${branch} to main and pushed`);
    
    // Clean up the worktree
    cleanupConflictingWorktrees(ticketId, branch);
    
    // Release any file locks held by sessions for this ticket
    if (dbModule?.sessions && dbModule?.locks) {
      const sessions = dbModule.sessions.list({ ticket_id: ticketId });
      for (const session of sessions) {
        dbModule.locks.release(session.id);
      }
      console.log(`🔓 Released file locks for ${ticketId}`);
    }
    
    // Release merge lock
    global.mergeInProgress = null;
    
    return { success: true };
    
  } catch (e) {
    console.error(`❌ Merge failed: ${e.message}`);
    
    // Release merge lock on failure too
    global.mergeInProgress = null;
    
    // Try to recover - abort merge if in progress
    try {
      execSync('git merge --abort', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    } catch (abortError) {
      // Ignore if no merge to abort
    }
    
    // Make sure we're back on main
    try {
      execSync('git checkout main', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    } catch (checkoutError) {
      // Ignore
    }
    
    return { success: false, error: e.message };
  }
}

/**
 * Clean up worktrees that might conflict with a branch
 * Called automatically before dev/QA agent launches
 */
function cleanupConflictingWorktrees(ticketId, branch) {
  const { execSync } = require('child_process');
  
  try {
    // Get list of worktrees
    const output = execSync('git worktree list --porcelain', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    
    // Parse worktrees and find conflicts
    const lines = output.split('\n');
    let currentWorktree = null;
    
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentWorktree = line.replace('worktree ', '');
      } else if (line.startsWith('branch ') && currentWorktree) {
        const worktreeBranch = line.replace('branch refs/heads/', '');
        
        // If this worktree uses the same branch and isn't the main repo
        if (branch && worktreeBranch === branch && !currentWorktree.endsWith('Digital_greeter')) {
          console.log(`🧹 Removing conflicting worktree: ${currentWorktree}`);
          try {
            execSync(`git worktree remove "${currentWorktree}" --force`, {
              cwd: PROJECT_ROOT,
              encoding: 'utf8'
            });
            console.log(`✅ Removed: ${currentWorktree}`);
          } catch (e) {
            // Try rm -rf as fallback
            execSync(`rm -rf "${currentWorktree}"`, { encoding: 'utf8' });
            execSync('git worktree prune', { cwd: PROJECT_ROOT, encoding: 'utf8' });
            console.log(`✅ Force removed: ${currentWorktree}`);
          }
        }
        currentWorktree = null;
      }
    }
    
    // Also clean up any worktrees for this ticket ID (qa-TKT-*, TKT-*)
    const ticketPattern = ticketId.toUpperCase();
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        const wtPath = line.replace('worktree ', '');
        const wtName = path.basename(wtPath);
        
        // Remove qa-TKT-XXX worktrees for this ticket (old QA runs)
        if (wtName.toUpperCase().includes(ticketPattern) && wtName.startsWith('qa-')) {
          console.log(`🧹 Removing old QA worktree: ${wtPath}`);
          try {
            execSync(`git worktree remove "${wtPath}" --force`, {
              cwd: PROJECT_ROOT,
              encoding: 'utf8'
            });
          } catch (e) {
            execSync(`rm -rf "${wtPath}"`, { encoding: 'utf8' });
          }
        }
      }
    }
    
    // Final prune
    execSync('git worktree prune', { cwd: PROJECT_ROOT, encoding: 'utf8' });
    
  } catch (e) {
    console.error('Worktree cleanup error:', e.message);
  }
}

/**
 * Launch Dev agent for a ticket (for continuation tickets)
 */
function launchDevAgent(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-agents.sh');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error('Dev launch script not found'));
      return;
    }
    
    // Clean up conflicting worktrees FIRST
    console.log(`🧹 Cleaning up conflicting worktrees for ${job.ticket_id}...`);
    cleanupConflictingWorktrees(job.ticket_id, job.branch);
    
    console.log(`🛠️ Launching Dev agent for ${job.ticket_id}...`);
    
    const proc = spawn('bash', [scriptPath, job.ticket_id], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ launched: true, output: stdout.slice(-2000) });
      } else {
        resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Launch QA agent for a ticket (starts tmux session)
 */
function launchQAAgent(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-qa-agents.sh');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error('QA launch script not found'));
      return;
    }
    
    // Clean up conflicting worktrees FIRST
    console.log(`🧹 Cleaning up conflicting worktrees for ${job.ticket_id}...`);
    cleanupConflictingWorktrees(job.ticket_id, job.branch);
    
    console.log(`🔍 Launching QA agent for ${job.ticket_id}...`);
    
    const proc = spawn('bash', [scriptPath, job.ticket_id], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ launched: true, output: stdout.slice(-2000) });
      } else {
        // Don't reject - QA launch failures shouldn't break the job queue
        // The script already handles creating blockers if needed
        resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Launch Test agent for a ticket (runs in finalizing stage)
 * Adds/updates unit tests for new functionality
 */
function launchTestAgent(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-test-agent.sh');
    
    // If script doesn't exist yet, create a basic one or skip gracefully
    if (!fs.existsSync(scriptPath)) {
      console.log(`⚠️ Test agent script not found, creating placeholder job result`);
      // For now, mark as completed - human can add the script later
      setTimeout(() => {
        handleTestDocAgentCompletion(job, 'test_agent', true);
        resolve({ launched: true, note: 'Script not found - placeholder completion' });
      }, 1000);
      return;
    }
    
    // Clean up conflicting worktrees FIRST
    console.log(`🧹 Cleaning up conflicting worktrees for ${job.ticket_id}...`);
    cleanupConflictingWorktrees(job.ticket_id, job.branch);
    
    console.log(`🧪 Launching Test agent for ${job.ticket_id}...`);
    
    const proc = spawn('bash', [scriptPath, job.ticket_id], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      const success = code === 0;
      handleTestDocAgentCompletion(job, 'test_agent', success);
      
      if (success) {
        resolve({ launched: true, output: stdout.slice(-2000) });
      } else {
        resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Launch Doc agent for a ticket (runs in finalizing stage)
 * Updates documentation for changes
 */
function launchDocAgent(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-doc-agent.sh');
    
    // If script doesn't exist yet, create a basic one or skip gracefully
    if (!fs.existsSync(scriptPath)) {
      console.log(`⚠️ Doc agent script not found, creating placeholder job result`);
      // For now, mark as completed - human can add the script later
      setTimeout(() => {
        handleTestDocAgentCompletion(job, 'doc_agent', true);
        resolve({ launched: true, note: 'Script not found - placeholder completion' });
      }, 1000);
      return;
    }
    
    // Clean up conflicting worktrees FIRST
    console.log(`🧹 Cleaning up conflicting worktrees for ${job.ticket_id}...`);
    cleanupConflictingWorktrees(job.ticket_id, job.branch);
    
    console.log(`📚 Launching Doc agent for ${job.ticket_id}...`);
    
    const proc = spawn('bash', [scriptPath, job.ticket_id], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      const success = code === 0;
      handleTestDocAgentCompletion(job, 'doc_agent', success);
      
      if (success) {
        resolve({ launched: true, output: stdout.slice(-2000) });
      } else {
        resolve({ launched: false, output: (stdout + stderr).slice(-2000) });
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Handle completion of test_agent or doc_agent
 * When BOTH are done, merge to main
 */
function handleTestDocAgentCompletion(job, agentType, success) {
  if (!dbModule?.jobs || !dbModule?.tickets) return;
  
  const ticketId = job.ticket_id;
  console.log(`📋 ${agentType} completed for ${ticketId} (success: ${success})`);
  
  // Get all jobs for this ticket
  const ticketJobs = dbModule.jobs.getForTicket(ticketId);
  
  // Check if both test_agent and doc_agent are completed
  const testJob = ticketJobs.find(j => j.job_type === 'test_agent' && j.status === 'completed');
  const docJob = ticketJobs.find(j => j.job_type === 'doc_agent' && j.status === 'completed');
  
  // Also check for current job if it just completed
  const testDone = testJob || (agentType === 'test_agent' && success);
  const docDone = docJob || (agentType === 'doc_agent' && success);
  
  console.log(`📊 ${ticketId} status: test_done=${testDone}, doc_done=${docDone}`);
  
  if (testDone && docDone) {
    console.log(`✅ Both Test and Doc agents completed for ${ticketId} - proceeding to merge!`);
    
    const ticket = dbModule.tickets.get(ticketId);
    if (!ticket) {
      console.error(`❌ Ticket ${ticketId} not found`);
      return;
    }
    
    // Merge the branch
    const mergeResult = mergeBranchToMain(ticketId, ticket.branch);
    
    if (mergeResult.success) {
      dbModule.tickets.update(ticketId, { status: 'merged' });
      console.log(`🎉 ${ticketId} merged to main after finalizing!`);
    } else {
      console.error(`❌ Merge failed for ${ticketId}: ${mergeResult.error}`);
      // Update status to indicate merge failure
      dbModule.tickets.update(ticketId, { status: 'blocked' });
    }
  }
}

/**
 * Run cleanup tests for an already-merged ticket
 * Works on main branch, records completion separately
 */
async function runCleanupTests(job) {
  const ticketId = job.ticket_id;
  console.log(`🧹 Running cleanup tests for ${ticketId} (on main branch)...`);
  
  // Get ticket info
  const ticket = dbModule?.tickets?.get(ticketId);
  if (!ticket) {
    console.log(`⚠️ Ticket ${ticketId} not found, skipping cleanup`);
    return { skipped: true, reason: 'ticket_not_found' };
  }
  
  // For cleanup, we run TEST_LOCK agent on the files that were modified
  const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-cleanup-tests.sh');
  
  if (!fs.existsSync(scriptPath)) {
    // Script doesn't exist yet - mark as needing manual cleanup
    console.log(`⚠️ Cleanup tests script not found for ${ticketId}`);
    console.log(`   Files to test: ${(ticket.files_to_modify || []).join(', ')}`);
    
    // Record that this needs manual attention
    const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
    if (!fs.existsSync(cleanupDir)) {
      fs.mkdirSync(cleanupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const record = {
      ticket_id: ticketId,
      type: 'tests',
      status: 'needs_manual',
      files_to_modify: ticket.files_to_modify || [],
      created_at: new Date().toISOString(),
      notes: 'Cleanup script not found - needs manual test coverage'
    };
    
    fs.writeFileSync(
      path.join(cleanupDir, `TESTS-PENDING-${ticketId}-${timestamp}.json`),
      JSON.stringify(record, null, 2)
    );
    
    return { needs_manual: true, files: ticket.files_to_modify };
  }
  
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [scriptPath, ticketId], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      // Record completion
      const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
      if (!fs.existsSync(cleanupDir)) {
        fs.mkdirSync(cleanupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const record = {
        ticket_id: ticketId,
        type: 'tests',
        completed_at: new Date().toISOString(),
        success: code === 0,
        output: (stdout + stderr).slice(-2000)
      };
      
      fs.writeFileSync(
        path.join(cleanupDir, `TESTS-${ticketId}-${timestamp}.json`),
        JSON.stringify(record, null, 2)
      );
      
      resolve({ completed: true, success: code === 0 });
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Run cleanup docs for an already-merged ticket
 * Works on main branch, records completion separately
 */
async function runCleanupDocs(job) {
  const ticketId = job.ticket_id;
  console.log(`🧹 Running cleanup docs for ${ticketId} (on main branch)...`);
  
  // Get ticket info
  const ticket = dbModule?.tickets?.get(ticketId);
  if (!ticket) {
    console.log(`⚠️ Ticket ${ticketId} not found, skipping cleanup`);
    return { skipped: true, reason: 'ticket_not_found' };
  }
  
  const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-cleanup-docs.sh');
  
  if (!fs.existsSync(scriptPath)) {
    // Script doesn't exist yet - mark as needing manual cleanup
    console.log(`⚠️ Cleanup docs script not found for ${ticketId}`);
    console.log(`   Feature docs to update: ${(ticket.feature_docs || []).join(', ')}`);
    
    // Record that this needs manual attention
    const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
    if (!fs.existsSync(cleanupDir)) {
      fs.mkdirSync(cleanupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const record = {
      ticket_id: ticketId,
      type: 'docs',
      status: 'needs_manual',
      feature_docs: ticket.feature_docs || [],
      files_modified: ticket.files_to_modify || [],
      created_at: new Date().toISOString(),
      notes: 'Cleanup script not found - needs manual doc update'
    };
    
    fs.writeFileSync(
      path.join(cleanupDir, `DOCS-PENDING-${ticketId}-${timestamp}.json`),
      JSON.stringify(record, null, 2)
    );
    
    return { needs_manual: true, feature_docs: ticket.feature_docs };
  }
  
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [scriptPath, ticketId], {
      cwd: PROJECT_ROOT,
      env: process.env
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      // Record completion
      const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
      if (!fs.existsSync(cleanupDir)) {
        fs.mkdirSync(cleanupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const record = {
        ticket_id: ticketId,
        type: 'docs',
        completed_at: new Date().toISOString(),
        success: code === 0,
        output: (stdout + stderr).slice(-2000)
      };
      
      fs.writeFileSync(
        path.join(cleanupDir, `DOCS-${ticketId}-${timestamp}.json`),
        JSON.stringify(record, null, 2)
      );
      
      resolve({ completed: true, success: code === 0 });
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

// Read JSON file safely
function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
    return null;
  }
}

// Write JSON file
function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Saved ${filename}`);
}

// Scan features directory recursively
function scanFeaturesDir(dir, basePath = '') {
  const features = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recurse into subdirectory
      features.push(...scanFeaturesDir(fullPath, basePath ? `${basePath}/${item}` : item));
    } else if (item.endsWith('.md') && item !== 'README.md') {
      // It's a markdown file
      const relativePath = basePath ? `${basePath}/${item}` : item;
      const name = item.replace('.md', '').split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      const category = basePath || 'general';
      
      features.push({
        name,
        category,
        docPath: `docs/features/${relativePath}`,
        fileName: item
      });
    }
  }
  
  return features;
}

const { execSync } = require('child_process');

// Helper: Run git command and return output
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { 
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (e) {
    return '';
  }
}

// Helper: List files in a git tree path
function gitListFiles(ref, dirPath) {
  const output = git(`ls-tree --name-only ${ref} ${dirPath}/`);
  if (!output) return [];
  return output.split('\n').filter(f => f && !f.endsWith('.gitkeep'));
}

// Helper: Read file content from git tree
function gitReadFile(ref, filePath) {
  return git(`show ${ref}:${filePath}`);
}

// Cache for agent outputs (avoid re-scanning git on every request)
let agentOutputsCache = null;
let agentOutputsCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

// Scan agent-output directories from GIT (not filesystem)
// This prevents branch switching from affecting dashboard accuracy
// Reads from: origin/main + all origin/agent/* branches
function scanAgentOutputs(skipFetch = false) {
  // Return cached results if fresh enough
  const now = Date.now();
  if (agentOutputsCache && (now - agentOutputsCacheTime) < CACHE_TTL_MS) {
    return agentOutputsCache;
  }

  const outputs = {
    reviews: [],
    completions: [],
    blocked: [],
    docTracker: [],
    started: [],
    findings: [],
    testLock: []
  };
  
  const subdirs = {
    'reviews': 'reviews',
    'completions': 'completions',
    'blocked': 'blocked',
    'doc-tracker': 'docTracker',
    'started': 'started',
    'findings': 'findings',
    'test-lock': 'testLock'
  };
  
  // Skip fetch by default - it's slow and usually not needed
  // Only fetch when explicitly requested via ?refresh=true
  if (!skipFetch) {
    // git('fetch origin --prune'); // DISABLED - too slow for every request
  }
  
  // Get all branches to scan: origin/main + all agent branches
  const agentBranchesRaw = git('branch -r --list "origin/agent/*"');
  const agentBranches = agentBranchesRaw
    ? agentBranchesRaw.split('\n').map(b => b.trim()).filter(b => b)
    : [];
  
  const branchesToScan = ['origin/main', ...agentBranches];
  
  // Track seen files to avoid duplicates (prefer main, then by branch name)
  const seenFiles = new Map();
  
  for (const branch of branchesToScan) {
    for (const [dirName, outputKey] of Object.entries(subdirs)) {
      const gitPath = `docs/agent-output/${dirName}`;
    
    try {
        const files = gitListFiles(branch, gitPath);
        
        for (const filePath of files) {
          const file = path.basename(filePath);
          if (!file.endsWith('.md') && !file.endsWith('.json')) continue;
          if (file === 'README.md') continue;
      
          // Skip if we already have this file from a higher-priority branch
          const fileKey = `${dirName}/${file}`;
          if (seenFiles.has(fileKey)) continue;
          
          const content = gitReadFile(branch, filePath);
          if (!content) continue;
          
          // Extract ticket ID from filename (include letter suffixes like TKT-004C)
          const ticketMatch = file.match(/([A-Z]+-\d+[a-zA-Z]?)/i);
          const ticketId = ticketMatch 
            ? ticketMatch[1].toUpperCase() 
            : file.replace(/-\d{4}-\d{2}-\d{2}T\d+\.(md|json)$/, '').replace(/\.(md|json)$/, '');
          
          // Parse branch from completion file content
          let fileBranch = branch.replace('origin/', '');
          if (dirName === 'completions') {
            const branchMatch = content.match(/\*\*Branch:\*\*\s*`?([^`\n]+)`?/);
            if (branchMatch) fileBranch = branchMatch[1].trim();
          }
          
          const entry = {
            fileName: file,
            filePath: `docs/agent-output/${dirName}/${file}`,
            content: content,
            modifiedAt: new Date().toISOString(),
            ticketId: ticketId,
            branch: fileBranch,
            sourceBranch: branch,
            id: file.replace(/-\d{4}-\d{2}-\d{2}T\d+\.(md|json)$/, '').replace(/\.(md|json)$/, '')
          };
          
          seenFiles.set(fileKey, entry);
          outputs[outputKey].push(entry);
        }
      } catch (e) {
        // Directory doesn't exist on this branch, skip
      }
    }
  }
  
  // Deduplicate blocked entries by ticket ID (keep most recent per ticket)
  const blockedByTicket = new Map();
  for (const entry of outputs.blocked) {
    const existing = blockedByTicket.get(entry.ticketId);
    if (!existing || entry.modifiedAt > existing.modifiedAt) {
      blockedByTicket.set(entry.ticketId, entry);
    }
  }
  outputs.blocked = Array.from(blockedByTicket.values());
  
  // Sort each output by ticketId for consistent ordering
  for (const key of Object.keys(outputs)) {
    outputs[key].sort((a, b) => a.ticketId.localeCompare(b.ticketId));
  }
  
  console.log(`📊 Scanned ${branchesToScan.length} branches: ${outputs.completions.length} completions, ${outputs.started.length} started, ${outputs.blocked.length} blocked (unique tickets)`);
  
  // Cache results
  agentOutputsCache = outputs;
  agentOutputsCacheTime = Date.now();
  
  return outputs;
}

// Scan agent-output directories from LOCAL FILESYSTEM only (not git branches)
// Used when DB is source of truth - we only need artifacts (QA results, test-lock, etc.)
// This is much faster and avoids stale data from old git branches
function scanAgentOutputsLocal() {
  const AGENT_OUTPUT_DIR = path.join(DOCS_DIR, 'agent-output');
  
  const outputs = {
    reviews: [],
    completions: [],
    blocked: [],
    docTracker: [],
    started: [],
    findings: [],
    testLock: [],
    qaResults: []
  };
  
  const subdirs = {
    'reviews': 'reviews',
    'completions': 'completions',
    'blocked': 'blocked',
    'doc-tracker': 'docTracker',
    'started': 'started',
    'findings': 'findings',
    'test-lock': 'testLock',
    'qa-results': 'qaResults'
  };
  
  for (const [dirName, outputKey] of Object.entries(subdirs)) {
    const dirPath = path.join(AGENT_OUTPUT_DIR, dirName);
    
    if (!fs.existsSync(dirPath)) continue;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        if (!file.endsWith('.md') && !file.endsWith('.json')) continue;
        if (file === 'README.md' || file === '.gitkeep') continue;
        
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        // Extract ticket ID from filename
        const ticketMatch = file.match(/([A-Z]+-\d+[a-zA-Z]?)/i);
        const ticketId = ticketMatch 
          ? ticketMatch[1].toUpperCase() 
          : file.replace(/-\d{4}-\d{2}-\d{2}T\d+\.(md|json)$/, '').replace(/\.(md|json)$/, '');
        
        let content = '';
        try {
          content = fs.readFileSync(filePath, 'utf8');
        } catch (e) {
          // Skip unreadable files
          continue;
        }
        
        const entry = {
          fileName: file,
          filePath: `docs/agent-output/${dirName}/${file}`,
          content: content,
          modifiedAt: stat.mtime.toISOString(),
          ticketId: ticketId,
          branch: 'main',
          sourceBranch: 'local',
          id: file.replace(/-\d{4}-\d{2}-\d{2}T\d+\.(md|json)$/, '').replace(/\.(md|json)$/, '')
        };
        
        outputs[outputKey].push(entry);
      }
    } catch (e) {
      // Directory doesn't exist or can't be read, skip
    }
  }
  
  // Sort by ticketId for consistent ordering
  for (const key of Object.keys(outputs)) {
    outputs[key].sort((a, b) => a.ticketId.localeCompare(b.ticketId));
  }
  
  console.log(`📂 Scanned local files: ${outputs.completions.length} completions, ${outputs.started.length} started, ${outputs.blocked.length} blocked, ${outputs.qaResults.length} QA results`);
  
  return outputs;
}

// Build devStatus from actual agent output files (source of truth)
// This prevents race conditions where agents update dev-status.json on their branch
function buildDevStatusFromOutputs(agentOutputs) {
  const completed = [];
  const inProgress = [];
  
  // Build completed list from completion files
  for (const completion of agentOutputs.completions) {
    completed.push({
      ticket_id: completion.ticketId,
      branch: completion.branch || `agent/${completion.ticketId.toLowerCase()}`,
      completed_at: completion.modifiedAt,
      completion_file: completion.filePath
    });
  }
  
  // Build in_progress from started files (that don't have a matching completion)
  const completedIds = new Set(completed.map(c => c.ticket_id));
  for (const started of agentOutputs.started) {
    if (!completedIds.has(started.ticketId)) {
      // Try to parse JSON content for more details
      let startedData = {};
      try {
        startedData = JSON.parse(started.content);
      } catch (e) {
        // Not JSON, use filename info
      }
      
      inProgress.push({
        ticket_id: started.ticketId,
        branch: startedData.branch || `agent/${started.ticketId.toLowerCase()}`,
        started_at: startedData.started_at || started.modifiedAt
      });
    }
  }
  
  // Build merged array from QA results (scan for PASSED reports)
  const merged = [];
  const qaResultsDir = path.join(__dirname, '../agent-output/qa-results');
  if (fs.existsSync(qaResultsDir)) {
    try {
      const seenTickets = new Set();
      const qaFiles = fs.readdirSync(qaResultsDir).filter(f => 
        f.endsWith('.md') && (f.includes('PASSED') || f.includes('passed'))
      );
      for (const file of qaFiles) {
        // Include letter suffixes (TKT-004C, TKT-005E, etc.)
        const match = file.match(/(TKT-\d+[a-zA-Z]?|SEC-\d+[a-zA-Z]?)/i);
        if (match && !seenTickets.has(match[1].toUpperCase())) {
          const ticketId = match[1].toUpperCase();
          seenTickets.add(ticketId);
          const filePath = path.join(qaResultsDir, file);
          const stat = fs.statSync(filePath);
          
          // Read and parse QA report content
          let reportContent = '';
          let reportSummary = '';
          let testResults = [];
          let acceptanceCriteria = [];
          try {
            reportContent = fs.readFileSync(filePath, 'utf8');
            
            // Extract summary
            const summaryMatch = reportContent.match(/## Summary\s*\n+([\s\S]*?)(?=\n##|\n\*\*|$)/i);
            if (summaryMatch) {
              reportSummary = summaryMatch[1].trim().split('\n')[0].slice(0, 200);
            }
            
            // Extract test results (supports both list and table formats)
            const testsSection = reportContent.match(/## (?:Tests?(?:\s+\w+)?|Build Verification)\s*\n+([\s\S]*?)(?=\n##|$)/i);
            if (testsSection) {
              const lines = testsSection[1].split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('-') && (trimmed.includes('✅') || trimmed.includes('❌') || trimmed.includes('⚠️'))) {
                  testResults.push(trimmed);
                } else if (trimmed.startsWith('|') && (trimmed.includes('✅') || trimmed.includes('❌') || trimmed.includes('PASS') || trimmed.includes('FAIL'))) {
                  const parts = trimmed.split('|').filter(p => p.trim());
                  if (parts.length >= 2) {
                    const check = parts[0].trim();
                    const status = parts[1].trim();
                    if (status.includes('✅') || status.includes('PASS')) {
                      testResults.push(`✅ ${check}`);
                    } else if (status.includes('❌') || status.includes('FAIL')) {
                      testResults.push(`❌ ${check}`);
                    } else if (status.includes('⚠️')) {
                      testResults.push(`⚠️ ${check}`);
                    }
                  }
                }
                if (testResults.length >= 5) break;
              }
            }
            
            // Extract acceptance criteria
            const acSection = reportContent.match(/## Acceptance Criteria\s*\n+([\s\S]*?)(?=\n##|$)/i);
            if (acSection) {
              const lines = acSection[1].split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('-') && (trimmed.includes('✅') || trimmed.includes('❌'))) {
                  acceptanceCriteria.push(trimmed);
                } else if (trimmed.startsWith('|') && (trimmed.includes('✅') || trimmed.includes('❌'))) {
                  const parts = trimmed.split('|').filter(p => p.trim());
                  if (parts.length >= 3) {
                    const criterion = parts[1].trim().slice(0, 60);
                    const status = parts[2].trim();
                    if (status.includes('✅') || status.includes('VERIFIED')) {
                      acceptanceCriteria.push(`✅ ${criterion}${criterion.length >= 60 ? '...' : ''}`);
                    } else if (status.includes('❌')) {
                      acceptanceCriteria.push(`❌ ${criterion}${criterion.length >= 60 ? '...' : ''}`);
                    }
                  }
                }
                if (acceptanceCriteria.length >= 5) break;
              }
            }
          } catch (e) {
            // Ignore read errors
          }
          
          merged.push({
            ticket_id: ticketId,
            branch: `agent/${ticketId.toLowerCase()}`,
            merged_at: stat.mtime.toISOString(),
            qa_report: `docs/agent-output/qa-results/${file}`,
            report_summary: reportSummary,
            test_results: testResults,
            acceptance_criteria: acceptanceCriteria
          });
        }
      }
    } catch (e) {
      console.error('Error scanning QA results:', e.message);
    }
  }
  
  // Exclude merged tickets from completed
  const mergedIds = new Set(merged.map(m => m.ticket_id.toUpperCase()));
  const filteredCompleted = completed.filter(c => !c.ticket_id || !mergedIds.has(c.ticket_id.toUpperCase()));
  
  return {
    meta: {
      last_updated: new Date().toISOString(),
      version: "2.2",
      note: "Built from agent-output files (source of truth)"
    },
    in_progress: inProgress,
    completed: filteredCompleted,
    merged: merged,
    retry_history: []
  };
}

// Generate dev agent prompt from ticket data
function generatePromptContent(ticket) {
  const id = ticket.id;
  const title = ticket.title || 'Untitled';
  const priority = (ticket.priority || 'medium').charAt(0).toUpperCase() + (ticket.priority || 'medium').slice(1);
  const difficulty = (ticket.difficulty || 'medium').charAt(0).toUpperCase() + (ticket.difficulty || 'medium').slice(1);
  const issue = ticket.issue || 'No issue description provided.';
  const branchSuffix = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30).replace(/-$/, '');
  
  const files = ticket.files_to_modify || ticket.files || [];
  const filesTable = files.length > 0 
    ? files.map(f => `| \`${f}\` | Implement required changes |`).join('\n')
    : '| (see ticket for files) | |';
  
  const featureDocs = ticket.feature_docs || [];
  const featureDocsSection = featureDocs.length > 0
    ? `\n**Feature Documentation:**\n${featureDocs.map(d => `- \`${d}\``).join('\n')}\n`
    : '';
  
  const similarCode = ticket.similar_code || [];
  const similarCodeSection = similarCode.length > 0
    ? `\n**Similar Code:**\n${similarCode.map(c => `- ${c}`).join('\n')}\n`
    : '';
  
  const fixRequired = ticket.fix_required || [];
  const fixRequiredList = fixRequired.length > 0
    ? fixRequired.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : '(See ticket for implementation details)';
  
  const criteria = ticket.acceptance_criteria || [];
  const acceptanceCriteriaList = criteria.length > 0
    ? criteria.map(c => `- [ ] ${c}`).join('\n')
    : '- [ ] (See ticket for acceptance criteria)';
  
  const outOfScope = ticket.out_of_scope || [];
  const outOfScopeList = outOfScope.length > 0
    ? outOfScope.map(o => `- ❌ ${o}`).join('\n')
    : '- (No explicit out-of-scope items listed)';
  
  const risks = ticket.risks || ticket.risk_notes || [];
  const risksSection = risks.length > 0
    ? '| Risk | How to Avoid |\n|------|--------------|' + risks.map(r => `\n| ${r} | Follow existing patterns |`).join('')
    : '| Risk | How to Avoid |\n|------|--------------|\n| (Low risk) | Follow existing patterns |';
  
  const qaNotes = ticket.qa_notes || '';
  const qaNotesSection = qaNotes ? `\n## QA Notes\n\n${qaNotes}\n\n---\n` : '';

  return `# Dev Agent: ${id} - ${title}

> **One-liner to launch:**
> \`You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-${id}-v1.md\`

---

You are a Dev Agent. Your job is to implement **${id}: ${title}**.

**First, read the Dev Agent SOP:** \`docs/workflow/DEV_AGENT_SOP.md\`

---

## Your Assignment

**Ticket:** ${id}
**Priority:** ${priority}
**Difficulty:** ${difficulty}
**Branch:** \`agent/${id.toLowerCase()}-${branchSuffix}\`
**Version:** v1

---

## The Problem

${issue}

---

## Files to Modify

| File | What to Change |
|------|----------------|
${filesTable}
${featureDocsSection}${similarCodeSection}
---

## What to Implement

${fixRequiredList}

---

## Acceptance Criteria

${acceptanceCriteriaList}

---

## Out of Scope

${outOfScopeList}

---

## Risks to Avoid

${risksSection}

---

## Dev Checks

\`\`\`bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
\`\`\`

---
${qaNotesSection}
## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to \`docs/agent-output/started/${id}-[TIMESTAMP].json\`
- **Complete:** Write to \`docs/agent-output/completions/${id}-[TIMESTAMP].md\`
- **Update:** Add to \`docs/data/dev-status.json\` completed array
- **Blocked:** Write to \`docs/agent-output/blocked/BLOCKED-${id}-[TIMESTAMP].json\`
- **Findings:** Write to \`docs/agent-output/findings/F-DEV-${id}-[TIMESTAMP].json\`

See \`docs/workflow/DEV_AGENT_SOP.md\` for exact formats.
`;
}

// Generate missing dev prompts from tickets
function generateMissingPrompts() {
  const PROMPTS_DIR = path.join(DOCS_DIR, 'prompts', 'active');
  const tickets = readJSON('tickets.json');
  if (!tickets) return { created: 0, existing: 0 };
  
  // Get existing prompts
  const existing = new Set();
  try {
    const files = fs.readdirSync(PROMPTS_DIR);
    for (const f of files) {
      if (f.startsWith('dev-agent-') && f.endsWith('.md')) {
        const parts = f.replace('dev-agent-', '').replace('.md', '').split('-v');
        if (parts[0]) existing.add(parts[0]);
      }
    }
  } catch (e) {
    console.error('Error reading prompts dir:', e.message);
  }
  
  // Generate missing
  let created = 0;
  const ready = (tickets.tickets || []).filter(t => t.status === 'ready');
  
  for (const ticket of ready) {
    if (!existing.has(ticket.id)) {
      const promptPath = path.join(PROMPTS_DIR, `dev-agent-${ticket.id}-v1.md`);
      const content = generatePromptContent(ticket);
      try {
        fs.writeFileSync(promptPath, content);
        console.log(`✅ Generated prompt: dev-agent-${ticket.id}-v1.md`);
        created++;
    } catch (e) {
        console.error(`Error writing prompt for ${ticket.id}:`, e.message);
      }
    }
  }
  
  return { created, existing: existing.size, total: ready.length };
}

// Handle API requests
function handleAPI(req, res, body) {
  const url = req.url;
  
  // GET /api/data - Load all data files (also generates missing prompts)
  // DB is now the source of truth for tickets and sessions when available
  if (req.method === 'GET' && url.startsWith('/api/data')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const forceJson = params.get('source') === 'json';
    
    // Auto-generate missing prompts on data load
    const promptStats = generateMissingPrompts();
    if (promptStats.created > 0) {
      console.log(`📝 Generated ${promptStats.created} new prompts`);
    }
    
    // Sync tickets.json to DB (keeps DB in sync during migration)
    if (dbModule && !forceJson) {
      syncTicketsToDb();
    }
    
    // Scan features directory
    const featuresDir = path.join(DOCS_DIR, 'features');
    let featuresList = [];
    try {
      featuresList = scanFeaturesDir(featuresDir);
      
      // If DB is available, merge in feature status from DB
      if (dbModule) {
        const dbFeatures = dbModule.features?.list?.() || [];
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
    
    // Scan agent-output directories for artifacts (QA results, test-lock, etc.)
    // These are still file-based as they are artifacts, not state
    let agentOutputs = { reviews: [], completions: [], blocked: [], docTracker: [], started: [], findings: [], testLock: [] };
    try {
      // Only scan local files, not git branches (DB is source of truth for state)
      agentOutputs = scanAgentOutputsLocal();
    } catch (e) {
      console.error('Error scanning agent outputs:', e.message);
      // Fallback to empty if local scan fails
    }
    
    // Read staging data for Cleanup Agent UI
    const stagingData = readJSON('findings-staging.json');
    const stagingCount = stagingData?.findings?.length || 0;
    
    // DB is the source of truth for tickets and sessions when available
    if (dbModule && !forceJson) {
      try {
        // Get tickets from DB (authoritative)
        const dbTickets = dbModule.tickets.list();
        
        // Get running sessions from DB
        const runningSessions = dbModule.sessions.getRunning();
        const stalledSessions = dbModule.sessions.getStalled();
        
        // Build devStatus from agent output files (for completed/blocked artifacts)
        // Then overlay with DB session data for in_progress
        let devStatus;
        try {
          devStatus = buildDevStatusFromOutputs(agentOutputs);
        } catch (e) {
          devStatus = { in_progress: [], completed: [], blocked: [] };
        }
        
        // Override in_progress with DB sessions (authoritative for running agents)
        devStatus.in_progress = runningSessions.map(s => ({
          ticket_id: s.ticket_id,
          branch: s.worktree_path ? `agent/${s.ticket_id.toLowerCase()}` : 'unknown',
          started_at: s.started_at,
          session_id: s.id
        }));
        
        // Add stalled sessions info
        devStatus.stalled = stalledSessions.map(s => ({
          ticket_id: s.ticket_id,
          session_id: s.id,
          last_heartbeat: s.last_heartbeat
        }));
        
        // Load regression results from saved file
        const savedDevStatus = readJSON('dev-status.json');
        if (savedDevStatus?.regression_results) {
          devStatus.regression_results = savedDevStatus.regression_results;
        }
        
        // Get active file locks from DB
        const activeLocks = dbModule.locks.getActive();
        
        const data = {
          findings: readJSON('findings.json'),
          decisions: readJSON('decisions.json'),
          tickets: { tickets: dbTickets }, // Format expected by UI
          summary: readJSON('findings-summary.json'),
          devStatus: devStatus,
          docStatus: readJSON('doc-status.json'),
          featuresList,
          agentOutputs,
          staging: {
            count: stagingCount,
            bySeverity: stagingData?.summary || { critical: 0, high: 0, medium: 0, low: 0 }
          },
          // DB state info
          activeLocks,
          runningSessions,
          source: 'database',
          dbAvailable: true
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Error loading from database:', e.message);
        // Fall through to JSON fallback
      }
    }
    
    // JSON fallback (when DB not available or forced)
    let devStatus;
    try {
      devStatus = buildDevStatusFromOutputs(agentOutputs);
      const savedDevStatus = readJSON('dev-status.json');
      if (savedDevStatus?.regression_results) {
        devStatus.regression_results = savedDevStatus.regression_results;
      }
    } catch (e) {
      console.error('Error building devStatus:', e.message);
      devStatus = readJSON('dev-status.json') || { in_progress: [], completed: [] };
    }
    
    const data = {
      findings: readJSON('findings.json'),
      decisions: readJSON('decisions.json'),
      tickets: readJSON('tickets.json'),
      summary: readJSON('findings-summary.json'),
      devStatus: devStatus,
      docStatus: readJSON('doc-status.json'),
      featuresList,
      agentOutputs,
      staging: {
        count: stagingCount,
        bySeverity: stagingData?.summary || { critical: 0, high: 0, medium: 0, low: 0 }
      },
      source: 'json',
      dbAvailable: !!dbModule,
      dbHint: dbModule ? 'DB available - using as source of truth' : 'Database not initialized. Run: cd scripts/db && npm install && npm run init'
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return true;
  }
  
  // GET /api/file?path=... - Read a file's contents (for displaying reports)
  if (req.method === 'GET' && url.startsWith('/api/file?')) {
    try {
      const params = new URLSearchParams(url.split('?')[1]);
      const filePath = params.get('path');
      
      if (!filePath) {
        throw new Error('Missing path parameter');
      }
      
      // Security: Only allow reading from docs/ directory
      if (!filePath.startsWith('docs/')) {
        throw new Error('Can only read files from docs/ directory');
      }
      
      // Resolve relative to project root (parent of pm-dashboard-ui)
      const fullPath = path.join(__dirname, '../..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(content);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/dev-status - Save dev status (blocked, in_progress, etc.)
  if (req.method === 'POST' && url === '/api/dev-status') {
    try {
      const devStatus = JSON.parse(body);
      devStatus.meta = devStatus.meta || {};
      devStatus.meta.last_updated = new Date().toISOString();
      writeJSON('dev-status.json', devStatus);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/create-ci-blocker - Create a CI failure blocker file for PM to handle
  if (req.method === 'POST' && url === '/api/create-ci-blocker') {
    try {
      const { ticketId, branch, failedTests, failedCount, output, attempt = 1 } = JSON.parse(body);
      
      if (!ticketId) {
        throw new Error('ticketId is required');
      }
      
      // Create blocker file in docs/agent-output/blocked/
      const blockedDir = path.join(DOCS_DIR, 'agent-output', 'blocked');
      if (!fs.existsSync(blockedDir)) {
        fs.mkdirSync(blockedDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `CI-${ticketId}-${timestamp}.json`;
      const filepath = path.join(blockedDir, filename);
      
      const blockerData = {
        type: 'ci_failure',
        ticket_id: ticketId,
        branch: branch || `agent/${ticketId.toLowerCase()}`,
        created_at: new Date().toISOString(),
        attempt: attempt,
        failed_tests: failedTests || [],
        failed_count: failedCount || 0,
        output: output ? output.substring(0, 5000) : '', // Limit output size
        status: 'pending',
        message: `CI detected ${failedCount || 0} test regression(s) outside ticket scope. PM should create continuation ticket.`
      };
      
      fs.writeFileSync(filepath, JSON.stringify(blockerData, null, 2));
      console.log(`✅ Created CI blocker: ${filename}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, file: filename }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/blocked-decision - Record a decision on a blocked agent
  if (req.method === 'POST' && url === '/api/blocked-decision') {
    try {
      const { ticketId, decision, customNote } = JSON.parse(body);
      const devStatus = readJSON('dev-status.json') || { blocked: [], in_progress: [], completed: [], observations: [] };
      
      // Find the blocked item
      const blockedIdx = devStatus.blocked.findIndex(b => b.ticket_id === ticketId);
      if (blockedIdx === -1) {
        throw new Error(`Ticket ${ticketId} not found in blocked queue`);
      }
      
      // Update with decision
      devStatus.blocked[blockedIdx].decision = {
        option: decision,
        custom_note: customNote,
        decided_at: new Date().toISOString()
      };
      devStatus.blocked[blockedIdx].status = 'decided';
      
      devStatus.meta = devStatus.meta || {};
      devStatus.meta.last_updated = new Date().toISOString();
      writeJSON('dev-status.json', devStatus);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/setup-worktrees - Create worktrees for multiple tickets
  if (req.method === 'POST' && url === '/api/setup-worktrees') {
    try {
      const { ticketIds } = JSON.parse(body);
      if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
        throw new Error('ticketIds must be a non-empty array');
      }
      
      const results = [];
      const SETUP_SCRIPT = path.join(__dirname, '../../scripts/setup-agent-worktree.sh');
      const WORKTREE_BASE = path.join(__dirname, '../../../agent-worktrees');
      
      // Ensure worktree base directory exists
      if (!fs.existsSync(WORKTREE_BASE)) {
        fs.mkdirSync(WORKTREE_BASE, { recursive: true });
      }
      
      for (const ticketId of ticketIds) {
        const worktreePath = path.join(WORKTREE_BASE, ticketId);
        
        try {
          // Run the setup script
          const output = execSync(`bash "${SETUP_SCRIPT}" "${ticketId}"`, {
            cwd: path.join(__dirname, '../..'),
            encoding: 'utf8',
            timeout: 60000, // 60 second timeout per worktree
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          results.push({
            ticketId,
            success: true,
            path: worktreePath,
            message: 'Worktree created successfully'
          });
          console.log(`✅ Created worktree for ${ticketId}`);
        } catch (scriptError) {
          results.push({
            ticketId,
            success: false,
            path: worktreePath,
            error: scriptError.message || 'Script execution failed'
          });
          console.error(`❌ Failed to create worktree for ${ticketId}:`, scriptError.message);
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: results.every(r => r.success),
        results,
        worktreeBase: WORKTREE_BASE
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/launch-agent - Create worktree and open Cursor in it
  if (req.method === 'POST' && url === '/api/launch-agent') {
    try {
      const { ticketId } = JSON.parse(body);
      if (!ticketId) {
        throw new Error('ticketId is required');
      }
      
      const SETUP_SCRIPT = path.join(__dirname, '../../scripts/setup-agent-worktree.sh');
      const WORKTREE_BASE = path.join(__dirname, '../../../agent-worktrees');
      const worktreePath = path.join(WORKTREE_BASE, ticketId);
      
      // Step 1: Create worktree
      console.log(`🚀 Launching agent for ${ticketId}...`);
      try {
        execSync(`bash "${SETUP_SCRIPT}" "${ticketId}"`, {
          cwd: path.join(__dirname, '../..'),
          encoding: 'utf8',
          timeout: 60000,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log(`✅ Worktree created for ${ticketId}`);
      } catch (scriptError) {
        // Worktree might already exist, continue anyway
        console.log(`ℹ️ Worktree setup: ${scriptError.message}`);
      }
      
      // Step 2: Open Cursor in the worktree
      try {
        // Use spawn instead of exec to not block, and detach so it persists
        const { spawn } = require('child_process');
        const cursorProcess = spawn('cursor', [worktreePath], {
          detached: true,
          stdio: 'ignore',
          cwd: worktreePath
        });
        cursorProcess.unref(); // Allow the server to exit independently
        console.log(`✅ Opened Cursor for ${ticketId} at ${worktreePath}`);
      } catch (cursorError) {
        console.error(`❌ Failed to open Cursor: ${cursorError.message}`);
        throw new Error(`Failed to open Cursor: ${cursorError.message}`);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true,
        ticketId,
        worktreePath,
        message: `Cursor opened at ${worktreePath}`
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/launch-dispatch - Launch dispatch agents to process blockers
  if (req.method === 'POST' && url === '/api/launch-dispatch') {
    try {
      const DISPATCH_SCRIPT = path.join(__dirname, '../../scripts/launch-dispatch-agents.sh');
      
      console.log('🚀 Launching dispatch agents...');
      
      // Run the script in background
      const { spawn } = require('child_process');
      const dispatchProcess = spawn('bash', [DISPATCH_SCRIPT], {
        detached: true,
        stdio: 'ignore',
        cwd: path.join(__dirname, '../..')
      });
      dispatchProcess.unref();
      
      // Count blockers for response
      const blockedDir = path.join(__dirname, '../agent-output/blocked');
      let blockerCount = 0;
      try {
        const files = fs.readdirSync(blockedDir);
        blockerCount = files.filter(f => 
          (f.startsWith('QA-') || f.startsWith('CI-')) && f.endsWith('.json')
        ).length;
      } catch (e) {}
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true,
        message: `Launched dispatch agents for ${blockerCount} blockers`,
        blockerCount,
        batchSize: 5,
        estimatedBatches: Math.ceil(blockerCount / 5)
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/run-regression - Run regression tests on a branch
  if (req.method === 'POST' && url === '/api/run-regression') {
    try {
      const { ticketId, branch } = JSON.parse(body);
      if (!ticketId) {
        throw new Error('ticketId is required');
      }
      
      const branchName = branch || `agent/${ticketId.toLowerCase()}`;
      console.log(`🧪 Running regression tests for ${ticketId} on branch ${branchName}...`);
      
      // Fetch and checkout the branch
      const repoPath = path.join(__dirname, '../..');
      
      // Helper to parse failed test files from output
      const parseFailedFiles = (output) => {
        const files = new Set();
        // Match patterns like "FAIL src/lib/auth/actions.test.ts" or "❌ src/app/api/billing/seats/route.test.ts"
        const patterns = [
          /FAIL\s+([^\s]+\.test\.[tj]sx?)/gi,
          /❌\s+([^\s]+\.test\.[tj]sx?)/gi,
          /×\s+([^\s]+\.test\.[tj]sx?)/gi,
          /failed.*?([^\s]+\.test\.[tj]sx?)/gi
        ];
        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(output)) !== null) {
            files.add(match[1]);
          }
        }
        return Array.from(files);
      };
      
      try {
        // Fetch the branch
        execSync(`git fetch origin ${branchName}`, {
          cwd: repoPath,
          encoding: 'utf8',
          timeout: 30000,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Run tests on the branch without switching (using git worktree or direct)
        const testResult = execSync(`git stash && git checkout ${branchName} && pnpm test 2>&1; git checkout - && git stash pop 2>/dev/null || true`, {
          cwd: repoPath,
          encoding: 'utf8',
          timeout: 300000, // 5 minute timeout for tests
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Parse test results
        const passed = testResult.includes('passed') && !testResult.includes('failed');
        const failMatch = testResult.match(/(\d+) failed/);
        const passMatch = testResult.match(/(\d+) passed/);
        const failedCount = failMatch ? parseInt(failMatch[1]) : 0;
        const passedCount = passMatch ? parseInt(passMatch[1]) : 0;
        const failedFiles = parseFailedFiles(testResult);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          ticketId,
          branch: branchName,
          passed: failedCount === 0,
          passedCount,
          failedCount,
          failedFiles,
          output: testResult.slice(-2000) // Last 2000 chars of output
        }));
      } catch (testError) {
        // Tests failed - this is expected for behavior changes
        const output = testError.stdout || testError.stderr || testError.message || '';
        const failMatch = output.match(/(\d+) failed/);
        const passMatch = output.match(/(\d+) passed/);
        const failedCount = failMatch ? parseInt(failMatch[1]) : 0;
        const passedCount = passMatch ? parseInt(passMatch[1]) : 0;
        const failedFiles = parseFailedFiles(output);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          ticketId,
          branch: branchName,
          passed: false,
          passedCount,
          failedCount,
          failedFiles,
          output: output.slice(-2000)
        }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/add-finding - Add a regression finding
  if (req.method === 'POST' && url === '/api/add-finding') {
    try {
      const finding = JSON.parse(body);
      const findings = readJSON('findings.json') || { findings: [] };
      
      // Add the new finding
      findings.findings.push(finding);
      
      // Update summary counts
      if (findings.summary) {
        findings.summary[finding.severity] = (findings.summary[finding.severity] || 0) + 1;
        findings.summary.pending = (findings.summary.pending || 0) + 1;
      }
      
      writeJSON('findings.json', findings);
      console.log(`🚨 Created regression finding: ${finding.id}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, finding }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/decisions - Save decisions (with PM response preservation)
  if (req.method === 'POST' && url === '/api/decisions') {
    try {
      const incomingDecisions = JSON.parse(body);
      const existingDecisions = readJSON('decisions.json') || { threads: [] };
      
      // Merge: preserve PM responses (role: 'system') that dashboard might not have
      const existingThreadMap = new Map();
      for (const thread of existingDecisions.threads || []) {
        existingThreadMap.set(thread.finding_id, thread);
      }
      
      // For each incoming thread, merge in any PM messages from existing
      for (const inThread of incomingDecisions.threads || []) {
        const existingThread = existingThreadMap.get(inThread.finding_id);
        if (existingThread) {
          // Get PM messages from existing that aren't in incoming
          const existingPmMessages = (existingThread.messages || [])
            .filter(m => m.role === 'system');
          const incomingMsgTexts = new Set((inThread.messages || []).map(m => m.text));
          
          // Add PM messages that dashboard doesn't have
          for (const pmMsg of existingPmMessages) {
            if (!incomingMsgTexts.has(pmMsg.text)) {
              inThread.messages = inThread.messages || [];
              inThread.messages.push(pmMsg);
            }
          }
          
          // Sort messages by timestamp
          if (inThread.messages) {
            inThread.messages.sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
          }
        }
      }
      
      writeJSON('decisions.json', incomingDecisions);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // =============================================================================
  // V2 API ENDPOINTS (Database-backed)
  // =============================================================================
  
  // Check if DB is available for v2 endpoints
  if (url.startsWith('/api/v2/') && !dbModule) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Database not available',
      message: 'Run: cd scripts/db && npm install && npm run init'
    }));
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // TICKETS v2
  // ---------------------------------------------------------------------------
  
  // GET /api/v2/tickets - List all tickets
  if (req.method === 'GET' && url.startsWith('/api/v2/tickets')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const filters = {};
      if (params.get('status')) filters.status = params.get('status');
      if (params.get('priority')) filters.priority = params.get('priority');
      
      // Check for single ticket request: /api/v2/tickets/TKT-001
      const ticketIdMatch = url.match(/\/api\/v2\/tickets\/([A-Z]+-\d+)/i);
      if (ticketIdMatch) {
        const ticket = dbModule.tickets.get(ticketIdMatch[1].toUpperCase());
        if (!ticket) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ticket not found' }));
          return true;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ticket));
        return true;
      }
      
      const tickets = dbModule.tickets.list(filters);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tickets, count: tickets.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/tickets - Create a ticket
  if (req.method === 'POST' && url === '/api/v2/tickets') {
    try {
      const data = JSON.parse(body);
      const ticket = dbModule.tickets.create(data);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ticket));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // PUT /api/v2/tickets/:id - Update a ticket
  if (req.method === 'PUT' && url.match(/\/api\/v2\/tickets\/[A-Z]+-\d+/i)) {
    try {
      const ticketId = url.split('/').pop().toUpperCase();
      const data = JSON.parse(body);
      
      // Get old ticket to detect status change
      const oldTicket = dbModule.tickets.get(ticketId);
      const ticket = dbModule.tickets.update(ticketId, data);
      
      // =========================================================================
      // EVENT-DRIVEN: Queue jobs on status change
      // =========================================================================
      if (oldTicket && data.status && oldTicket.status !== data.status) {
        handleTicketStatusChange(ticketId, oldTicket.status, data.status, ticket);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ticket));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // FINDINGS v2
  // ---------------------------------------------------------------------------
  
  // GET /api/v2/findings - List findings
  if (req.method === 'GET' && url.startsWith('/api/v2/findings')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const status = params.get('status');
      
      let findings;
      if (status === 'inbox') {
        findings = dbModule.findings.getInbox();
      } else if (status === 'staging') {
        findings = dbModule.findings.getStaging();
      } else {
        const filters = {};
        if (status) filters.status = status;
        if (params.get('severity')) filters.severity = params.get('severity');
        findings = dbModule.findings.list(filters);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ findings, count: findings.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/findings - Create a finding
  if (req.method === 'POST' && url === '/api/v2/findings') {
    try {
      const data = JSON.parse(body);
      const finding = dbModule.findings.create(data);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(finding));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // PUT /api/v2/findings/:id - Update a finding
  if (req.method === 'PUT' && url.match(/\/api\/v2\/findings\/F-\d+/i)) {
    try {
      const findingId = url.split('/').pop().toUpperCase();
      const data = JSON.parse(body);
      const finding = dbModule.findings.update(findingId, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(finding));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // JOBS v2 (Background Job Queue)
  // ---------------------------------------------------------------------------

  // GET /api/v2/jobs - List jobs
  if (req.method === 'GET' && url.startsWith('/api/v2/jobs')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const filters = {};
      if (params.get('status')) filters.status = params.get('status');
      if (params.get('job_type')) filters.job_type = params.get('job_type');
      
      const jobs = dbModule.jobs.list(filters);
      const pendingCounts = dbModule.jobs.getPendingCounts();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        jobs, 
        count: jobs.length,
        pending: pendingCounts,
        worker_running: jobWorkerRunning
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/jobs - Create a job manually
  if (req.method === 'POST' && url === '/api/v2/jobs') {
    try {
      const data = JSON.parse(body);
      const job = dbModule.jobs.create(data);
      startJobWorker();  // Ensure worker is running
      
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(job));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/jobs/start-worker - Start the job worker
  if (req.method === 'POST' && url === '/api/v2/jobs/start-worker') {
    try {
      startJobWorker();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: true, running: jobWorkerRunning }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // CLEANUP v2 (One-time cleanup for already-merged tickets)
  // Runs Test + Doc agents on main branch without affecting ticket status
  // ---------------------------------------------------------------------------

  // GET /api/v2/cleanup/status - Get cleanup status for merged tickets
  if (req.method === 'GET' && url === '/api/v2/cleanup/status') {
    try {
      const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
      const completed = { tests: [], docs: [] };
      const pending = { tests: [], docs: [] };
      
      // Read cleanup completion files
      if (fs.existsSync(cleanupDir)) {
        const files = fs.readdirSync(cleanupDir);
        for (const file of files) {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(cleanupDir, file), 'utf8'));
            if (file.startsWith('TESTS-') && !file.includes('PENDING')) {
              completed.tests.push(content.ticket_id);
            } else if (file.startsWith('DOCS-') && !file.includes('PENDING')) {
              completed.docs.push(content.ticket_id);
            }
          } catch (e) {}
        }
      }
      
      // Get all merged tickets from QA PASSED files (source of truth)
      const qaResultsDir = path.join(__dirname, '../agent-output/qa-results');
      const allMerged = new Set();
      
      if (fs.existsSync(qaResultsDir)) {
        const files = fs.readdirSync(qaResultsDir).filter(f => f.includes('PASSED'));
        for (const file of files) {
          // Extract ticket ID from filename: QA-TKT-XXX-PASSED or QA-SEC-XXX-PASSED
          const match = file.match(/QA-((?:TKT|SEC)-\d+[a-zA-Z]?)/i);
          if (match) {
            allMerged.add(match[1].toUpperCase());
          }
        }
      }
      
      // Also include tickets from database with merged/done status
      const mergedTickets = dbModule?.tickets?.list({ status: 'merged' }) || [];
      const doneTickets = dbModule?.tickets?.list({ status: 'done' }) || [];
      for (const t of [...mergedTickets, ...doneTickets]) {
        allMerged.add(t.id);
      }
      
      const allMergedArray = Array.from(allMerged).sort();
      
      // Find pending (merged but not cleaned up)
      pending.tests = allMergedArray.filter(id => !completed.tests.includes(id));
      pending.docs = allMergedArray.filter(id => !completed.docs.includes(id));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        total_merged: allMergedArray.length,
        all_merged: allMergedArray,
        completed,
        pending,
        fully_cleaned: allMergedArray.filter(id => 
          completed.tests.includes(id) && completed.docs.includes(id)
        )
      }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/cleanup/queue - Queue cleanup jobs for merged tickets
  // Body: { ticket_ids: ["TKT-001", "TKT-002"], types: ["tests", "docs"] }
  // Or: { all: true, types: ["tests", "docs"] } to queue all merged tickets
  if (req.method === 'POST' && url === '/api/v2/cleanup/queue') {
    try {
      const { ticket_ids, all, types } = JSON.parse(body);
      const jobTypes = types || ['tests', 'docs'];
      
      let ticketsToClean = [];
      
      if (all) {
        // Get all merged tickets from QA PASSED files (source of truth)
        const qaResultsDir = path.join(__dirname, '../agent-output/qa-results');
        const allMerged = new Set();
        
        if (fs.existsSync(qaResultsDir)) {
          const files = fs.readdirSync(qaResultsDir).filter(f => f.includes('PASSED'));
          for (const file of files) {
            const match = file.match(/QA-((?:TKT|SEC)-\d+[a-zA-Z]?)/i);
            if (match) {
              allMerged.add(match[1].toUpperCase());
            }
          }
        }
        
        // Also include tickets from database with merged/done status
        const mergedTickets = dbModule?.tickets?.list({ status: 'merged' }) || [];
        const doneTickets = dbModule?.tickets?.list({ status: 'done' }) || [];
        for (const t of [...mergedTickets, ...doneTickets]) {
          allMerged.add(t.id);
        }
        
        ticketsToClean = Array.from(allMerged).sort();
      } else if (ticket_ids && Array.isArray(ticket_ids)) {
        ticketsToClean = ticket_ids.map(id => id.toUpperCase());
      } else {
        throw new Error('Provide ticket_ids array or set all: true');
      }
      
      // Check what's already been cleaned
      const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
      const alreadyCleaned = { tests: new Set(), docs: new Set() };
      
      if (fs.existsSync(cleanupDir)) {
        const files = fs.readdirSync(cleanupDir);
        for (const file of files) {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(cleanupDir, file), 'utf8'));
            if (file.startsWith('TESTS-')) {
              alreadyCleaned.tests.add(content.ticket_id);
            } else if (file.startsWith('DOCS-')) {
              alreadyCleaned.docs.add(content.ticket_id);
            }
          } catch (e) {}
        }
      }
      
      const queued = [];
      const skipped = [];
      
      for (const ticketId of ticketsToClean) {
        if (jobTypes.includes('tests') && !alreadyCleaned.tests.has(ticketId)) {
          dbModule.jobs.create({
            job_type: 'cleanup_tests',
            ticket_id: ticketId,
            branch: 'main',  // Always run on main for cleanup
            priority: 10,    // Low priority - don't block normal work
            payload: { triggered_by: 'cleanup', cleanup_type: 'tests' }
          });
          queued.push({ ticketId, type: 'tests' });
        } else if (jobTypes.includes('tests')) {
          skipped.push({ ticketId, type: 'tests', reason: 'already_cleaned' });
        }
        
        if (jobTypes.includes('docs') && !alreadyCleaned.docs.has(ticketId)) {
          dbModule.jobs.create({
            job_type: 'cleanup_docs',
            ticket_id: ticketId,
            branch: 'main',  // Always run on main for cleanup
            priority: 10,    // Low priority
            payload: { triggered_by: 'cleanup', cleanup_type: 'docs' }
          });
          queued.push({ ticketId, type: 'docs' });
        } else if (jobTypes.includes('docs')) {
          skipped.push({ ticketId, type: 'docs', reason: 'already_cleaned' });
        }
      }
      
      if (queued.length > 0) {
        startJobWorker();
      }
      
      console.log(`🧹 Queued ${queued.length} cleanup jobs, skipped ${skipped.length}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        queued,
        skipped,
        message: `Queued ${queued.length} cleanup jobs (${skipped.length} already cleaned)`
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/cleanup/mark-complete - Manually mark cleanup as complete
  // (For when you've done it manually or want to skip)
  if (req.method === 'POST' && url === '/api/v2/cleanup/mark-complete') {
    try {
      const { ticket_id, type, notes } = JSON.parse(body);
      
      if (!ticket_id || !type) {
        throw new Error('ticket_id and type (tests/docs) required');
      }
      
      const cleanupDir = path.join(__dirname, '../agent-output/cleanup');
      if (!fs.existsSync(cleanupDir)) {
        fs.mkdirSync(cleanupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const prefix = type === 'tests' ? 'TESTS' : 'DOCS';
      const filename = `${prefix}-${ticket_id.toUpperCase()}-${timestamp}.json`;
      
      const record = {
        ticket_id: ticket_id.toUpperCase(),
        type,
        completed_at: new Date().toISOString(),
        completed_by: 'manual',
        notes: notes || 'Manually marked complete'
      };
      
      fs.writeFileSync(path.join(cleanupDir, filename), JSON.stringify(record, null, 2));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, record }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // INBOX v2 (Human Review Queue for UI Changes)
  // ---------------------------------------------------------------------------

  // GET /api/v2/inbox - List pending inbox items
  if (req.method === 'GET' && url === '/api/v2/inbox') {
    try {
      const inboxDir = path.join(__dirname, '../agent-output/inbox');
      const items = [];
      
      if (fs.existsSync(inboxDir)) {
        const files = fs.readdirSync(inboxDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(inboxDir, file), 'utf8');
            const item = JSON.parse(content);
            if (item.status === 'pending') {
              items.push({ ...item, filename: file });
            }
          } catch (e) {
            // Skip invalid files
          }
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items, count: items.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/inbox/:ticketId/approve - Human approves UI review, proceed to finalizing
  if (req.method === 'POST' && url.match(/\/api\/v2\/inbox\/[A-Z]+-\d+[a-zA-Z]?\/approve/i)) {
    try {
      const ticketId = url.split('/')[4].toUpperCase();
      console.log(`✅ Human approved UI review for ${ticketId}`);
      
      // Find and update the inbox item
      const inboxDir = path.join(__dirname, '../agent-output/inbox');
      if (fs.existsSync(inboxDir)) {
        const files = fs.readdirSync(inboxDir).filter(f => f.includes(ticketId) && f.endsWith('.json'));
        for (const file of files) {
          const filepath = path.join(inboxDir, file);
          try {
            const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            content.status = 'approved';
            content.approved_at = new Date().toISOString();
            fs.writeFileSync(filepath, JSON.stringify(content, null, 2));
          } catch (e) {
            // Skip invalid files
          }
        }
      }
      
      // Get ticket and proceed to finalizing
      if (!dbModule?.tickets) {
        throw new Error('Database not available');
      }
      
      const ticket = dbModule.tickets.get(ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }
      
      // Update status to finalizing
      dbModule.tickets.update(ticketId, { status: 'finalizing' });
      
      // Trigger the finalizing handler to queue Test + Doc agents
      handleTicketStatusChange(ticketId, 'qa_approved', 'finalizing', ticket);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        ticketId, 
        message: 'UI approved - proceeding to finalizing stage (Test + Doc agents queued)' 
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/inbox/:ticketId/reject - Human rejects UI review, needs more work
  if (req.method === 'POST' && url.match(/\/api\/v2\/inbox\/[A-Z]+-\d+[a-zA-Z]?\/reject/i)) {
    try {
      const ticketId = url.split('/')[4].toUpperCase();
      const { reason } = JSON.parse(body);
      console.log(`❌ Human rejected UI review for ${ticketId}: ${reason}`);
      
      // Find and update the inbox item
      const inboxDir = path.join(__dirname, '../agent-output/inbox');
      if (fs.existsSync(inboxDir)) {
        const files = fs.readdirSync(inboxDir).filter(f => f.includes(ticketId) && f.endsWith('.json'));
        for (const file of files) {
          const filepath = path.join(inboxDir, file);
          try {
            const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            content.status = 'rejected';
            content.rejected_at = new Date().toISOString();
            content.rejection_reason = reason;
            fs.writeFileSync(filepath, JSON.stringify(content, null, 2));
          } catch (e) {
            // Skip invalid files
          }
        }
      }
      
      // Update ticket status back to blocked for rework
      if (dbModule?.tickets) {
        dbModule.tickets.update(ticketId, { status: 'blocked' });
        
        // Create blocker for dispatch to handle
        const blockedDir = path.join(__dirname, '../agent-output/blocked');
        if (!fs.existsSync(blockedDir)) {
          fs.mkdirSync(blockedDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const blockerFile = path.join(blockedDir, `UI-REJECTED-${ticketId}-${timestamp}.json`);
        const blocker = {
          ticket_id: ticketId,
          blocker_type: 'ui_rejected',
          summary: `UI review rejected: ${reason}`,
          rejection_reason: reason,
          blocked_at: new Date().toISOString(),
          dispatch_action: 'create_continuation_ticket'
        };
        fs.writeFileSync(blockerFile, JSON.stringify(blocker, null, 2));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        ticketId, 
        message: 'UI rejected - ticket blocked for rework' 
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/agents/report - Agent reports completion or failure
  // This triggers the next step in the autonomous loop
  if (req.method === 'POST' && url === '/api/v2/agents/report') {
    try {
      const data = JSON.parse(body);
      const { ticket_id, agent_type, status, branch } = data;
      
      console.log(`📬 Agent report: ${agent_type} for ${ticket_id} → ${status}`);
      
      // Update ticket status based on agent report
      if (dbModule?.tickets) {
        let newStatus;
        
        if (agent_type === 'dev') {
          newStatus = status === 'completed' ? 'dev_complete' : 'blocked';
        } else if (agent_type === 'qa') {
          if (status === 'passed') {
            // QA passed - merge branch to main!
            console.log(`🔀 QA passed for ${ticket_id} - merging branch ${branch} to main`);
            const mergeResult = mergeBranchToMain(ticket_id, branch);
            newStatus = mergeResult.success ? 'merged' : 'qa_failed';
          } else {
            newStatus = 'qa_failed';
          }
        } else if (agent_type === 'dispatch') {
          // Dispatch completed, check for continuation tickets
          checkForNewContinuationTickets();
          newStatus = null;  // Don't change ticket status
        }
        
        if (newStatus && ticket_id) {
          const ticket = dbModule.tickets.get(ticket_id.toUpperCase());
          if (ticket) {
            dbModule.tickets.update(ticket_id.toUpperCase(), { status: newStatus });
            // This triggers handleTicketStatusChange which queues next job
          }
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, next_step_queued: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // POST /api/v2/blockers/scan - Scan for new blockers and trigger dispatch
  if (req.method === 'POST' && url === '/api/v2/blockers/scan') {
    try {
      const blockedDir = path.join(PROJECT_ROOT, 'docs/agent-output/blocked');
      const files = fs.readdirSync(blockedDir).filter(f => f.endsWith('.json'));
      
      console.log(`🔍 Scanning ${files.length} blocker files...`);
      
      if (files.length > 0 && dbModule?.jobs) {
        // Queue dispatch agent if not already running
        const pendingDispatch = dbModule.jobs.list({ status: 'pending', job_type: 'dispatch' });
        const runningDispatch = dbModule.jobs.list({ status: 'running', job_type: 'dispatch' });
        
        if (pendingDispatch.length === 0 && runningDispatch.length === 0) {
          dbModule.jobs.create({
            job_type: 'dispatch',
            priority: 2,
            payload: { triggered_by: 'blocker_scan', blocker_count: files.length }
          });
          startJobWorker();
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ scanned: files.length, dispatch_queued: files.length > 0 }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // DECISIONS v2
  // ---------------------------------------------------------------------------

  // GET /api/v2/decisions - List decision threads
  if (req.method === 'GET' && url.startsWith('/api/v2/decisions')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const filters = {};
      if (params.get('status')) filters.status = params.get('status');
      
      const threads = dbModule.decisions.list(filters);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ threads, count: threads.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/decisions/:id/messages - Add message to thread
  if (req.method === 'POST' && url.match(/\/api\/v2\/decisions\/[^/]+\/messages/)) {
    try {
      const threadId = url.split('/')[4];
      const { role, content } = JSON.parse(body);
      const thread = dbModule.decisions.addMessage(threadId, role, content);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(thread));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // AGENT SESSIONS v2
  // ---------------------------------------------------------------------------
  
  // GET /api/v2/agents - List agent sessions
  if (req.method === 'GET' && url.startsWith('/api/v2/agents')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const filters = {};
      if (params.get('status')) filters.status = params.get('status');
      if (params.get('type')) filters.agent_type = params.get('type');
      
      // Special queries
      if (params.get('running') === 'true') {
        const sessions = dbModule.sessions.getRunning();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessions, count: sessions.length }));
        return true;
      }
      
      if (params.get('stalled') === 'true') {
        const sessions = dbModule.sessions.getStalled();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessions, count: sessions.length }));
        return true;
      }
      
      const sessions = dbModule.sessions.list(filters);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessions, count: sessions.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/agents/start - Register a new agent session
  if (req.method === 'POST' && url === '/api/v2/agents/start') {
    try {
      const { ticket_id, feature_id, agent_type, tmux_session, worktree_path } = JSON.parse(body);
      
      // Create session
      const session = dbModule.sessions.create({
        ticket_id,
        feature_id,
        agent_type,
        status: 'queued'
      });
      
      // If tmux session provided, start it immediately
      if (tmux_session) {
        dbModule.sessions.start(session.id, tmux_session, worktree_path);
      }
      
      // Acquire file locks if this is a dev agent with a ticket
      if (ticket_id && agent_type === 'dev') {
        const ticket = dbModule.tickets.get(ticket_id);
        if (ticket && ticket.files_to_modify) {
          const lockResult = dbModule.locks.acquire(session.id, ticket_id, ticket.files_to_modify);
          if (!lockResult.success) {
            // Release session if we can't get locks
            dbModule.sessions.crash(session.id, 'Failed to acquire file locks');
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'File lock conflict',
              conflicts: lockResult.conflicts 
            }));
            return true;
          }
        }
      }
      
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dbModule.sessions.get(session.id)));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/agents/:id/heartbeat - Update agent heartbeat
  if (req.method === 'POST' && url.match(/\/api\/v2\/agents\/[^/]+\/heartbeat/)) {
    try {
      const sessionId = url.split('/')[4];
      const session = dbModule.sessions.heartbeat(sessionId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, last_heartbeat: session.last_heartbeat }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/agents/:id/complete - Mark agent as complete
  if (req.method === 'POST' && url.match(/\/api\/v2\/agents\/[^/]+\/complete/)) {
    try {
      const sessionId = url.split('/')[4];
      const { completion_file } = JSON.parse(body);
      
      // Mark session complete
      const session = dbModule.sessions.complete(sessionId, completion_file);
      
      // Release file locks
      dbModule.locks.release(sessionId);
      
      // Update ticket status if applicable
      if (session.ticket_id) {
        dbModule.tickets.update(session.ticket_id, { status: 'dev_complete' });
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/agents/:id/block - Mark agent as blocked
  if (req.method === 'POST' && url.match(/\/api\/v2\/agents\/[^/]+\/block/)) {
    try {
      const sessionId = url.split('/')[4];
      const { blocker_type, summary, blocker_file } = JSON.parse(body);
      
      const session = dbModule.sessions.block(sessionId, blocker_type, summary, blocker_file);
      
      // Release file locks
      dbModule.locks.release(sessionId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // LOCKS v2
  // ---------------------------------------------------------------------------
  
  // GET /api/v2/locks - Get active locks
  if (req.method === 'GET' && url === '/api/v2/locks') {
    try {
      const locks = dbModule.locks.getActive();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ locks, count: locks.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/locks/acquire - Acquire file locks
  if (req.method === 'POST' && url === '/api/v2/locks/acquire') {
    try {
      const { session_id, ticket_id, files } = JSON.parse(body);
      const result = dbModule.locks.acquire(session_id, ticket_id, files);
      
      if (result.success) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, conflicts: result.conflicts }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // POST /api/v2/locks/release - Release file locks
  if (req.method === 'POST' && url === '/api/v2/locks/release') {
    try {
      const { session_id } = JSON.parse(body);
      dbModule.locks.release(session_id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // UNIT TESTS v2
  // ---------------------------------------------------------------------------
  
  // POST /api/v2/tests/regression - Record regression test result
  if (req.method === 'POST' && url === '/api/v2/tests/regression') {
    try {
      const { 
        ticket_id, session_id, branch, modified_files, excluded_tests,
        regression_passed, regression_output, modified_tests_output,
        total_tests, passed_tests, failed_tests
      } = JSON.parse(body);
      
      // Create test run record
      const testRun = dbModule.testRuns.create({
        ticket_id,
        session_id,
        branch,
        modified_files,
        excluded_tests
      });
      
      // Complete with results
      const result = dbModule.testRuns.complete(testRun.id, {
        regression_passed,
        regression_output,
        modified_tests_output,
        total_tests,
        passed_tests,
        failed_tests
      });
      
      // Update ticket status based on result
      if (regression_passed) {
        dbModule.tickets.update(ticket_id, { status: 'qa_pending' });
      } else {
        dbModule.tickets.update(ticket_id, { status: 'unit_test_failed' });
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // EVENTS v2
  // ---------------------------------------------------------------------------
  
  // GET /api/v2/events - Get recent events
  if (req.method === 'GET' && url.startsWith('/api/v2/events')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const limit = parseInt(params.get('limit')) || 100;
      
      const events = dbModule.events.getRecent(limit);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ events, count: events.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // ---------------------------------------------------------------------------
  // DASHBOARD v2 (combined data endpoint)
  // ---------------------------------------------------------------------------
  
  // GET /api/v2/dashboard - Get all dashboard data from DB
  if (req.method === 'GET' && url === '/api/v2/dashboard') {
    try {
      const data = dbModule.getDashboardData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  // GET /api/v2/batch - Get next batch of conflict-free tickets
  if (req.method === 'GET' && url.startsWith('/api/v2/batch')) {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const maxConcurrent = parseInt(params.get('max')) || 3;
      
      const batch = dbModule.getNextBatch(maxConcurrent);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ tickets: batch, count: batch.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return true;
  }
  
  return false;
}

// Serve static files
function serveStatic(req, res) {
  let filepath = req.url === '/' ? '/index.html' : req.url;
  filepath = path.join(__dirname, filepath);
  
  const ext = path.extname(filepath);
  const contentType = MIME[ext] || 'text/plain';
  
  fs.readFile(filepath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      // Prevent caching for HTML files
      const headers = { 'Content-Type': contentType };
      if (ext === '.html') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      res.writeHead(200, headers);
      res.end(content);
    }
  });
}

// Create server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Collect body for POST
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    // Try API first
    if (req.url.startsWith('/api/')) {
      if (!handleAPI(req, res, body)) {
        res.writeHead(404);
        res.end('API not found');
      }
    } else {
      serveStatic(req, res);
    }
  });
});

server.listen(PORT, () => {
  const dbStatus = dbModule 
    ? '║   ✅ Database: Connected (v2 API enabled)             ║'
    : '║   ⚠️  Database: Not initialized                       ║';
  const dbHint = dbModule
    ? '║   • /api/v2/* endpoints available                    ║'
    : '║   • Run: cd scripts/db && npm install && npm run init║';
  
  console.log(`
╔════════════════════════════════════════════════════════╗
║                   PM DASHBOARD                         ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║   🚀 Server running at: http://localhost:${PORT}         ║
║                                                        ║
${dbStatus}
${dbHint}
║                                                        ║
║   Features:                                            ║
║   • Auto-saves decisions (no copy/paste!)              ║
║   • Loads data from docs/data/*.json                   ║
║   • Auto-aggregates agent outputs                      ║
║   • v2 API with SQLite database support                ║
║                                                        ║
║   Press Ctrl+C to stop                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);
});

