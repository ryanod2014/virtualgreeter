/**
 * Scheduler / Job Queue
 * 
 * Simple job queue with:
 * - Pause/resume capability
 * - Max concurrent jobs
 * - Manual trigger or auto-process
 */

import { eventBus } from '../events/eventBus.mjs';
import config from '../config.mjs';

// Database module - will be injected
let db = null;

class Scheduler {
  constructor() {
    this.running = false;
    this.paused = false;
    this.processingInterval = null;
    this.activeJobs = new Map(); // jobId -> { type, ticketId, startedAt }
    this.jobHandlers = new Map(); // job_type -> handler function
  }

  /**
   * Set the database module (dependency injection)
   */
  setDB(dbModule) {
    db = dbModule;
  }

  /**
   * Register a job handler
   */
  registerHandler(jobType, handler) {
    this.jobHandlers.set(jobType, handler);
    console.log(`📝 Registered handler for job type: ${jobType}`);
  }

  /**
   * Add a job to the queue
   */
  enqueue(jobData) {
    if (!db?.jobs) {
      throw new Error('Database not initialized');
    }

    const job = db.jobs.create({
      job_type: jobData.type,
      ticket_id: jobData.ticketId,
      branch: jobData.branch,
      payload: jobData.payload || {},
      priority: jobData.priority || 5,
    });
    
    console.log(`📥 Job queued: ${job.job_type} for ${job.ticket_id || 'system'}`);
    
    eventBus.emit('job:enqueued', job);
    
    return job;
  }
  
  /**
   * Start processing jobs (auto mode)
   */
  start() {
    if (this.running) {
      console.log('⚠️ Scheduler already running');
      return;
    }
    
    this.running = true;
    this.paused = false;
    
    console.log('▶️ Scheduler started');
    
    this.processingInterval = setInterval(() => {
      this.processNext();
    }, config.timeouts.jobProcessIntervalMs);
    
    // Process immediately
    this.processNext();
  }
  
  /**
   * Stop processing jobs
   */
  stop() {
    this.running = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    console.log('⏹️ Scheduler stopped');
  }
  
  /**
   * Pause (finish current, don't start new)
   */
  pause() {
    this.paused = true;
    console.log('⏸️ Scheduler paused');
  }
  
  /**
   * Resume processing
   */
  resume() {
    this.paused = false;
    console.log('▶️ Scheduler resumed');
    this.processNext();
  }
  
  /**
   * Process a single job (can be called manually)
   */
  async processNext() {
    if (this.paused) return null;
    if (!db?.jobs) return null;
    
    const job = db.jobs.getNext();
    if (!job) return null;
    
    // Claim the job
    const claimed = db.jobs.claim(job.id);
    if (!claimed) return null; // Someone else got it
    
    console.log(`⚙️ Processing job: ${claimed.job_type} for ${claimed.ticket_id}`);
    
    // Track active job
    this.activeJobs.set(claimed.id, {
      type: claimed.job_type,
      ticketId: claimed.ticket_id,
      startedAt: new Date(),
    });
    
    try {
      const result = await this.executeJob(claimed);
      db.jobs.complete(claimed.id, result);
      console.log(`✅ Job complete: ${claimed.id}`);
      
      eventBus.emit('job:completed', { job: claimed, result });
      
      return result;
    } catch (e) {
      const newStatus = db.jobs.fail(claimed.id, e.message);
      console.error(`❌ Job failed: ${claimed.id} - ${e.message}`);
      
      eventBus.emit('job:failed', { job: claimed, error: e.message });
      
      if (newStatus === 'pending') {
        console.log(`🔄 Will retry (attempt ${claimed.attempt + 1}/${claimed.max_attempts})`);
      }
      return null;
    } finally {
      this.activeJobs.delete(claimed.id);
    }
  }
  
  /**
   * Execute a specific job type
   */
  async executeJob(job) {
    const handler = this.jobHandlers.get(job.job_type);
    
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.job_type}`);
    }
    
    return await handler(job);
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      running: this.running,
      paused: this.paused,
      pendingCounts: db?.jobs?.getPendingCounts() || [],
      activeJobs: Array.from(this.activeJobs.entries()).map(([id, info]) => ({
        id,
        ...info,
      })),
      registeredHandlers: Array.from(this.jobHandlers.keys()),
    };
  }
  
  /**
   * Clear all pending jobs (emergency)
   */
  clearPending() {
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    const database = db.getDB();
    const result = database.prepare("UPDATE jobs SET status = 'cancelled' WHERE status = 'pending'").run();
    console.log(`🗑️ Cancelled ${result.changes} pending jobs`);
    return result.changes;
  }

  /**
   * Get count of active jobs by type
   */
  getActiveCount(jobType = null) {
    if (jobType) {
      return Array.from(this.activeJobs.values()).filter(j => j.type === jobType).length;
    }
    return this.activeJobs.size;
  }
}

export const scheduler = new Scheduler();
export default scheduler;
