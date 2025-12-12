#!/usr/bin/env node
/**
 * =============================================================================
 * Auto-Merge Script
 * =============================================================================
 * Automatically merges tickets that have passed all gates:
 *   1. Dev Complete ✅
 *   2. QA Passed ✅
 *   3. Docs + Tests Agents Complete ✅ (both run on same branch)
 * 
 * This script runs programmatically - NOT by agents.
 * 
 * NEW in this version:
 *   - Runs after BOTH Docs and Tests agents complete
 *   - Triggers Review Agent after successful merge
 *   - Checks for docs_tests_complete status
 * 
 * Usage:
 *   node scripts/auto-merge.js                    # Check and merge all ready
 *   node scripts/auto-merge.js TKT-001            # Merge specific ticket
 *   node scripts/auto-merge.js --dry-run          # Show what would be merged
 * 
 * =============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3456';

// =============================================================================
// HTTP Client (same as agent-cli.js)
// =============================================================================

const http = require('http');
const https = require('https');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, DASHBOARD_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(body);
          }
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// =============================================================================
// Merge Logic
// =============================================================================

/**
 * Check if a ticket is ready for auto-merge
 * Returns { ready: boolean, reason: string, gates: object }
 */
async function checkMergeReadiness(ticketId) {
  const ticket = await request('GET', `/api/v2/tickets/${ticketId}`);
  
  if (!ticket) {
    return { ready: false, reason: 'Ticket not found', gates: {} };
  }

  const gates = {
    dev_complete: false,
    qa_passed: false,
    docs_tests_complete: false,
  };

  // Check status progression - NEW: check for docs_tests_complete
  const validMergeStatuses = ['docs_tests_complete', 'ready_to_merge'];
  
  if (!validMergeStatuses.includes(ticket.status)) {
    return { 
      ready: false, 
      reason: `Ticket status is '${ticket.status}', expected 'docs_tests_complete' or 'ready_to_merge'`,
      gates 
    };
  }

  gates.dev_complete = true;
  gates.qa_passed = true;
  gates.docs_tests_complete = true;

  // Check if branch exists
  if (!ticket.branch) {
    return {
      ready: false,
      reason: 'No branch associated with ticket',
      gates
    };
  }

  return {
    ready: true,
    reason: 'All gates passed',
    gates,
    ticket
  };
}

/**
 * Perform selective merge of a ticket's branch to main
 * Uses git checkout of specific files only (not git merge)
 */
