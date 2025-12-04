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
  
  // Generate alternative based on context
  let alternativeOption = 'Implement minimal version first, iterate later';
  let deferOption = 'Add to backlog - not blocking';
  let skipOption = 'Skip - acceptable as-is';
  
  // Customize alternatives based on issue type
  if (context.includes('security') || context.includes('sensitive') || context.includes('password') || context.includes('token')) {
    alternativeOption = 'Add audit logging first, fix in security sprint';
    deferOption = 'Add to security backlog (requires review)';
    skipOption = 'Skip - security risk is acceptable';
  } else if (context.includes('billing') || context.includes('payment') || context.includes('subscription') || context.includes('charge')) {
    alternativeOption = 'Add billing safeguards and monitoring first';
    deferOption = 'Add to billing fixes backlog';
    skipOption = 'Skip - billing impact is acceptable';
  } else if (context.includes('cancel')) {
    alternativeOption = 'Cancel at end of billing period instead';
    deferOption = 'Add cancellation fix to backlog';
    skipOption = 'Skip - current cancellation flow is acceptable';
  } else if (context.includes('call') || context.includes('webrtc') || context.includes('video')) {
    alternativeOption = 'Add warning/confirmation before action';
    deferOption = 'Add to call handling backlog';
    skipOption = 'Skip - edge case acceptable';
  } else if (context.includes('notification') || context.includes('email') || context.includes('alert')) {
    alternativeOption = 'Add in-app notification only (skip email)';
    deferOption = 'Add to notifications backlog';
    skipOption = 'Skip - users will figure it out';
  } else if (context.includes('error') || context.includes('fail') || context.includes('crash')) {
    alternativeOption = 'Add silent error handling (log only)';
    deferOption = 'Add to error handling sprint';
    skipOption = 'Skip - rare edge case';
  } else if (context.includes('performance') || context.includes('slow') || context.includes('cache')) {
    alternativeOption = 'Add monitoring first, optimize if needed';
    deferOption = 'Add to performance backlog';
    skipOption = 'Skip - performance is acceptable';
  } else if (context.includes('documentation') || context.includes('docs') || context.includes('unclear')) {
    alternativeOption = 'Add inline code comments instead';
    deferOption = 'Add to documentation backlog';
    skipOption = 'Skip - docs are clear enough';
  } else if (context.includes('ui') || context.includes('ux') || context.includes('button') || context.includes('display')) {
    alternativeOption = 'Implement simpler UI version first';
    deferOption = 'Add to UX improvements backlog';
    skipOption = 'Skip - current UX is acceptable';
  } else if (context.includes('state') || context.includes('status') || context.includes('sync')) {
    alternativeOption = 'Add state validation on read (defensive)';
    deferOption = 'Add to state management backlog';
    skipOption = 'Skip - state inconsistency is rare';
  }
  
  // If no suggested fix, use title-based option
  if (!suggestedFix || suggestedFix.length < 10) {
    primaryOption = `Fix: ${title}`;
  }
  
  return {
    options: [
      primaryOption,
      alternativeOption,
      deferOption,
      skipOption
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
