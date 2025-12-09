/**
 * useCallSession - Visitor Call Rejoin Logic (TKT-024)
 *
 * Manages visitor's call session state and handles rejoin scenarios.
 * This hook detects when a visitor returns after disconnecting (browser crash, accidental close)
 * and determines whether they should be shown the rejoin prompt.
 *
 * Key responsibilities:
 * - Check localStorage for stored call session on widget init
 * - Determine if the stored session is still valid (within 60s window)
 * - Provide rejoin functionality to reconnect to the call
 */

import { useState, useEffect, useCallback } from "preact/hooks";
import { getStoredCall, clearStoredCall } from "../signaling/useSignaling";

interface CallSession {
  callId: string;
  agentId: string;
  reconnectToken: string;
  canRejoin: boolean;
  timeRemaining: number; // seconds
}

interface UseCallSessionOptions {
  orgId: string;
  onRejoin?: (reconnectToken: string) => void;
}

export function useCallSession(options: UseCallSessionOptions) {
  const [pendingSession, setPendingSession] = useState<CallSession | null>(null);

  /**
   * Check for stored call session on mount.
   * This runs when the widget initializes (e.g., after page refresh or browser reopen).
   */
  useEffect(() => {
    const storedCall = getStoredCall(options.orgId);

    if (!storedCall) {
      return;
    }

    // Calculate time since disconnect
    const now = Date.now();
    const elapsed = now - storedCall.timestamp;
    const RECONNECT_WINDOW_MS = 60_000; // 60 seconds

    // Check if still within reconnection window
    if (elapsed < RECONNECT_WINDOW_MS) {
      const timeRemaining = Math.ceil((RECONNECT_WINDOW_MS - elapsed) / 1000);

      console.log(`[useCallSession] Found active call session, ${timeRemaining}s remaining to rejoin`);

      setPendingSession({
        callId: storedCall.callId,
        agentId: storedCall.agentId,
        reconnectToken: storedCall.reconnectToken,
        canRejoin: true,
        timeRemaining,
      });
    } else {
      console.log("[useCallSession] Stored call session expired, clearing");
      clearStoredCall();
    }
  }, [options.orgId]);

  /**
   * Attempt to rejoin the call using the stored reconnect token.
   */
  const attemptRejoin = useCallback(() => {
    if (!pendingSession) {
      console.warn("[useCallSession] No pending session to rejoin");
      return;
    }

    console.log(`[useCallSession] Attempting to rejoin call ${pendingSession.callId}`);

    // Notify parent (Widget) to emit CALL_RECONNECT
    options.onRejoin?.(pendingSession.reconnectToken);
  }, [pendingSession, options]);

  /**
   * Decline to rejoin - clear the session and dismiss prompt.
   */
  const declineRejoin = useCallback(() => {
    console.log("[useCallSession] Declining to rejoin call");
    clearStoredCall();
    setPendingSession(null);
  }, []);

  /**
   * Clear the pending session (called after successful rejoin or failure).
   */
  const clearSession = useCallback(() => {
    setPendingSession(null);
  }, []);

  return {
    pendingSession,
    attemptRejoin,
    declineRejoin,
    clearSession,
  };
}
