import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { io, Socket } from "socket.io-client";
import type {
  WidgetToServerEvents,
  ServerToWidgetEvents,
  AgentAssignedPayload,
  AgentReassignedPayload,
  AgentUnavailablePayload,
  OrgPausedPayload,
  CallAcceptedPayload,
  CallRejectedPayload,
  CallReconnectedPayload,
  CallReconnectFailedPayload,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { CONNECTION_TIMING, ERROR_MESSAGES } from "../../constants";

// ============================================================================
// CALL PERSISTENCE - localStorage utilities
// ============================================================================
// These allow calls to survive page navigation by storing reconnect info

const CALL_STORAGE_KEY = "gg_active_call";
const CALL_EXPIRY_MS = 30 * 1000; // 30 seconds - matches server CALL_RECONNECT_TIMEOUT

interface StoredCallData {
  reconnectToken: string;
  callId: string;
  agentId: string;
  orgId: string;
  timestamp: number;
}

// ============================================================================
// WIDGET STATE PERSISTENCE - localStorage utilities  
// ============================================================================
// These allow widget to maintain video sequence state across page navigation
// Key insight: Same agent on different pool may have different video sequence

const WIDGET_STATE_KEY = "gg_widget_state";
const WIDGET_STATE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes - session-like expiry

interface StoredWidgetState {
  agentId: string;
  // Store video URLs to detect if sequence changed (different pool = different videos)
  waveVideoUrl: string | null;
  introVideoUrl: string | null;
  loopVideoUrl: string | null;
  introCompleted: boolean;
  timestamp: number;
}

export function storeWidgetState(data: Omit<StoredWidgetState, "timestamp">): void {
  try {
    const stored: StoredWidgetState = { ...data, timestamp: Date.now() };
    localStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(stored));
    console.log("[Widget] 💾 Stored widget state for page navigation");
  } catch (e) {
    console.warn("[Widget] Failed to store widget state:", e);
  }
}

export function getStoredWidgetState(): StoredWidgetState | null {
  try {
    const stored = localStorage.getItem(WIDGET_STATE_KEY);
    if (!stored) return null;
    
    const data: StoredWidgetState = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() - data.timestamp > WIDGET_STATE_EXPIRY_MS) {
      console.log("[Widget] Stored widget state expired, clearing");
      clearStoredWidgetState();
      return null;
    }
    
    return data;
  } catch (e) {
    console.warn("[Widget] Failed to read stored widget state:", e);
    return null;
  }
}

export function clearStoredWidgetState(): void {
  try {
    localStorage.removeItem(WIDGET_STATE_KEY);
  } catch (e) {
    console.warn("[Widget] Failed to clear widget state:", e);
  }
}

/**
 * Check if agent's video sequence matches stored state
 * Returns true if same agent AND same video URLs (should skip intro)
 */
export function shouldSkipIntroForAgent(agent: {
  id: string;
  waveVideoUrl?: string | null;
  introVideoUrl?: string | null;
  loopVideoUrl?: string | null;
}): boolean {
  const stored = getStoredWidgetState();
  
  if (!stored || !stored.introCompleted) {
    return false;
  }
  
  // Must be same agent
  if (stored.agentId !== agent.id) {
    console.log("[Widget] Different agent - will play intro");
    return false;
  }
  
  // Must have same video sequence (same pool or same videos)
  const sameSequence = 
    stored.waveVideoUrl === (agent.waveVideoUrl ?? null) &&
    stored.introVideoUrl === (agent.introVideoUrl ?? null) &&
    stored.loopVideoUrl === (agent.loopVideoUrl ?? null);
  
  if (sameSequence) {
    console.log("[Widget] Same agent + same video sequence - skipping intro");
    return true;
  } else {
    console.log("[Widget] Same agent but different video sequence (different pool) - will play intro");
    return false;
  }
}

function storeActiveCall(data: Omit<StoredCallData, "timestamp">): void {
  try {
    const stored: StoredCallData = { ...data, timestamp: Date.now() };
    localStorage.setItem(CALL_STORAGE_KEY, JSON.stringify(stored));
    console.log("[Widget] 💾 Stored active call for reconnection:", data.callId);
  } catch (e) {
    console.warn("[Widget] Failed to store call data:", e);
  }
}

