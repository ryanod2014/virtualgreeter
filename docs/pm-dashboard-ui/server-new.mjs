#!/usr/bin/env node

/**
 * PM Dashboard Server (Modular Version)
 * 
 * This is the new entry point that uses the modular architecture.
 * Run with: node docs/pm-dashboard-ui/server-new.js
 * 
 * Environment variables:
 *   PORT - Server port (default: 3456)
 *   AUTOMATION_ENABLED - Enable all automation (default: false)
 *   DEBUG_REQUESTS - Log all requests (default: false)
 *   DEBUG_EVENTS - Log all events (default: false)
 */

import { createApp } from './src/api/index.mjs';
import { initializeDB } from './src/db/index.mjs';
import { scheduler } from './src/core/scheduler.mjs';
import { setDB as setStateMachineDB } from './src/core/stateMachine.mjs';
import { init as initOrchestrator } from './src/core/orchestrator.mjs';
import { agentLauncher } from './src/services/agentLauncher.mjs';
import { regressionRunner } from './src/services/regressionRunner.mjs';
import { eventBus } from './src/events/eventBus.mjs';
import config from './src/config.mjs';

// Route initializers
import { initTicketsRoutes } from './src/api/routes/tickets.mjs';
import { initJobsRoutes } from './src/api/routes/jobs.mjs';
import { initAgentsRoutes } from './src/api/routes/agents.mjs';
import { initDashboardRoutes } from './src/api/routes/dashboard.mjs';
import { initDataRoutes } from './src/api/routes/data.mjs';
import { initActionsRoutes } from './src/api/routes/actions.mjs';
import { initInboxRoutes } from './src/api/routes/inbox.mjs';

