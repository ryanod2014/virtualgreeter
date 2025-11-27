"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import type {
  CallIncomingPayload,
  StatsUpdatePayload,
  ActiveCall,
  CobrowseSnapshotPayload,
} from "@ghost-greeter/domain";
import { useSignaling } from "./use-signaling";
import { useIncomingCall } from "@/features/workbench/hooks/useIncomingCall";
import { useIdleTimer } from "@/features/workbench/hooks/useIdleTimer";
import { useHeartbeat } from "@/features/workbench/hooks/useHeartbeat";
import { TIMING } from "@ghost-greeter/domain";
import type { AgentProfile, User } from "@ghost-greeter/domain/database.types";
import { createClient } from "@/lib/supabase/client";

interface CobrowseState {
  snapshot: CobrowseSnapshotPayload | null;
  mousePosition: { x: number; y: number } | null;
  scrollPosition: { x: number; y: number } | null;
  selection: { text: string; rect: { x: number; y: number; width: number; height: number } | null } | null;
}

interface SignalingContextType {
  isConnected: boolean;
  isReconnecting: boolean;
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
  socket: Socket | null;
  // For incoming call audio
  isAudioReady: boolean;
  initializeAudio: () => void;
}

const SignalingContext = createContext<SignalingContextType | null>(null);

interface SignalingProviderProps {
  children: ReactNode;
  user: User;
  agentProfile: AgentProfile | null;
  organizationId: string;
}

export function SignalingProvider({
  children,
  user,
  agentProfile,
  organizationId,
}: SignalingProviderProps) {
  const agentId = agentProfile?.id ?? user.id;
  
  // Track Supabase access token for server authentication
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Fetch access token on mount and listen for auth changes
  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null);
    });
    
    // Listen for auth state changes (e.g., token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Track ended call for disposition modal
  const [endedCallId, setEndedCallId] = useState<string | null>(null);
  const previousCallRef = useRef<string | null>(null);
  
  // Track reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wasConnectedRef = useRef(false);
  
  const {
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
    socket,
  } = useSignaling(agentId, {
    profile: {
      displayName: agentProfile?.display_name ?? user.full_name,
      avatarUrl: user.avatar_url ?? null,
      waveVideoUrl: agentProfile?.wave_video_url ?? null,
      introVideoUrl: agentProfile?.intro_video_url ?? null,
      connectVideoUrl: agentProfile?.connect_video_url ?? null,
      loopVideoUrl: agentProfile?.loop_video_url ?? null,
    },
    accessToken,
  });

  // Track reconnection state based on connection changes
  useEffect(() => {
    if (isConnected) {
      // We're connected
      if (isReconnecting) {
        console.log("[SignalingProvider] Reconnected successfully!");
        setIsReconnecting(false);
      }
      wasConnectedRef.current = true;
    } else if (wasConnectedRef.current) {
      // We were connected but now we're not - we're reconnecting
      console.log("[SignalingProvider] Connection lost, attempting to reconnect...");
      setIsReconnecting(true);
    }
  }, [isConnected, isReconnecting]);

  // Incoming call notifications and audio
  const {
    startRinging,
    stopRinging,
    isAudioReady,
    initializeAudio,
  } = useIncomingCall();

  // Auto-away on idle
  const { isIdle } = useIdleTimer({
    timeout: TIMING.AGENT_IDLE_TIMEOUT,
    onIdle: () => {
      if (!activeCall && !isMarkedAway) {
        setAway("idle");
      }
    },
    // Disable idle tracking during calls
    enabled: !activeCall,
  });

  // Handler for stale connection detection
  const handleConnectionStale = useCallback(() => {
    console.log("[SignalingProvider] Connection appears stale, triggering reconnect...");
    if (socket && !socket.connected) {
      socket.connect();
    } else if (socket) {
      // Force reconnect by disconnecting and reconnecting
      socket.disconnect();
      socket.connect();
    }
  }, [socket]);

  // Worker-based heartbeat to prevent tab freezing
  const { isConnectionHealthy } = useHeartbeat({
    socket,
    enabled: isConnected,
    onConnectionStale: handleConnectionStale,
  });

  // Handle incoming call - start/stop ringing
  useEffect(() => {
    if (incomingCall) {
      startRinging(incomingCall);
    } else {
      stopRinging();
    }
  }, [incomingCall, startRinging, stopRinging]);

  // Track when call ends to show disposition modal
  useEffect(() => {
    if (activeCall) {
      // Store the database call log ID (not the generated callId)
      console.log("[SignalingProvider] Active call:", { callId: activeCall.callId, callLogId: activeCall.callLogId });
      previousCallRef.current = activeCall.callLogId ?? null;
    } else if (previousCallRef.current) {
      // Call just ended - show disposition modal
      console.log("[SignalingProvider] Call ended, showing disposition modal for:", previousCallRef.current);
      setEndedCallId(previousCallRef.current);
      previousCallRef.current = null;
    }
  }, [activeCall]);

  // Handle call acceptance with ring stop
  const handleAcceptCall = useCallback((requestId: string) => {
    stopRinging();
    acceptCall(requestId);
  }, [stopRinging, acceptCall]);

  // Handle call rejection with ring stop
  const handleRejectCall = useCallback((requestId: string, reason?: string) => {
    stopRinging();
    rejectCall(requestId, reason);
  }, [stopRinging, rejectCall]);

  // Initialize audio on first user interaction (for AudioContext)
  const handleFirstInteraction = useCallback(() => {
    if (!isAudioReady) {
      initializeAudio();
    }
  }, [isAudioReady, initializeAudio]);

  // Listen for first interaction to init audio
  useEffect(() => {
    const events = ["click", "keydown", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleFirstInteraction, { once: true });
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleFirstInteraction);
      });
    };
  }, [handleFirstInteraction]);

  const contextValue = useMemo<SignalingContextType>(() => ({
    isConnected,
    isReconnecting,
    incomingCall,
    activeCall,
    stats,
    cobrowse,
    isMarkedAway,
    awayReason,
    acceptCall: handleAcceptCall,
    rejectCall: handleRejectCall,
    endCall,
    setAway,
    setBack,
    socket,
    isAudioReady,
    initializeAudio,
  }), [
    isConnected,
    isReconnecting,
    incomingCall,
    activeCall,
    stats,
    cobrowse,
    isMarkedAway,
    awayReason,
    handleAcceptCall,
    handleRejectCall,
    endCall,
    setAway,
    setBack,
    socket,
    isAudioReady,
    initializeAudio,
  ]);

  return (
    <SignalingContext.Provider value={contextValue}>
      {children}
    </SignalingContext.Provider>
  );
}

export function useSignalingContext() {
  const context = useContext(SignalingContext);
  if (!context) {
    throw new Error("useSignalingContext must be used within a SignalingProvider");
  }
  return context;
}

// Export the ended call ID and setter for the disposition modal
export function useEndedCallId() {
  const [endedCallId, setEndedCallId] = useState<string | null>(null);
  return { endedCallId, setEndedCallId };
}

