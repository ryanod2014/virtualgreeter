/**
 * Auto-Resume Scheduler for Paused Subscriptions
 *
 * This module implements a scheduled job that automatically resumes
 * paused subscriptions when their pause_ends_at date is reached.
 *
 * Job runs every hour to check for organizations that need to be resumed.
 */

import { supabase } from "../../lib/supabase.js";

// Default interval: 1 hour (in milliseconds)
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SCHEDULER_INTERVAL_MS = parseInt(
  process.env["RESUME_SCHEDULER_INTERVAL_MS"] ?? String(DEFAULT_INTERVAL_MS),
  10
);

let schedulerIntervalId: NodeJS.Timeout | null = null;

/**
 * Processes a single organization for auto-resume
 */
async function resumeOrganization(orgId: string, orgName: string | null) {
  try {
    console.log(
      `[AutoResume] Processing org: ${orgName ?? orgId} (${orgId})`
    );

    if (!supabase) {
      throw new Error("Supabase client not configured");
    }

    // Update organization to active status
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        subscription_status: "active",
        paused_at: null,
        pause_ends_at: null,
        pause_months: null,
        pause_reason: null,
      })
      .eq("id", orgId);

    if (updateError) {
      console.error(
        `[AutoResume] Failed to update org ${orgId}:`,
        updateError
      );
      throw updateError;
    }

    // Record in pause history (auto-resumed)
    const { error: historyError } = await supabase
      .from("pause_history")
      .insert({
        organization_id: orgId,
        user_id: null, // Auto-resume has no user
        action: "resumed",
        pause_months: null,
        reason: "auto_resumed",
      });

    if (historyError) {
      console.error(
        `[AutoResume] Failed to record pause history for org ${orgId}:`,
        historyError
      );
      // Don't throw - the resume itself succeeded
    }

    console.log(`[AutoResume] ✅ Successfully resumed org: ${orgId}`);

    // In production, you would also:
    // 1. Resume Stripe subscription (call Stripe API)
    // 2. Send confirmation email to admin
    // 3. Re-enable widgets on all sites
  } catch (error) {
    console.error(
      `[AutoResume] Error processing org ${orgId}:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Main job function that queries and processes expired pauses
 */
export async function runAutoResumeJob() {
  try {
    const now = new Date().toISOString();
    console.log(`[AutoResume] Running job at ${now}`);

    if (!supabase) {
      console.error("[AutoResume] Supabase client not configured");
      return;
    }

    // Query organizations where pause_ends_at <= now AND status = 'paused'
    const { data: orgsToResume, error: queryError } = await supabase
      .from("organizations")
      .select("id, name, pause_ends_at")
      .eq("subscription_status", "paused")
      .not("pause_ends_at", "is", null)
      .lte("pause_ends_at", now);

    if (queryError) {
      console.error("[AutoResume] Query error:", queryError);
      throw queryError;
    }

    if (!orgsToResume || orgsToResume.length === 0) {
      console.log("[AutoResume] No organizations to resume");
      return;
    }

    console.log(
      `[AutoResume] Found ${orgsToResume.length} organization(s) to resume`
    );

    // Process each organization
    const results = await Promise.allSettled(
      orgsToResume.map((org) => resumeOrganization(org.id, org.name))
    );

    // Log summary
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `[AutoResume] Job complete: ${successful} succeeded, ${failed} failed`
    );

    if (failed > 0) {
      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason);
      console.error("[AutoResume] Failed resumes:", errors);
    }
  } catch (error) {
    console.error(
      "[AutoResume] Job execution error:",
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Starts the auto-resume scheduler
 */
export function startAutoResumeScheduler() {
  if (schedulerIntervalId) {
    console.warn("[AutoResume] Scheduler already running");
    return;
  }

  console.log(
    `[AutoResume] Starting scheduler (interval: ${SCHEDULER_INTERVAL_MS / 1000}s)`
  );

  // Run immediately on startup
  runAutoResumeJob().catch((error) => {
    console.error("[AutoResume] Initial job failed:", error);
  });

  // Schedule recurring job
  schedulerIntervalId = setInterval(() => {
    runAutoResumeJob().catch((error) => {
      console.error("[AutoResume] Scheduled job failed:", error);
    });
  }, SCHEDULER_INTERVAL_MS);

  console.log("[AutoResume] ✅ Scheduler started");
}

/**
 * Stops the auto-resume scheduler (for graceful shutdown)
 */
export function stopAutoResumeScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log("[AutoResume] Scheduler stopped");
  }
}
