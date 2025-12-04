#!/usr/bin/env node

/**
 * Process Decisions Script
 * 
 * Reads decisions.json for resolved findings and:
 * 1. Creates tickets in tickets.json for resolved findings
 * 2. Updates finding status to 'ticketed' in findings.json
 * 
 * Also auto-resolves "in_discussion" threads where user clearly selected an option
 * (e.g., "option 1", "go with 1", "pick option 2", etc.)
 * 
 * DOES NOT regenerate the dashboard HTML - the webapp reads from JSON directly.
 * 
 * Usage: node docs/scripts/process-decisions.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Patterns that indicate user selected an option (1 or 2)
const OPTION_PATTERNS = [
  /^option\s*1\b/i,           // "option 1", "option1"
  /^1\.?\s*$/,                // just "1" or "1."
  /\bgo\s*(with|for)\s*(option\s*)?1\b/i,  // "go with 1", "go for option 1"
  /\bpick\s*(option\s*)?1\b/i, // "pick 1", "pick option 1"
  /\bchoice\s*1\b/i,          // "choice 1"
  /\bfirst\s*(one|option)\b/i, // "first one", "first option"
  /^option\s*2\b/i,
  /^2\.?\s*$/,
  /\bgo\s*(with|for)\s*(option\s*)?2\b/i,
  /\bpick\s*(option\s*)?2\b/i,
  /\bchoice\s*2\b/i,
  /\bsecond\s*(one|option)\b/i,
];

/**
 * Check if a message is selecting option 1 or 2
 * Returns: 1, 2, or null
 */
function detectOptionSelection(text) {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  
  // Option 1 patterns
  if (/^option\s*1\b/i.test(t) || /^1\.?\s*$/.test(t) || 
      /\bgo\s*(with|for)\s*(option\s*)?1\b/i.test(t) ||
      /\bpick\s*(option\s*)?1\b/i.test(t) ||
      /\bchoice\s*1\b/i.test(t) ||
      /\bfirst\s*(one|option)\b/i.test(t)) {
    return 1;
  }
  
  // Option 2 patterns
  if (/^option\s*2\b/i.test(t) || /^2\.?\s*$/.test(t) || 
      /\bgo\s*(with|for)\s*(option\s*)?2\b/i.test(t) ||
      /\bpick\s*(option\s*)?2\b/i.test(t) ||
      /\bchoice\s*2\b/i.test(t) ||
      /\bsecond\s*(one|option)\b/i.test(t)) {
    return 2;
  }
  
  return null;
}

/**
 * Auto-resolve threads where user clearly selected an option
 */
function autoResolveOptionSelections(decisions, findingsMap) {
  let resolved = 0;
  
  for (const thread of decisions.threads) {
    if (thread.status !== 'in_discussion') continue;
    if (!thread.messages || thread.messages.length === 0) continue;
    
    // Get last human message
    const lastHumanMsg = [...thread.messages].reverse().find(m => m.role === 'human');
    if (!lastHumanMsg) continue;
    
    // Check if it's an option selection
    const optionNum = detectOptionSelection(lastHumanMsg.text);
    if (!optionNum) continue;
    
    // Look up the finding to get its options
    const finding = findingsMap.get(thread.finding_id);
    if (!finding || !finding.options || finding.options.length < optionNum) continue;
    
    // Get the selected option (1-indexed → 0-indexed)
    const selectedOption = finding.options[optionNum - 1];
    if (!selectedOption) continue;
    
    // Auto-resolve!
    console.log(`🔄 Auto-resolving ${thread.finding_id}: user selected option ${optionNum}`);
    thread.status = 'resolved';
    thread.decision = {
      option_id: selectedOption.id || (optionNum === 1 ? 'implement_fix' : 'skip'),
      option_label: selectedOption.label,
      recommended: selectedOption.recommended || false,
      custom_note: lastHumanMsg.text,
      timestamp: new Date().toISOString()
    };
    resolved++;
  }
  
  return resolved;
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
  console.log(`✅ Updated ${filename}`);
}

// Get next ticket ID
function getNextTicketId(tickets) {
  if (!tickets.length) return 'TKT-001';
  const ids = tickets.map(t => parseInt(t.id.replace('TKT-', '')));
  const maxId = Math.max(...ids);
  return `TKT-${String(maxId + 1).padStart(3, '0')}`;
}