function performSelectiveMerge(ticketId, branch, dryRun = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Merging: ${ticketId} (${branch})`);
  console.log('='.repeat(60));

  try {
    // Ensure we're in the project root
    process.chdir(PROJECT_ROOT);

    // Fetch latest
    console.log('\n1. Fetching latest...');
    if (!dryRun) {
      execSync('git fetch origin', { stdio: 'inherit' });
    }

    // Get list of files modified by this branch
    console.log('\n2. Getting modified files...');
    const filesOutput = execSync(
      `git diff --name-only main...origin/${branch}`,
      { encoding: 'utf8' }
    ).trim();

    if (!filesOutput) {
      console.log('   No files to merge (branch has no changes from main)');
      return { success: true, files: [], reason: 'no_changes' };
    }

    const files = filesOutput.split('\n').filter(f => f.trim());
    console.log(`   Found ${files.length} files:`);
    files.forEach(f => console.log(`     - ${f}`));

    if (dryRun) {
      console.log('\n[DRY RUN] Would merge these files to main');
      return { success: true, files, dryRun: true };
    }

    // Checkout main
    console.log('\n3. Checking out main...');
    execSync('git checkout main', { stdio: 'inherit' });
    execSync('git pull origin main', { stdio: 'inherit' });

    // Selectively checkout files from the branch
    console.log('\n4. Selectively merging files...');
    const fileList = files.join(' ');
    execSync(`git checkout origin/${branch} -- ${fileList}`, { stdio: 'inherit' });

    // Stage and commit
    console.log('\n5. Committing...');
    execSync('git add -A', { stdio: 'inherit' });
    
    const commitMessage = `feat: ${ticketId} - Selective merge from ${branch}\n\nFiles merged:\n${files.map(f => `- ${f}`).join('\n')}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    // Push
    console.log('\n6. Pushing to main...');
    execSync('git push origin main', { stdio: 'inherit' });

    console.log('\n✅ Merge complete!');
    return { success: true, files };

  } catch (error) {
    console.error(`\n❌ Merge failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Update ticket status after merge and trigger Review Agent
 */
async function updateTicketAfterMerge(ticketId) {
  await request('PUT', `/api/v2/tickets/${ticketId}`, {
    status: 'merged',
  });

  // Log event
  await request('POST', '/api/v2/events', {
    event_type: 'ticket_merged',
    actor: 'auto_merge',
    entity_type: 'ticket',
    entity_id: ticketId,
    data: { merged_at: new Date().toISOString() }
  });

  console.log(`   Ticket ${ticketId} status updated to 'merged'`);
  
  // Trigger Review Agent (non-blocking)
  console.log(`   Triggering Review Agent for ${ticketId}...`);
  try {
    execSync(`./scripts/launch-review-agent.sh ${ticketId}`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    console.log(`   ✅ Review Agent launched for ${ticketId}`);
  } catch (e) {
    console.log(`   ⚠️ Review Agent launch failed (non-fatal): ${e.message}`);
    // Update status to closed if review agent can't be launched
    await request('PUT', `/api/v2/tickets/${ticketId}`, {
      status: 'closed',
    });
  }
}

/**
 * Get all tickets ready for merge (docs_tests_complete status)
 */
async function getTicketsReadyForMerge() {
  const result = await request('GET', '/api/v2/tickets?status=docs_tests_complete');
  const docsTestsComplete = result?.tickets || [];
  
  const result2 = await request('GET', '/api/v2/tickets?status=ready_to_merge');
  const readyToMerge = result2?.tickets || [];
  
  return [...docsTestsComplete, ...readyToMerge];
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = args.includes('--dry-run');
  // Support both "--ticket TKT-001" and just "TKT-001" as first arg
  const ticketArg = args.find((a, i) => args[i-1] === '--ticket') || 
                    (args[0] && !args[0].startsWith('-') ? args[0] : null);
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Auto-Merge Script

Automatically merges tickets that have passed all gates.

Usage:
  node scripts/auto-merge.js                    # Check and merge all ready
  node scripts/auto-merge.js TKT-001            # Merge specific ticket
  node scripts/auto-merge.js --ticket TKT-001   # Alternative syntax
  node scripts/auto-merge.js --dry-run          # Show what would be merged

Pipeline (NEW):
  Dev → Unit Tests → QA → Docs+Tests (same branch) → Auto-Merge → Review

Gates checked:
  1. Dev Complete ✅
  2. QA Passed ✅
  3. Docs + Tests Agents Complete ✅ (both on same branch)

After merge:
  - Ticket status set to 'merged'
  - Review Agent launched to audit changes

The merge uses SELECTIVE FILE CHECKOUT (not git merge) to avoid
conflicts with other agents' work on main.
`);
    return;
  }

  console.log('🔄 Auto-Merge Check');
  console.log('='.repeat(60));

  try {
    let tickets = [];
    
    if (ticketArg) {
      // Check specific ticket
      const readiness = await checkMergeReadiness(ticketArg);
      if (readiness.ready) {
        tickets.push(readiness.ticket);
      } else {
        console.log(`\n❌ ${ticketArg}: ${readiness.reason}`);
        console.log('   Gates:', JSON.stringify(readiness.gates, null, 2));
        return;
      }
    } else {
      // Get all tickets ready for merge
      tickets = await getTicketsReadyForMerge();
    }

    if (tickets.length === 0) {
      console.log('\nNo tickets ready for merge.');
      return;
    }

    console.log(`\nFound ${tickets.length} ticket(s) ready for merge:`);
    tickets.forEach(t => console.log(`  - ${t.id}: ${t.title}`));

    // Process each ticket
    for (const ticket of tickets) {
      const result = performSelectiveMerge(ticket.id, ticket.branch, dryRun);
      
      if (result.success && !dryRun && result.reason !== 'no_changes') {
        await updateTicketAfterMerge(ticket.id);
      }
    }

    console.log('\n✅ Auto-merge complete');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();

