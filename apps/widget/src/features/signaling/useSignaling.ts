import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { io, Socket } from "socket.io-client";
import type {
  WidgetToServerEvents,
  ServerToWidgetEvents,
  AgentAssignedPayload,
  AgentReassignedPayload,
  CallAcceptedPayload,
  CallRejectedPayload,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { CONNECTION_TIMING, ERROR_MESSAGES } from "../../constants";

interface UseSignalingOptions {
  serverUrl: string;
  orgId: string;
  onAgentAssigned: (data: AgentAssignedPayload) => void;
  onAgentReassigned: (data: AgentReassignedPayload) => void;
  onAgentUnavailable: () => void;
  onCallAccepted: (data: CallAcceptedPayload) => void;
  onCallRejected: (data: CallRejectedPayload) => void;
  onCallEnded: () => void;
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
      reconnectAttemptRef.current = 0;

      // Notify parent if we reconnected
      if (reconnectAttemptRef.current > 0) {
        optionsRef.current.onReconnected?.();
      }

      // Join as visitor
      socket.emit(SOCKET_EVENTS.VISITOR_JOIN, {
        orgId: optionsRef.current.orgId,
        pageUrl: window.location.href,
        visitorId: visitorId ?? undefined, // Use existing ID if reconnecting
      });
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

    // Call accepted
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, (data: CallAcceptedPayload) => {
      console.log("[Widget] Call accepted:", data);
      setCallAccepted(true);
      setCallRejected(false);
      setCurrentCallId(data.callId);
      optionsRef.current.onCallAccepted(data);
    });

    // Call rejected
    socket.on(SOCKET_EVENTS.CALL_REJECTED, (data: CallRejectedPayload) => {
      console.log("[Widget] Call rejected:", data);
      setCallRejected(true);
      setCallAccepted(false);
      currentRequestIdRef.current = null;
      optionsRef.current.onCallRejected(data);
    });

    // Call ended
    socket.on(SOCKET_EVENTS.CALL_ENDED, () => {
      console.log("[Widget] Call ended");
      setCallAccepted(false);
      setCallRejected(false);
      setCurrentCallId(null);
      currentRequestIdRef.current = null;
      optionsRef.current.onCallEnded();
    });

    // Server error
    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.log("[Widget] 📥 Received ERROR event:", error);
      
      if (error.code === "AGENT_UNAVAILABLE") {
        console.log("[Widget] 🚫 Agent unavailable - hiding widget");
        optionsRef.current.onAgentUnavailable();
      } else {
        setConnectionError(error.message);
        optionsRef.current.onConnectionError?.(error.message);
      }
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
