#!/usr/bin/env node
/**
 * Sync Findings Script
 * 
 * Parses REVIEW_FINDINGS.md and generates findings.json with:
 * - Structured finding data
 * - Dynamic options based on finding type/severity
 * - Recommended option highlighted
 * 
 * Usage: node docs/scripts/sync-findings.js
 */

const fs = require('fs');
const path = require('path');

const REVIEW_FINDINGS_PATH = path.join(__dirname, '../REVIEW_FINDINGS.md');
const FINDINGS_JSON_PATH = path.join(__dirname, '../data/findings.json');
const DECISIONS_JSON_PATH = path.join(__dirname, '../data/decisions.json');

// Option templates based on finding patterns
const OPTION_TEMPLATES = {
  // Cancellation-specific (check BEFORE billing since it's more specific)
  cancellation: {
    patterns: ['cancellation', 'cancel subscription', 'not actually cancel', 'stripe cancel', 'cancel stripe'],
    options: [
      { id: 'cancel_immediate', label: 'Implement actual Stripe cancellation (immediate)', recommended: true },
      { id: 'cancel_period_end', label: 'Cancel at end of billing period (grace period)' },
      { id: 'cancel_with_feedback', label: 'Cancel with feedback collection before' },
      { id: 'cancel_refund', label: 'Cancel + prorated refund' },
      { id: 'custom', label: 'Need different approach...' }
    ]
  },

  // Security-related findings
  security: {
    patterns: ['password', 'sensitive', 'credit card', 'token', 'pci', 'gdpr', 'privacy', 'encrypt', 'sanitize', 'mask'],
    options: [
      { id: 'implement_strict', label: 'Implement strict sanitization (mask ALL sensitive fields)', recommended: true },
      { id: 'implement_configurable', label: 'Make sanitization configurable per-org' },
      { id: 'allowlist', label: 'Use allowlist approach (opt-in capture only)' },
      { id: 'blocklist', label: 'Use blocklist approach (opt-out of capture)' },
      { id: 'skip', label: 'Skip - not applicable to our use case' }
    ]
  },
  
  // Performance-related findings
  performance: {
    patterns: ['latency', 'slow', 'performance', 'pagination', 'cache', 'bandwidth', 'memory', 'compress', 'large'],
    options: [
      { id: 'implement_now', label: 'Implement optimization now (before scale issues)', recommended: true },
      { id: 'implement_later', label: 'Add to backlog - not urgent yet' },
      { id: 'monitor_first', label: 'Add monitoring first, then decide' },
      { id: 'configurable', label: 'Make thresholds configurable' },
      { id: 'skip', label: 'Skip - acceptable trade-off' }
    ]
  },
  
  // Billing/Subscription findings
  billing: {
    patterns: ['billing', 'subscription', 'payment', 'invoice', 'stripe', 'cancel', 'pause', 'trial', 'plan'],
    options: [
      { id: 'strict_block', label: 'Block access immediately on payment failure', recommended: true },
      { id: 'grace_period', label: 'Allow grace period before blocking' },
      { id: 'soft_warning', label: 'Show warning but allow continued access' },
      { id: 'admin_only', label: 'Notify admin only, no user-facing changes' },
      { id: 'custom', label: 'Need different approach...' }
    ]
  },
  
  // Compliance/Legal findings
  compliance: {
    patterns: ['compliance', 'consent', 'gdpr', 'ccpa', 'hipaa', 'regulation', 'legal', 'two-party', 'recording'],
    options: [
      { id: 'full_compliance', label: 'Implement full compliance (consent + indicator)', recommended: true },
      { id: 'indicator_only', label: 'Add indicator only (assume implied consent)' },
      { id: 'org_configurable', label: 'Make compliance settings per-org configurable' },
      { id: 'defer', label: 'Defer - needs legal review first' },
      { id: 'skip', label: 'Skip - not required for our jurisdictions' }
    ]
  },
  
  // UX/Accessibility findings
  ux: {
    patterns: ['loading', 'spinner', 'accessibility', 'aria', 'screen reader', 'wcag', 'ux', 'user experience', 'indicator'],
    options: [
      { id: 'implement', label: 'Implement UX improvement' },
      { id: 'implement_minimal', label: 'Implement minimal version', recommended: true },
      { id: 'defer', label: 'Add to UX backlog - not critical path' },
      { id: 'skip', label: 'Skip - edge case not worth effort' }
    ]
  },
  
  // Data retention findings
  retention: {
    patterns: ['retention', 'delete', 'cleanup', 'archive', 'expire', 'ttl', 'purge'],
    options: [
      { id: 'auto_delete', label: 'Auto-delete after retention period expires', recommended: true },
      { id: 'soft_delete', label: 'Soft delete with recovery option' },
      { id: 'manual_cleanup', label: 'Manual cleanup only (admin action)' },
      { id: 'archive_first', label: 'Archive to cold storage before deletion' },
      { id: 'skip', label: 'Skip - keep indefinitely' }
    ]
  },
  
  // API/Integration findings
  api: {
    patterns: ['api', 'rate limit', 'timeout', 'retry', 'webhook', 'integration', 'third-party', 'external'],
    options: [
      { id: 'robust_handling', label: 'Implement retry + fallback + caching', recommended: true },
      { id: 'retry_only', label: 'Add retry mechanism only' },
      { id: 'fallback', label: 'Add graceful degradation/fallback' },
      { id: 'upgrade_tier', label: 'Upgrade to paid tier of service' },
      { id: 'skip', label: 'Skip - current behavior acceptable' }
    ]
  },
  
  // Documentation/Config issues - CHECK THIS FIRST (before realtime)
  documentation: {
    patterns: ['contradiction', 'mismatch', 'docs say', 'documentation says', 'frequency', 'uptime', 'monitoring', 'free tier'],
    options: [
      { id: 'fix_docs', label: 'Fix the documentation to match reality', recommended: true },
      { id: 'fix_code', label: 'Fix the code/config to match docs' },
      { id: 'clarify_both', label: 'Update both docs and code for clarity' },
      { id: 'skip', label: 'Skip - not a real issue' }
    ]
  },
  
  // WebRTC/Real-time findings - more specific patterns
  realtime: {
    patterns: ['webrtc', 'ice restart', 'ice candidate', 'peer connection', 'rtc', 'media stream'],
    options: [
      { id: 'auto_reconnect', label: 'Implement auto-reconnect with retry', recommended: true },
      { id: 'manual_reconnect', label: 'Add manual "Reconnect" button' },
      { id: 'improve_status', label: 'Better status indicators only' },
      { id: 'defer', label: 'Defer - needs WebRTC expertise' },
      { id: 'skip', label: 'Skip - rare edge case' }
    ]
  },
  
  // Default options for unmatched findings
  default: {
    patterns: [],
    options: [
      { id: 'implement', label: 'Implement suggested fix', recommended: true },
      { id: 'modify', label: 'Implement with modifications...' },
      { id: 'defer', label: 'Add to backlog - not urgent' },
      { id: 'needs_info', label: 'Need more information...' },
      { id: 'skip', label: 'Skip - not applicable' }
    ]
  }
};

