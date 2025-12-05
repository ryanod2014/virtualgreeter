/**
 * Agent Status Utilities for Payment Failure Handling
 */

import { getOrgSubscriptionStatus } from "../../lib/organization.js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js";

export async function isOrgPastDue(orgId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(orgId);
  return status === "past_due";
}

export async function canAgentGoAvailable(orgId: string): Promise<{
  canGoAvailable: boolean;
  reason?: string;
  message?: string;
}> {
  const status = await getOrgSubscriptionStatus(orgId);
  
  if (status === "past_due") {
    return {
      canGoAvailable: false,
      reason: "payment_failed",
      message: getPaymentBlockedMessage(),
    };
  }
  
  if (status === "cancelled") {
    return {
      canGoAvailable: false,
      reason: "subscription_cancelled",
      message: "Your organization's subscription has been cancelled.",
    };
  }
  
  if (status === "paused") {
    return {
      canGoAvailable: false,
      reason: "subscription_paused",
      message: "Your organization's subscription is paused.",
    };
  }
  
  return { canGoAvailable: true };
}

export function getPaymentBlockedMessage(): string {
  return "Unable to go live - there's a payment issue with your organization's account. Please contact your administrator.";
}

export async function isOrgOperational(orgId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(orgId);
  return status === "active" || status === "trialing";
}

export async function getAgentOrgId(agentId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("[AgentStatus] Supabase not configured");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("agent_profiles")
      .select("organization_id")
      .eq("id", agentId)
      .single();

    if (error || !data) {
      console.error("[AgentStatus] Failed to fetch org:", error?.message);
      return null;
    }

    return data.organization_id;
  } catch (error) {
    console.error("[AgentStatus] Error:", error);
    return null;
  }
}