function getStoredCall(orgId: string): StoredCallData | null {
  try {
    const stored = localStorage.getItem(CALL_STORAGE_KEY);
    if (!stored) return null;
    
    const data: StoredCallData = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() - data.timestamp > CALL_EXPIRY_MS) {
      console.log("[Widget] Stored call expired, clearing");
      clearStoredCall();
      return null;
    }
    
    // Check if same org (don't reconnect to calls from different sites)
    if (data.orgId !== orgId) {
      console.log("[Widget] Stored call is for different org, ignoring");
      return null;
    }
    
    return data;
  } catch (e) {
    console.warn("[Widget] Failed to read stored call:", e);
    return null;
  }
}

function clearStoredCall(): void {
  try {
    localStorage.removeItem(CALL_STORAGE_KEY);
    console.log("[Widget] 🗑️ Cleared stored call data");
  } catch (e) {
    console.warn("[Widget] Failed to clear call data:", e);
  }
}

interface UseSignalingOptions {
  serverUrl: string;
  orgId: string;
  onAgentAssigned: (data: AgentAssignedPayload) => void;
  onAgentReassigned: (data: AgentReassignedPayload) => void;
  onAgentUnavailable: (data: AgentUnavailablePayload) => void;
  onOrgPaused?: (data: OrgPausedPayload) => void;
  onCallAccepted: (data: CallAcceptedPayload) => void;
  onCallRejected: (data: CallRejectedPayload) => void;
  onCallEnded: () => void;
  onCallReconnecting?: () => void;
  onCallReconnected?: (data: CallReconnectedPayload) => void;
  onCallReconnectFailed?: (data: CallReconnectFailedPayload) => void;
  onConnectionError?: (error: string) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
}

interface UseSignalingReturn {
  connect: () => void;
  disconnect: () => void;
  requestCall: (agentId: string) => void;
  cancelCall: () => void;
  endCall: (callId: string) => void;
  trackPageview: (agentId: string) => void;
  trackMissedOpportunity: (triggerDelaySeconds: number, poolId: string | null) => void;
  isConnected: boolean;
  isReconnecting: boolean;
  visitorId: string | null;
  callAccepted: boolean;
  callRejected: boolean;
  currentCallId: string | null;
  connectionError: string | null;
  socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> | null;
}

