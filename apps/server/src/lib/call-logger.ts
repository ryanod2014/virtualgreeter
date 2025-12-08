import { supabase, isSupabaseConfigured } from "./supabase.js";
import type { VisitorLocation } from "@ghost-greeter/domain";
import { randomBytes } from "crypto";

export interface CallLogEntry {
  id?: string;
  organization_id: string;
  site_id: string;
  agent_id: string;
  visitor_id: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "missed" | "cancelled";
  page_url: string;
  ring_started_at?: string;
  answered_at?: string;
  answer_time_seconds?: number;
  duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  recording_url?: string;
  disposition_id?: string;
  visitor_ip?: string;
  visitor_city?: string;
  visitor_region?: string;
  visitor_country?: string;
  visitor_country_code?: string;
  // Call recovery fields
  reconnect_token?: string;
  last_heartbeat_at?: string;
  reconnect_eligible?: boolean;
}

export interface OrphanedCall {
  id: string;
  agent_id: string;
  visitor_id: string;
  organization_id: string;
  page_url: string;
  reconnect_token: string;
  started_at: string;
  last_heartbeat_at: string;
}

// Generate a secure random reconnect token
function generateReconnectToken(): string {
  return randomBytes(32).toString("hex");
}

// In-memory map to track call log IDs for active calls
// Maps requestId/callId -> call_log database ID
const callLogIds = new Map<string, string>();

/**
 * Create a new call log entry when a call request is made (ring starts)
 */
export async function createCallLog(
  requestId: string,
  data: {
    visitorId: string;
    agentId: string;
    orgId: string;
    pageUrl: string;
    ipAddress?: string | null;
    location?: VisitorLocation | null;
  }
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[CallLogger] Supabase not configured, skipping call log");
    return null;
  }

  try {
    // First, get the agent's organization_id from their profile
    const { data: agentProfile } = await supabase
      .from("agent_profiles")
      .select("organization_id")
      .eq("id", data.agentId)
      .single();

    if (!agentProfile) {
      console.warn(`[CallLogger] Agent profile not found for ${data.agentId}`);
      return null;
    }

    // Site ID is no longer used - we use orgId for routing now
    // Keep site_id as null in the database for now
    const validSiteId: string | null = null;

    const now = new Date().toISOString();

    const { data: callLog, error } = await supabase
      .from("call_logs")
      .insert({
        organization_id: agentProfile.organization_id,
        site_id: validSiteId,
        agent_id: data.agentId,
        visitor_id: data.visitorId,
        status: "pending",
        page_url: data.pageUrl,
        ring_started_at: now,
        // Location data
        visitor_ip: data.ipAddress ?? null,
        visitor_city: data.location?.city ?? null,
        visitor_region: data.location?.region ?? null,
        visitor_country: data.location?.country ?? null,
        visitor_country_code: data.location?.countryCode ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[CallLogger] Failed to create call log:", error);
      return null;
    }

    // Store the mapping
    callLogIds.set(requestId, callLog.id);
    console.log(`[CallLogger] Created call log ${callLog.id} for request ${requestId}${data.location ? ` (${data.location.city}, ${data.location.region})` : ""}`);
    return callLog.id;
  } catch (err) {
    console.error("[CallLogger] Error creating call log:", err);
    return null;
  }
}

/**
 * Update call log when agent accepts the call
 * Returns the reconnect token for the call
 */
