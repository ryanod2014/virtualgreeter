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

interface UseSignalingOptions {
  serverUrl: string;
  siteId: string;
  onAgentAssigned: (data: AgentAssignedPayload) => void;
  onAgentReassigned: (data: AgentReassignedPayload) => void;
  onAgentUnavailable: () => void;
  onCallAccepted: (data: CallAcceptedPayload) => void;
  onCallRejected: (data: CallRejectedPayload) => void;
  onCallEnded: () => void;
}

interface UseSignalingReturn {
  connect: () => void;
  disconnect: () => void;
  requestCall: (agentId: string) => void;
  cancelCall: () => void;
  endCall: (callId: string) => void;
  isConnected: boolean;
  visitorId: string | null;
  callAccepted: boolean;
  callRejected: boolean;
  currentCallId: string | null;
  socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> | null;
}

export function useSignaling(options: UseSignalingOptions): UseSignalingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callRejected, setCallRejected] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  
  const socketRef = useRef<Socket<ServerToWidgetEvents, WidgetToServerEvents> | null>(null);
  const currentRequestIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket: Socket<ServerToWidgetEvents, WidgetToServerEvents> = io(options.serverUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Widget] Connected to signaling server");
      setIsConnected(true);

      // Join as visitor
      socket.emit(SOCKET_EVENTS.VISITOR_JOIN, {
        siteId: options.siteId,
        pageUrl: window.location.href,
      });
    });

    socket.on("disconnect", () => {
      console.log("[Widget] Disconnected from signaling server");
      setIsConnected(false);
    });

    socket.on(SOCKET_EVENTS.AGENT_ASSIGNED, (data: AgentAssignedPayload) => {
      console.log("[Widget] 🎉 AGENT_ASSIGNED received:", {
        agentId: data.agent.id,
        agentName: data.agent.displayName,
        visitorId: data.visitorId,
      });
      setVisitorId(data.visitorId);
      options.onAgentAssigned(data);
    });

    socket.on(SOCKET_EVENTS.AGENT_REASSIGNED, (data: AgentReassignedPayload) => {
      console.log("[Widget] Agent reassigned:", data);
      options.onAgentReassigned(data);
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, (data: CallAcceptedPayload) => {
      console.log("[Widget] Call accepted:", data);
      setCallAccepted(true);
      setCallRejected(false);
      setCurrentCallId(data.callId);
      options.onCallAccepted(data);
    });

    socket.on(SOCKET_EVENTS.CALL_REJECTED, (data: CallRejectedPayload) => {
      console.log("[Widget] Call rejected:", data);
      setCallRejected(true);
      setCallAccepted(false);
      currentRequestIdRef.current = null;
      options.onCallRejected(data);
    });

    socket.on(SOCKET_EVENTS.CALL_ENDED, () => {
      console.log("[Widget] Call ended");
      setCallAccepted(false);
      setCallRejected(false);
      setCurrentCallId(null);
      currentRequestIdRef.current = null;
      options.onCallEnded();
    });

    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error("[Widget] Socket error:", error);
      // Check if agent became unavailable
      if (error.code === "AGENT_UNAVAILABLE") {
        options.onAgentUnavailable();
      }
    });
  }, [options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.VISITOR_DISCONNECT);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setVisitorId(null);
  }, []);

  const requestCall = useCallback((agentId: string) => {
    if (!socketRef.current) {
      console.error("[Widget] Cannot request call - socket not connected");
      return;
    }
    if (!socketRef.current.connected) {
      console.error("[Widget] Cannot request call - socket disconnected");
      return;
    }
    
    console.log("[Widget] Requesting call with agent:", agentId);
    socketRef.current.emit(SOCKET_EVENTS.CALL_REQUEST, { agentId });
    
    // Track request for cancellation
    currentRequestIdRef.current = `pending_${Date.now()}`;
  }, []);

  const cancelCall = useCallback(() => {
    if (!socketRef.current || !currentRequestIdRef.current) return;
    
    socketRef.current.emit(SOCKET_EVENTS.CALL_CANCEL, {
      requestId: currentRequestIdRef.current,
    });
    currentRequestIdRef.current = null;
    setCallRejected(false);
    setCallAccepted(false);
  }, []);

  const endCall = useCallback((callId: string) => {
    if (!socketRef.current) return;
    
    console.log("[Widget] Ending call:", callId);
    socketRef.current.emit(SOCKET_EVENTS.CALL_END, { callId });
    setCallAccepted(false);
    setCurrentCallId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Report interactions
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
    isConnected,
    visitorId,
    callAccepted,
    callRejected,
    currentCallId,
    socket: socketRef.current,
  };
}

