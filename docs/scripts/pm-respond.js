#!/usr/bin/env node
/**
 * PM Respond Script
 * 
 * Adds PM responses to finding threads in decisions.json
 * Auto-resolves when response indicates action taken (added to ticket, acknowledged, etc.)
 * 
 * Usage: node docs/scripts/pm-respond.js F-XXX "Your response message"
 */

const fs = require('fs');
const path = require('path');

const DECISIONS_PATH = path.join(__dirname, '../data/decisions.json');
const FINDINGS_PATH = path.join(__dirname, '../data/findings.json');
const TICKETS_PATH = path.join(__dirname, '../data/tickets.json');

/**
 * Check if a finding already has a ticket (meaning the conversation is DONE)
 */
function findingHasTicket(findingId) {
  try {
    const findingsData = JSON.parse(fs.readFileSync(FINDINGS_PATH, 'utf8'));
    const findingsArray = findingsData.findings || findingsData;
    const finding = findingsArray.find(f => f.id === findingId);
    
    if (finding?.status === 'ticketed' || finding?.ticket_id) {
      return { hasTicket: true, ticketId: finding.ticket_id };
    }
    return { hasTicket: false };
  } catch (e) {
    return { hasTicket: false };
  }
}

// Patterns that indicate the finding should be auto-resolved
const RESOLUTION_PATTERNS = [
  { regex: /adding to (existing )?ticket|added to (existing )?ticket|I'll add this (requirement )?to (TKT-\d+)/i, type: 'added_to_ticket' },
  { regex: /TKT-(\d+)/i, type: 'added_to_ticket' },
  { regex: /^✅|Got it!|Understood|Will do|Done|Noted/i, type: 'acknowledged' },
  { regex: /creating ticket|new ticket created|ticket created/i, type: 'ticket_created' },
  { regex: /this is expected|working as intended|by design|not a bug/i, type: 'wont_fix' },
  { regex: /skipping|won't fix|low priority - skip|acceptable risk/i, type: 'skipped' }
];

function extractTicketId(message) {
  const match = message.match(/TKT-(\d+)/i);
  return match ? `TKT-${match[1].padStart(3, '0')}` : null;
}

function checkForResolution(message) {
  for (const pattern of RESOLUTION_PATTERNS) {
    if (pattern.regex.test(message)) {
      return pattern.type;
    }
  }
  return null;
}

function respond(findingId, message) {
  // Check if finding already has a ticket - conversation is DONE
  const ticketCheck = findingHasTicket(findingId);
  if (ticketCheck.hasTicket) {
    console.log(`⏭️  Skipping ${findingId} - already has ticket ${ticketCheck.ticketId || '(ticketed)'}`);
    console.log(`   No PM response needed - conversation is complete.`);
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  
  // Find thread
  const thread = data.threads.find(t => t.finding_id === findingId);
  
  if (!thread) {
    console.error(`❌ Finding ${findingId} not found in decisions.json`);
    process.exit(1);
  }
  
  const timestamp = new Date().toISOString();
  
  // Add PM response
  thread.messages.push({
    role: 'system',
    text: message,
    timestamp
  });
  
  // Check if this response indicates resolution
  const resolutionType = checkForResolution(message);
  const ticketId = extractTicketId(message);
  
  if (resolutionType) {
    // Auto-resolve the finding
    thread.status = 'resolved';
    thread.decision = {
      option_id: resolutionType,
      option_label: message.length > 100 ? message.substring(0, 97) + '...' : message,
      timestamp
    };
    
    if (ticketId) {
      thread.decision.combined_with = [ticketId];
    }
    
    // Also update findings.json if ticket was mentioned
    if (ticketId) {
      try {
        const findingsData = JSON.parse(fs.readFileSync(FINDINGS_PATH, 'utf8'));
        const findingsArray = findingsData.findings || findingsData;
        const finding = findingsArray.find(f => f.id === findingId);
        if (finding) {
          finding.status = 'ticketed';
          finding.ticket_id = ticketId;
          fs.writeFileSync(FINDINGS_PATH, JSON.stringify(findingsData, null, 2));
          console.log(`   📎 Linked to ${ticketId} in findings.json`);
        }
      } catch (e) {
        console.log(`   ⚠️ Could not update findings.json: ${e.message}`);
      }
    }
    
    console.log(`✅ Added PM response to ${findingId}`);
    console.log(`   Status: resolved (auto-resolved: ${resolutionType})`);
  } else {
    // Keep in discussion - waiting for more input
    thread.status = 'in_discussion';
    console.log(`✅ Added PM response to ${findingId}`);
    console.log(`   Status: in_discussion (awaiting user response)`);
  }
  
  console.log(`   Message: ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`);
  
  // Save decisions
  fs.writeFileSync(DECISIONS_PATH, JSON.stringify(data, null, 2));
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node docs/scripts/pm-respond.js <finding_id> "<message>"');
  console.log('Example: node docs/scripts/pm-respond.js F-643 "This means..."');
  process.exit(1);
}

respond(args[0], args.slice(1).join(' '));

