"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CancellationReason, SubscriptionStatus } from "@ghost-greeter/domain/database.types";

interface SubmitCancellationFeedbackParams {
  organizationId: string;
  userId: string;
  primaryReason: CancellationReason;
  additionalReasons: CancellationReason[];
  detailedFeedback: string | null;
  competitorName: string | null;
  wouldReturn: boolean | null;
  returnConditions: string | null;
  agentCount: number;
  monthlyCost: number;
  subscriptionDurationDays: number;
}

export async function submitCancellationFeedback(
  params: SubmitCancellationFeedbackParams
) {
  const supabase = await createClient();

  // Insert the cancellation feedback
  const { error: feedbackError } = await supabase
    .from("cancellation_feedback")
    .insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      primary_reason: params.primaryReason,
      additional_reasons: params.additionalReasons,
      detailed_feedback: params.detailedFeedback,
      competitor_name: params.competitorName,
      would_return: params.wouldReturn,
      return_conditions: params.returnConditions,
      agent_count: params.agentCount,
      monthly_cost: params.monthlyCost,
      subscription_duration_days: params.subscriptionDurationDays,
    });

  if (feedbackError) {
    console.error("Failed to save cancellation feedback:", feedbackError);
    throw new Error("Failed to save cancellation feedback");
  }

  // In production, you would also:
  // 1. Call Stripe to cancel the subscription
  // 2. Update the organization's plan to 'free' or mark as cancelled
  // 3. Send a confirmation email
  // 4. Schedule data retention/deletion

  // For now, we'll just downgrade to free plan
  const { error: updateError } = await supabase
    .from("organizations")
    .update({ plan: "free" })
    .eq("id", params.organizationId);

  if (updateError) {
    console.error("Failed to update organization plan:", updateError);
    // Don't throw - feedback is saved, that's the important part
  }

  revalidatePath("/admin/settings/billing");

  return { success: true };
}

// ============================================================================
// PAUSE ACCOUNT
// ============================================================================

interface PauseAccountParams {
  organizationId: string;
  userId: string;
  pauseMonths: number;
  reason: string | null;
}

export async function pauseAccount(params: PauseAccountParams) {
  const supabase = await createClient();

  // Validate pause months (1, 2, or 3)
  if (![1, 2, 3].includes(params.pauseMonths)) {
    throw new Error("Invalid pause duration. Must be 1, 2, or 3 months.");
  }

  // Calculate pause end date
  const pausedAt = new Date();
  const pauseEndsAt = new Date();
  pauseEndsAt.setMonth(pauseEndsAt.getMonth() + params.pauseMonths);

  // Update organization to paused status
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      subscription_status: "paused" as SubscriptionStatus,
      paused_at: pausedAt.toISOString(),
      pause_ends_at: pauseEndsAt.toISOString(),
      pause_months: params.pauseMonths,
      pause_reason: params.reason,
    })
    .eq("id", params.organizationId);

  if (updateError) {
    console.error("Failed to pause organization:", updateError);
    throw new Error("Failed to pause account");
  }

  // Record in pause history
  const { error: historyError } = await supabase
    .from("pause_history")
    .insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      action: "paused",
      pause_months: params.pauseMonths,
      reason: params.reason,
    });

  if (historyError) {
    console.error("Failed to record pause history:", historyError);
    // Don't throw - the pause itself succeeded
  }

  // In production, you would also:
  // 1. Update Stripe subscription (pause or swap to pause price)
  // 2. Send confirmation email
  // 3. Schedule reminder email for 7 days before resume
  // 4. Disable the widget on all sites

  revalidatePath("/admin/settings/billing");

  return { 
    success: true,
    pauseEndsAt: pauseEndsAt.toISOString(),
  };
}

// ============================================================================
// RESUME ACCOUNT
// ============================================================================

interface ResumeAccountParams {
  organizationId: string;
  userId: string;
}

export async function resumeAccount(params: ResumeAccountParams) {
  const supabase = await createClient();

  // Update organization to active status
  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      subscription_status: "active" as SubscriptionStatus,
      paused_at: null,
      pause_ends_at: null,
      pause_months: null,
      pause_reason: null,
    })
    .eq("id", params.organizationId);

  if (updateError) {
    console.error("Failed to resume organization:", updateError);
    throw new Error("Failed to resume account");
  }

  // Record in pause history
  const { error: historyError } = await supabase
    .from("pause_history")
    .insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      action: "resumed",
      pause_months: null,
      reason: null,
    });

  if (historyError) {
    console.error("Failed to record resume history:", historyError);
    // Don't throw - the resume itself succeeded
  }

  // In production, you would also:
  // 1. Resume Stripe subscription or swap back to full price
  // 2. Send confirmation email
  // 3. Re-enable widgets on all sites

  revalidatePath("/admin/settings/billing");

  return { success: true };
}
