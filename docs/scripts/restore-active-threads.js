#!/usr/bin/env node
/**
 * Restore Active Threads
 * 
 * Moves findings with active "in_discussion" threads from staging back to inbox
 * so they appear in the dashboard.
 * 
 * Usage: node docs/scripts/restore-active-threads.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
    return null;
  }
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Wrote ${filename}`);
}

function main() {
  console.log('\n🔄 Restoring findings with active discussions to inbox...\n');

  const decisions = readJSON('decisions.json');
  const staging = readJSON('findings-staging.json');
  const inbox = readJSON('findings.json');

  if (!decisions || !staging || !inbox) {
    console.error('❌ Could not load required files');
    process.exit(1);
  }

  // Find all finding IDs with in_discussion status
  const activeThreadIds = new Set();
  for (const thread of decisions.threads || []) {
    if (thread.status === 'in_discussion') {
      activeThreadIds.add(thread.finding_id);
    }
  }

  console.log(`📋 Found ${activeThreadIds.size} findings with active discussions:`);
  console.log(`   ${[...activeThreadIds].join(', ')}\n`);

  // Move matching findings from staging to inbox
  const toMove = [];
  const remainInStaging = [];

  for (const finding of staging.findings || []) {
    if (activeThreadIds.has(finding.id)) {
      toMove.push(finding);
    } else {
      remainInStaging.push(finding);
    }
  }

  console.log(`📦 Moving ${toMove.length} findings from staging to inbox`);
  console.log(`📦 Keeping ${remainInStaging.length} findings in staging\n`);

  // Add to inbox
  inbox.findings = [...inbox.findings, ...toMove];
  
  // Update inbox summary
  for (const f of toMove) {
    const sev = f.severity || 'medium';
    inbox.summary[sev] = (inbox.summary[sev] || 0) + 1;
    inbox.summary.pending = (inbox.summary.pending || 0) + 1;
  }
  inbox.meta.total_findings = inbox.findings.length;
  inbox.meta.last_updated = new Date().toISOString().split('T')[0];

  // Update staging
  staging.findings = remainInStaging;
  staging.meta.total_findings = remainInStaging.length;
  staging.meta.last_updated = new Date().toISOString().split('T')[0];
  
  // Recalculate staging summary
  staging.summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of remainInStaging) {
    const sev = f.severity || 'medium';
    staging.summary[sev] = (staging.summary[sev] || 0) + 1;
  }

  // Write updated files
  writeJSON('findings.json', inbox);
  writeJSON('findings-staging.json', staging);

  console.log(`
✨ Done!

📥 Inbox now has: ${inbox.findings.length} findings
   - ${toMove.length} with active discussions restored
   - ${inbox.summary.pending || 0} pending

📦 Staging now has: ${staging.findings.length} findings

Dashboard should now show the open conversations.
`);
}

main();





