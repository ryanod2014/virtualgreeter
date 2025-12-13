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
  });
  
scheduler.registerHandler('doc_agent', async (job) => {
    const ticket = dbModule.tickets.get(job.ticket_id);
    return await agentLauncher.launchDoc(ticket);
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
