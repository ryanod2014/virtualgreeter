/**
 * Auto-Resume Service for Paused Subscriptions
 *
 * This module provides utilities to automatically resume paused subscriptions
 * when pause_ends_at is reached. The main auto-resume logic runs via Supabase
 * pg_cron (see migration: 20251210000000_setup_auto_resume_cron.sql).
 *
 * This file provides:
 * 1. Manual trigger function for testing/debugging
 * 2. Monitoring and logging utilities
 * 3. Status checking for paused accounts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ghost-greeter/domain/database.types";

export interface AutoResumeResult {
  organization_id: string;
  organization_name: string | null;
  status: "success" | "error";
  error_message: string | null;
}

export interface AutoResumeSummary {
  total_processed: number;
  succeeded: number;
  failed: number;
  results: AutoResumeResult[];
  timestamp: string;
}

/**
 * Manually trigger the auto-resume function
 *
 * This calls the Supabase function that's normally run by cron.
 * Useful for testing, debugging, or manual intervention.
 *
 * @param supabase - Supabase client with appropriate permissions
 * @returns Summary of resume operations
 */
export async function triggerAutoResume(
  supabase: SupabaseClient<Database>
): Promise<AutoResumeSummary> {
  try {
    // Call the database function
    const { data, error } = await supabase.rpc("auto_resume_expired_pauses");

    if (error) {
      console.error("Failed to trigger auto-resume:", error);
      throw new Error(`Auto-resume failed: ${error.message}`);
    }

    // Process results
    const results = (data as AutoResumeResult[]) || [];
    const succeeded = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;

    const summary: AutoResumeSummary = {
      total_processed: results.length,
      succeeded,
      failed,
      results,
      timestamp: new Date().toISOString(),
    };

    // Log summary
    console.log(
      `[AutoResume] Processed ${summary.total_processed} organizations: ${summary.succeeded} succeeded, ${summary.failed} failed`
    );

    // Log failures for alerting
    if (failed > 0) {
      console.error(
        `[AutoResume] ${failed} organizations failed to resume:`,
        results.filter((r) => r.status === "error")
      );
    }

    return summary;
  } catch (error) {
    console.error("[AutoResume] Unexpected error:", error);
    throw error;
  }
}

/**
 * Get organizations that should be auto-resumed
 *
 * Returns a list of paused organizations where pause_ends_at has passed.
 * Useful for monitoring and alerting.
 *
 * @param supabase - Supabase client
 * @returns Array of organizations ready for resume
 */
export async function getPendingResumes(
  supabase: SupabaseClient<Database>
): Promise<
  Array<{
    id: string;
    name: string;
    paused_at: string | null;
    pause_ends_at: string | null;
    pause_months: number | null;
    hours_overdue: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, paused_at, pause_ends_at, pause_months")
      .eq("subscription_status", "paused")
      .not("pause_ends_at", "is", null)
      .lte("pause_ends_at", new Date().toISOString())
      .order("pause_ends_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch pending resumes:", error);
      throw new Error(`Failed to fetch pending resumes: ${error.message}`);
    }

    // Calculate how overdue each one is
    const now = new Date();
    return (data || []).map((org) => {
      const pauseEndsAt = org.pause_ends_at
        ? new Date(org.pause_ends_at)
        : now;
      const hoursOverdue =
        (now.getTime() - pauseEndsAt.getTime()) / (1000 * 60 * 60);

      return {
        ...org,
        hours_overdue: Math.round(hoursOverdue * 10) / 10, // round to 1 decimal
      };
    });
  } catch (error) {
    console.error("[AutoResume] Failed to get pending resumes:", error);
    throw error;
  }
}

/**
 * Get statistics about paused subscriptions
 *
 * Useful for monitoring dashboard and alerting.
 *
 * @param supabase - Supabase client
 * @returns Statistics object
 */
export async function getPauseStatistics(
  supabase: SupabaseClient<Database>
): Promise<{
  total_paused: number;
  pending_resume_count: number;
  overdue_by_hours: number | null;
  oldest_paused_at: string | null;
}> {
  try {
    // Get count of all paused organizations
    const { count: totalPaused, error: countError } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "paused");

    if (countError) {
      throw new Error(`Failed to count paused orgs: ${countError.message}`);
    }

    // Get pending resumes
    const pendingResumes = await getPendingResumes(supabase);

    // Calculate overdue time for most overdue
    const mostOverdue = pendingResumes[0] || null;

    // Get oldest paused_at for visibility
    const { data: oldestData, error: oldestError } = await supabase
      .from("organizations")
      .select("paused_at")
      .eq("subscription_status", "paused")
      .not("paused_at", "is", null)
      .order("paused_at", { ascending: true })
      .limit(1)
      .single();

    if (oldestError && oldestError.code !== "PGRST116") {
      // PGRST116 = no rows
      throw new Error(`Failed to get oldest paused: ${oldestError.message}`);
    }

    return {
      total_paused: totalPaused || 0,
      pending_resume_count: pendingResumes.length,
      overdue_by_hours: mostOverdue?.hours_overdue || null,
      oldest_paused_at: oldestData?.paused_at || null,
    };
  } catch (error) {
    console.error("[AutoResume] Failed to get pause statistics:", error);
    throw error;
  }
}

/**
 * Check if auto-resume scheduler is working correctly
 *
 * Returns false if there are organizations overdue for resume by more than 2 hours,
 * indicating the cron job might be failing.
 *
 * @param supabase - Supabase client
 * @returns true if healthy, false if issues detected
 */
export async function checkSchedulerHealth(
  supabase: SupabaseClient<Database>
): Promise<{
  healthy: boolean;
  issues: string[];
  statistics: Awaited<ReturnType<typeof getPauseStatistics>>;
}> {
  const issues: string[] = [];

  try {
    const stats = await getPauseStatistics(supabase);

    // Check for overdue resumes (more than 2 hours overdue is a problem)
    if (
      stats.pending_resume_count > 0 &&
      stats.overdue_by_hours &&
      stats.overdue_by_hours > 2
    ) {
      issues.push(
        `${stats.pending_resume_count} organizations are ${stats.overdue_by_hours.toFixed(1)} hours overdue for resume`
      );
    }

    // Check for very old paused accounts (more than 6 months is suspicious)
    if (stats.oldest_paused_at) {
      const oldestDate = new Date(stats.oldest_paused_at);
      const monthsOld =
        (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsOld > 6) {
        issues.push(
          `Oldest paused account is ${monthsOld.toFixed(1)} months old (max pause is 3 months)`
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      statistics: stats,
    };
  } catch (error) {
    console.error("[AutoResume] Health check failed:", error);
    return {
      healthy: false,
      issues: [`Health check failed: ${(error as Error).message}`],
      statistics: {
        total_paused: 0,
        pending_resume_count: 0,
        overdue_by_hours: null,
        oldest_paused_at: null,
      },
    };
  }
}
