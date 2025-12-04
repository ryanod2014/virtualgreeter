#!/usr/bin/env node
/**
 * PM Respond Script
 * 
 * Adds PM responses to finding threads in decisions.json
 * 
 * Usage: node docs/scripts/pm-respond.js F-XXX "Your response message"
 */

const fs = require('fs');
const path = require('path');

const DECISIONS_PATH = path.join(__dirname, '../data/decisions.json');

function respond(findingId, message) {
  const data = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
  
  // Find thread
  const thread = data.threads.find(t => t.finding_id === findingId);
  
  if (!thread) {
    console.error(`❌ Finding ${findingId} not found in decisions.json`);
    process.exit(1);
  }
  
  // Add PM response
  thread.messages.push({
    role: 'system',
    text: message,
    timestamp: new Date().toISOString()
  });
  
  // Keep in discussion until human responds again
  thread.status = 'in_discussion';
  
  // Save
  fs.writeFileSync(DECISIONS_PATH, JSON.stringify(data, null, 2));
  
  console.log(`✅ Added PM response to ${findingId}`);
  console.log(`   Status: in_discussion`);
  console.log(`   Message: ${message.substring(0, 80)}...`);
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node docs/scripts/pm-respond.js <finding_id> "<message>"');
  console.log('Example: node docs/scripts/pm-respond.js F-643 "This means..."');
  process.exit(1);
}

respond(args[0], args.slice(1).join(' '));