const PORT = process.env.PORT || 3456;

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PM Dashboard Server (Modular Architecture)');
  console.log('═══════════════════════════════════════════════════════════════');

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE DATABASE
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('\n📦 Initializing database...');
  let dbModule;
  try {
    dbModule = await initializeDB();
    console.log('✅ Database initialized');
  } catch (e) {
    console.error('❌ Failed to initialize database:', e.message);
    console.log('   Run: cd scripts/db && npm install && npm run init');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE MODULES
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('\n🔧 Initializing modules...');
  
  // Set DB on all modules
  setStateMachineDB(dbModule);
  scheduler.setDB(dbModule);
  agentLauncher.setDB(dbModule);
  regressionRunner.setDB(dbModule);
  
  // Initialize orchestrator with dependencies
  initOrchestrator(dbModule, agentLauncher);
  
  // Initialize routes
  initTicketsRoutes(dbModule);
  initJobsRoutes(dbModule);
  initAgentsRoutes(dbModule);
  initDashboardRoutes(dbModule);
  initDataRoutes(dbModule);
  initActionsRoutes(dbModule);
  initInboxRoutes(dbModule);
  
  console.log('✅ Modules initialized');

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER JOB HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('\n📋 Registering job handlers...');
  
scheduler.registerHandler('regression_test', async (job) => {
    const result = await regressionRunner.run(job.ticket_id, job.branch);

    // Update ticket status based on result
    if (result.passed) {
      dbModule.tickets.update(job.ticket_id, { status: 'qa_pending' });
      console.log(`📋 ${job.ticket_id}: regression passed → qa_pending`);
      
      // Auto-queue QA agent
      scheduler.enqueue({
        type: 'qa_launch',
        ticketId: job.ticket_id,
        payload: { triggered_by: 'regression_passed' }
      });
      console.log(`🚀 Queued qa_launch for ${job.ticket_id}`);
    } else {
      dbModule.tickets.update(job.ticket_id, { status: 'blocked' });
    }

    return result;
  });
  
  scheduler.registerHandler('dev_launch', async (job) => {
    const ticket = dbModule.tickets.get(job.ticket_id);
    return await agentLauncher.launchDev(ticket);
  });
  
  scheduler.registerHandler('qa_launch', async (job) => {
    const ticket = dbModule.tickets.get(job.ticket_id);
    return await agentLauncher.launchQa(ticket);
  });
  
  scheduler.registerHandler('test_agent', async (job) => {
    const ticket = dbModule.tickets.get(job.ticket_id);
    return await agentLauncher.launchTest(ticket);
    // NOTE: Don't check for completion here - the job completes when script launches,
    // but the agent session completes later. We listen for session completion below.
  });
  
  scheduler.registerHandler('doc_agent', async (job) => {
    const ticket = dbModule.tickets.get(job.ticket_id);
    return await agentLauncher.launchDoc(ticket);
    // NOTE: Don't check for completion here - see above.
  });
  
  // Listen for agent session completion to trigger merge check
  eventBus.on('agent:session:completed', async ({ ticketId, agentType, sessionId }) => {
    console.log(`🏁 Session completed: ${ticketId} / ${agentType}`);
    
    // Only check for test/doc completion
    if (agentType === 'test' || agentType === 'test_lock' || agentType === 'doc') {
      await checkFinalizingComplete(ticketId, agentType);
    }
  });
  
  // Helper: Check if both test+doc SESSIONS are done, then queue merge
  // NOTE: We check sessions, not jobs, because jobs complete when the script launches,
  // but sessions complete when the agent actually finishes its work.
  async function checkFinalizingComplete(ticketId, completedType) {
    // Get all sessions for this ticket
    const sessions = dbModule.sessions?.list ? dbModule.sessions.list({ ticket_id: ticketId }) : [];
    
    // Check for completed test and doc sessions
    // agent_type could be 'test', 'test_lock', or 'test_agent'
    const testDone = sessions.some(s => 
      (s.agent_type === 'test' || s.agent_type === 'test_lock' || s.agent_type === 'test_agent') && 
      s.status === 'completed'
    );
    const docDone = sessions.some(s => 
      (s.agent_type === 'doc' || s.agent_type === 'doc_agent') && 
      s.status === 'completed'
    );
    
    console.log(`📊 ${ticketId} finalizing check: test=${testDone ? '✅' : '⏳'} doc=${docDone ? '✅' : '⏳'}`);
    
    // If both are done, queue selective merge
    if (testDone && docDone) {
      // Double-check ticket is still in finalizing (prevent duplicate merges)
      const ticket = dbModule.tickets.get(ticketId);
      if (ticket?.status !== 'finalizing') {
        console.log(`⚠️ ${ticketId} not in finalizing (${ticket?.status}), skipping merge`);
        return;
      }
      
      console.log(`✅ Both test+doc sessions complete for ${ticketId}, queuing selective merge...`);
      
      // Update status to ready_to_merge
      dbModule.tickets.update(ticketId, { status: 'ready_to_merge' });
      
      scheduler.enqueue({
        type: 'selective_merge',
        ticketId,
        payload: { triggered_by: 'finalizing_complete' }
      });
    }
  }
  
  // Selective merge - only merge specific files, not full branch
  scheduler.registerHandler('selective_merge', async (job) => {
    const ticketId = job.ticket_id;
    const ticket = dbModule.tickets.get(ticketId);
    
    if (!ticket) {
      return { success: false, error: 'Ticket not found' };
    }
    
    const branch = ticket.branch || `agent/${ticketId.toLowerCase()}`;
    const filesToModify = ticket.files_to_modify || [];
    
    console.log(`🔀 Starting selective merge for ${ticketId} from branch ${branch}`);
    
    try {
      const { execSync } = await import('child_process');
      const projectRoot = config.paths.projectRoot;
      
      // Fetch latest from origin
      execSync('git fetch origin', { cwd: projectRoot, encoding: 'utf8' });
      
      // Get list of files changed on the branch vs main
      let changedFiles = [];
      try {
        const diffOutput = execSync(
          `git diff --name-only origin/main...origin/${branch}`,
          { cwd: projectRoot, encoding: 'utf8' }
        );
        changedFiles = diffOutput.trim().split('\n').filter(Boolean);
      } catch (e) {
        console.error(`Failed to get diff: ${e.message}`);
        changedFiles = [...filesToModify];
      }
      
      // Filter to only include:
      // 1. Files from ticket.files_to_modify (dev changes)
      // 2. Doc files (docs/)
      // 3. Test files (*.test.*, *.spec.*, __tests__/)
      const allowedFiles = changedFiles.filter(f => {
        const isDevFile = filesToModify.includes(f);
        const isDocFile = f.startsWith('docs/') || f.endsWith('.md');
        const isTestFile = f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__/');
        return isDevFile || isDocFile || isTestFile;
      });
      
      if (allowedFiles.length === 0) {
        console.log(`⚠️ No files to merge for ${ticketId}`);
        dbModule.tickets.update(ticketId, { status: 'merged' });
        return { success: true, action: 'no_files_to_merge', ticketId };
      }
      
      console.log(`📁 Merging ${allowedFiles.length} files: ${allowedFiles.slice(0, 5).join(', ')}${allowedFiles.length > 5 ? '...' : ''}`);
      
      // Ensure we're on main and up to date
      execSync('git checkout main', { cwd: projectRoot, encoding: 'utf8' });
      execSync('git pull origin main', { cwd: projectRoot, encoding: 'utf8' });
      
      // Selectively checkout files from the feature branch
      for (const file of allowedFiles) {
        try {
          execSync(`git checkout origin/${branch} -- "${file}"`, { cwd: projectRoot, encoding: 'utf8' });
          console.log(`  ✓ ${file}`);
        } catch (e) {
          console.error(`  ✗ Failed to checkout ${file}: ${e.message}`);
        }
      }
      
      // Commit the changes
      execSync('git add -A', { cwd: projectRoot, encoding: 'utf8' });
      
      const commitMsg = `feat(${ticketId}): ${ticket.title}\n\nSelective merge from ${branch}\nFiles: ${allowedFiles.length}`;
      try {
        execSync(`git commit -m "${commitMsg}"`, { cwd: projectRoot, encoding: 'utf8' });
      } catch (e) {
        // No changes to commit
        if (e.message.includes('nothing to commit')) {
          console.log(`⚠️ Nothing to commit for ${ticketId}`);
          dbModule.tickets.update(ticketId, { status: 'merged' });
          return { success: true, action: 'nothing_to_commit', ticketId };
        }
        throw e;
      }
      
      // Push to main
      execSync('git push origin main', { cwd: projectRoot, encoding: 'utf8' });
      
      console.log(`✅ Merged ${ticketId} to main (${allowedFiles.length} files)`);
      
      // Update ticket status
      dbModule.tickets.update(ticketId, { status: 'merged' });
      
      // Release file locks
      if (dbModule.locks && dbModule.sessions) {
        const sessions = dbModule.sessions.list({ ticket_id: ticketId });
        for (const s of sessions) {
          dbModule.locks.release(s.id);
        }
      }
      
      return { success: true, action: 'merged', ticketId, filesCount: allowedFiles.length };
      
    } catch (e) {
      console.error(`❌ Merge failed for ${ticketId}: ${e.message}`);
      dbModule.tickets.update(ticketId, { 
        status: 'blocked', 
        blocker_summary: `Merge failed: ${e.message}` 
      });
      return { success: false, error: e.message };
    }
  });

  scheduler.registerHandler('dispatch_blocker', async (job) => {
    // Process a blocker - either escalate to human or create continuation ticket
    const ticketId = job.ticket_id;
    
    // Parse payload (stored as JSON string in SQLite)
    let payload = {};
    try {
      payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : (job.payload || {});
    } catch (e) {
      console.error(`Failed to parse job payload: ${e.message}`);
    }
    
    const blockerType = payload.blockerType || 'unknown';
    const blockerPath = payload.blockerPath || null;
    
    console.log(`📤 Dispatch processing blocker for ${ticketId}: ${blockerType}`);
    
    try {
      const ticket = dbModule.tickets.get(ticketId);
      if (!ticket) {
        console.error(`Ticket ${ticketId} not found`);
        return { success: false, error: 'Ticket not found' };
      }
      
      // Read blocker file for details
      let blockerDetails = {};
      if (blockerPath) {
        try {
          const { readFileSync, existsSync } = await import('fs');
          if (existsSync(blockerPath)) {
            blockerDetails = JSON.parse(readFileSync(blockerPath, 'utf8'));
          }
        } catch (e) {
          console.error(`Failed to read blocker file: ${e.message}`);
        }
      }
      
      // Clarification blockers (product decisions) → Human inbox
      const needsHumanTypes = ['BLOCKED-', 'CLARIFICATION', 'PRODUCT-DECISION'];
      if (needsHumanTypes.some(t => blockerType.toUpperCase().includes(t))) {
        console.log(`👤 ${ticketId} needs human input (${blockerType}) → Inbox`);
        
        // Update ticket status to blocked
        dbModule.tickets.update(ticketId, { 
          status: 'blocked', 
          blocker_summary: blockerDetails.summary || blockerType,
          updated_at: new Date().toISOString()
        });
        
        // TODO: Could add to an inbox table here if needed
        
        return { success: true, action: 'escalated_to_human', ticketId };
      }
      
      // Auto-processable blockers → Launch TICKET AGENT to create smart continuation
      // This matches the mermaid chart: DEV/QA --> blocker --> TICKET AGENT --> TICKETS
      const autoProcessTypes = ['QA-FAILED', 'QA_FAILED', 'QA_FAILURE', 'CI-FAILED', 'REGRESSION-FAILED', 'UI-REJECTED', 'DEV-BLOCKED', 'DEV_BLOCKED'];
      if (!autoProcessTypes.some(t => blockerType.toUpperCase().includes(t))) {
        console.log(`⚠️ Unknown blocker type ${blockerType} for ${ticketId} → Inbox`);
        dbModule.tickets.update(ticketId, { status: 'blocked' });
        return { success: true, action: 'escalated_to_human', ticketId };
      }
      
      // Check max iterations
      const versionMatch = ticketId.match(/-[vV](\d+)$/i);
      const currentVersion = versionMatch ? parseInt(versionMatch[1]) : 1;
      if (currentVersion >= 5) {
        console.log(`🛑 ${ticketId} reached max iterations (5). Escalating to human.`);
        dbModule.tickets.update(ticketId, { 
          status: 'blocked', 
          blocker_summary: 'Max iterations reached (5). Needs human review.' 
        });
        return { success: false, action: 'max_iterations', ticketId };
      }
      
      // Get the blocker filename from the path
      let blockerFilename = null;
      if (blockerPath) {
        const { basename } = await import('path');
        blockerFilename = basename(blockerPath);
      }
      
      // Launch TICKET AGENT to analyze blocker and create smart continuation
      console.log(`🎫 Launching Ticket Agent for ${ticketId} (blocker: ${blockerType})`);
      
      try {
        const result = await agentLauncher.launchTicket(ticketId, blockerFilename);
        
        if (result.launched) {
          console.log(`✅ Ticket Agent launched for ${ticketId}`);
          return { success: true, action: 'ticket_agent_launched', ticketId, blockerType };
        } else {
          console.error(`❌ Ticket Agent failed to launch: ${result.output?.slice(-500)}`);
          dbModule.tickets.update(ticketId, { status: 'blocked', blocker_summary: 'Ticket agent failed to launch' });
          return { success: false, action: 'ticket_agent_failed', ticketId };
        }
      } catch (e) {
        console.error(`❌ Ticket Agent error: ${e.message}`);
        dbModule.tickets.update(ticketId, { status: 'blocked', blocker_summary: `Ticket agent error: ${e.message}` });
        return { success: false, action: 'ticket_agent_error', ticketId, error: e.message };
      }
    } catch (e) {
      console.error(`Dispatch handler error: ${e.message}`);
      return { success: false, error: e.message };
    }
  });

  console.log('✅ Job handlers registered');

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE AND START SERVER
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log('\n🌐 Starting HTTP server...');
  
  const app = createApp();
  
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    
    // Print configuration summary
    console.log('\n📊 Configuration:');
    console.log(`   Automation: ${config.automation.enabled ? '🤖 ENABLED' : '🔒 DISABLED'}`);
    console.log(`   Max Dev Agents: ${config.limits.maxParallelDevAgents}`);
    console.log(`   Max QA Agents: ${config.limits.maxParallelQaAgents}`);
    console.log(`   Max Iterations: ${config.limits.maxIterations}`);
    
    // Start scheduler if automation is enabled
    if (config.automation.enabled) {
      console.log('\n▶️ Starting job scheduler (automation enabled)...');
      scheduler.start();
    } else {
      console.log('\n⏸️ Job scheduler NOT started (automation disabled)');
      console.log('   Enable via: POST /api/v2/config/automation/enable');
      console.log('   Or start manually: POST /api/v2/jobs/start');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  Ready! Open http://localhost:' + PORT + ' in your browser');
    console.log('═══════════════════════════════════════════════════════════════\n');
  });
}

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Run
main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
