/**
 * Call Lifecycle - Visitor Reconnection Window (TKT-024)
 *
 * Manages the 60-second reconnection window when a visitor disconnects during an active call.
 * This is different from page navigation reconnection - this handles browser crash/accidental close.
 *
 * Key behaviors:
 * - When visitor disconnects, don't immediately end the call
 * - Keep call in "waiting_for_reconnection" state for 60 seconds
 * - Agent sees "Visitor disconnected - waiting for reconnection" status
 * - If visitor returns within 60s with valid session token, they can rejoin
 * - After 60s timeout, truly end the call
 */

import type { Server as SocketIOServer } from "socket.io";
import type { PoolManager } from "../routing/pool-manager.js";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { markCallEnded } from "../../lib/call-logger.js";
import { recordStatusChange } from "../../lib/session-tracker.js";

// 60-second window for visitor to rejoin after disconnect
const VISITOR_RECONNECT_WINDOW_MS = 60_000;

interface PendingVisitorReconnect {
  callId: string;
  visitorId: string;
  agentId: string;
  timeout: NodeJS.Timeout;
  disconnectedAt: number;
}

// Track calls waiting for visitor reconnection
const pendingVisitorReconnects = new Map<string, PendingVisitorReconnect>();

/**
 * Start reconnection window when visitor disconnects during active call.
 * Instead of immediately ending the call, we give the visitor 60 seconds to rejoin.
 */
export function startVisitorReconnectWindow(
  io: SocketIOServer,
  poolManager: PoolManager,
  callId: string,
  visitorId: string,
  agentId: string
): void {
  // Don't start multiple windows for the same call
  if (pendingVisitorReconnects.has(callId)) {
    console.log(`[CallLifecycle] Reconnection window already active for call ${callId}`);
    return;
  }

  console.log(`[CallLifecycle] 🕐 Starting 60-second reconnection window for visitor ${visitorId} on call ${callId}`);

  const disconnectedAt = Date.now();

  // Notify agent that visitor disconnected but we're waiting
  const agent = poolManager.getAgent(agentId);
  if (agent) {
    const agentSocket = io.sockets.sockets.get(agent.socketId);
    agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTING, {
      callId,
      message: "Visitor disconnected - waiting for reconnection",
      timeoutSeconds: VISITOR_RECONNECT_WINDOW_MS / 1000,
    });
  }

  // Set timeout to truly end the call if visitor doesn't return
  const timeout = setTimeout(async () => {
    console.log(`[CallLifecycle] ⏱️ Reconnection window expired for call ${callId}, ending call`);

    // Remove from tracking
    pendingVisitorReconnects.delete(callId);

    // End the call in pool manager
    const call = poolManager.endCall(callId);
    if (call) {
      // Mark call as ended in database
      await markCallEnded(callId);

      // Track agent going back to idle
      await recordStatusChange(agentId, "idle", "call_ended");

      // Notify agent that call has ended due to visitor not reconnecting
      const agent = poolManager.getAgent(agentId);
      if (agent) {
        const agentSocket = io.sockets.sockets.get(agent.socketId);
        agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
          callId,
          reason: "reconnect_failed",
          message: "Visitor did not reconnect within 60 seconds",
        });
      }
    }
  }, VISITOR_RECONNECT_WINDOW_MS);

  // Store the pending reconnect
  pendingVisitorReconnects.set(callId, {
    callId,
    visitorId,
    agentId,
    timeout,
    disconnectedAt,
  });
}

/**
 * Handle visitor successfully rejoining within the reconnection window.
 * Clears the timeout and notifies both parties.
 */
export function handleVisitorRejoin(
  io: SocketIOServer,
  poolManager: PoolManager,
  callId: string,
  visitorId: string,
  newSocketId: string,
  reconnectToken: string
): boolean {
  const pending = pendingVisitorReconnects.get(callId);

  if (!pending) {
    console.log(`[CallLifecycle] No pending reconnection for call ${callId}`);
    return false;
  }

  // Verify the visitor ID matches
  if (pending.visitorId !== visitorId) {
    console.log(`[CallLifecycle] Visitor ID mismatch for call ${callId}`);
    return false;
  }

  // Clear the timeout - visitor has successfully rejoined
  clearTimeout(pending.timeout);
  pendingVisitorReconnects.delete(callId);

  const reconnectedAt = Date.now();
  const disconnectDuration = reconnectedAt - pending.disconnectedAt;
  console.log(`[CallLifecycle] ✅ Visitor ${visitorId} rejoined call ${callId} after ${disconnectDuration}ms`);

  // Update visitor's socket ID in pool manager
  const visitor = poolManager.getVisitor(visitorId);
  if (visitor) {
    visitor.socketId = newSocketId;
  }

  // Notify both parties that reconnection was successful
  const agent = poolManager.getAgent(pending.agentId);
  if (agent) {
    const agentSocket = io.sockets.sockets.get(agent.socketId);
    const visitorSocket = io.sockets.sockets.get(newSocketId);

    // Notify agent
    agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
      callId,
      reconnectToken, // New token for future reconnections
      peerId: visitorId,
    });

    // Notify visitor with agent info (needed for WebRTC re-establishment)
    visitorSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
      callId,
      reconnectToken,
      peerId: pending.agentId,
      agent: {
        id: agent.profile.id,
        displayName: agent.profile.displayName,
        avatarUrl: agent.profile.avatarUrl,
        waveVideoUrl: agent.profile.waveVideoUrl,
        introVideoUrl: agent.profile.introVideoUrl,
        connectVideoUrl: agent.profile.connectVideoUrl,
        loopVideoUrl: agent.profile.loopVideoUrl,
      },
    });
  }

  return true;
}

/**
 * Cancel the reconnection window if agent manually ends the call.
 */
export function cancelVisitorReconnectWindow(callId: string): void {
  const pending = pendingVisitorReconnects.get(callId);

  if (pending) {
    console.log(`[CallLifecycle] Cancelling reconnection window for call ${callId}`);
    clearTimeout(pending.timeout);
    pendingVisitorReconnects.delete(callId);
  }
}

/**
 * Check if a call is currently in the reconnection window.
 */
export function isCallWaitingForReconnection(callId: string): boolean {
  return pendingVisitorReconnects.has(callId);
}

/**
 * Get remaining time in reconnection window (in seconds).
 */
export function getReconnectWindowRemaining(callId: string): number {
  const pending = pendingVisitorReconnects.get(callId);

  if (!pending) {
    return 0;
  }

  const elapsed = Date.now() - pending.disconnectedAt;
  const remaining = Math.max(0, VISITOR_RECONNECT_WINDOW_MS - elapsed);
  return Math.ceil(remaining / 1000);
}

/**
 * Clean up all pending reconnections (for server shutdown).
 */
export function clearAllReconnectWindows(): void {
  for (const pending of pendingVisitorReconnects.values()) {
    clearTimeout(pending.timeout);
  }
  pendingVisitorReconnects.clear();
  console.log(`[CallLifecycle] Cleared all reconnection windows`);
}
