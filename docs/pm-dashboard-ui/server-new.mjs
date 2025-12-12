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
      
      // Auto-processable blockers → Create continuation ticket
      const autoProcessTypes = ['QA-FAILED', 'CI-FAILED', 'REGRESSION-FAILED', 'UI-REJECTED'];
      if (!autoProcessTypes.some(t => blockerType.toUpperCase().includes(t))) {
        console.log(`⚠️ Unknown blocker type ${blockerType} for ${ticketId} → Inbox`);
        dbModule.tickets.update(ticketId, { status: 'blocked' });
        return { success: true, action: 'escalated_to_human', ticketId };
      }
      
      // Calculate new ticket ID (TKT-007 → TKT-007-v2, TKT-007-v2 → TKT-007-v3)
      // Handle both uppercase and lowercase version suffixes
      const baseId = ticketId.replace(/-[vV]\d+$/i, ''); // Strip existing version (case-insensitive)
      const versionMatch = ticketId.match(/-[vV](\d+)$/i);
      const currentVersion = versionMatch ? parseInt(versionMatch[1]) : 1;
      const newVersion = currentVersion + 1;
      const newTicketId = `${baseId}-v${newVersion}`; // Always use lowercase 'v'
      
      // Check max iterations
      if (newVersion > 5) {
        console.log(`🛑 ${ticketId} reached max iterations (5). Escalating to human.`);
        dbModule.tickets.update(ticketId, { 
          status: 'blocked', 
          blocker_summary: 'Max iterations reached (5). Needs human review.' 
        });
        return { success: false, action: 'max_iterations', ticketId };
      }
      
      // Create continuation ticket (copy of original + blocker info)
      const continuationTicket = {
        id: newTicketId,
        title: ticket.title,
        priority: ticket.priority,
        feature: ticket.feature,
        difficulty: ticket.difficulty,
        status: 'ready',
        source: `Continuation of ${ticketId}`,
        issue: `${ticket.issue || ''}\n\n--- BLOCKER FROM PREVIOUS ATTEMPT ---\n${blockerDetails.summary || blockerType}\n${blockerDetails.output ? blockerDetails.output.slice(-2000) : ''}`.trim(),
        feature_docs: ticket.feature_docs,
        similar_code: ticket.similar_code,
        files_to_modify: ticket.files_to_modify,
        files_to_read: ticket.files_to_read,
        out_of_scope: ticket.out_of_scope,
        fix_required: ticket.fix_required,
        acceptance_criteria: ticket.acceptance_criteria,
        risks: ticket.risks,
        dev_checks: ticket.dev_checks,
        qa_notes: ticket.qa_notes,
        parent_ticket_id: baseId,
        iteration: newVersion
      };
      
      dbModule.tickets.create(continuationTicket);
      console.log(`✅ Created continuation ticket: ${newTicketId}`);
      
      // Create prompt file for continuation ticket
      try {
        const { readFileSync, writeFileSync, existsSync, readdirSync } = await import('fs');
        const { join } = await import('path');
        const promptsDir = join(config.paths.projectRoot, 'docs/prompts/active');
        
        // Find the original prompt file (try multiple patterns)
        const baseIdLower = baseId.toLowerCase();
        const baseIdUpper = baseId.toUpperCase();
        const ticketIdLower = ticketId.toLowerCase();
        const ticketIdUpper = ticketId.toUpperCase();
        
        let originalPromptPath = null;
        let originalPromptContent = '';
        
        // Look for existing prompt files
        const promptFiles = readdirSync(promptsDir).filter(f => f.endsWith('.md'));
        for (const pattern of [ticketIdLower, ticketIdUpper, ticketId, baseIdLower, baseIdUpper, baseId]) {
          const match = promptFiles.find(f => f.toLowerCase().includes(pattern.toLowerCase()));
          if (match) {
            originalPromptPath = join(promptsDir, match);
            originalPromptContent = readFileSync(originalPromptPath, 'utf8');
            break;
          }
        }
        
        // Generate continuation prompt
        const blockerSection = `
---

## ⚠️ CONTINUATION - Previous Attempt Failed

**Original Ticket:** ${ticketId}
**Blocker Type:** ${blockerType}
**Attempt:** v${newVersion}

### What Went Wrong

${blockerDetails.summary || 'Previous attempt did not pass validation.'}

${blockerDetails.failures ? `### Specific Failures\n${Array.isArray(blockerDetails.failures) ? blockerDetails.failures.map(f => `- ${f}`).join('\n') : blockerDetails.failures}` : ''}

${blockerDetails.recommendation ? `### Recommendation\n${blockerDetails.recommendation}` : ''}

${blockerDetails.output ? `### Error Output (last 1000 chars)\n\`\`\`\n${blockerDetails.output.slice(-1000)}\n\`\`\`` : ''}

### Your Task

Fix the issues identified above. The branch already exists with previous work - build on it, don't start over.

---
`;

        let newPromptContent;
        if (originalPromptContent) {
          // Insert blocker section after the header
          const headerEnd = originalPromptContent.indexOf('---');
          if (headerEnd > 0) {
            const secondDash = originalPromptContent.indexOf('---', headerEnd + 3);
            if (secondDash > 0) {
              newPromptContent = originalPromptContent.slice(0, secondDash + 3) + '\n' + blockerSection + originalPromptContent.slice(secondDash + 3);
            } else {
              newPromptContent = originalPromptContent + '\n' + blockerSection;
            }
          } else {
            newPromptContent = blockerSection + '\n' + originalPromptContent;
          }
          
          // Update ticket ID references
          newPromptContent = newPromptContent.replace(new RegExp(ticketId, 'gi'), newTicketId);
          newPromptContent = newPromptContent.replace(/Version:\s*v\d+/i, `Version: v${newVersion}`);
          newPromptContent = newPromptContent.replace(/Attempt:\s*v\d+/i, `Attempt: v${newVersion}`);
        } else {
          // Generate a basic prompt if original not found
          newPromptContent = `# Dev Agent Continuation: ${newTicketId}

> **One-liner to launch:**
> \`You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-${newTicketId}-v1.md\`

${blockerSection}

## Original Ticket Info

**Title:** ${ticket.title}
**Priority:** ${ticket.priority || 'medium'}

## The Problem

${ticket.issue || 'See original ticket for details.'}

## Files to Modify

${ticket.files_to_modify ? (typeof ticket.files_to_modify === 'string' ? JSON.parse(ticket.files_to_modify) : ticket.files_to_modify).map(f => `- \`${f}\``).join('\n') : 'See original ticket.'}

