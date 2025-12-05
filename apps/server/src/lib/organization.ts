/**
 * Organization Status Utilities
 * 
 * Provides functions to check organization subscription status
 * for widget visibility and agent availability control.
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

// Cache for org subscription status (short TTL since status can change)
const orgStatusCache = new Map<string, { status: string | null; expiresAt: number }>();
const CACHE_TTL = 30_000; // 30 seconds - short TTL since pause/resume should take effect quickly

/**
 * Get the subscription status for an organization
 * 
 * @param orgId - Organization ID
 * @returns Subscription status or null if not found
 */
export async function getOrgSubscriptionStatus(orgId: string): Promise<string | null> {
  // Check cache first
  const cached = orgStatusCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status;
  }

  if (!isSupabaseConfigured || !supabase) {
    console.log("[Organization] Supabase not configured, assuming active status");
    return "active";
  }

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("subscription_status")
      .eq("id", orgId)
      .single();

    if (error) {
      console.warn(`[Organization] Failed to fetch status for ${orgId}:`, error.message);
      // Cache null result briefly to avoid hammering DB on repeated failures
      orgStatusCache.set(orgId, { status: null, expiresAt: Date.now() + 5000 });
      return null;
    }

    const status = data?.subscription_status ?? null;
    
    // Cache the result
    orgStatusCache.set(orgId, {
      status,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return status;
  } catch (error) {
    console.error("[Organization] Error fetching subscription status:", error);
    return null;
  }
}

/**
 * Check if an organization is paused
 * 
 * @param orgId - Organization ID
 * @returns true if org is paused, false otherwise
 */
export async function isOrgPaused(orgId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(orgId);
  return status === "paused";
}

/**
 * Check if an organization is active (not paused or cancelled)
 * 
 * @param orgId - Organization ID
 * @returns true if org is active/trialing, false otherwise
 */
export async function isOrgActive(orgId: string): Promise<boolean> {
  const status = await getOrgSubscriptionStatus(orgId);
  // Active statuses that allow widget and agents to function
  return status === "active" || status === "trialing";
}

/**
 * Clear the org status cache for an organization
 * Call this when org status is updated (e.g., after pause/resume)
 * 
 * @param orgId - Organization ID
 */
export function clearOrgStatusCache(orgId: string): void {
  orgStatusCache.delete(orgId);
  console.log(`[Organization] Cleared status cache for org ${orgId}`);
}

/**
 * Clear all cached org statuses
 * Useful for testing or after bulk updates
 */
export function clearAllOrgStatusCache(): void {
  orgStatusCache.clear();
  console.log("[Organization] Cleared all org status cache");
}

