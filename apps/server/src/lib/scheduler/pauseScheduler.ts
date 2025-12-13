/**
 * Pause Scheduler - Monitoring and Management for Auto-Resume
 *
 * This module provides tools for monitoring and managing the automatic
 * subscription resume scheduler. The actual scheduling is handled by
 * Supabase pg_cron (see migration: 20251210000000_setup_auto_resume_cron.sql).
 *
 * Key Features:
 * - Health monitoring for the auto-resume scheduler
 * - Manual trigger for testing/debugging
 * - Statistics and reporting
 * - Alerting for failures
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@ghost-greeter/domain/database.types";
import {
  triggerAutoResume,
  getPendingResumes,
  getPauseStatistics,
  checkSchedulerHealth,
  type AutoResumeSummary,
} from "../../features/billing/autoResume";

/**
 * Get Supabase client for scheduler operations
 *
 * This uses service role key for elevated permissions needed by cron jobs.
 * In production, ensure SUPABASE_SERVICE_ROLE_KEY is set.
 */
function getSchedulerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials for scheduler. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

/**
 * Manually run the auto-resume job
 *
 * This is useful for:
 * - Testing the scheduler in development
 * - Manual intervention if cron fails
 * - Debugging resume issues
 *
 * @returns Summary of resume operations
 */
export async function runAutoResumeNow(): Promise<AutoResumeSummary> {
  console.log("[PauseScheduler] Manually triggering auto-resume job...");

  const supabase = getSchedulerClient();
  const summary = await triggerAutoResume(supabase);

  console.log("[PauseScheduler] Manual auto-resume completed:", {
    total: summary.total_processed,
    succeeded: summary.succeeded,
    failed: summary.failed,
  });

  return summary;
}

/**
 * Get current scheduler status and health
 *
 * @returns Health check results with statistics
 */
export async function getSchedulerStatus() {
  console.log("[PauseScheduler] Checking scheduler health...");

  const supabase = getSchedulerClient();
  const health = await checkSchedulerHealth(supabase);

  if (!health.healthy) {
    console.warn(
      "[PauseScheduler] Scheduler health issues detected:",
      health.issues
    );
  } else {
    console.log("[PauseScheduler] Scheduler is healthy");
  }

  return health;
}

/**
 * Get list of organizations pending resume
 *
 * @returns Array of organizations that should be resumed
 */
export async function getPendingResumeList() {
  console.log("[PauseScheduler] Fetching pending resumes...");

  const supabase = getSchedulerClient();
  const pending = await getPendingResumes(supabase);

  console.log(`[PauseScheduler] Found ${pending.length} pending resumes`);

  return pending;
}

/**
 * Get statistics about paused subscriptions
 *
 * @returns Statistics object
 */
export async function getStatistics() {
  console.log("[PauseScheduler] Fetching pause statistics...");

  const supabase = getSchedulerClient();
  const stats = await getPauseStatistics(supabase);

  console.log("[PauseScheduler] Statistics:", stats);

  return stats;
}

/**
 * Monitor scheduler and send alerts if needed
 *
 * This function should be called periodically (e.g., every 15 minutes)
 * to detect scheduler failures and alert administrators.
 *
 * In production, you might:
 * - Send alerts to Slack/PagerDuty/etc when issues detected
 * - Log to monitoring system (DataDog, Sentry, etc)
 * - Automatically retry failed resumes
 *
 * @returns Alert information
 */
export async function monitorScheduler(): Promise<{
  should_alert: boolean;
  alert_message: string | null;
  health_status: Awaited<ReturnType<typeof checkSchedulerHealth>>;
}> {
  console.log("[PauseScheduler] Running scheduler monitoring...");

  try {
    const health = await getSchedulerStatus();

    if (!health.healthy) {
      const alertMessage = `Auto-resume scheduler health check failed:\n${health.issues.join("\n")}`;

      console.error("[PauseScheduler] ALERT:", alertMessage);

      // In production, send alert to monitoring system here
      // Example:
      // await sendSlackAlert(alertMessage);
      // await sentryClient.captureMessage(alertMessage, 'error');

      return {
        should_alert: true,
        alert_message: alertMessage,
        health_status: health,
      };
    }

    return {
      should_alert: false,
      alert_message: null,
      health_status: health,
    };
  } catch (error) {
    const errorMessage = `Scheduler monitoring failed: ${(error as Error).message}`;
    console.error("[PauseScheduler] CRITICAL ERROR:", errorMessage);

    return {
      should_alert: true,
      alert_message: errorMessage,
      health_status: {
        healthy: false,
        issues: [errorMessage],
        statistics: {
          total_paused: 0,
          pending_resume_count: 0,
          overdue_by_hours: null,
          oldest_paused_at: null,
        },
      },
    };
  }
}

// ============================================================================
// CLI-style exports for manual operations
// ============================================================================

/**
 * Main scheduler operations
 *
 * These can be imported and called directly for testing or manual operations.
 */
export const scheduler = {
  /**
   * Manually trigger auto-resume now
   */
  run: runAutoResumeNow,

  /**
   * Get scheduler health status
   */
  health: getSchedulerStatus,

  /**
   * Get list of pending resumes
   */
  pending: getPendingResumeList,

  /**
   * Get statistics
   */
  stats: getStatistics,

  /**
   * Run monitoring check
   */
  monitor: monitorScheduler,
} as const;

// ============================================================================
// Example usage (for testing/debugging)
// ============================================================================
//
// import { scheduler } from './pauseScheduler';
//
// // Manual trigger
// const summary = await scheduler.run();
// console.log('Resume summary:', summary);
//
// // Check health
// const health = await scheduler.health();
// console.log('Scheduler health:', health);
//
// // Get pending resumes
// const pending = await scheduler.pending();
// console.log('Pending resumes:', pending);
//
// // Get statistics
// const stats = await scheduler.stats();
// console.log('Pause statistics:', stats);
//
// // Run monitoring
// const monitoring = await scheduler.monitor();
// if (monitoring.should_alert) {
//   console.error('ALERT:', monitoring.alert_message);
// }
