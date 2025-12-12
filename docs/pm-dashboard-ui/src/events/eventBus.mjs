/**
 * Event Bus for decoupled communication between modules
 * 
 * Events emitted:
 * - ticket:transitioned - When a ticket changes status
 * - job:enqueued - When a job is added to the queue
 * - job:completed - When a job finishes successfully
 * - job:failed - When a job fails
 * - agent:started - When an agent session starts
 * - agent:completed - When an agent session completes
 * - agent:crashed - When an agent session crashes
 */

import { EventEmitter } from 'events';

class WorkflowEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners for debugging
  }

  /**
   * Emit with logging
   */
  emit(eventName, data) {
    if (process.env.DEBUG_EVENTS === 'true') {
      console.log(`[EVENT] ${eventName}:`, JSON.stringify(data, null, 2));
    }
    return super.emit(eventName, data);
  }
}

export const eventBus = new WorkflowEventBus();
export default eventBus;
