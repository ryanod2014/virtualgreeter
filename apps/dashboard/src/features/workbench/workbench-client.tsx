"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import {
  Video,
  Users,
  Wifi,
  WifiOff,
  AlertTriangle,
  Coffee,
} from "lucide-react";
import { useSignaling } from "@/features/signaling/use-signaling";
import { useWebRTC } from "@/features/webrtc/use-webrtc";
import { IncomingCallModal } from "@/features/workbench/incoming-call-modal";
import { ActiveCallStage } from "@/features/webrtc/active-call-stage";
import { CobrowseViewer } from "@/features/cobrowse/CobrowseViewer";
import { PostCallDispositionModal } from "@/features/workbench/post-call-disposition-modal";
import { useIncomingCall } from "@/features/workbench/hooks/useIncomingCall";
import { useIdleTimer } from "@/features/workbench/hooks/useIdleTimer";
import { useHeartbeat } from "@/features/workbench/hooks/useHeartbeat";
import type { AgentProfile, User } from "@ghost-greeter/domain/database.types";
import { TIMING } from "@ghost-greeter/domain";

interface WorkbenchClientProps {
  agentProfile: AgentProfile | null;
  user: User;
  organizationId: string;
}

export function WorkbenchClient({ agentProfile, user, organizationId }: WorkbenchClientProps) {
  const agentId = agentProfile?.id ?? user.id;
  const displayName = agentProfile?.display_name ?? user.full_name;
  
  // Track ended call for disposition modal
  const [endedCallId, setEndedCallId] = useState<string | null>(null);
  const previousCallRef = useRef<string | null>(null);
  
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
    displayName: agentProfile?.display_name ?? user.full_name,
    avatarUrl: user.avatar_url ?? null,
    waveVideoUrl: agentProfile?.wave_video_url ?? null,
    introVideoUrl: agentProfile?.intro_video_url ?? null,
    connectVideoUrl: agentProfile?.connect_video_url ?? null,
    loopVideoUrl: agentProfile?.loop_video_url ?? null,
  });

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

  // Worker-based heartbeat to prevent tab freezing
  useHeartbeat({
    socket,
    enabled: isConnected,
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
      console.log("[Workbench] Active call:", { callId: activeCall.callId, callLogId: activeCall.callLogId });
      previousCallRef.current = activeCall.callLogId ?? null;
    } else if (previousCallRef.current) {
      // Call just ended - show disposition modal
      console.log("[Workbench] Call ended, showing disposition modal for:", previousCallRef.current);
      setEndedCallId(previousCallRef.current);
      previousCallRef.current = null;
    }
  }, [activeCall]);

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

  // WebRTC connection
  const {
    localStream,
    remoteStream,
    screenShareStream,
    isConnecting: webrtcConnecting,
    isConnected: webrtcConnected,
    isVisitorScreenSharing,
    isAgentScreenSharing,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC({
    socket,
    visitorId: activeCall?.visitorId ?? null,
    isCallActive: !!activeCall,
  });

  const hasVideos = agentProfile?.intro_video_url && agentProfile?.loop_video_url;

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold">Bullpen</h1>
            <p className="text-muted-foreground">
              Manage your live presence and incoming calls
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Disconnected</span>
                </>
              )}
            </div>
            <div className="relative">
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full live-pulse" />
              )}
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {displayName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* No Videos Warning */}
        {!hasVideos && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-500">Setup Required</h3>
              <p className="text-sm text-muted-foreground">
                You haven't uploaded your intro and loop videos yet. Visitors won't see your
                simulated presence until you{" "}
                <a href="/dashboard/videos" className="text-primary hover:underline">
                  upload your videos
                </a>
                .
              </p>
            </div>
          </div>
        )}

        {/* Live Visitors Counter */}
        <div className="mb-8">
          <div className="glass rounded-2xl p-6 inline-flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Live Visitors in Pool</div>
              <div className="text-3xl font-bold flex items-center gap-2">
                {stats?.poolVisitors ?? 0}
                {isConnected && (stats?.poolVisitors ?? 0) > 0 && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Stage Area */}
        {activeCall ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Call */}
            <div className="glass rounded-2xl p-6 min-h-[500px]">
            <ActiveCallStage
              call={activeCall}
              localStream={localStream}
              remoteStream={remoteStream}
              screenShareStream={screenShareStream}
              isConnecting={webrtcConnecting}
              isConnected={webrtcConnected}
              isVisitorScreenSharing={isVisitorScreenSharing}
              isAgentScreenSharing={isAgentScreenSharing}
              onStartScreenShare={startScreenShare}
              onStopScreenShare={stopScreenShare}
              onEndCall={endCall}
            />
            </div>
            
            {/* Co-browse View - Visitor's Screen */}
            <div className="glass rounded-2xl p-6 min-h-[500px]">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Visitor's Screen
              </h3>
              <CobrowseViewer
                snapshot={cobrowse.snapshot}
                mousePosition={cobrowse.mousePosition}
                scrollPosition={cobrowse.scrollPosition}
                selection={cobrowse.selection}
              />
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 min-h-[500px]">
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Video className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Ready for Calls</h2>
              <p className="text-muted-foreground max-w-md">
                Your simulated presence is broadcasting to visitors. When someone
                requests to connect, you'll see it here.
              </p>
              {isConnected && (
                <div className="mt-6 flex items-center gap-2 text-green-500">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                  <span className="text-sm font-medium">Broadcasting Live</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Incoming Call Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Away Modal */}
      {isMarkedAway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative glass rounded-3xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <div className="text-center">
              {/* Icon */}
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Coffee className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold mb-2">You're Away</h2>
              <p className="text-muted-foreground mb-6">
                {awayReason || "You've been marked as away and won't receive incoming calls."}
              </p>

              {/* Action */}
              <button
                onClick={setBack}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
              >
                I'm Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Call Disposition Modal */}
      <PostCallDispositionModal
        isOpen={!!endedCallId}
        callLogId={endedCallId}
        organizationId={organizationId}
        onClose={() => setEndedCallId(null)}
      />
    </>
  );
}