export function useSignaling(options: UseSignalingOptions): UseSignalingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callRejected, setCallRejected] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<Socket<ServerToWidgetEvents, WidgetToServerEvents> | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isUnmountingRef = useRef(false);
  
  // Track pending call request for reconnection recovery (Option E)
  // If socket disconnects while visitor is waiting for agent to answer,
  // we'll re-emit call:request on reconnect
  const pendingCallAgentIdRef = useRef<string | null>(null);
  
  // Store options in ref to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Clean up socket connection
   */
  const cleanup = useCallback(() => {
    if (socketRef.current) {
      // Remove all listeners before disconnecting to prevent memory leaks
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  /**
   * Connect to signaling server with automatic reconnection
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (socketRef.current?.connected) {
      console.log("[Widget] Already connected to signaling server");
      return;
    }

    // Clean up any existing socket before creating new one
    cleanup();

    setConnectionError(null);
    reconnectAttemptRef.current = 0;

    const socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> = io(optionsRef.current.serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: CONNECTION_TIMING.MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: CONNECTION_TIMING.RECONNECT_BASE_DELAY,
      reconnectionDelayMax: CONNECTION_TIMING.RECONNECT_BASE_DELAY * 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection established
    socket.on("connect", () => {
      console.log("[Widget] Connected to signaling server");
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
      
      // Track if this is a reconnection (not initial connect)
      const wasReconnecting = reconnectAttemptRef.current > 0;
      reconnectAttemptRef.current = 0;

      // Notify parent if we reconnected
      if (wasReconnecting) {
        optionsRef.current.onReconnected?.();
      }

      // Check if we have a stored call that we need to reconnect to
      const storedCall = getStoredCall(optionsRef.current.orgId);
      
      if (storedCall) {
        // We have an active call from a previous page - attempt to reconnect
        console.log("[Widget] 🔄 Found stored call, attempting reconnection:", storedCall.callId);
        socket.emit(SOCKET_EVENTS.CALL_RECONNECT, {
          reconnectToken: storedCall.reconnectToken,
          role: "visitor",
        });
      }

      // Join as visitor (always do this, even when reconnecting)
      socket.emit(SOCKET_EVENTS.VISITOR_JOIN, {
        orgId: optionsRef.current.orgId,
        pageUrl: window.location.href,
        visitorId: visitorId ?? undefined, // Use existing ID if reconnecting
      });
      
      // OPTION E: Retry pending call request after server restart/reconnect
      // If we had a pending call request (visitor was waiting for agent to answer)
      // and socket reconnected, re-emit the call:request
      // The server handles duplicate calls gracefully via existing call cleanup
      if (wasReconnecting && pendingCallAgentIdRef.current && !callAccepted) {
        console.log("[Widget] 🔄 Retrying pending call request after reconnect for agent:", pendingCallAgentIdRef.current);
        // Small delay to ensure visitor:join is processed first
        setTimeout(() => {
          if (pendingCallAgentIdRef.current && !callAccepted) {
            socket.emit(SOCKET_EVENTS.CALL_REQUEST, { agentId: pendingCallAgentIdRef.current });
          }
        }, 100);
      }
    });

    // Connection lost
    socket.on("disconnect", (reason) => {
      console.log("[Widget] Disconnected from signaling server:", reason);
      setIsConnected(false);

      // Don't try to reconnect if we intentionally disconnected or are unmounting
      if (reason === "io client disconnect" || isUnmountingRef.current) {
        return;
      }

      // Socket.io will automatically try to reconnect
      // for server-initiated disconnects
    });

    // Reconnection attempt
    socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`[Widget] Reconnection attempt ${attempt}/${CONNECTION_TIMING.MAX_RECONNECT_ATTEMPTS}`);
      reconnectAttemptRef.current = attempt;
      setIsReconnecting(true);
      optionsRef.current.onReconnecting?.(attempt);
    });

    // Reconnection failed after all attempts
    socket.io.on("reconnect_failed", () => {
      console.error("[Widget] Failed to reconnect after maximum attempts");
      setIsReconnecting(false);
      const errorMsg = ERROR_MESSAGES.WEBSOCKET_DISCONNECTED;
      setConnectionError(errorMsg);
      optionsRef.current.onConnectionError?.(errorMsg);
    });

    // Reconnected successfully
    socket.io.on("reconnect", () => {
      console.log("[Widget] Successfully reconnected");
      setIsReconnecting(false);
      setConnectionError(null);
      optionsRef.current.onReconnected?.();
    });

    // Connection error
    socket.on("connect_error", (error) => {
      console.error("[Widget] Connection error:", error.message);
      
      // Only set error if not actively reconnecting
      // Note: socket.io Manager uses _reconnecting internally
      if (reconnectAttemptRef.current === 0) {
        const errorMsg = ERROR_MESSAGES.CONNECTION_FAILED;
        setConnectionError(errorMsg);
        optionsRef.current.onConnectionError?.(errorMsg);
      }
    });

    // Agent assigned
    socket.on(SOCKET_EVENTS.AGENT_ASSIGNED, (data: AgentAssignedPayload) => {
      console.log("[Widget] 🎉 AGENT_ASSIGNED received:", {
        agentId: data.agent.id,
        agentName: data.agent.displayName,
        visitorId: data.visitorId,
      });
      setVisitorId(data.visitorId);
      optionsRef.current.onAgentAssigned(data);
    });

    // Agent reassigned
    socket.on(SOCKET_EVENTS.AGENT_REASSIGNED, (data: AgentReassignedPayload) => {
      console.log("[Widget] Agent reassigned:", data);
      optionsRef.current.onAgentReassigned(data);
    });

    // Agent unavailable (no agents online) - includes widget settings for trigger tracking
    socket.on(SOCKET_EVENTS.AGENT_UNAVAILABLE, (data: AgentUnavailablePayload) => {
      console.log("[Widget] 🚫 Agent unavailable - received settings for trigger tracking:", {
        visitorId: data.visitorId,
        triggerDelay: data.widgetSettings.trigger_delay,
        poolId: data.poolId,
      });
      setVisitorId(data.visitorId);
      
      // Clear pending call tracking - no agents available to fulfill the request
      pendingCallAgentIdRef.current = null;
      currentRequestIdRef.current = null;
      
      optionsRef.current.onAgentUnavailable(data);
    });

    // Organization is paused - show temporarily unavailable message
    socket.on(SOCKET_EVENTS.ORG_PAUSED, (data: OrgPausedPayload) => {
      console.log("[Widget] ⏸️ Organization is paused:", data.message);
      optionsRef.current.onOrgPaused?.(data);
    });

    // Call accepted
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, (data: CallAcceptedPayload) => {
      console.log("[Widget] Call accepted:", data);
      setCallAccepted(true);
      setCallRejected(false);
      setCurrentCallId(data.callId);
      
      // Clear pending call tracking - call is now active
      pendingCallAgentIdRef.current = null;
      
      // Store call data for reconnection after page navigation
      storeActiveCall({
        reconnectToken: data.reconnectToken,
        callId: data.callId,
        agentId: data.agentId,
        orgId: optionsRef.current.orgId,
      });
      
      optionsRef.current.onCallAccepted(data);
    });

    // Call rejected
    socket.on(SOCKET_EVENTS.CALL_REJECTED, (data: CallRejectedPayload) => {
      console.log("[Widget] Call rejected:", data);
      setCallRejected(true);
      setCallAccepted(false);
      currentRequestIdRef.current = null;
      // Note: Don't clear pendingCallAgentIdRef here - server may reroute to another agent
      // The visitor stays in "call_requested" state waiting for the next agent
      optionsRef.current.onCallRejected(data);
    });

    // Call ended
    socket.on(SOCKET_EVENTS.CALL_ENDED, () => {
      console.log("[Widget] Call ended");
      setCallAccepted(false);
      setCallRejected(false);
      setCurrentCallId(null);
      currentRequestIdRef.current = null;
      
      // Clear pending call tracking - call is over
      pendingCallAgentIdRef.current = null;
      
      // Clear stored call data - call is over
      clearStoredCall();
      
      optionsRef.current.onCallEnded();
    });

    // Call reconnection events
    socket.on(SOCKET_EVENTS.CALL_RECONNECTING, () => {
      console.log("[Widget] 🔄 Call reconnecting...");
      optionsRef.current.onCallReconnecting?.();
    });

    socket.on(SOCKET_EVENTS.CALL_RECONNECTED, (data: CallReconnectedPayload) => {
      console.log("[Widget] ✅ Call reconnected:", data);
      setCallAccepted(true);
      setCallRejected(false);
      setCurrentCallId(data.callId);
      
      // Update stored call with new reconnect token
      const storedCall = getStoredCall(optionsRef.current.orgId);
      if (storedCall) {
        storeActiveCall({
          reconnectToken: data.reconnectToken,
          callId: data.callId,
          agentId: storedCall.agentId,
          orgId: optionsRef.current.orgId,
        });
      }
      
      optionsRef.current.onCallReconnected?.(data);
    });

    socket.on(SOCKET_EVENTS.CALL_RECONNECT_FAILED, (data: CallReconnectFailedPayload) => {
      console.log("[Widget] ❌ Call reconnect failed:", data);
      setCallAccepted(false);
      setCurrentCallId(null);
      
      // Clear pending call tracking - reconnection failed
      pendingCallAgentIdRef.current = null;
      
      // Clear stored call - reconnection failed
      clearStoredCall();
      
      optionsRef.current.onCallReconnectFailed?.(data);
    });

    // Server error
    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.log("[Widget] 📥 Received ERROR event:", error);
      setConnectionError(error.message);
      optionsRef.current.onConnectionError?.(error.message);
    });
  }, [cleanup, visitorId]);

  /**
   * Disconnect from signaling server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.VISITOR_DISCONNECT);
      cleanup();
    }
    setIsConnected(false);
    setIsReconnecting(false);
    setVisitorId(null);
    setConnectionError(null);
  }, [cleanup]);

  /**
   * Request a call with an agent
   */
  const requestCall = useCallback((agentId: string) => {
    if (!socketRef.current) {
      console.error("[Widget] Cannot request call - socket not initialized");
      return;
    }
    if (!socketRef.current.connected) {
      console.error("[Widget] Cannot request call - socket disconnected");
      setConnectionError(ERROR_MESSAGES.CONNECTION_FAILED);
      return;
    }

    console.log("[Widget] Requesting call with agent:", agentId);
    socketRef.current.emit(SOCKET_EVENTS.CALL_REQUEST, { agentId });

    // Track request for cancellation
    currentRequestIdRef.current = `pending_${Date.now()}`;
    
    // Track pending call agent for reconnection recovery (Option E)
    pendingCallAgentIdRef.current = agentId;
  }, []);

  /**
   * Cancel a pending call request
   */
  const cancelCall = useCallback(() => {
    if (!socketRef.current || !currentRequestIdRef.current) return;

    socketRef.current.emit(SOCKET_EVENTS.CALL_CANCEL, {
      requestId: currentRequestIdRef.current,
    });
    currentRequestIdRef.current = null;
    
    // Clear pending call tracking - visitor cancelled
    pendingCallAgentIdRef.current = null;
    
    setCallRejected(false);
    setCallAccepted(false);
  }, []);

  /**
   * End an active call
   */
  const endCall = useCallback((callId: string) => {
    if (!socketRef.current) return;

    console.log("[Widget] Ending call:", callId);
    socketRef.current.emit(SOCKET_EVENTS.CALL_END, { callId });
    
    // Reset all call-related state immediately to allow new calls
    setCallAccepted(false);
    setCallRejected(false);
    setCurrentCallId(null);
    currentRequestIdRef.current = null;
  }, []);

  /**
   * Track a pageview when widget popup is shown
   */
  const trackPageview = useCallback((agentId: string) => {
    if (!socketRef.current) {
      console.log("[Widget] Cannot track pageview - socket not initialized");
      return;
    }
    if (!socketRef.current.connected) {
      console.log("[Widget] Cannot track pageview - socket disconnected");
      return;
    }

    console.log("[Widget] 👁️ Tracking pageview for agent:", agentId);
    socketRef.current.emit(SOCKET_EVENTS.WIDGET_PAGEVIEW, { agentId });
  }, []);

  /**
   * Track a missed opportunity when trigger delay passes but no agent available
   * This ensures we only count visitors who would have actually seen the widget
   */
  const trackMissedOpportunity = useCallback((triggerDelaySeconds: number, poolId: string | null) => {
    if (!socketRef.current) {
      console.log("[Widget] Cannot track missed opportunity - socket not initialized");
      return;
    }
    if (!socketRef.current.connected) {
      console.log("[Widget] Cannot track missed opportunity - socket disconnected");
      return;
    }

    console.log("[Widget] ⚠️ Tracking missed opportunity (trigger_delay:", triggerDelaySeconds, "s, pool:", poolId, ")");
    socketRef.current.emit(SOCKET_EVENTS.WIDGET_MISSED_OPPORTUNITY, { 
      triggerDelaySeconds,
      poolId,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  // Report visitor interactions (throttled by the hook's callers)
  useEffect(() => {
    if (!socketRef.current || !isConnected) return;

    const handleInteraction = (type: "click" | "scroll") => {
      socketRef.current?.emit(SOCKET_EVENTS.VISITOR_INTERACTION, {
        interactionType: type,
        timestamp: Date.now(),
      });
    };

    const handleClick = () => handleInteraction("click");
    const handleScroll = () => handleInteraction("scroll");

    window.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isConnected]);

  return {
    connect,
    disconnect,
    requestCall,
    cancelCall,
    endCall,
    trackPageview,
    trackMissedOpportunity,
    isConnected,
    isReconnecting,
    visitorId,
    callAccepted,
    callRejected,
    currentCallId,
    connectionError,
    socket: socketRef.current,
  };
}
