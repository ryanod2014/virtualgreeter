#!/usr/bin/env node
/**
 * Migrate to Staging Script
 * 
 * Moves PENDING findings from findings.json to findings-staging.json.
 * This is a one-time migration to initialize the cleanup workflow.
 * 
 * After running:
 * - findings-staging.json: All pending findings (raw, need cleanup)
 * - findings.json: Only ticketed/skipped findings (processed)
 * 
 * The Cleanup Agent will then process staging → inbox in controlled batches.
 * 
 * Usage: node docs/scripts/migrate-to-staging.js
 * 
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --force      Overwrite existing staging data (normally appends)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

const FINDINGS_PATH = path.join(DATA_DIR, 'findings.json');
const STAGING_PATH = path.join(DATA_DIR, 'findings-staging.json');
const BACKUP_PATH = path.join(DATA_DIR, 'findings-backup-' + new Date().toISOString().split('T')[0] + '.json');

// Parse command line args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filepath}:`, e.message);
    return null;
  }
}

function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ Wrote ${filepath}`);
}

function main() {
  console.log('\n📦 Migrate Pending Findings to Staging\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load current findings
  const findings = readJSON(FINDINGS_PATH);
  if (!findings) {
    console.error('❌ Could not load findings.json');
    process.exit(1);
  }

  // Load or create staging
  let staging = readJSON(STAGING_PATH);
  if (!staging || FORCE) {
    staging = {
      meta: {
        last_updated: new Date().toISOString().split('T')[0],
        total_findings: 0,
        format_version: '1.0',
        description: 'Raw findings from agents pending cleanup before promotion to inbox'
      },
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      findings: []
    };
  }

  // Separate pending from processed
  const pending = [];
  const processed = [];

  for (const finding of findings.findings || []) {
    if (finding.status === 'pending') {
      pending.push(finding);
    } else {
      processed.push(finding);
    }
  }

  console.log(`📊 Current State:`);
  console.log(`   Total findings: ${findings.findings?.length || 0}`);
  console.log(`   Pending (to migrate): ${pending.length}`);
  console.log(`   Already processed: ${processed.length}`);
  console.log('');

  // Count by severity
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of pending) {
    const sev = f.severity || 'medium';
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  }

  console.log(`📋 Pending by Severity:`);
  console.log(`   🔴 Critical: ${severityCounts.critical}`);
  console.log(`   🟠 High: ${severityCounts.high}`);
  console.log(`   🟡 Medium: ${severityCounts.medium}`);
  console.log(`   🟢 Low: ${severityCounts.low}`);
  console.log('');

  if (DRY_RUN) {
    console.log('🔍 Dry run complete. Run without --dry-run to migrate.\n');
    return;
  }

  // Backup current findings
  console.log(`💾 Creating backup: ${BACKUP_PATH}`);
  writeJSON(BACKUP_PATH, findings);

  // Move pending to staging
  staging.findings = [...staging.findings, ...pending];
  staging.meta.total_findings = staging.findings.length;
  staging.meta.last_updated = new Date().toISOString().split('T')[0];
  staging.meta.migrated_from = 'findings.json';
  staging.meta.migration_date = new Date().toISOString();
  staging.summary = severityCounts;

  // Keep only processed in findings (inbox is now empty of pending)
  const newFindings = {
    meta: {
      ...findings.meta,
      last_updated: new Date().toISOString().split('T')[0],
      total_findings: processed.length,
      note: 'Pending findings moved to findings-staging.json for cleanup'
    },
    summary: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      pending: 0,
      ticketed: processed.filter(f => f.status === 'ticketed').length,
      skipped: processed.filter(f => f.status === 'skipped').length
    },
    findings: processed
  };

  // Write updated files
  console.log('');
  writeJSON(STAGING_PATH, staging);
  writeJSON(FINDINGS_PATH, newFindings);

  console.log(`
✨ Migration Complete!

📦 Staging (pending cleanup): ${staging.findings.length} findings
   🔴 Critical: ${severityCounts.critical}
   🟠 High: ${severityCounts.high}
   🟡 Medium: ${severityCounts.medium}
   🟢 Low: ${severityCounts.low}

📥 Inbox (processed): ${newFindings.findings.length} findings
   ✅ Ticketed: ${newFindings.summary.ticketed}
   ⏭️  Skipped: ${newFindings.summary.skipped}

📁 Backup: ${BACKUP_PATH}

Next Steps:
1. Launch Cleanup Agent to process staging in batches:
   "You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then execute."

2. Cleanup Agent will promote findings to inbox in controlled batches
   (e.g., all Critical + 10 High at a time)

3. Human reviews cleaned inbox, makes decisions
`);
}

main();





