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
        } else if (existing.status !== ticket.status) {
          // Update if status changed (JSON is source of truth during migration)
          dbModule.tickets.update(ticket.id, { status: ticket.status });
          updated++;
        } else {
          unchanged++;
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
// JOB QUEUE SYSTEM
// Event-driven automation - no external scripts needed
// =============================================================================

const { spawn } = require('child_process');
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * Handle ticket status changes - queue appropriate jobs
 */
function handleTicketStatusChange(ticketId, oldStatus, newStatus, ticket) {
  if (!dbModule?.jobs) {
    console.log('⚠️ Jobs module not available, skipping automation');
    return;
  }
  
  console.log(`📋 Ticket ${ticketId}: ${oldStatus} → ${newStatus}`);
  
  // Dev completed → Queue regression tests
  if (newStatus === 'dev_complete') {
    console.log(`🧪 Queueing regression tests for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'regression_test',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 3,  // High priority
      payload: {
        ticket_title: ticket.title,
        triggered_by: 'status_change'
      }
    });
    startJobWorker();
  }
  
  // Regression passed → Queue QA agent launch
  if (newStatus === 'in_review') {
    console.log(`🔍 Queueing QA agent for ${ticketId}`);
    dbModule.jobs.create({
      job_type: 'qa_launch',
      ticket_id: ticketId,
      branch: ticket.branch,
      priority: 5,
      payload: {
        ticket_title: ticket.title,
        triggered_by: 'regression_passed'
      }
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
          dbModule.tickets.update(job.ticket_id, { status: 'in_review' });
        }
        
        resolve({ passed: true, output: stdout.slice(-5000) });
      } else {
        // Tests failed → Update ticket status to blocked
        console.log(`❌ Regression tests failed for ${job.ticket_id}`);
        
        if (dbModule?.tickets) {
          dbModule.tickets.update(job.ticket_id, { status: 'blocked' });
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
 * Launch QA agent for a ticket (starts tmux session)
 */
function launchQAAgent(job) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PROJECT_ROOT, 'scripts/launch-qa-agents.sh');
    
    if (!fs.existsSync(scriptPath)) {
      reject(new Error('QA launch script not found'));
      return;
    }
    
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

