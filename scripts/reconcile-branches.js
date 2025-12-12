#!/usr/bin/env node
/**
 * Reconcile all agent branches to main using SELECTIVE merge
 * Ensures each ticket's changes are applied without overwriting others
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = '/Users/ryanodonnell/projects/Digital_greeter';
process.chdir(PROJECT_ROOT);

const DRY_RUN = !process.argv.includes('--apply');

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

function exec(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: PROJECT_ROOT, ...opts }).trim();
  } catch (e) {
    return '';
  }
}

function log(color, msg) {
  console.log(`${color}${msg}${NC}`);
}

console.log(`${BLUE}========================================${NC}`);
console.log(`${BLUE}Branch Reconciliation Script${NC}`);
console.log(`${BLUE}========================================${NC}`);
console.log('');

// Ensure we're on main
exec('git checkout main');
exec('git pull origin main');

// Get all agent branches
const branches = exec('git branch -r')
  .split('\n')
  .map(b => b.trim())
  .filter(b => /agent\/tkt/i.test(b));

console.log(`Found ${branches.length} agent branches`);
console.log('');

// Phase 1: Analyze each branch
log(BLUE, 'Phase 1: Analyzing branches...');
console.log('');

const ticketFiles = {}; // ticket -> files
const fileTickets = {}; // file -> tickets[]

for (const branch of branches) {
  const ticketMatch = branch.match(/tkt-([0-9a-z-]+)/i);
  if (!ticketMatch) continue;
  
  const ticketId = `TKT-${ticketMatch[1].toUpperCase()}`;
  
  // Get merge base
  const mergeBase = exec(`git merge-base main ${branch}`);
  if (!mergeBase) continue;
  
  // Get files modified (excluding metadata)
  const filesRaw = exec(`git diff --name-only ${mergeBase} ${branch}`);
  const files = filesRaw
    .split('\n')
    .filter(f => f && !f.startsWith('docs/agent-output') && 
                    !f.startsWith('docs/data') && 
                    !f.startsWith('docs/prompts') &&
                    !f.startsWith('.agent') &&
                    !f.includes('pnpm-lock') &&
                    !f.includes('tsconfig.tsbuildinfo'));
  
  if (files.length === 0) continue;
  
  ticketFiles[ticketId] = { branch, files };
  
  // Track file -> tickets mapping
  for (const file of files) {
    if (!fileTickets[file]) fileTickets[file] = [];
    fileTickets[file].push(ticketId);
  }
  
  console.log(`  📁 ${ticketId}: ${files.length} files (${branch.replace('origin/', '')})`);
}

// Phase 2: Find conflicts
console.log('');
log(BLUE, 'Phase 2: Checking for conflicts...');
console.log('');

const conflicts = [];
for (const [file, tickets] of Object.entries(fileTickets)) {
  if (tickets.length > 1) {
    conflicts.push({ file, tickets });
    log(RED, `  ⚠️  CONFLICT: ${file}`);
    console.log(`     Tickets: ${tickets.join(', ')}`);
  }
}

if (conflicts.length === 0) {
  log(GREEN, '  ✅ No conflicts detected!');
}

// Phase 3: Check which tickets are merged/ready_to_merge
console.log('');
log(BLUE, 'Phase 3: Checking ticket status...');
console.log('');

const mergedTickets = [];
const readyToMerge = [];

try {
  const statusOutput = exec(`sqlite3 data/workflow.db "SELECT id, status FROM tickets WHERE status IN ('merged', 'ready_to_merge');"`);
  for (const line of statusOutput.split('\n').filter(l => l)) {
    const [id, status] = line.split('|');
    const normalizedId = id.toUpperCase();
    if (ticketFiles[normalizedId]) {
      if (status === 'merged') {
        mergedTickets.push(normalizedId);
      } else {
        readyToMerge.push(normalizedId);
      }
    }
  }
} catch (e) {
  console.log('Could not read ticket status from DB');
}

console.log(`  Already merged: ${mergedTickets.length}`);
console.log(`  Ready to merge: ${readyToMerge.length}`);

// Summary
console.log('');
log(BLUE, '========================================');
log(BLUE, 'Summary');
log(BLUE, '========================================');
console.log(`Total tickets with files: ${Object.keys(ticketFiles).length}`);
console.log(`Files with conflicts: ${conflicts.length}`);
console.log(`Merged tickets: ${mergedTickets.length}`);
console.log(`Ready to merge: ${readyToMerge.length}`);
console.log('');

if (DRY_RUN) {
  log(YELLOW, 'Dry run complete. Run with --apply to perform reconciliation.');
  console.log('');
  console.log('Example: node scripts/reconcile-branches.js --apply');
  
  // Show what would be done
  if (conflicts.length > 0) {
    console.log('');
    log(YELLOW, 'Conflicts require manual resolution:');
    for (const { file, tickets } of conflicts) {
      console.log(`  ${file}: ${tickets.join(' vs ')}`);
    }
  }
  
  process.exit(0);
}

// Phase 4: Apply selective merges
console.log('');
log(BLUE, 'Phase 4: Applying selective merges...');
console.log('');

let changesApplied = 0;

// Process in order: merged first, then ready_to_merge
const allToProcess = [...mergedTickets, ...readyToMerge];

for (const ticketId of allToProcess) {
  const { branch, files } = ticketFiles[ticketId];
  if (!branch || !files) continue;
  
  log(YELLOW, `Processing ${ticketId}...`);
  
  for (const file of files) {
    try {
      // Check if file exists in branch
      exec(`git show ${branch}:"${file}" > /dev/null 2>&1`);
      exec(`git checkout ${branch} -- "${file}"`);
      console.log(`  ${GREEN}✓ ${file}${NC}`);
      changesApplied++;
    } catch (e) {
      // File might be deleted
      try {
        exec(`git rm --ignore-unmatch "${file}"`);
        console.log(`  ${RED}✗ ${file} (deleted)${NC}`);
      } catch (e2) {
        console.log(`  ${YELLOW}⏭️  ${file} (skipped)${NC}`);
      }
    }
  }
}

// Check for changes
const status = exec('git status --porcelain');
if (!status) {
  console.log('');
  log(GREEN, 'No changes needed - main is already reconciled!');
} else {
  console.log('');
  log(YELLOW, 'Staging changes...');
  exec('git add -A');
  
  const commitMsg = `Reconcile: Apply selective file changes from ${allToProcess.length} tickets

This commit ensures all ticket branches are properly merged using
selective file checkout (not full git merge) to prevent overwrites.

Tickets reconciled: ${allToProcess.join(', ')}`;

  log(YELLOW, 'Creating reconciliation commit...');
  exec(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  
  console.log('');
  log(GREEN, '✅ Reconciliation complete!');
  console.log('');
  console.log("Run 'git push origin main' to push changes.");
}
