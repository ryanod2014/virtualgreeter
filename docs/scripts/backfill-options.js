#!/usr/bin/env node
/**
 * Backfill Options Script v2
 * 
 * Generates CONTEXT-SPECIFIC options based on the actual suggested_fix,
 * not generic templates.
 * 
 * Option 1 = Implement the suggested fix (truncated to fit)
 * Option 2 = Alternative approach
 * Option 3 = Defer/backlog
 * Option 4 = Skip
 * 
 * Usage: node docs/scripts/backfill-options.js
 */

const fs = require('fs');
const path = require('path');

const REVIEW_FINDINGS_PATH = path.join(__dirname, '../REVIEW_FINDINGS.md');

/**
 * Generate smart options based on the finding's content
 */
function generateOptionsForFinding(finding) {
  const title = finding.title || 'this issue';
  const suggestedFix = finding.suggested_fix || '';
  const issue = finding.issue || '';
  const context = `${title} ${issue} ${suggestedFix}`.toLowerCase();
  
  // Extract the core action from suggested fix
  let primaryOption = suggestedFix;
  
  // Truncate if too long (keep it actionable)
  if (primaryOption.length > 80) {
    // Try to find a natural break point
    const breakPoints = ['. ', ', ', ' - ', ' and '];
    for (const bp of breakPoints) {
      const idx = primaryOption.indexOf(bp);
      if (idx > 30 && idx < 80) {
        primaryOption = primaryOption.substring(0, idx);
        break;
      }
    }
    // If still too long, just truncate
    if (primaryOption.length > 80) {
      primaryOption = primaryOption.substring(0, 77) + '...';
    }
  }
  
  // Clean up the primary option
  primaryOption = primaryOption.replace(/^(Add|Implement|Create|Use|Enable|Emit|Show|Display|Update)\s+/i, (match) => match);
  
  // Simple fallback options - no domain-specific generic garbage
  // The agent should provide specific options during review
  
  // If no suggested fix, use title-based option
  if (!suggestedFix || suggestedFix.length < 10) {
    primaryOption = `Fix: ${title}`;
  }
  
  return {
    options: [
      primaryOption,
      'Add to backlog',
      'Skip - acceptable as-is'
    ],
    recommendation: 'Option 1 - implement the suggested fix'
  };
}

function parseFinding(lines, startIndex) {
  const finding = {
    title: '',
    issue: '',
    suggested_fix: '',
    has_options: false,
    startLine: startIndex,
    endLine: startIndex
  };
  
  // Parse title from #### N. Title
  const titleMatch = lines[startIndex].match(/^#### \d+\.\s*(.+)$/);
  if (titleMatch) {
    finding.title = titleMatch[1].trim();
  }
  
  let i = startIndex + 1;
  while (i < lines.length && lines[i] && !lines[i].match(/^#{1,4}\s/) && lines[i] !== '---') {
    const line = lines[i].trim();
    
    if (line.startsWith('- **Issue:**')) {
      finding.issue = line.replace('- **Issue:**', '').trim();
    } else if (line.startsWith('- **Suggested Fix:**')) {
      finding.suggested_fix = line.replace('- **Suggested Fix:**', '').trim();
    } else if (line.startsWith('- **Options:**')) {
      finding.has_options = true;
    }
    
    finding.endLine = i;
    i++;
  }
  
  return finding;
}

function insertOptionsIntoFinding(lines, finding, options) {
  // Find the line with "- **Suggested Fix:**" or "- **Human Decision:**"
  let insertAfterLine = -1;
  
  for (let i = finding.startLine; i <= Math.min(finding.endLine, lines.length - 1); i++) {
    if (!lines[i]) continue;
    if (lines[i].trim().startsWith('- **Suggested Fix:**')) {
      insertAfterLine = i;
    } else if (lines[i].trim().startsWith('- **Human Decision:**') && insertAfterLine === -1) {
      insertAfterLine = i - 1;
    }
  }
  
  if (insertAfterLine === -1) {
    insertAfterLine = Math.min(finding.endLine, lines.length - 1);
  }
  
  // Create options text
  const optionsText = [
    '- **Options:**',
    ...options.options.map((opt, idx) => `  ${idx + 1}. ${opt}`),
    `- **Recommendation:** ${options.recommendation}`
  ];
  
  // Insert after the Suggested Fix line
  lines.splice(insertAfterLine + 1, 0, ...optionsText);
  
  return optionsText.length;
}

function main() {
  console.log('📥 Reading REVIEW_FINDINGS.md...');
  const content = fs.readFileSync(REVIEW_FINDINGS_PATH, 'utf8');
  const lines = content.split('\n');
  
  console.log('🔍 Finding entries without options...');
  
  // First pass: collect all findings
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].match(/^#### \d+\.\s*(.+)$/)) {
      const finding = parseFinding(lines, i);
      if (!finding.has_options) {
        findings.push(finding);
      }
    }
  }
  
  console.log(`   Found ${findings.length} findings without options`);
  
  if (findings.length === 0) {
    console.log('✅ All findings already have options!');
    console.log('\n🔧 To re-generate options, remove - **Options:** lines from REVIEW_FINDINGS.md');
    return;
  }
  
  // Second pass: insert options from END to START (so indices don't shift)
  let processed = 0;
  for (let i = findings.length - 1; i >= 0; i--) {
    const finding = findings[i];
    const options = generateOptionsForFinding(finding);
    insertOptionsIntoFinding(lines, finding, options);
    processed++;
    
    if (processed % 100 === 0) {
      console.log(`   Processed ${processed}/${findings.length} findings...`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${processed} findings`);
  
  // Write updated content
  console.log('\n💾 Writing updated REVIEW_FINDINGS.md...');
  fs.writeFileSync(REVIEW_FINDINGS_PATH, lines.join('\n'), 'utf8');
  
  console.log('✅ Done! Now run: node docs/scripts/sync-findings.js');
}

main();
