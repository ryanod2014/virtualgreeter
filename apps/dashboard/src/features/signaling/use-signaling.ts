"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  DashboardToServerEvents,
  ServerToDashboardEvents,
  CallIncomingPayload,
  StatsUpdatePayload,
  ActiveCall,
  CallStartedPayload,
  CobrowseSnapshotPayload,
  CobrowseMousePayload,
  CobrowseScrollPayload,
  CobrowseSelectionPayload,
  AgentMarkedAwayPayload,
  CallRNATimeoutPayload,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER ?? "http://localhost:3001";

interface CobrowseState {
  snapshot: CobrowseSnapshotPayload | null;
  mousePosition: { x: number; y: number } | null;
  scrollPosition: { x: number; y: number } | null;
  selection: { text: string; rect: { x: number; y: number; width: number; height: number } | null } | null;
}

interface UseSignalingReturn {
  isConnected: boolean;
  incomingCall: CallIncomingPayload | null;
  activeCall: ActiveCall | null;
  stats: StatsUpdatePayload | null;
  cobrowse: CobrowseState;
  isMarkedAway: boolean;
  awayReason: string | null;
  acceptCall: (requestId: string) => void;
  rejectCall: (requestId: string, reason?: string) => void;
  endCall: (callId: string) => void;
  setAway: (reason: "idle" | "manual") => void;
  setBack: () => void;
  socket: Socket<ServerToDashboardEvents, DashboardToServerEvents> | null;
}

interface AgentProfileData {
  displayName: string;
  avatarUrl: string | null;
  waveVideoUrl: string | null;
  introVideoUrl: string | null;
  connectVideoUrl: string | null;
  loopVideoUrl: string | null;
}

