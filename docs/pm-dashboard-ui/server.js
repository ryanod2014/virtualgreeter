#!/usr/bin/env node

/**
 * PM Dashboard Server
 * 
 * Serves the dashboard AND auto-saves decisions to JSON files.
 * No more copy/paste!
 * 
 * Usage: node docs/pm-dashboard-ui/server.js
 * Then visit: http://localhost:3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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
          
          // Extract ticket ID from filename
          const ticketMatch = file.match(/^([A-Z]+-\d+[a-z]?)/i);
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
  
  // Sort each output by ticketId for consistent ordering
  for (const key of Object.keys(outputs)) {
    outputs[key].sort((a, b) => a.ticketId.localeCompare(b.ticketId));
  }
  
  console.log(`📊 Scanned ${branchesToScan.length} branches: ${outputs.completions.length} completions, ${outputs.started.length} started, ${outputs.blocked.length} blocked`);
  
  // Cache results
  agentOutputsCache = outputs;
  agentOutputsCacheTime = Date.now();
  
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
  
  return {
    meta: {
      last_updated: new Date().toISOString(),
      version: "2.1",
      note: "Built from agent-output files (source of truth)"
    },
    in_progress: inProgress,
    completed: completed,
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
  if (req.method === 'GET' && url === '/api/data') {
    // Auto-generate missing prompts on data load
    const promptStats = generateMissingPrompts();
    if (promptStats.created > 0) {
      console.log(`📝 Generated ${promptStats.created} new prompts`);
    }
    // Scan features directory
    const featuresDir = path.join(DOCS_DIR, 'features');
    let featuresList = [];
    try {
      featuresList = scanFeaturesDir(featuresDir);
    } catch (e) {
      console.error('Error scanning features:', e.message);
    }
    
    // Scan agent-output directories for per-agent files (auto-aggregation)
    let agentOutputs = { reviews: [], completions: [], blocked: [], docTracker: [], started: [], findings: [], testLock: [] };
    try {
      agentOutputs = scanAgentOutputs();
    } catch (e) {
      console.error('Error scanning agent outputs:', e.message);
    }
    
    // Build devStatus from actual output files (source of truth)
    // This prevents race conditions where agents update dev-status.json on their branch
    let devStatus;
    try {
      devStatus = buildDevStatusFromOutputs(agentOutputs);
      // Also load regression_results from dev-status.json (persisted test results)
      const savedDevStatus = readJSON('dev-status.json');
      if (savedDevStatus?.regression_results) {
        devStatus.regression_results = savedDevStatus.regression_results;
      }
    } catch (e) {
      console.error('Error building devStatus:', e.message);
      devStatus = readJSON('dev-status.json') || { in_progress: [], completed: [] };
    }
    
    // Read staging data for Cleanup Agent UI
    const stagingData = readJSON('findings-staging.json');
    const stagingCount = stagingData?.findings?.length || 0;
    
    const data = {
      findings: readJSON('findings.json'),
      decisions: readJSON('decisions.json'),
      tickets: readJSON('tickets.json'),
      summary: readJSON('findings-summary.json'),
      devStatus: devStatus,
      docStatus: readJSON('doc-status.json'),
      featuresList,
      // Aggregated agent outputs (prevents race conditions with multiple agents)
      agentOutputs,
      // Staging queue info for Cleanup Agent
      staging: {
        count: stagingCount,
        bySeverity: stagingData?.summary || { critical: 0, high: 0, medium: 0, low: 0 }
      }
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
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
      res.writeHead(200, { 'Content-Type': contentType });
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
  console.log(`
╔════════════════════════════════════════════════════════╗
║                   PM DASHBOARD                         ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║   🚀 Server running at: http://localhost:${PORT}         ║
║                                                        ║
║   Features:                                            ║
║   • Auto-saves decisions (no copy/paste!)              ║
║   • Loads data from docs/data/*.json                   ║
║   • Auto-aggregates agent outputs from:                ║
║     docs/agent-output/{reviews,completions,blocked,    ║
║     doc-tracker}/*.md                                  ║
║                                                        ║
║   Press Ctrl+C to stop                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);
});

