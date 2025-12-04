#!/usr/bin/env node
/**
 * Cleanup Options Script
 * 
 * Removes all Options and Recommendation lines from REVIEW_FINDINGS.md
 * so they can be regenerated fresh by backfill-options.js
 * 
 * Usage: node docs/scripts/cleanup-options.js
 */

const fs = require('fs');
const path = require('path');

const REVIEW_FINDINGS_PATH = path.join(__dirname, '../REVIEW_FINDINGS.md');

function main() {
  console.log('📥 Reading REVIEW_FINDINGS.md...');
  const content = fs.readFileSync(REVIEW_FINDINGS_PATH, 'utf8');
  const lines = content.split('\n');
  
  console.log(`   Total lines: ${lines.length}`);
  
  const cleanedLines = [];
  let removedOptions = 0;
  let removedOptionLines = 0;
  let removedRecommendations = 0;
  let inOptionsBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is the start of an options block
    if (line.trim() === '- **Options:**') {
      inOptionsBlock = true;
      removedOptions++;
      continue; // Skip this line
    }
    
    // Check if we're in an options block and this is a numbered option
    if (inOptionsBlock && line.match(/^\s+\d+\.\s+/)) {
      removedOptionLines++;
      continue; // Skip numbered option lines
    }
    
    // Check if this is a Recommendation line (ends the options block)
    if (line.trim().startsWith('- **Recommendation:**')) {
      inOptionsBlock = false;
      removedRecommendations++;
      continue; // Skip this line
    }
    
    // If we hit any other content, we're out of the options block
    if (inOptionsBlock && line.trim() && !line.match(/^\s+\d+\.\s+/)) {
      inOptionsBlock = false;
    }
    
    // Keep all other lines
    cleanedLines.push(line);
  }
  
  console.log('\n📊 Cleanup Summary:');
  console.log(`   Removed ${removedOptions} "- **Options:**" headers`);
  console.log(`   Removed ${removedOptionLines} numbered option lines`);
  console.log(`   Removed ${removedRecommendations} "- **Recommendation:**" lines`);
  console.log(`   Original lines: ${lines.length}`);
  console.log(`   Cleaned lines: ${cleanedLines.length}`);
  console.log(`   Total removed: ${lines.length - cleanedLines.length}`);
  
  // Write cleaned content
  console.log('\n💾 Writing cleaned REVIEW_FINDINGS.md...');
  fs.writeFileSync(REVIEW_FINDINGS_PATH, cleanedLines.join('\n'), 'utf8');
  
  console.log('✅ Done! Now run: node docs/scripts/backfill-options.js');
}

main();

