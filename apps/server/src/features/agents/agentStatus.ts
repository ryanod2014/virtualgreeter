/**
 * Agent Status Utilities for Payment Failure Handling
 *
 * This module provides utilities to restrict agent availability based on organization
 * subscription status. Prevents agents from going available when their organization
 * has payment issues (past_due, cancelled, or paused subscriptions).
 *
 * @module agentStatus
 */

import { getOrgSubscriptionStatus } from "../../lib/organization.js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js";

/**
 * Checks if an organization's subscription is in past_due status.
 *
 * @param {string} orgId - The organization ID to check
 * @returns {Promise<boolean>} True if organization is past_due, false otherwise
 */
export async function isOrgPastDue(orgId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(orgId);
  return status === "past_due";
}

/**
 * Determines if an agent from a given organization can go available to take calls.
 * Checks the organization's subscription status and blocks availability if the
 * organization has payment issues (past_due, cancelled, or paused).
 *
 * This function is called:
 * - On agent login (AGENT_LOGIN event) - forces agent to "away" if org not operational
 * - When agent tries to go available (AGENT_BACK event) - blocks status change if org not operational
 *
 * @param {string} orgId - The organization ID to check
 * @returns {Promise<Object>} Result object with:
 *   - canGoAvailable: boolean - Whether agent can go available
 *   - reason?: string - Machine-readable reason code if blocked (payment_failed, subscription_cancelled, subscription_paused)
 *   - message?: string - User-facing error message if blocked
 *
 * @example
 * const check = await canAgentGoAvailable("org_123");
 * if (!check.canGoAvailable) {
 *   console.log(`Blocked: ${check.reason}`);
 *   socket.emit("error", { message: check.message });
 * }
 */
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

/**
 * Returns the user-facing error message shown to agents when they are blocked
 * from going available due to payment issues.
 *
 * @returns {string} User-facing error message
 */
export function getPaymentBlockedMessage(): string {
  return "Unable to go live - there's a payment issue with your organization's account. Please contact your administrator.";
}

/**
 * Checks if an organization is in an operational state (can use the service).
 * Operational states are "active" (paying subscription) or "trialing" (free trial).
 *
 * @param {string} orgId - The organization ID to check
 * @returns {Promise<boolean>} True if organization is active or trialing, false otherwise
 */
export async function isOrgOperational(orgId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(orgId);
  return status === "active" || status === "trialing";
}

/**
 * Fetches the organization ID for a given agent by querying the agent_profiles table.
 * Used to determine which organization's subscription status should be checked when
 * an agent attempts to go available.
 *
 * @param {string} agentId - The agent ID (UUID from agent_profiles.id)
 * @returns {Promise<string | null>} Organization ID if found, null if not found or on error
 *
 * @example
 * const orgId = await getAgentOrgId(agentId);
 * if (orgId) {
 *   const check = await canAgentGoAvailable(orgId);
 *   // ...
 * }
 */
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
