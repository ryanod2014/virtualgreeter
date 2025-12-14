#!/usr/bin/env node
/**
 * Capture screenshots for UI review
 * Usage: node capture-screenshots.js <ticketId> <branch> <outputDir>
 * 
 * Captures screenshots of key dashboard pages for UI review.
 * Uses npx playwright if playwright is not installed locally.
 */

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e) {
  // Try to find playwright in common locations
  try {
    const globalPath = require('child_process').execSync('npm root -g').toString().trim();
    chromium = require(`${globalPath}/playwright`).chromium;
  } catch (e2) {
    console.error('Playwright not found. Install with: npm install -g playwright');
    process.exit(1);
  }
}

const path = require('path');
const fs = require('fs');

const DASHBOARD_URL = 'http://localhost:3000';

// Pages to capture for different component types
const PAGES_TO_CAPTURE = [
  { name: 'dashboard', path: '/dashboard', description: 'Main Dashboard' },
  { name: 'admin-settings', path: '/admin/settings', description: 'Admin Settings' },
  { name: 'admin-billing', path: '/admin/settings/billing', description: 'Billing Settings' },
];

async function captureScreenshots(ticketId, branch, outputDir) {
  console.log(`📸 Capturing screenshots for ${ticketId}...`);
  
  // Ensure output directory exists
  const screenshotDir = path.join(outputDir, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshots = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    for (const pageInfo of PAGES_TO_CAPTURE) {
      try {
        const url = `${DASHBOARD_URL}${pageInfo.path}`;
        console.log(`  📷 Capturing ${pageInfo.name}: ${url}`);
        
        await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        // Wait a bit for any animations
        await page.waitForTimeout(500);
        
        const filename = `${ticketId}-${pageInfo.name}.png`;
        const filepath = path.join(screenshotDir, filename);
        
        await page.screenshot({ 
          path: filepath, 
          fullPage: false 
        });
        
        screenshots.push({
          name: pageInfo.description,
          path: `screenshots/${filename}`,
          url: pageInfo.path
        });
        
        console.log(`  ✅ Saved: ${filename}`);
      } catch (e) {
        console.log(`  ⚠️ Failed to capture ${pageInfo.name}: ${e.message}`);
      }
    }

    await browser.close();
  } catch (e) {
    console.error(`❌ Screenshot capture failed: ${e.message}`);
    if (browser) await browser.close();
  }

  return screenshots;
}

// CLI entry point
if (require.main === module) {
  const [,, ticketId, branch, outputDir] = process.argv;
  
  if (!ticketId || !outputDir) {
    console.error('Usage: node capture-screenshots.js <ticketId> <branch> <outputDir>');
    process.exit(1);
  }
  
  captureScreenshots(ticketId, branch, outputDir)
    .then(screenshots => {
      console.log(`\n📸 Captured ${screenshots.length} screenshots`);
      // Output JSON for the parent process to read
      console.log('SCREENSHOTS_JSON:' + JSON.stringify(screenshots));
    })
    .catch(e => {
      console.error('Fatal error:', e);
      process.exit(1);
    });
}

module.exports = { captureScreenshots };