// Combine related findings detection
const COMBINABLE_PATTERNS = [
  { pattern: /password|credit card|sensitive data|sanitiz/i, group: 'sensitive_data_sanitization' },
  { pattern: /billing|payment|subscription|pause/i, group: 'billing_flow' },
  { pattern: /consent|recording|indicator/i, group: 'recording_consent' },
  { pattern: /retry|reconnect|failure.*handling/i, group: 'error_recovery' }
];

function parseReviewFindings(content) {
  const findings = [];
  let currentFeature = null;
  let currentCategory = null;
  let globalFindingCounter = 0;  // Global counter for unique IDs
  
  const lines = content.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Match feature section header: ## A-cobrowse-viewer - Co-Browse Viewer
    const featureMatch = line.match(/^## ([A-Za-z0-9-]+) - (.+)$/);
    if (featureMatch) {
      currentCategory = featureMatch[1];
      currentFeature = featureMatch[2];
      i++;
      continue;
    }
    
    // Also match simpler format: ## Feature Name
    const simpleFeatureMatch = line.match(/^## ([^#].+)$/);
    if (simpleFeatureMatch && !line.includes('Findings') && !line.includes('Summary') && !line.includes('How This')) {
      if (!currentFeature) {
        currentFeature = simpleFeatureMatch[1];
        currentCategory = simpleFeatureMatch[1].toLowerCase().replace(/\s+/g, '-');
      }
      i++;
      continue;
    }
    
    // Match finding header: #### N. Title
    const findingMatch = line.match(/^#### \d+\.\s*(.+)$/);
    if (findingMatch && currentFeature) {
      globalFindingCounter++;
      const finding = {
        id: `F-${String(globalFindingCounter).padStart(3, '0')}`,
        feature: currentFeature,
        category: currentCategory,
        title: findingMatch[1].trim(),
        severity: 'medium',
        location: '',
        issue: '',
        suggested_fix: '',
        agent_options: [],      // Options provided by review agent
        agent_recommendation: '', // Agent's recommended option
        status: 'pending',
        ticket_id: null
      };
      
      // Parse finding details
      i++;
      let parsingOptions = false;
      while (i < lines.length && !lines[i].match(/^#{1,4}\s/) && lines[i] !== '---') {
        const detailLine = lines[i].trim();
        
        if (detailLine.startsWith('- **Category:**')) {
          parsingOptions = false;
          // Skip - we use our own categorization
        } else if (detailLine.startsWith('- **Severity:**')) {
          parsingOptions = false;
          const sev = detailLine.replace('- **Severity:**', '').trim().toLowerCase();
          finding.severity = sev;
        } else if (detailLine.startsWith('- **Location:**')) {
          parsingOptions = false;
          finding.location = detailLine.replace('- **Location:**', '').trim();
        } else if (detailLine.startsWith('- **Issue:**')) {
          parsingOptions = false;
          finding.issue = detailLine.replace('- **Issue:**', '').trim();
        } else if (detailLine.startsWith('- **Suggested Fix:**')) {
          parsingOptions = false;
          finding.suggested_fix = detailLine.replace('- **Suggested Fix:**', '').trim();
        } else if (detailLine.startsWith('- **Options:**')) {
          parsingOptions = true;
          // Options follow on subsequent lines
        } else if (parsingOptions && detailLine.match(/^\d+\.\s+/)) {
          // Parse numbered option: "1. Option text here"
          const optionText = detailLine.replace(/^\d+\.\s+/, '').trim();
          finding.agent_options.push(optionText);
        } else if (detailLine.startsWith('- **Recommendation:**')) {
          parsingOptions = false;
          finding.agent_recommendation = detailLine.replace('- **Recommendation:**', '').trim();
        } else if (detailLine.startsWith('- **Human Decision:**')) {
          parsingOptions = false;
          const decision = detailLine.replace('- **Human Decision:**', '').trim();
          if (decision.includes('APPROVED') || decision.includes('TICKETED') || decision.includes('📋')) {
            finding.status = 'ticketed';
            // Extract ticket ID if present
            const ticketMatch = decision.match(/TKT-\d+/);
            if (ticketMatch) {
              finding.ticket_id = ticketMatch[0];
            }
          } else if (decision.includes('REJECTED') || decision.includes('❌')) {
            finding.status = 'rejected';
          } else if (decision.includes('MODIFIED') || decision.includes('🔄')) {
            finding.status = 'modified';
          }
        } else if (parsingOptions) {
          // Continue parsing if we're in options mode but line doesn't match pattern
          // (might be continuation or different format)
        }
        i++;
      }
      
      // Use agent options if provided, otherwise generate fallback options
      finding.options = generateOptions(finding);
      
      // Check for combinable findings
      finding.combinable_with = findCombinableFindings(finding, findings);
      
      findings.push(finding);
      continue;
    }
    
    i++;
  }
  
  return findings;
}

function generateOptions(finding) {
  // PRIORITY 1: Use options from review agent if provided
  if (finding.agent_options && finding.agent_options.length > 0) {
    return finding.agent_options.map((optText, idx) => {
      // Check if this is the recommended option
      const isRecommended = finding.agent_recommendation && 
        (finding.agent_recommendation.toLowerCase().includes(`option ${idx + 1}`) ||
         finding.agent_recommendation.toLowerCase().includes(optText.toLowerCase().substring(0, 20)));
      
      return {
        id: `agent_opt_${idx + 1}`,
        label: optText,
        recommended: isRecommended
      };
    });
  }
  
  // PRIORITY 2: If only suggested_fix exists (old format), show it as single option
  if (finding.suggested_fix && finding.suggested_fix.length > 0) {
    return [
      { id: 'implement', label: `Implement: ${finding.suggested_fix.substring(0, 100)}${finding.suggested_fix.length > 100 ? '...' : ''}`, recommended: true },
      { id: 'modify', label: 'Implement with modifications...' },
      { id: 'defer', label: 'Add to backlog - not urgent' },
      { id: 'skip', label: 'Skip - not worth fixing' }
    ];
  }
  
  // PRIORITY 3: Generic fallback (should rarely happen)
  return [
    { id: 'implement', label: 'Implement suggested fix', recommended: true },
    { id: 'modify', label: 'Implement with modifications...' },
    { id: 'defer', label: 'Add to backlog - not urgent' },
    { id: 'skip', label: 'Skip - not applicable' }
  ];
}

function customizeOptions(baseOptions, finding) {
  return baseOptions.map(opt => ({
    ...opt,
    // Add finding-specific context to labels where helpful
    label: opt.label.replace('{fix}', finding.suggested_fix.substring(0, 50))
  }));
}

function findCombinableFindings(currentFinding, existingFindings) {
  const combinable = [];
  const currentText = `${currentFinding.title} ${currentFinding.issue}`;
  
  for (const pattern of COMBINABLE_PATTERNS) {
    if (pattern.pattern.test(currentText)) {
      // Find other findings in same group
      for (const existing of existingFindings) {
        const existingText = `${existing.title} ${existing.issue}`;
        if (pattern.pattern.test(existingText) && existing.id !== currentFinding.id) {
          combinable.push({
            id: existing.id,
            title: existing.title,
            group: pattern.group
          });
        }
      }
    }
  }
  
  return combinable.length > 0 ? combinable : null;
}

function generateFindingsSummary(findings) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    ticketed: 0,
    rejected: 0
  };
  
  for (const f of findings) {
    summary[f.severity]++;
    if (f.status === 'pending') summary.pending++;
    else if (f.status === 'ticketed') summary.ticketed++;
    else if (f.status === 'rejected') summary.rejected++;
  }
  
  return summary;
}

function loadExistingDecisions() {
  try {
    if (fs.existsSync(DECISIONS_JSON_PATH)) {
      return JSON.parse(fs.readFileSync(DECISIONS_JSON_PATH, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load existing decisions:', e.message);
  }
  return { threads: [] };
}

function mergeWithExistingFindings(newFindings) {
  // Load existing findings to preserve status and ticket_id
  // NOTE: We do NOT preserve options - they should be regenerated
  try {
    if (fs.existsSync(FINDINGS_JSON_PATH)) {
      const existing = JSON.parse(fs.readFileSync(FINDINGS_JSON_PATH, 'utf8'));
      const existingMap = new Map();
      
      for (const f of existing.findings || []) {
        // Key by title + feature for matching
        const key = `${f.feature}|${f.title}`;
        existingMap.set(key, f);
      }
      
      // Merge status from existing (but NOT options - regenerate those)
      for (const f of newFindings) {
        const key = `${f.feature}|${f.title}`;
        const existingFinding = existingMap.get(key);
        if (existingFinding) {
          f.status = existingFinding.status || f.status;
          f.ticket_id = existingFinding.ticket_id || f.ticket_id;
          f.id = existingFinding.id || f.id; // Preserve IDs
          // Options are regenerated fresh each time
        }
      }
    }
  } catch (e) {
    console.warn('Could not merge with existing findings:', e.message);
  }
  
  return newFindings;
}

function main() {
  console.log('📥 Reading REVIEW_FINDINGS.md...');
  
  if (!fs.existsSync(REVIEW_FINDINGS_PATH)) {
    console.error('❌ REVIEW_FINDINGS.md not found at:', REVIEW_FINDINGS_PATH);
    process.exit(1);
  }
  
  const content = fs.readFileSync(REVIEW_FINDINGS_PATH, 'utf8');
  console.log(`   File size: ${(content.length / 1024).toFixed(1)} KB`);
  
  console.log('🔍 Parsing findings...');
  let findings = parseReviewFindings(content);
  console.log(`   Found ${findings.length} findings`);
  
  console.log('🔗 Merging with existing status...');
  findings = mergeWithExistingFindings(findings);
  
  const summary = generateFindingsSummary(findings);
  console.log(`   Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}, Low: ${summary.low}`);
  console.log(`   Pending: ${summary.pending}, Ticketed: ${summary.ticketed}, Rejected: ${summary.rejected}`);
  
  // Build output
  const output = {
    meta: {
      last_updated: new Date().toISOString().split('T')[0],
      total_findings: findings.length,
      format_version: '3.0',
      synced_from: 'REVIEW_FINDINGS.md'
    },
    summary,
    findings
  };
  
  console.log('💾 Writing findings.json...');
  fs.writeFileSync(FINDINGS_JSON_PATH, JSON.stringify(output, null, 2), 'utf8');
  
  // Also update findings-summary.json for dashboard
  const summaryPath = path.join(__dirname, '../data/findings-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  
  console.log('✅ Sync complete!');
  console.log(`   Output: ${FINDINGS_JSON_PATH}`);
  console.log(`   Summary: ${summaryPath}`);
}

main();

