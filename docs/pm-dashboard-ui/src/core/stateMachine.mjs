/**
 * Ticket State Machine
 * 
 * This is THE ONLY place that knows valid status transitions.
 * All status changes MUST go through this module.
 */

import { eventBus } from '../events/eventBus.mjs';
import config from '../config.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// STATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const STATES = {
  // Pre-work
  DRAFT: 'draft',
  READY: 'ready',
  
  // Development
  IN_PROGRESS: 'in_progress',
  DEV_COMPLETE: 'dev_complete',
  
  // Testing
  IN_REVIEW: 'in_review',        // Regression tests running
  QA_PENDING: 'qa_pending',      // QA agent running
  QA_APPROVED: 'qa_approved',    // QA passed, awaiting next step
  QA_FAILED: 'qa_failed',        // QA failed, needs retry
  
  // UI Review (optional)
  UI_REVIEW: 'ui_review',        // Waiting for human UI approval
  
  // Finalization
  FINALIZING: 'finalizing',      // Test+Doc agents running
  READY_TO_MERGE: 'ready_to_merge', // All done, awaiting manual merge
  
  // Terminal
  MERGED: 'merged',
  BLOCKED: 'blocked',            // Human decision needed
  CANCELLED: 'cancelled',
  
  // Legacy (for backwards compatibility)
  CONTINUATION_READY: 'continuation_ready',
  QA_PASSED: 'qa_passed',  // Legacy alias for qa_approved
};

// ═══════════════════════════════════════════════════════════════════════════
// VALID TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

const TRANSITIONS = {
  [STATES.DRAFT]:           [STATES.READY, STATES.CANCELLED],
  [STATES.READY]:           [STATES.IN_PROGRESS, STATES.CANCELLED],
  [STATES.IN_PROGRESS]:     [STATES.DEV_COMPLETE, STATES.BLOCKED],
  [STATES.DEV_COMPLETE]:    [STATES.IN_REVIEW],
  [STATES.IN_REVIEW]:       [STATES.QA_PENDING, STATES.BLOCKED],
  [STATES.QA_PENDING]:      [STATES.QA_APPROVED, STATES.QA_FAILED, STATES.QA_PASSED],
  [STATES.QA_APPROVED]:     [STATES.FINALIZING, STATES.UI_REVIEW],
  [STATES.QA_FAILED]:       [STATES.IN_PROGRESS, STATES.BLOCKED, STATES.CONTINUATION_READY],
  [STATES.UI_REVIEW]:       [STATES.FINALIZING, STATES.BLOCKED],
  [STATES.FINALIZING]:      [STATES.READY_TO_MERGE, STATES.BLOCKED],
  [STATES.READY_TO_MERGE]:  [STATES.MERGED],
  [STATES.BLOCKED]:         [STATES.IN_PROGRESS, STATES.CANCELLED, STATES.CONTINUATION_READY],
  [STATES.MERGED]:          [],  // Terminal
  [STATES.CANCELLED]:       [],  // Terminal
  [STATES.CONTINUATION_READY]: [STATES.IN_PROGRESS],
  [STATES.QA_PASSED]: [STATES.FINALIZING, STATES.UI_REVIEW],  // Same as QA_APPROVED
};

// Database module - will be injected
let db = null;

/**
 * Set the database module (dependency injection)
 */
export function setDB(dbModule) {
  db = dbModule;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSITION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a transition is valid
 */
export function canTransition(fromStatus, toStatus) {
  const validNext = TRANSITIONS[fromStatus] || [];
  return validNext.includes(toStatus);
}

/**
 * Get valid next states for a given status
 */
export function getValidTransitions(status) {
  return TRANSITIONS[status] || [];
}

/**
 * Perform a state transition with validation
 * 
 * @param {string} ticketId - The ticket ID
 * @param {string} toStatus - Target status
 * @param {object} metadata - Additional fields to update
 * @returns {object} Updated ticket
 * @throws {Error} If transition is invalid
 */
export function transition(ticketId, toStatus, metadata = {}) {
  if (!db) {
    throw new Error('Database not initialized. Call setDB() first.');
  }
  
  const ticket = db.tickets.get(ticketId);
  
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }
  
  const fromStatus = ticket.status;
  
  if (!canTransition(fromStatus, toStatus)) {
    throw new Error(
      `Invalid transition: ${fromStatus} → ${toStatus}. ` +
      `Valid transitions from ${fromStatus}: ${TRANSITIONS[fromStatus]?.join(', ') || 'none'}`
    );
  }
  
  // Check iteration limit for retries
  if (toStatus === STATES.IN_PROGRESS && 
      [STATES.QA_FAILED, STATES.BLOCKED, STATES.CONTINUATION_READY].includes(fromStatus)) {
    const newIteration = (ticket.iteration || 1) + 1;
    if (newIteration > config.limits.maxIterations) {
      throw new Error(
        `Ticket ${ticketId} has reached max iterations (${config.limits.maxIterations}). ` +
        `Requires human decision.`
      );
    }
    metadata.iteration = newIteration;
  }
  
  // Perform the update
  const updated = db.tickets.update(ticketId, { 
    status: toStatus,
    ...metadata 
  });
  
  // Log event if available
  if (db.logEvent) {
    db.logEvent('ticket_status_changed', 'state_machine', 'ticket', ticketId, {
      from: fromStatus,
      to: toStatus,
      metadata
    });
  }
  
  // Emit event for other modules to react
  eventBus.emit('ticket:transitioned', {
    ticketId,
    fromStatus,
    toStatus,
    ticket: updated,
  });
  
  console.log(`📋 ${ticketId}: ${fromStatus} → ${toStatus}`);
  
  return updated;
}

/**
 * Force a transition (for admin/recovery use)
 * Logs a warning but allows any transition
 */
export function forceTransition(ticketId, toStatus, reason, metadata = {}) {
  if (!db) {
    throw new Error('Database not initialized. Call setDB() first.');
  }
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  
  console.warn(`⚠️ FORCE TRANSITION: ${ticketId} ${ticket.status} → ${toStatus}. Reason: ${reason}`);
  
  if (db.logEvent) {
    db.logEvent('forced_transition', 'admin', 'ticket', ticketId, {
      from: ticket.status,
      to: toStatus,
      reason,
    });
  }
  
  const updated = db.tickets.update(ticketId, { status: toStatus, ...metadata });
  
  eventBus.emit('ticket:transitioned', {
    ticketId,
    fromStatus: ticket.status,
    toStatus,
    ticket: updated,
    forced: true,
  });
  
  return updated;
}

/**
 * Get valid next states for a ticket
 */
export function getNextStates(ticketId) {
  if (!db) return [];
  
  const ticket = db.tickets.get(ticketId);
  if (!ticket) return [];
  return TRANSITIONS[ticket.status] || [];
}

/**
 * Get all defined states
 */
export function getAllStates() {
  return Object.values(STATES);
}

export default {
  STATES,
  setDB,
  canTransition,
  getValidTransitions,
  transition,
  forceTransition,
  getNextStates,
  getAllStates,
};