// Main function
function main() {
  console.log('\n📋 Processing PM Decisions...\n');

  // Load data
  const decisions = readJSON('decisions.json');
  const findings = readJSON('findings.json');
  const ticketsData = readJSON('tickets.json');

  if (!decisions || !findings || !ticketsData) {
    console.error('❌ Failed to load required data files');
    process.exit(1);
  }

  const findingsMap = new Map(findings.findings.map(f => [f.id, f]));
  const existingTicketSources = new Set();
  
  // Track which findings already have tickets
  for (const ticket of ticketsData.tickets) {
    if (ticket.source) {
      // Extract finding IDs from source field (e.g., "Finding F-001, F-002")
      const matches = ticket.source.match(/F-\d+/g);
      if (matches) {
        matches.forEach(id => existingTicketSources.add(id));
      }
    }
  }

  // Auto-resolve threads where user clearly selected an option (e.g., "option 1")
  const autoResolved = autoResolveOptionSelections(decisions, findingsMap);
  if (autoResolved > 0) {
    writeJSON('decisions.json', decisions);
    console.log(`   ↳ Auto-resolved ${autoResolved} option selections\n`);
  }

  // Cleanup: Fix threads stuck in "in_discussion" when finding is already processed
  let cleanedUp = 0;
  for (const thread of decisions.threads) {
    if (thread.status !== 'in_discussion') continue;
    
    const finding = findingsMap.get(thread.finding_id);
    if (!finding) continue;
    
    // If finding is already ticketed or skipped, thread should be resolved
    if (finding.status === 'ticketed' || finding.status === 'skipped') {
      thread.status = 'resolved';
      cleanedUp++;
      console.log(`🧹 Cleaned up ${thread.finding_id}: finding already ${finding.status}, thread now resolved`);
    }
  }
  if (cleanedUp > 0) {
    writeJSON('decisions.json', decisions);
  }

  let newTicketsCount = 0;
  let updatedFindingsCount = 0;

  // Process resolved decisions
  for (const thread of decisions.threads) {
    // Skip if not resolved or no decision
    if (thread.status !== 'resolved' || !thread.decision) {
      continue;
    }

    const findingId = thread.finding_id;
    const finding = findingsMap.get(findingId);

    if (!finding) {
      console.log(`⚠️  Finding ${findingId} not found in findings.json`);
      continue;
    }

    // Skip if already has a ticket or was explicitly skipped
    if (finding.status === 'ticketed' || finding.status === 'skipped' || existingTicketSources.has(findingId)) {
      continue;
    }

    // Skip combined findings that aren't primary
    if (thread.decision.combined_with && !thread.decision.is_primary) {
      // Mark as ticketed (will be part of primary's ticket)
      finding.status = 'ticketed';
      updatedFindingsCount++;
      continue;
    }

    // Handle "skip" decisions - mark as resolved without creating ticket
    if (thread.decision.option_id === 'skip' || 
        thread.decision.option_label?.toLowerCase().includes('skip') ||
        thread.decision.option_label?.toLowerCase().includes("won't fix")) {
      finding.status = 'skipped';
      updatedFindingsCount++;
      console.log(`⏭️  Skipped ${findingId}: ${thread.decision.option_label || 'No action needed'}`);
      continue;
    }

    // Detect skip phrases in custom notes
    const skipPhrases = ['skip', 'dont need', "don't need", 'no need', 'not needed', 'wont fix', "won't fix", 'already have ticket', 'already covered'];
    if (thread.decision.custom_note) {
      const note = thread.decision.custom_note.toLowerCase();
      if (skipPhrases.some(phrase => note.includes(phrase))) {
        finding.status = 'skipped';
        updatedFindingsCount++;
        console.log(`⏭️  Skipped ${findingId}: Custom note indicates skip/existing coverage`);
        continue;
      }
    }

    // Detect questions (not decisions) - don't create tickets for unanswered questions
    if (thread.decision.custom_note?.trim().endsWith('?')) {
      console.log(`❓ Skipped ${findingId}: Custom note is a question, not a decision`);
      continue;
    }

    // Create ticket
    const ticketId = getNextTicketId(ticketsData.tickets);
    
    // Handle combined findings
    let combinedSource = findingId;
    let combinedFindingsInfo = '';
    if (thread.decision.combined_with?.length) {
      combinedSource = [findingId, ...thread.decision.combined_with].join(', ');
      combinedFindingsInfo = ` (combined with ${thread.decision.combined_with.join(', ')})`;
      
      // Mark combined findings as ticketed
      for (const combinedId of thread.decision.combined_with) {
        const combinedFinding = findingsMap.get(combinedId);
        if (combinedFinding) {
          combinedFinding.status = 'ticketed';
          updatedFindingsCount++;
        }
      }
    }

    const newTicket = {
      id: ticketId,
      title: finding.title,
      priority: finding.severity,
      feature: finding.feature,
      status: 'ready',
      difficulty: 'medium', // Default, can be adjusted
      complexity: 'medium',
      risk: finding.severity === 'critical' ? 'high' : 'medium',
      source: `Finding ${combinedSource}`,
      issue: finding.issue,
      fix_required: [thread.decision.option_label || finding.suggested_fix],
      files: [], // Will need to be filled in by PM or developer
      risk_notes: [],
      acceptance_criteria: [
        `Issue described in ${findingId} is resolved`,
        'Change is tested and verified'
      ]
    };

    // Add custom notes if any
    if (thread.decision.custom_note) {
      newTicket.fix_required.push(`Note: ${thread.decision.custom_note}`);
    }

    ticketsData.tickets.push(newTicket);
    existingTicketSources.add(findingId);
    newTicketsCount++;

    // Mark finding as ticketed
    finding.status = 'ticketed';
    updatedFindingsCount++;

    console.log(`🎫 Created ${ticketId}: ${finding.title}${combinedFindingsInfo}`);
  }

  // Update metadata
  ticketsData.meta.total_tickets = ticketsData.tickets.length;
  ticketsData.meta.last_updated = new Date().toISOString().split('T')[0];

  // Write updated data
  if (newTicketsCount > 0 || updatedFindingsCount > 0) {
    writeJSON('tickets.json', ticketsData);
    writeJSON('findings.json', findings);
    
    // Also update findings-summary.json
    updateFindingsSummary(findings);

    console.log(`\n✨ Summary:`);
    console.log(`   • ${newTicketsCount} new tickets created`);
    console.log(`   • ${updatedFindingsCount} findings marked as ticketed`);
    console.log(`   • Total tickets: ${ticketsData.tickets.length}`);
    console.log(`\n💡 Refresh the dashboard to see changes (http://localhost:3456)`);
  } else {
    console.log(`\nℹ️  No new resolved decisions to process.`);
    console.log(`   Resolve findings in the Triage tab first, then run this script.`);
  }
}

