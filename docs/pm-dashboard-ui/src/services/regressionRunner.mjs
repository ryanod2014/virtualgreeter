/**
 * Regression Runner Service
 * 
 * Runs regression tests for tickets and handles results.
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.mjs';
import { eventBus } from '../events/eventBus.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database module - will be injected
let db = null;

class RegressionRunner {
  constructor() {
    this.projectRoot = config.paths.projectRoot;
  }

  /**
   * Set the database module (dependency injection)
   */
  setDB(dbModule) {
    db = dbModule;
  }

  /**
   * Run regression tests for a ticket
   */
  async run(ticketId, branch) {
    const scriptPath = join(this.projectRoot, 'scripts/run-regression-tests.sh');

    if (!existsSync(scriptPath)) {
      throw new Error('Regression test script not found');
    }

    console.log(`🧪 Running regression tests for ${ticketId}...`);

    return new Promise((resolve, reject) => {
      const proc = spawn('bash', [scriptPath, ticketId, branch || ''], {
        cwd: this.projectRoot,
        env: { ...process.env, DASHBOARD_URL: 'http://localhost:3456' }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      proc.on('close', (code) => {
        const passed = code === 0;
        
        if (passed) {
          console.log(`✅ Regression tests passed for ${ticketId}`);
        } else {
          console.log(`❌ Regression tests failed for ${ticketId}`);
          
          // Create blocker file
          this.createBlocker(ticketId, branch, stdout + stderr);
        }

        eventBus.emit('regression:completed', {
          ticketId,
          branch,
          passed,
          output: (stdout + stderr).slice(-5000)
        });

        resolve({
          passed,
          output: (stdout + stderr).slice(-5000)
        });
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Create a blocker file for regression failures
   */
  createBlocker(ticketId, branch, output) {
    const blockerDir = join(this.projectRoot, 'docs/agent-output/blocked');
    const blockerPath = join(blockerDir, `REGRESSION-${ticketId}-${Date.now()}.json`);
    const blockerType = 'REGRESSION-FAILED';

    const blocker = {
      ticket_id: ticketId,
      blocker_type: blockerType,
      branch: branch,
      blocked_at: new Date().toISOString(),
      summary: 'Regression tests failed - dev broke code outside ticket scope',
      output: output.slice(-10000),
      dispatch_action: 'create_continuation_ticket'
    };

    try {
      if (!existsSync(blockerDir)) {
        mkdirSync(blockerDir, { recursive: true });
      }
      writeFileSync(blockerPath, JSON.stringify(blocker, null, 2));
      console.log(`📝 Created blocker: ${blockerPath}`);
      
      // Emit event for self-healing loop
      eventBus.emit('blocker:created', { 
        ticketId, 
        blockerType, 
        path: blockerPath 
      });
    } catch (e) {
      console.error('Failed to create blocker file:', e.message);
    }
  }
}

export const regressionRunner = new RegressionRunner();
export default regressionRunner;