export function useSignaling(agentId: string, profile?: AgentProfileData): UseSignalingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallIncomingPayload | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [stats, setStats] = useState<StatsUpdatePayload | null>(null);
  const [isMarkedAway, setIsMarkedAway] = useState(false);
  const [awayReason, setAwayReason] = useState<string | null>(null);
  const [cobrowse, setCobrowse] = useState<CobrowseState>({
    snapshot: null,
    mousePosition: null,
    scrollPosition: null,
    selection: null,
  });
  const socketRef = useRef<Socket<ServerToDashboardEvents, DashboardToServerEvents> | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Initialize socket connection
    const socket: Socket<ServerToDashboardEvents, DashboardToServerEvents> = io(SIGNALING_SERVER, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Signaling] Connected to server, socket ID:", socket.id);
      if (isMounted) {
        setIsConnected(true);
      }

      // Login as agent
      console.log("[Signaling] Logging in as agent:", agentId, "with profile:", profile);
      socket.emit(SOCKET_EVENTS.AGENT_LOGIN, {
        agentId,
        token: "demo-token", // TODO: Use real Supabase JWT
        profile: profile ?? {
          displayName: "Agent",
          avatarUrl: null,
          waveVideoUrl: null,
          introVideoUrl: null,
          connectVideoUrl: null,
          loopVideoUrl: null,
        },
      });
    });

    socket.on("disconnect", () => {
      console.log("[Signaling] Disconnected from server");
      if (isMounted) {
        setIsConnected(false);
      }
    });

    socket.on(SOCKET_EVENTS.LOGIN_SUCCESS, (data) => {
      console.log("[Signaling] Login successful", data);
    });

    socket.on(SOCKET_EVENTS.CALL_INCOMING, (data: CallIncomingPayload) => {
      console.log("[Signaling] 🔔🔔🔔 INCOMING CALL 🔔🔔🔔", {
        requestId: data.request.requestId,
        visitorId: data.visitor.visitorId,
        pageUrl: data.visitor.pageUrl,
      });
      console.log("[Signaling] Setting incomingCall state...");
      setIncomingCall(data);
      console.log("[Signaling] incomingCall state SET");
      
      // Play notification sound
      playNotificationSound();
    });

    // Debug: log all events received
    socket.onAny((event, ...args) => {
      console.log("[Signaling] EVENT RECEIVED:", event, args);
    });

    socket.on(SOCKET_EVENTS.CALL_CANCELLED, () => {
      console.log("[Signaling] Call cancelled by visitor");
      setIncomingCall(null);
    });

    socket.on(SOCKET_EVENTS.AGENT_MARKED_AWAY, (data: AgentMarkedAwayPayload) => {
      console.log("[Signaling] Agent marked as away:", data);
      setIsMarkedAway(true);
      setAwayReason(data.message);
      setIncomingCall(null); // Clear any incoming call since we're away
    });

    socket.on(SOCKET_EVENTS.CALL_RNA_TIMEOUT, (data: CallRNATimeoutPayload) => {
      console.log("[Signaling] Call RNA timeout:", data);
      // The agent:marked_away event will handle the UI update
    });

    socket.on(SOCKET_EVENTS.CALL_STARTED, (data: CallStartedPayload) => {
      console.log("[Signaling] Call started", data);
      setIncomingCall(null);
      setActiveCall(data.call);
    });

    socket.on(SOCKET_EVENTS.CALL_ENDED, (data) => {
      console.log("[Signaling] Call ended", data);
      setActiveCall(null);
      // Reset cobrowse state when call ends
      setCobrowse({ snapshot: null, mousePosition: null, scrollPosition: null, selection: null });
    });

    socket.on(SOCKET_EVENTS.STATS_UPDATE, (data: StatsUpdatePayload) => {
      setStats(data);
    });

    // Co-browsing events
    socket.on(SOCKET_EVENTS.COBROWSE_SNAPSHOT, (data) => {
      setCobrowse(prev => ({ ...prev, snapshot: data }));
    });

    socket.on(SOCKET_EVENTS.COBROWSE_MOUSE, (data) => {
      setCobrowse(prev => ({ ...prev, mousePosition: { x: data.x, y: data.y } }));
    });

    socket.on(SOCKET_EVENTS.COBROWSE_SCROLL, (data) => {
      setCobrowse(prev => ({ ...prev, scrollPosition: { x: data.scrollX, y: data.scrollY } }));
    });

    socket.on(SOCKET_EVENTS.COBROWSE_SELECTION, (data) => {
      setCobrowse(prev => ({ ...prev, selection: { text: data.text, rect: data.rect } }));
    });

    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error("[Signaling] Error:", error);
    });

    return () => {
      isMounted = false;
      socket.emit(SOCKET_EVENTS.AGENT_LOGOUT);
      socket.disconnect();
    };
  }, [agentId]);

  const acceptCall = useCallback((requestId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_ACCEPT, { requestId });
  }, []);

  const rejectCall = useCallback((requestId: string, reason?: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_REJECT, { requestId, reason });
    setIncomingCall(null);
  }, []);

  const endCall = useCallback((callId: string) => {
    socketRef.current?.emit(SOCKET_EVENTS.CALL_END, { callId });
    setActiveCall(null);
  }, []);

  const setAway = useCallback((reason: "idle" | "manual") => {
    socketRef.current?.emit(SOCKET_EVENTS.AGENT_AWAY, { reason });
    setIsMarkedAway(true);
    setAwayReason(reason === "idle" ? "You were marked away due to inactivity" : "You set yourself as away");
  }, []);

  const setBack = useCallback(() => {
    socketRef.current?.emit(SOCKET_EVENTS.AGENT_BACK);
    setIsMarkedAway(false);
    setAwayReason(null);
  }, []);

  return {
    isConnected,
    incomingCall,
    activeCall,
    stats,
    cobrowse,
    isMarkedAway,
    awayReason,
    acceptCall,
    rejectCall,
    endCall,
    setAway,
    setBack,
    socket: socketRef.current,
  };
}

function playNotificationSound() {
  // Create a simple notification beep using Web Audio API
  if (typeof window === "undefined") return;
  
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
}

