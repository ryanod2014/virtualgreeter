#!/usr/bin/env node
/**
 * Backfill Options Script
 * 
 * Reads REVIEW_FINDINGS.md and adds Options + Recommendation to findings
 * that don't have them, based on analyzing the issue content.
 * 
 * Usage: node docs/scripts/backfill-options.js
 */

const fs = require('fs');
const path = require('path');

const REVIEW_FINDINGS_PATH = path.join(__dirname, '../REVIEW_FINDINGS.md');

// Smart option generators based on issue patterns
const OPTION_GENERATORS = {
  // Implementation missing / TODO
  missing_implementation: {
    patterns: [/not implemented/i, /TODO/i, /missing/i, /doesn't exist/i, /no .* implemented/i],
    generate: (finding) => ({
      options: [
        `Implement ${finding.title.toLowerCase()}`,
        'Implement minimal version first, iterate later',
        'Add to backlog - not blocking',
        'Skip - not needed for MVP'
      ],
      recommendation: 'Option 1 - implement the feature as documented'
    })
  },

  // Mismatch / inconsistency
  mismatch: {
    patterns: [/mismatch/i, /inconsistent/i, /doesn't match/i, /contradicts/i, /but.*says/i],
    generate: (finding) => ({
      options: [
        'Fix the code to match documentation',
        'Fix the documentation to match code',
        'Update both for clarity',
        'Skip - acceptable inconsistency'
      ],
      recommendation: 'Option 1 - code should match documented behavior'
    })
  },

  // Security / sensitive data
  security: {
    patterns: [/sensitive/i, /password/i, /credit card/i, /sanitiz/i, /security/i, /token/i, /pci/i],
    generate: (finding) => ({
      options: [
        'Implement strict sanitization (mask all sensitive fields)',
        'Make sanitization configurable per-org',
        'Use allowlist approach (explicit opt-in)',
        'Skip - not applicable to our use case'
      ],
      recommendation: 'Option 1 - security should be strict by default'
    })
  },

  // Accessibility / UX
  accessibility: {
    patterns: [/accessibility/i, /screen reader/i, /aria/i, /wcag/i, /a11y/i],
    generate: (finding) => ({
      options: [
        'Implement full accessibility support',
        'Add basic accessibility (ARIA labels only)',
        'Add to accessibility backlog',
        'Skip - edge case not worth effort'
      ],
      recommendation: 'Option 2 - basic accessibility is minimum requirement'
    })
  },

  // Error handling / edge cases
  error_handling: {
    patterns: [/error/i, /edge case/i, /fails/i, /crash/i, /undefined/i, /null/i],
    generate: (finding) => ({
      options: [
        'Add proper error handling with user feedback',
        'Add silent error handling (log only)',
        'Add to error handling sprint',
        'Skip - rare edge case'
      ],
      recommendation: 'Option 1 - users should see meaningful errors'
    })
  },

  // Performance / optimization
  performance: {
    patterns: [/slow/i, /performance/i, /optimize/i, /cache/i, /latency/i, /timeout/i],
    generate: (finding) => ({
      options: [
        'Implement optimization now',
        'Add monitoring first, optimize if needed',
        'Add to performance backlog',
        'Skip - acceptable performance'
      ],
      recommendation: 'Option 2 - measure before optimizing'
    })
  },

  // Billing / subscription
  billing: {
    patterns: [/billing/i, /subscription/i, /payment/i, /charge/i, /invoice/i],
    generate: (finding) => ({
      options: [
        'Fix billing logic immediately (revenue impact)',
        'Add billing safeguards and alerts',
        'Document current behavior, fix later',
        'Skip - acceptable risk'
      ],
      recommendation: 'Option 1 - billing bugs are high priority'
    })
  },

  // Cancellation specific
  cancellation: {
    patterns: [/cancel/i, /unsubscribe/i],
    generate: (finding) => ({
      options: [
        'Implement proper cancellation flow',
        'Cancel at end of billing period (grace period)',
        'Add cancellation confirmation step',
        'Skip - current behavior acceptable'
      ],
      recommendation: 'Option 1 - cancellation should work as users expect'
    })
  },

  // Pause subscription
  pause: {
    patterns: [/pause/i, /resume/i, /suspend/i],
    generate: (finding) => ({
      options: [
        'Implement proper pause/resume behavior',
        'Disable features during pause (strict)',
        'Show warnings but allow access (soft)',
        'Skip - pause feature not critical'
      ],
      recommendation: 'Option 1 - pause should fully stop service'
    })
  },

  // Documentation issues
  documentation: {
    patterns: [/documentation/i, /docs say/i, /unclear/i, /ambiguous/i, /confusing/i],
    generate: (finding) => ({
      options: [
        'Clarify documentation with specific behavior',
        'Add code comments explaining the logic',
        'Create FAQ entry for this scenario',
        'Skip - documentation is acceptable'
      ],
      recommendation: 'Option 1 - clear docs prevent future confusion'
    })
  },

  // Notification / email
  notification: {
    patterns: [/notification/i, /email/i, /alert/i, /notify/i],
    generate: (finding) => ({
      options: [
        'Implement notification system',
        'Add email notifications only',
        'Add in-app notifications only',
        'Skip - notifications not critical'
      ],
      recommendation: 'Option 1 - users need to be informed of important events'
    })
  },

  // Default fallback
  default: {
    patterns: [],
    generate: (finding) => ({
      options: [
        `Implement fix: ${finding.suggested_fix.substring(0, 60)}...`,
        'Implement with modifications',
        'Add to backlog - not urgent',
        'Skip - not applicable'
      ],
      recommendation: 'Option 1 - implement the suggested fix'
    })
  }
};

function generateOptionsForFinding(finding) {
  const text = `${finding.title} ${finding.issue} ${finding.suggested_fix}`.toLowerCase();
  
  // Find matching generator
  for (const [name, generator] of Object.entries(OPTION_GENERATORS)) {
    if (name === 'default') continue;
    
    for (const pattern of generator.patterns) {
      if (pattern.test(text)) {
        return generator.generate(finding);
      }
    }
  }
  
  // Fallback to default
  return OPTION_GENERATORS.default.generate(finding);
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
  while (i < lines.length && !lines[i].match(/^#{1,4}\s/) && lines[i] !== '---') {
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
  
  return optionsText.length; // Return number of lines inserted
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

