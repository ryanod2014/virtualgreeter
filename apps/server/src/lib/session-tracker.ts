/**
 * SessionTracker - Manages agent session lifecycle and status tracking
 * 
 * Responsibilities:
 * - Create session on agent login
 * - Track status changes within session
 * - Calculate time breakdowns
 * - End session on logout/disconnect
 */

import { supabase, isSupabaseConfigured } from "./supabase.js";

// In-memory state for active sessions
interface ActiveSessionState {
  sessionId: string;
  agentId: string;
  orgId: string;
  currentStatus: string;
  statusStartedAt: number; // timestamp when current status began
}

// Map agentId -> session state
const activeSessions: Map<string, ActiveSessionState> = new Map();

/**
 * Start a new session when an agent logs in
 */
export async function startSession(
  agentId: string,
  orgId: string
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[SessionTracker] Supabase not configured, skipping session tracking");
    return null;
  }

  // End any existing active session for this agent (cleanup stale sessions)
  const existingSession = activeSessions.get(agentId);
  if (existingSession) {
    console.log(`[SessionTracker] Ending stale session for agent ${agentId}`);
    await endSession(agentId, "disconnect");
  }

  try {
    // Create new session in database
    const { data, error } = await supabase
      .from("agent_sessions")
      .insert({
        agent_id: agentId,
        organization_id: orgId,
        started_at: new Date().toISOString(),
        idle_seconds: 0,
        in_call_seconds: 0,
        away_seconds: 0,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[SessionTracker] Failed to create session:", error);
      return null;
    }

    // Track in memory
    activeSessions.set(agentId, {
      sessionId: data.id,
      agentId,
      orgId,
      currentStatus: "idle",
      statusStartedAt: Date.now(),
    });

    // Log initial status change
    await logStatusChange(data.id, agentId, "offline", "idle", "login");

    console.log(`[SessionTracker] ✅ Session started for agent ${agentId}: ${data.id}`);
    return data.id;
  } catch (err) {
    console.error("[SessionTracker] Error starting session:", err);
    return null;
  }
}

/**
 * End a session when an agent logs out or disconnects
 */
export async function endSession(
  agentId: string,
  reason: "logout" | "disconnect" | "idle_timeout" | "server_restart"
): Promise<void> {
  const state = activeSessions.get(agentId);
  if (!state) {
    console.log(`[SessionTracker] No active session for agent ${agentId}`);
    return;
  }

  if (!isSupabaseConfigured || !supabase) {
    activeSessions.delete(agentId);
    return;
  }

  try {
    const now = new Date();

    // Calculate final time for current status
    const statusDuration = Math.floor((Date.now() - state.statusStartedAt) / 1000);
    const updateField = getStatusField(state.currentStatus);

    // Log final status change
    await logStatusChange(state.sessionId, agentId, state.currentStatus, "offline", reason);

    // Get current session data to calculate final values
    const { data: session } = await supabase
      .from("agent_sessions")
      .select("started_at, idle_seconds, in_call_seconds, away_seconds")
      .eq("id", state.sessionId)
      .single();

    if (session) {
      const totalDuration = Math.floor(
        (now.getTime() - new Date(session.started_at).getTime()) / 1000
      );

      // Build update object
      const updateData: Record<string, unknown> = {
        ended_at: now.toISOString(),
        ended_reason: reason,
        duration_seconds: totalDuration,
      };

      // Add remaining time to the appropriate field
      if (updateField) {
        const currentValue = session[updateField as keyof typeof session] as number;
        updateData[updateField] = currentValue + statusDuration;
      }

      const { error } = await supabase
        .from("agent_sessions")
        .update(updateData)
        .eq("id", state.sessionId);

      if (error) {
        console.error("[SessionTracker] Failed to end session:", error);
      }
    }

    activeSessions.delete(agentId);
    console.log(`[SessionTracker] ✅ Session ended for agent ${agentId}: ${state.sessionId} (${reason})`);
  } catch (err) {
    console.error("[SessionTracker] Error ending session:", err);
    activeSessions.delete(agentId);
  }
}

/**
 * Record a status change within an active session
 */
export async function recordStatusChange(
  agentId: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  const state = activeSessions.get(agentId);
  if (!state) {
    console.log(`[SessionTracker] No active session for agent ${agentId}, cannot record status change`);
    return;
  }

  const previousStatus = state.currentStatus;
  if (previousStatus === newStatus) return; // No change

  if (!isSupabaseConfigured || !supabase) {
    // Still update in-memory state even without Supabase
    state.currentStatus = newStatus;
    state.statusStartedAt = Date.now();
    return;
  }

  try {
    const now = Date.now();

    // Calculate time spent in previous status
    const statusDuration = Math.floor((now - state.statusStartedAt) / 1000);
    const updateField = getStatusField(previousStatus);

    // Update session time breakdown
    if (updateField && statusDuration > 0) {
      // Use direct update instead of RPC for simplicity
      const { data: currentSession } = await supabase
        .from("agent_sessions")
        .select(updateField)
        .eq("id", state.sessionId)
        .single();

      if (currentSession) {
        const currentValue = currentSession[updateField as keyof typeof currentSession] as number;
        await supabase
          .from("agent_sessions")
          .update({ [updateField]: currentValue + statusDuration })
          .eq("id", state.sessionId);
      }
    }

    // Log the status change
    await logStatusChange(state.sessionId, agentId, previousStatus, newStatus, reason);

    // Update in-memory state
    state.currentStatus = newStatus;
    state.statusStartedAt = now;

    console.log(`[SessionTracker] Agent ${agentId} status: ${previousStatus} → ${newStatus}`);
  } catch (err) {
    console.error("[SessionTracker] Error recording status change:", err);
    // Still update in-memory state
    state.currentStatus = newStatus;
    state.statusStartedAt = Date.now();
  }
}

/**
 * Log a status change to the audit table
 */
async function logStatusChange(
  sessionId: string,
  agentId: string,
  fromStatus: string,
  toStatus: string,
  reason?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    const { error } = await supabase.from("agent_status_changes").insert({
      session_id: sessionId,
      agent_id: agentId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_at: new Date().toISOString(),
      reason: reason ?? null,
    });

    if (error) {
      console.error("[SessionTracker] Failed to log status change:", error);
    }
  } catch (err) {
    console.error("[SessionTracker] Error logging status change:", err);
  }
}

/**
 * Map agent status to database field name
 */
function getStatusField(status: string): string | null {
  switch (status) {
    case "idle":
    case "in_simulation":
      return "idle_seconds";
    case "in_call":
      return "in_call_seconds";
    case "away":
      return "away_seconds";
    default:
      return null;
  }
}

/**
 * Get the active session ID for an agent (if any)
 */
export function getActiveSessionId(agentId: string): string | null {
  return activeSessions.get(agentId)?.sessionId ?? null;
}

/**
 * Check if an agent has an active session
 */
export function hasActiveSession(agentId: string): boolean {
  return activeSessions.has(agentId);
}

