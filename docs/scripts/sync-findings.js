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

// No more template-based options - we use the actual suggested_fix now

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
    // Also supports underscores in section IDs (e.g., M-UPTIME_MONITORING)
    const featureMatch = line.match(/^## ([A-Za-z0-9_-]+) - (.+)$/);
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
      
      // Generate context-specific options from the actual suggested_fix
      finding.options = generateOptions(finding);
      
      findings.push(finding);
      continue;
    }
    
    i++;
  }
  
  return findings;
}

function generateOptions(finding) {
  // Use agent_options if available - these are the actual specific options from the review
  if (finding.agent_options && finding.agent_options.length > 0) {
    // Determine which option is recommended based on agent_recommendation
    const recommendation = (finding.agent_recommendation || '').toLowerCase();
    
    return finding.agent_options.map((label, idx) => {
      const optionNum = idx + 1;
      // Check if this option is recommended (e.g., "Option 1" or matches the label)
      const isRecommended = recommendation.includes(`option ${optionNum}`) || 
                           recommendation.includes(`option${optionNum}`) ||
                           (idx === 0 && !recommendation.includes('option'));
      
      return {
        id: `option_${optionNum}`,
        label: label,
        recommended: isRecommended
      };
    });
  }
  
  // No agent_options - use full suggested_fix as the recommended option
  // No truncation - UI handles text wrapping
  const suggestedFix = finding.suggested_fix || '';
  const title = finding.title || 'this issue';
  
  const option1 = suggestedFix.length >= 5 ? suggestedFix : `Implement: ${title}`;
  
  // Return ONLY the recommended option - no generic fallbacks
  return [
    { id: 'implement_fix', label: option1, recommended: true }
  ];
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

