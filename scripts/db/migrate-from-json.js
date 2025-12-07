#!/usr/bin/env node
/**
 * =============================================================================
 * Migrate JSON Data to SQLite Database
 * =============================================================================
 * Imports existing workflow data from JSON files into the SQLite database.
 * 
 * Source files:
 *   - docs/data/tickets.json -> tickets table
 *   - docs/data/findings.json -> findings table (status = 'inbox')
 *   - docs/data/findings-staging.json -> findings table (status = 'staging')
 *   - docs/data/decisions.json -> decision_threads + decision_messages tables
 *   - docs/data/doc-status.json -> features table
 * =============================================================================
 */

import { initDB, closeDB, tickets, findings, decisions, features, logEvent } from './db.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../docs/data');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function readJSON(filename) {
  const filepath = join(DATA_DIR, filename);
  if (!existsSync(filepath)) {
    console.log(`  ⚠ File not found: ${filename}`);
    return null;
  }
  try {
    const content = readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`  ✗ Error reading ${filename}:`, error.message);
    return null;
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

function migrateTickets(db) {
  console.log('\n📋 Migrating tickets...');
  
  const data = readJSON('tickets.json');
  if (!data || !data.tickets) {
    console.log('  ⚠ No tickets to migrate');
    return { migrated: 0, skipped: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  
  for (const ticket of data.tickets) {
    try {
      // Check if ticket already exists
      const existing = tickets.get(ticket.id);
      if (existing) {
        skipped++;
        continue;
      }
      
      tickets.create({
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority || 'medium',
        feature: ticket.feature || null,
        difficulty: ticket.difficulty || 'medium',
        status: ticket.status || 'draft',
        source: ticket.source || null,
        issue: ticket.issue || null,
        feature_docs: ticket.feature_docs || [],
        similar_code: ticket.similar_code || [],
        files_to_modify: ticket.files_to_modify || [],
        files_to_read: ticket.files_to_read || [],
        out_of_scope: ticket.out_of_scope || [],
        fix_required: ticket.fix_required || [],
        acceptance_criteria: ticket.acceptance_criteria || [],
        risks: ticket.risks || [],
        dev_checks: ticket.dev_checks || [],
        qa_notes: ticket.qa_notes || null,
      });
      
      migrated++;
    } catch (error) {
      console.error(`  ✗ Error migrating ticket ${ticket.id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✓ Migrated ${migrated} tickets (${skipped} skipped)`);
  return { migrated, skipped };
}

function migrateFindings(db) {
  console.log('\n🔍 Migrating findings...');
  
  let totalMigrated = 0;
  let totalSkipped = 0;
  
  // Migrate inbox findings (from findings.json)
  const inboxData = readJSON('findings.json');
  if (inboxData && inboxData.findings) {
    console.log('  Processing inbox findings...');
    for (const finding of inboxData.findings) {
      try {
        const existing = findings.get(finding.id);
        if (existing) {
          totalSkipped++;
          continue;
        }
        
        // Map old status to new status
        let status = 'inbox';
        if (finding.status === 'ticketed') status = 'ticketed';
        else if (finding.status === 'skipped') status = 'rejected';
        else if (finding.status === 'pending') status = 'inbox';
        
        findings.create({
          id: finding.id,
          feature: finding.feature || null,
          category: finding.category || null,
          title: finding.title,
          severity: finding.severity || 'medium',
          location: finding.location || null,
          issue: finding.issue || null,
          suggested_fix: finding.suggested_fix || null,
          status: status,
          ticket_id: finding.ticket_id || null,
          options: finding.options || [],
          agent_recommendation: finding.agent_recommendation || null,
          source_agent: 'review_agent',
        });
        
        totalMigrated++;
      } catch (error) {
        console.error(`  ✗ Error migrating finding ${finding.id}:`, error.message);
        totalSkipped++;
      }
    }
  }
  
  // Migrate staging findings (from findings-staging.json)
  const stagingData = readJSON('findings-staging.json');
  if (stagingData && stagingData.findings) {
    console.log('  Processing staging findings...');
    for (const finding of stagingData.findings) {
      try {
        const existing = findings.get(finding.id);
        if (existing) {
          totalSkipped++;
          continue;
        }
        
        findings.create({
          id: finding.id,
          feature: finding.feature || null,
          category: finding.category || null,
          title: finding.title,
          severity: finding.severity || 'medium',
          location: finding.location || null,
          issue: finding.issue || null,
          suggested_fix: finding.suggested_fix || null,
          status: 'staging',
          ticket_id: finding.ticket_id || null,
          options: finding.options || [],
          agent_recommendation: finding.agent_recommendation || null,
          source_agent: 'review_agent',
        });
        
        totalMigrated++;
      } catch (error) {
        console.error(`  ✗ Error migrating staging finding ${finding.id}:`, error.message);
        totalSkipped++;
      }
    }
  }
  
  console.log(`  ✓ Migrated ${totalMigrated} findings (${totalSkipped} skipped)`);
  return { migrated: totalMigrated, skipped: totalSkipped };
}

function migrateDecisions(db) {
  console.log('\n💬 Migrating decision threads...');
  
  const data = readJSON('decisions.json');
  if (!data || !data.threads) {
    console.log('  ⚠ No decisions to migrate');
    return { migrated: 0, skipped: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  
  // Track which finding_ids we've already created threads for (handle duplicates)
  const processedFindings = new Map();
  
  for (const thread of data.threads) {
    try {
      const findingId = thread.finding_id;
      
      // Handle duplicate threads for same finding
      // Keep the one with more messages or more recent activity
      if (processedFindings.has(findingId)) {
        const existingThread = processedFindings.get(findingId);
        const existingMsgCount = existingThread.messages?.length || 0;
        const newMsgCount = thread.messages?.length || 0;
        
        // Keep the one with more messages
        if (newMsgCount <= existingMsgCount) {
          skipped++;
          continue;
        }
        
        // This thread is better, but we already created the other one
        // Just add the additional messages
        console.log(`  ⚠ Duplicate thread for ${findingId}, merging messages`);
      }
      
      // Generate a unique thread ID
      const threadId = `thread-${findingId}-${generateId()}`;
      
      // Map status
      let status = 'pending';
      if (thread.status === 'resolved') status = 'resolved';
      else if (thread.status === 'in_discussion') status = 'pending';
      
      // Create thread
      const created = decisions.create({
        id: threadId,
        finding_id: findingId,
        status: status,
      });
      
      // Add messages
      if (thread.messages && thread.messages.length > 0) {
        for (const msg of thread.messages) {
          decisions.addMessage(
            threadId,
            msg.role || 'system',
            msg.text || msg.content || ''
          );
        }
      }
      
      // If there's a decision, add it as a message and resolve
      if (thread.decision && thread.decision.option_label) {
        decisions.addMessage(
          threadId,
          'human',
          `Decision: ${thread.decision.option_label}`
        );
        
        if (status !== 'resolved') {
          decisions.resolve(threadId, 'approve', thread.decision.option_label);
        }
      }
      
      processedFindings.set(findingId, thread);
      migrated++;
    } catch (error) {
      console.error(`  ✗ Error migrating thread for ${thread.finding_id}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✓ Migrated ${migrated} decision threads (${skipped} duplicates/skipped)`);
  return { migrated, skipped };
}

function migrateFeatures(db) {
  console.log('\n📚 Migrating features...');
  
  const data = readJSON('doc-status.json');
  if (!data || !data.features) {
    console.log('  ⚠ No features to migrate');
    return { migrated: 0, skipped: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  
  for (const [featureId, featureData] of Object.entries(data.features)) {
    try {
      features.upsert({
        id: featureId,
        name: featureId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        doc_file: featureData.doc_file || null,
        documented: featureData.documented || false,
        last_documented: featureData.last_documented || null,
        needs_redoc: featureData.needs_redoc || false,
        redoc_context: featureData.redoc_context || null,
        reviewed: featureData.reviewed || false,
        last_reviewed: featureData.last_reviewed || null,
        tested: false, // Not tracked in old system
      });
      
      migrated++;
    } catch (error) {
      console.error(`  ✗ Error migrating feature ${featureId}:`, error.message);
      skipped++;
    }
  }
  
  console.log(`  ✓ Migrated ${migrated} features (${skipped} skipped)`);
  return { migrated, skipped };
}

// =============================================================================
// MAIN
// =============================================================================

console.log('═══════════════════════════════════════════════════════════════');
console.log('          JSON to SQLite Migration Script');
console.log('═══════════════════════════════════════════════════════════════');

// Initialize database
console.log('\n🔧 Initializing database...');
const db = initDB();
console.log('  ✓ Database ready');

// Check if already migrated
const metadata = db.prepare("SELECT value FROM metadata WHERE key = 'migrated_from_json'").get();
if (metadata && metadata.value === 'true') {
  console.log('\n⚠ Database already migrated. Run with --force to re-migrate.');
  const forceFlag = process.argv.includes('--force');
  if (!forceFlag) {
    console.log('  Exiting. Use --force to override.');
    closeDB();
    process.exit(0);
  }
  console.log('  --force flag detected, proceeding with migration...');
}

// Run migrations
const results = {
  tickets: migrateTickets(db),
  findings: migrateFindings(db),
  decisions: migrateDecisions(db),
  features: migrateFeatures(db),
};

// Update metadata
db.prepare("UPDATE metadata SET value = 'true', updated_at = datetime('now') WHERE key = 'migrated_from_json'").run();

// Log migration event
logEvent('migration_completed', 'system', 'database', 'migration', {
  results,
  timestamp: new Date().toISOString()
});

// Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                    Migration Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Tickets:   ${results.tickets.migrated} migrated, ${results.tickets.skipped} skipped`);
console.log(`  Findings:  ${results.findings.migrated} migrated, ${results.findings.skipped} skipped`);
console.log(`  Decisions: ${results.decisions.migrated} migrated, ${results.decisions.skipped} skipped`);
console.log(`  Features:  ${results.features.migrated} migrated, ${results.features.skipped} skipped`);
console.log('═══════════════════════════════════════════════════════════════');

// Write migration report
const reportPath = join(__dirname, '../../data/migration-report.json');
writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  results,
  source_files: {
    tickets: 'docs/data/tickets.json',
    findings_inbox: 'docs/data/findings.json',
    findings_staging: 'docs/data/findings-staging.json',
    decisions: 'docs/data/decisions.json',
    features: 'docs/data/doc-status.json',
  },
  database: 'data/workflow.db'
}, null, 2));

console.log(`\n📄 Migration report saved to: ${reportPath}`);

closeDB();
console.log('\n✓ Migration complete!');