## Acceptance Criteria

${ticket.acceptance_criteria ? (typeof ticket.acceptance_criteria === 'string' ? JSON.parse(ticket.acceptance_criteria) : ticket.acceptance_criteria).map(c => `- [ ] ${c}`).join('\n') : 'See original ticket.'}

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

See \`docs/workflow/DEV_AGENT_SOP.md\` for reporting requirements.
`;
        }
        
        // Write the new prompt file
        const newPromptPath = join(promptsDir, `dev-agent-${newTicketId}-v1.md`);
        writeFileSync(newPromptPath, newPromptContent);
        console.log(`📝 Created prompt file: dev-agent-${newTicketId}-v1.md`);
        
      } catch (e) {
        console.error(`Failed to create prompt file: ${e.message}`);
        // Don't fail the whole operation if prompt creation fails
      }
      
      // Cancel original ticket and release its locks
      dbModule.tickets.update(ticketId, {
        status: 'cancelled',
        blocker_summary: `Superseded by ${newTicketId}`,
        updated_at: new Date().toISOString()
      });
      console.log(`🚫 Cancelled original ticket: ${ticketId}`);
      
      // Release file locks from the cancelled ticket's sessions
      if (dbModule.locks && dbModule.sessions) {
        const sessions = dbModule.sessions.list({ ticket_id: ticketId });
        for (const s of sessions) {
          dbModule.locks.release(s.id);
        }
        if (sessions.length > 0) {
          console.log(`🔓 Released locks from ${sessions.length} session(s) for ${ticketId}`);
        }
      }
      
      // Archive the blocker file
      if (blockerPath) {
        try {
          const { renameSync, existsSync, mkdirSync } = await import('fs');
          const { join, basename } = await import('path');
          const archiveDir = join(config.paths.projectRoot, 'docs/agent-output/blocked/archive');
          if (!existsSync(archiveDir)) mkdirSync(archiveDir, { recursive: true });
          renameSync(blockerPath, join(archiveDir, basename(blockerPath)));
          console.log(`📁 Archived blocker: ${basename(blockerPath)}`);
        } catch (e) {
          console.error(`Failed to archive blocker: ${e.message}`);
        }
      }
      
      // Auto-launch dev agent for continuation ticket (completes the self-healing loop)
      try {
        scheduler.enqueue({
          type: 'dev_launch',
          ticketId: newTicketId,
          payload: { triggered_by: 'dispatch_continuation' }
        });
        console.log(`🚀 Queued dev_launch for ${newTicketId}`);
      } catch (e) {
        console.error(`Failed to queue dev_launch: ${e.message}`);
      }
      
      return { success: true, action: 'continuation_created', originalTicket: ticketId, newTicket: newTicketId };
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