export async function markCallAccepted(
  requestId: string,
  callId: string
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const callLogId = callLogIds.get(requestId);
  if (!callLogId) {
    console.warn(`[CallLogger] No call log found for request ${requestId}`);
    return null;
  }

  try {
    // Get the ring_started_at to calculate answer time
    const { data: existing } = await supabase
      .from("call_logs")
      .select("ring_started_at")
      .eq("id", callLogId)
      .single();

    const now = new Date();
    let answerTimeSeconds: number | null = null;

    if (existing?.ring_started_at) {
      const ringStarted = new Date(existing.ring_started_at);
      answerTimeSeconds = Math.round((now.getTime() - ringStarted.getTime()) / 1000);
    }

    // Generate reconnect token for call recovery
    const reconnectToken = generateReconnectToken();

    const { error } = await supabase
      .from("call_logs")
      .update({
        status: "accepted",
        answered_at: now.toISOString(),
        answer_time_seconds: answerTimeSeconds,
        started_at: now.toISOString(),
        // Call recovery fields
        reconnect_token: reconnectToken,
        reconnect_eligible: true,
        last_heartbeat_at: now.toISOString(),
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call accepted:", error);
      return null;
    }

    // Transfer the mapping from requestId to callId
    callLogIds.delete(requestId);
    callLogIds.set(callId, callLogId);
    console.log(`[CallLogger] Call ${callLogId} accepted (answer time: ${answerTimeSeconds}s)`);
    return reconnectToken;
  } catch (err) {
    console.error("[CallLogger] Error marking call accepted:", err);
    return null;
  }
}

/**
 * Update call log when call ends (completed)
 */
export async function markCallEnded(callId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const callLogId = callLogIds.get(callId);
  if (!callLogId) {
    console.warn(`[CallLogger] No call log found for call ${callId}`);
    return;
  }

  try {
    // Get started_at to calculate duration
    const { data: existing } = await supabase
      .from("call_logs")
      .select("started_at")
      .eq("id", callLogId)
      .single();

    const now = new Date();
    let durationSeconds: number | null = null;

    if (existing?.started_at) {
      const startedAt = new Date(existing.started_at);
      durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
    }

    const { error } = await supabase
      .from("call_logs")
      .update({
        status: "completed",
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call ended:", error);
      return;
    }

    callLogIds.delete(callId);
    console.log(`[CallLogger] Call ${callLogId} completed (duration: ${durationSeconds}s)`);
  } catch (err) {
    console.error("[CallLogger] Error marking call ended:", err);
  }
}

/**
 * Update call log when call is missed (RNA timeout)
 */
export async function markCallMissed(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const callLogId = callLogIds.get(requestId);
  if (!callLogId) {
    console.warn(`[CallLogger] No call log found for request ${requestId}`);
    return;
  }

  try {
    const { error } = await supabase
      .from("call_logs")
      .update({
        status: "missed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call missed:", error);
      return;
    }

    callLogIds.delete(requestId);
    console.log(`[CallLogger] Call ${callLogId} marked as missed`);
  } catch (err) {
    console.error("[CallLogger] Error marking call missed:", err);
  }
}

/**
 * Update call log when call is rejected by agent
 */
export async function markCallRejected(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const callLogId = callLogIds.get(requestId);
  if (!callLogId) {
    // This is okay - the call might have been re-routed
    return;
  }

  try {
    const { error } = await supabase
      .from("call_logs")
      .update({
        status: "rejected",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call rejected:", error);
      return;
    }

    callLogIds.delete(requestId);
    console.log(`[CallLogger] Call ${callLogId} marked as rejected`);
  } catch (err) {
    console.error("[CallLogger] Error marking call rejected:", err);
  }
}

/**
 * Update call log when visitor cancels the call request
 */
export async function markCallCancelled(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const callLogId = callLogIds.get(requestId);
  if (!callLogId) return;

  try {
    // Update the call log status to "cancelled" to preserve audit trail
    const { error } = await supabase
      .from("call_logs")
      .update({
        status: "cancelled",
        ended_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call cancelled:", error);
      return;
    }

    callLogIds.delete(requestId);
    console.log(`[CallLogger] Call ${callLogId} marked as cancelled`);
  } catch (err) {
    console.error("[CallLogger] Error marking call cancelled:", err);
  }
}

/**
 * Get the call log ID for a given request/call
 */
export function getCallLogId(requestOrCallId: string): string | undefined {
  return callLogIds.get(requestOrCallId);
}

/**
 * Update heartbeat for an active call
 * Called periodically during a call to indicate both parties are still connected
 */
export async function updateCallHeartbeat(callId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const callLogId = callLogIds.get(callId);
  if (!callLogId) return;

  try {
    const { error } = await supabase
      .from("call_logs")
      .update({
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to update heartbeat:", error);
    }
  } catch (err) {
    console.error("[CallLogger] Error updating heartbeat:", err);
  }
}

/**
 * Find orphaned calls that need recovery after server restart
 * An orphaned call is one that was active (accepted) but the server died
 * We look for calls with recent heartbeats that haven't been ended
 */
export async function findOrphanedCalls(
  maxAgeSeconds: number = 60
): Promise<OrphanedCall[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    // Find calls that:
    // 1. Were accepted (in progress)
    // 2. Are reconnect eligible
    // 3. Have a heartbeat within the last maxAgeSeconds
    // 4. Haven't been ended yet
    const cutoffTime = new Date(Date.now() - maxAgeSeconds * 1000).toISOString();

    const { data, error } = await supabase
      .from("call_logs")
      .select("id, agent_id, visitor_id, organization_id, page_url, reconnect_token, started_at, last_heartbeat_at")
      .eq("status", "accepted")
      .eq("reconnect_eligible", true)
      .is("ended_at", null)
      .gte("last_heartbeat_at", cutoffTime);

    if (error) {
      console.error("[CallLogger] Failed to find orphaned calls:", error);
      return [];
    }

    console.log(`[CallLogger] Found ${data?.length ?? 0} orphaned calls eligible for recovery`);
    return (data ?? []) as OrphanedCall[];
  } catch (err) {
    console.error("[CallLogger] Error finding orphaned calls:", err);
    return [];
  }
}

/**
 * Get call info by reconnect token
 * Used when a client reconnects with their token
 */
export async function getCallByReconnectToken(token: string): Promise<OrphanedCall | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from("call_logs")
      .select("id, agent_id, visitor_id, organization_id, page_url, reconnect_token, started_at, last_heartbeat_at")
      .eq("reconnect_token", token)
      .eq("status", "accepted")
      .eq("reconnect_eligible", true)
      .is("ended_at", null)
      .single();

    if (error) {
      if (error.code !== "PGRST116") { // Not found is okay
        console.error("[CallLogger] Failed to get call by reconnect token:", error);
      }
      return null;
    }

    return data as OrphanedCall;
  } catch (err) {
    console.error("[CallLogger] Error getting call by reconnect token:", err);
    return null;
  }
}

/**
 * Mark a call as successfully reconnected
 * Resets the reconnect state and updates heartbeat
 * Returns the new reconnect token for future reconnections
 */
export async function markCallReconnected(callLogId: string, newCallId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    // Generate a new reconnect token in case we need to recover again
    const newReconnectToken = generateReconnectToken();

    const { error } = await supabase
      .from("call_logs")
      .update({
        reconnect_token: newReconnectToken,
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call reconnected:", error);
      return null;
    }

    // Add mapping for the new call ID
    callLogIds.set(newCallId, callLogId);
    console.log(`[CallLogger] Call ${callLogId} reconnected with new callId ${newCallId}`);
    return newReconnectToken;
  } catch (err) {
    console.error("[CallLogger] Error marking call reconnected:", err);
    return null;
  }
}

/**
 * Mark a call as no longer reconnectable (timeout or permanent failure)
 * This ends the call with a specific reason
 */
export async function markCallReconnectFailed(callLogId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { data: existing } = await supabase
      .from("call_logs")
      .select("started_at")
      .eq("id", callLogId)
      .single();

    const now = new Date();
    let durationSeconds: number | null = null;

    if (existing?.started_at) {
      const startedAt = new Date(existing.started_at);
      durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
    }

    const { error } = await supabase
      .from("call_logs")
      .update({
        status: "completed",
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
        reconnect_eligible: false,
      })
      .eq("id", callLogId);

    if (error) {
      console.error("[CallLogger] Failed to mark call reconnect failed:", error);
      return;
    }

    console.log(`[CallLogger] Call ${callLogId} marked as ended (reconnect failed)`);
  } catch (err) {
    console.error("[CallLogger] Error marking call reconnect failed:", err);
  }
}

