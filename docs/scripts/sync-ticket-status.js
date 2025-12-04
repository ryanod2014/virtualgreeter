#!/usr/bin/env node
/**
 * Sync Ticket Status
 * 
 * Reads tickets.json and updates findings.json to mark findings that
 * already have tickets created.
 * 
 * Usage: node docs/scripts/sync-ticket-status.js
 */

const fs = require('fs');
const path = require('path');

const TICKETS_PATH = path.join(__dirname, '../data/tickets.json');
const FINDINGS_PATH = path.join(__dirname, '../data/findings.json');

// Parse ticket source to extract category and number
// Examples: "Findings A-cobrowse-viewer #1, #2" -> [{ category: 'A-cobrowse-viewer', num: 1 }, { category: 'A-cobrowse-viewer', num: 2 }]
function parseTicketSource(source, ticketId) {
  const results = [];
  
  if (!source) return results;
  
  // Match patterns like "Finding X #1" or "Findings X #1, #2"
  // Also handle "D4-agent-management" style categories
  const categoryMatch = source.match(/Finding[s]?\s+([A-Za-z0-9_-]+)\s+#/);
  if (!categoryMatch) return results;
  
  const category = categoryMatch[1].toLowerCase();
  
  // Extract all #N references
  const numMatches = source.matchAll(/#(\d+)/g);
  for (const match of numMatches) {
    results.push({
      category,
      num: parseInt(match[1]),
      ticketId
    });
  }
  
  // Handle multiple categories in same source
  // "Findings A-cobrowse-viewer #1, #2; V-cobrowse-sender #1"
  const parts = source.split(';');
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim();
      const catMatch = part.match(/([A-Za-z0-9_-]+)\s+#/);
      if (catMatch) {
        const cat = catMatch[1].toLowerCase();
        const nums = part.matchAll(/#(\d+)/g);
        for (const m of nums) {
          results.push({
            category: cat,
            num: parseInt(m[1]),
            ticketId
          });
        }
      }
    }
  }
  
  return results;
}

function main() {
  console.log('📥 Loading tickets.json...');
  const ticketsData = JSON.parse(fs.readFileSync(TICKETS_PATH, 'utf8'));
  const tickets = ticketsData.tickets || ticketsData; // Handle both formats
  
  console.log('📥 Loading findings.json...');
  const findingsData = JSON.parse(fs.readFileSync(FINDINGS_PATH, 'utf8'));
  
  // Build a map of which findings have tickets
  // Key: "category|num" -> ticketId
  const ticketedFindings = new Map();
  
  for (const ticket of tickets) {
    const sources = parseTicketSource(ticket.source, ticket.id);
    for (const s of sources) {
      const key = `${s.category}|${s.num}`;
      ticketedFindings.set(key, s.ticketId);
    }
  }
  
  console.log(`   Found ${ticketedFindings.size} finding references in ${tickets.length} tickets`);
  
  // Track findings per category to determine which # they are
  const categoryCounters = new Map();
  let updatedCount = 0;
  
  for (const finding of findingsData.findings) {
    const cat = (finding.category || '').toLowerCase();
    
    // Increment counter for this category
    const currentNum = (categoryCounters.get(cat) || 0) + 1;
    categoryCounters.set(cat, currentNum);
    
    // Check if this finding has a ticket
    const key = `${cat}|${currentNum}`;
    const ticketId = ticketedFindings.get(key);
    
    if (ticketId) {
      if (finding.status !== 'ticketed') {
        finding.status = 'ticketed';
        finding.ticket_id = ticketId;
        updatedCount++;
        console.log(`   ✓ ${finding.id} (${cat} #${currentNum}) → ${ticketId}`);
      }
    }
  }
  
  // Update summary counts
  findingsData.summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    ticketed: 0,
    rejected: 0
  };
  
  for (const f of findingsData.findings) {
    findingsData.summary[f.severity]++;
    if (f.status === 'pending') findingsData.summary.pending++;
    else if (f.status === 'ticketed') findingsData.summary.ticketed++;
    else if (f.status === 'rejected') findingsData.summary.rejected++;
  }
  
  console.log(`\n📊 Updated ${updatedCount} findings to ticketed status`);
  console.log(`   Total ticketed: ${findingsData.summary.ticketed}`);
  console.log(`   Total pending: ${findingsData.summary.pending}`);
  
  // Save updated findings
  console.log('\n💾 Saving findings.json...');
  fs.writeFileSync(FINDINGS_PATH, JSON.stringify(findingsData, null, 2));
  
  // Also update findings-summary.json
  const summaryPath = path.join(__dirname, '../data/findings-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(findingsData.summary, null, 2));
  
  console.log('✅ Sync complete!');
}

main();

