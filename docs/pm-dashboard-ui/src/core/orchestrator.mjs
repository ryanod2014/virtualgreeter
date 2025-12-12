/**
 * Orchestrator
 * 
 * Coordinates the pipeline steps. Can run in manual or auto mode.
 * In manual mode, each step must be explicitly triggered via API.
 * In auto mode, it listens to events and queues next steps.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import config from '../config.mjs';
import { eventBus } from '../events/eventBus.mjs';
import { transition, STATES } from './stateMachine.mjs';
import { scheduler } from './scheduler.mjs';

// Database and services - will be injected
let db = null;
let agentLauncher = null;

/**
 * Create a blocker file for Dispatch Agent to process
 */
function createBlockerFile(ticketId, blockerType, details) {
  const blockerDir = join(config.paths.projectRoot, 'docs/agent-output/blocked');
  if (!existsSync(blockerDir)) {
    mkdirSync(blockerDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const filename = `${blockerType}-${ticketId}-${timestamp}.json`;
  const blockerPath = join(blockerDir, filename);
  
  const blocker = {
    ticket_id: ticketId,
    blocker_type: blockerType,
    created_at: new Date().toISOString(),
    dispatch_action: 'create_continuation_ticket',
    ...details
  };
  
  writeFileSync(blockerPath, JSON.stringify(blocker, null, 2));
  console.log(`📝 Created blocker: ${filename}`);
  
  // Emit event for dispatch to pick up
  eventBus.emit('blocker:created', { ticketId, blockerType, path: blockerPath, blocker });
  
  return blockerPath;
}

/**
 * Initialize orchestrator with dependencies
 */
export function init(dbModule, launcher) {
  db = dbModule;
  agentLauncher = launcher;
  
  if (config.automation.enabled) {
    setupAutoHandlers();
  } else {
    console.log('🔒 Automation DISABLED - manual mode active');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL PIPELINE STEPS (called via API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Launch a dev agent for a ticket
 */
export async function launchDevAgent(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  
  // Check status
  if (ticket.status !== STATES.READY && 
      ticket.status !== STATES.QA_FAILED && 
      ticket.status !== STATES.BLOCKED &&
      ticket.status !== STATES.CONTINUATION_READY) {
    throw new Error(`Cannot launch dev agent for ticket in ${ticket.status} status`);
  }
  
  // Check parallel limit
  const runningDev = db.sessions.getRunning().filter(s => s.agent_type === 'dev');
  if (runningDev.length >= config.limits.maxParallelDevAgents) {
    throw new Error(
      `Max parallel dev agents (${config.limits.maxParallelDevAgents}) already running. ` +
      `Wait for one to complete or increase limit.`
    );
  }
  
  // Check file locks
  const filesToModify = ticket.files_to_modify || [];
  if (filesToModify.length > 0) {
    const activeLocks = db.locks.getActive();
    for (const file of filesToModify) {
      const lock = activeLocks.find(l => l.file_path === file);
      if (lock && lock.ticket_id !== ticketId) {
        throw new Error(
          `Cannot launch: file ${file} locked by ${lock.ticket_id}`
        );
      }
    }
  }
  
  // Transition status
  transition(ticketId, STATES.IN_PROGRESS);
  
  // Launch agent
  if (agentLauncher) {
    const result = await agentLauncher.launchDev(ticket);
    return result;
  }
  
  return { success: true, ticketId, message: 'Status updated, agent launcher not configured' };
}

/**
 * Run regression tests for a ticket
 */
export async function runRegression(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  
  if (ticket.status !== STATES.DEV_COMPLETE) {
    throw new Error(`Cannot run regression for ticket in ${ticket.status} status`);
  }
  
  transition(ticketId, STATES.IN_REVIEW);
  
  // Queue regression job
  scheduler.enqueue({
    type: 'regression_test',
    ticketId,
    branch: ticket.branch,
  });
  
  return { queued: true, ticketId };
}

/**
 * Launch QA agent for a ticket
 */
export async function launchQaAgent(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  
  if (ticket.status !== STATES.IN_REVIEW) {
    throw new Error(`Cannot launch QA for ticket in ${ticket.status} status`);
  }
  
  // Check parallel limit
  const runningQa = db.sessions.getRunning().filter(s => s.agent_type === 'qa');
  if (runningQa.length >= config.limits.maxParallelQaAgents) {
    throw new Error(
      `Max parallel QA agents (${config.limits.maxParallelQaAgents}) already running.`
    );
  }
  
  transition(ticketId, STATES.QA_PENDING);
  
  if (agentLauncher) {
    const result = await agentLauncher.launchQa(ticket);
    return result;
  }
  
  return { success: true, ticketId, message: 'Status updated, agent launcher not configured' };
}

/**
 * Process QA result
 */
export function processQaResult(ticketId, passed, details = {}) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  
  if (ticket.status !== STATES.QA_PENDING) {
    throw new Error(`Cannot process QA result for ticket in ${ticket.status} status`);
  }
  
  if (passed) {
    // Check if this is a UI ticket that needs human review
    const filesToModify = ticket.files_to_modify || [];
    const isUiTicket = filesToModify.some(f => 
      f.includes('/components/') || 
      f.includes('/app/') || 
      f.endsWith('.tsx') ||
      f.endsWith('.css')
    );
    
    if (isUiTicket) {
      transition(ticketId, STATES.UI_REVIEW);
    } else {
      transition(ticketId, STATES.QA_APPROVED);
    }
  } else {
    // Create blocker file for Dispatch to auto-create continuation ticket
    createBlockerFile(ticketId, 'QA-FAILED', {
      failures: details.failures || [],
      recommendation: details.recommendation || 'Fix QA failures and retry',
      qa_report: details.qa_report || null,
      branch: ticket.branch || `agent/${ticketId.toLowerCase()}`
    });
    
    transition(ticketId, STATES.QA_FAILED);
  }
  
  return db.tickets.get(ticketId);
}

/**
 * Approve UI review (human action)
 */
export function approveUiReview(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  transition(ticketId, STATES.FINALIZING);
  
  // Queue test+doc agents
  scheduler.enqueue({ type: 'test_agent', ticketId });
  scheduler.enqueue({ type: 'doc_agent', ticketId });
  
  return db.tickets.get(ticketId);
}

/**
 * Reject UI review (human action) - creates blocker for continuation
 */
export function rejectUiReview(ticketId, reason) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  
  // Create blocker file for Dispatch to auto-create continuation ticket
  createBlockerFile(ticketId, 'UI-REJECTED', {
    rejection_reason: reason,
    recommendation: `Fix UI issues: ${reason}`,
    branch: ticket.branch || `agent/${ticketId.toLowerCase()}`
  });
  
  transition(ticketId, STATES.BLOCKED, { rejection_reason: reason });
  
  return db.tickets.get(ticketId);
}

/**
 * Start finalizing (for non-UI tickets after QA approval)
 */
export function startFinalizing(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  transition(ticketId, STATES.FINALIZING);
  
  // Queue test+doc agents
  scheduler.enqueue({ type: 'test_agent', ticketId });
  scheduler.enqueue({ type: 'doc_agent', ticketId });
  
  return db.tickets.get(ticketId);
}

/**
 * Mark ticket ready for manual merge
 */
export function markReadyToMerge(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  transition(ticketId, STATES.READY_TO_MERGE);
  return db.tickets.get(ticketId);
}

/**
 * Complete merge (after human does manual merge)
 */
export function completeMerge(ticketId) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  const ticket = db.tickets.get(ticketId);
  
  // Release file locks
  const sessions = db.sessions.list({ ticket_id: ticketId });
  for (const s of sessions) {
    db.locks.release(s.id);
  }
  
  transition(ticketId, STATES.MERGED);
  return db.tickets.get(ticketId);
}

/**
 * Block a ticket (requires human decision)
 */
export function blockTicket(ticketId, reason) {
  if (!db) throw new Error('Orchestrator not initialized');
  
  transition(ticketId, STATES.BLOCKED, { blocker_summary: reason });
  return db.tickets.get(ticketId);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-MODE EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function setupAutoHandlers() {
  console.log('🤖 Automation ENABLED');
  
  // Auto-advance pipeline on status changes
  eventBus.on('ticket:transitioned', async ({ ticketId, toStatus }) => {
    try {
      if (config.automation.autoQueueOnDevComplete && 
          toStatus === STATES.DEV_COMPLETE) {
        console.log(`🔄 Auto-queuing regression for ${ticketId}`);
        await runRegression(ticketId);
      }
      
      if (config.automation.autoQueueOnQaPass && 
          toStatus === STATES.QA_APPROVED) {
        console.log(`🔄 Auto-queuing finalizing for ${ticketId}`);
        startFinalizing(ticketId);
      }
    } catch (e) {
      console.error(`Auto-handler error for ${ticketId}: ${e.message}`);
    }
  });
  
  // Auto-trigger Dispatch when blockers are created
  eventBus.on('blocker:created', async ({ ticketId, blockerType, path }) => {
    if (!config.automation.autoDispatchOnBlock) return;
    
    console.log(`🚨 Blocker created for ${ticketId} (${blockerType}), triggering Dispatch...`);
    
    // Queue a dispatch job to process the blocker
    try {
      scheduler.enqueue({
        type: 'dispatch_blocker',
        ticketId,
        payload: { blockerType, blockerPath: path }
      });
    } catch (e) {
      console.error(`Failed to queue dispatch for ${ticketId}: ${e.message}`);
    }
  });
}

export const orchestrator = {
  init,
  launchDevAgent,
  runRegression,
  launchQaAgent,
  processQaResult,
  approveUiReview,
  rejectUiReview,
  startFinalizing,
  markReadyToMerge,
  completeMerge,
  blockTicket,
  createBlockerFile,
};

export default orchestrator;
