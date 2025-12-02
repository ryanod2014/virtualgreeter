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
  CallReconnectedPayload,
  CobrowseSnapshotPayload,
  CobrowseMousePayload,
  CobrowseScrollPayload,
  CobrowseSelectionPayload,
  AgentMarkedAwayPayload,
  CallRNATimeoutPayload,
  StatusAckPayload,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER ?? "http://localhost:3001";

// Retry configuration for status change operations
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 500; // ms
const ACK_TIMEOUT = 5000; // 5 seconds to wait for server acknowledgment

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

interface UseSignalingOptions {
  profile?: AgentProfileData;
  accessToken?: string | null;
}

export function useSignaling(agentId: string, options?: UseSignalingOptions): UseSignalingReturn {
  const { profile, accessToken } = options ?? {};
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
    let reconnectCount = 0;
    
    // Initialize socket connection with robust reconnection
    const socket: Socket<ServerToDashboardEvents, DashboardToServerEvents> = io(SIGNALING_SERVER, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity, // Never stop trying
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Cap at 10 seconds
      randomizationFactor: 0.5, // Add jitter to prevent thundering herd
      timeout: 20000, // Connection timeout
    });

    socketRef.current = socket;

    // Helper to login agent
    const loginAgent = () => {
      console.log("[Signaling] Logging in as agent:", agentId, "with profile:", profile);
      socket.emit(SOCKET_EVENTS.AGENT_LOGIN, {
        agentId,
        token: accessToken ?? "demo-token", // Use Supabase JWT when available
        profile: profile ?? {
          displayName: "Agent",
          avatarUrl: null,
          waveVideoUrl: null,
          introVideoUrl: null,
          connectVideoUrl: null,
          loopVideoUrl: null,
        },
      });
    };

    socket.on("connect", () => {
      console.log("[Signaling] Connected to server, socket ID:", socket.id, "reconnectCount:", reconnectCount);
      if (isMounted) {
        setIsConnected(true);
      }

      // Always login on connect (handles both initial connect and reconnect)
      loginAgent();
      
      // Reset reconnect count on successful connection
      reconnectCount = 0;
    });

    socket.on("disconnect", (reason) => {
      console.log("[Signaling] Disconnected from server, reason:", reason);
      if (isMounted) {
        setIsConnected(false);
      }
      
      // If server closed the connection, we need to manually reconnect
      if (reason === "io server disconnect") {
        console.log("[Signaling] Server disconnected us, attempting manual reconnect...");
        socket.connect();
      }
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      reconnectCount = attempt;
      console.log("[Signaling] Reconnection attempt:", attempt);
    });

    socket.io.on("reconnect", (attempt) => {
      console.log("[Signaling] Reconnected after", attempt, "attempts");
    });

    socket.io.on("reconnect_error", (error) => {
      console.error("[Signaling] Reconnection error:", error);
    });

    socket.on("connect_error", (error) => {
      console.error("[Signaling] Connection error:", error.message);
    });

    socket.on(SOCKET_EVENTS.LOGIN_SUCCESS, (data) => {
      console.log("[Signaling] Login successful", data);
      // Restore away status from server (important for reconnects/page reloads)
      if (data.agentState?.profile?.status === "away") {
        console.log("[Signaling] Restoring away status from server");
        setIsMarkedAway(true);
        // Use "set yourself" in the message to prevent the "Are you back?" modal from showing
        // (the modal only shows for automatic away, not manual)
        setAwayReason("You set yourself as away");
      }
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

    // Visitor reconnected after page navigation - update call ID and re-init WebRTC
    socket.on(SOCKET_EVENTS.CALL_RECONNECTED, (data: CallReconnectedPayload) => {
      console.log("[Signaling] 🔄 Visitor reconnected to call:", data);
      // Update the active call with the new call ID
      // The WebRTC connection will need to be re-established
      // The peerId is the visitor's ID
      setActiveCall(prev => prev ? {
        ...prev,
        callId: data.callId,
        visitorId: data.peerId, // Update in case it changed
        reconnectToken: data.reconnectToken,
      } : null);
      // Reset cobrowse state - visitor's page may have changed
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
  }, [agentId, accessToken]);

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

  const setAway = useCallback(async (reason: "idle" | "manual") => {
    const socket = socketRef.current;
    console.log("[Signaling] 🚫 Setting away, reason:", reason, "socket connected:", socket?.connected);
    
    const awayMessage = reason === "idle" 
      ? "You were marked away due to inactivity" 
      : "You set yourself as away";

    // Emit with acknowledgment and retry logic
    const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
      // Wait for socket to be connected
      if (!socketRef.current?.connected) {
        if (attempt >= MAX_RETRIES) {
          console.error("[Signaling] ⚠️ Max retries reached for setAway, socket not connected");
          return false;
        }
        console.log(`[Signaling] Socket disconnected, reconnecting (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        socketRef.current?.connect();
        await new Promise(resolve => setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempt)));
        return emitWithRetry(attempt + 1);
      }

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn(`[Signaling] Ack timeout for setAway (attempt ${attempt + 1})`);
          if (attempt < MAX_RETRIES - 1) {
            emitWithRetry(attempt + 1).then(resolve);
          } else {
            // Fallback: assume it worked if we're still connected after max retries
            console.warn("[Signaling] Max retries reached, assuming setAway succeeded");
            resolve(true);
          }
        }, ACK_TIMEOUT);

        socketRef.current?.emit(SOCKET_EVENTS.AGENT_AWAY, { reason }, (response: StatusAckPayload) => {
          clearTimeout(timeoutId);
          console.log("[Signaling] setAway ack received:", response);
          
          if (response.success) {
            resolve(true);
          } else {
            console.error("[Signaling] setAway failed:", response.error);
            if (attempt < MAX_RETRIES - 1) {
              setTimeout(() => {
                emitWithRetry(attempt + 1).then(resolve);
              }, BASE_RETRY_DELAY * Math.pow(2, attempt));
            } else {
              resolve(false);
            }
          }
        });
      });
    };

    const success = await emitWithRetry();
    
    if (success) {
      setIsMarkedAway(true);
      setAwayReason(awayMessage);
    } else {
      console.error("[Signaling] Failed to set away status after all retries");
      // Optionally still set local state as a last resort
      // This prevents the agent from appearing available when they're not
      setIsMarkedAway(true);
      setAwayReason(awayMessage + " (sync pending)");
    }
  }, []);

  const setBack = useCallback(async () => {
    const socket = socketRef.current;
    console.log("[Signaling] ✅ Setting back, socket connected:", socket?.connected);

    // Emit with acknowledgment and retry logic
    const emitWithRetry = async (attempt: number = 0): Promise<boolean> => {
      // Wait for socket to be connected
      if (!socketRef.current?.connected) {
        if (attempt >= MAX_RETRIES) {
          console.error("[Signaling] ⚠️ Max retries reached for setBack, socket not connected");
          return false;
        }
        console.log(`[Signaling] Socket disconnected, reconnecting (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        socketRef.current?.connect();
        await new Promise(resolve => setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempt)));
        return emitWithRetry(attempt + 1);
      }

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn(`[Signaling] Ack timeout for setBack (attempt ${attempt + 1})`);
          if (attempt < MAX_RETRIES - 1) {
            emitWithRetry(attempt + 1).then(resolve);
          } else {
            // Fallback: assume it worked if we're still connected after max retries
            console.warn("[Signaling] Max retries reached, assuming setBack succeeded");
            resolve(true);
          }
        }, ACK_TIMEOUT);

        socketRef.current?.emit(SOCKET_EVENTS.AGENT_BACK, (response: StatusAckPayload) => {
          clearTimeout(timeoutId);
          console.log("[Signaling] setBack ack received:", response);
          
          if (response.success) {
            resolve(true);
          } else {
            console.error("[Signaling] setBack failed:", response.error);
            if (attempt < MAX_RETRIES - 1) {
              setTimeout(() => {
                emitWithRetry(attempt + 1).then(resolve);
              }, BASE_RETRY_DELAY * Math.pow(2, attempt));
            } else {
              resolve(false);
            }
          }
        });
      });
    };

    const success = await emitWithRetry();
    
    if (success) {
      setIsMarkedAway(false);
      setAwayReason(null);
    } else {
      console.error("[Signaling] Failed to set back status after all retries");
      // Still try to update local state - better to show as available than stuck away
      setIsMarkedAway(false);
      setAwayReason(null);
    }
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