// Update findings-summary.json
function updateFindingsSummary(findings) {
  const summary = {
    meta: {
      last_updated: new Date().toISOString().split('T')[0],
      total_features: 61,
      reviewed_features: 61,
      total_findings: findings.findings.length
    },
    by_priority: {
      critical: { total: 0, answered: 0, tickets_created: 0, pending: 0 },
      high: { total: 0, answered: 0, tickets_created: 0, pending: 0 },
      medium: { total: 0, answered: 0, tickets_created: 0, pending: 0 },
      low: { total: 0, answered: 0, tickets_created: 0, pending: 0 }
    },
    by_category: {}
  };

  for (const finding of findings.findings) {
    const severity = finding.severity || 'medium';
    const category = finding.category || 'other';
    
    if (!summary.by_priority[severity]) {
      summary.by_priority[severity] = { total: 0, answered: 0, tickets_created: 0, pending: 0 };
    }
    
    summary.by_priority[severity].total++;
    
    if (finding.status === 'ticketed') {
      summary.by_priority[severity].tickets_created++;
      summary.by_priority[severity].answered++;
    } else if (finding.status === 'skipped') {
      summary.by_priority[severity].answered++;
    } else {
      summary.by_priority[severity].pending++;
    }

    // Category stats
    if (!summary.by_category[category]) {
      summary.by_category[category] = { total: 0, reviewed: 0 };
    }
    summary.by_category[category].total++;
    summary.by_category[category].reviewed++;
  }

  writeJSON('findings-summary.json', summary);
}

main();

