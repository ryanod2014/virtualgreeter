/**
 * Handle Rejoin - Visitor Reconnection Logic (TKT-024)
 *
 * Handles visitor rejoining a call after disconnect (browser crash, accidental close).
 * This validates the reconnect token and coordinates with callLifecycle to restore the call.
 */

import type { Server as SocketIOServer, Socket } from "socket.io";
import type { PoolManager } from "../routing/pool-manager.js";
import { getCallByReconnectToken, markCallReconnected } from "../../lib/call-logger.js";
import { handleVisitorRejoin } from "../calls/callLifecycle.js";

/**
 * Handle visitor attempting to rejoin a call using their stored reconnect token.
 *
 * Flow:
 * 1. Validate reconnect token exists in database
 * 2. Check if call is in "waiting for reconnection" state
 * 3. Verify visitor ID matches
 * 4. Update visitor's socket ID
 * 5. Notify both parties of successful rejoin
 * 6. Generate new reconnect token for future disconnects
 *
 * @returns true if rejoin successful, false otherwise
 */
export async function handleRejoinRequest(
  io: SocketIOServer,
  socket: Socket,
  poolManager: PoolManager,
  reconnectToken: string,
  visitorId: string
): Promise<boolean> {
  console.log(`[Rejoin] Visitor ${visitorId} attempting to rejoin with token ${reconnectToken.substring(0, 8)}...`);

  try {
    // Look up the call by reconnect token
    // This query already filters for status='accepted' and reconnect_eligible=true
    const callData = await getCallByReconnectToken(reconnectToken);

    if (!callData) {
      console.log(`[Rejoin] ❌ No call found for token ${reconnectToken.substring(0, 8)}...`);
      return false;
    }

    // Verify visitor ID matches the call (using snake_case from DB)
    if (callData.visitor_id !== visitorId) {
      console.log(`[Rejoin] ❌ Visitor ID mismatch. Expected ${callData.visitor_id}, got ${visitorId}`);
      return false;
    }

    // Get the call from pool manager
    const activeCall = poolManager.getActiveCallByVisitorId(visitorId);
    if (!activeCall) {
      console.log(`[Rejoin] ❌ Call not found in pool manager for visitor ${visitorId}`);
      return false;
    }

    // Generate new reconnect token for this session
    const newReconnectToken = await markCallReconnected(activeCall.callId, callData.id);

    // Ensure we have a token (markCallReconnected can return null on error)
    if (!newReconnectToken) {
      console.log(`[Rejoin] ❌ Failed to generate new reconnect token`);
      return false;
    }

    // Let callLifecycle handle the rejoin logic
    const success = handleVisitorRejoin(
      io,
      poolManager,
      activeCall.callId,
      visitorId,
      socket.id,
      newReconnectToken
    );

    if (success) {
      console.log(`[Rejoin] ✅ Visitor ${visitorId} successfully rejoined call ${activeCall.callId}`);
    } else {
      console.log(`[Rejoin] ❌ Failed to rejoin call ${activeCall.callId}`);
    }

    return success;

  } catch (error) {
    console.error(`[Rejoin] Error handling rejoin request:`, error);
    return false;
  }
}
