"use client";

import { useRef, useEffect, useState } from "react";
import {
  Video,
  AlertTriangle,
  Coffee,
  Camera,
  RefreshCw,
  Phone,
  ArrowRight,
} from "lucide-react";
import { useWebRTC } from "@/features/webrtc/use-webrtc";
import { useCallRecording } from "@/features/webrtc/use-call-recording";
import { ActiveCallStage } from "@/features/webrtc/active-call-stage";
import { CobrowseViewer } from "@/features/cobrowse/CobrowseViewer";
import { useSignalingContext } from "@/features/signaling/signaling-provider";
import { useCameraPreview } from "@/features/workbench/hooks/use-camera-preview";
import { createClient } from "@/lib/supabase/client";
import type { AgentProfile, User, RecordingSettings } from "@ghost-greeter/domain/database.types";

interface WorkbenchClientProps {
  agentProfile: AgentProfile | null;
  user: User;
  organizationId: string;
  isAdmin?: boolean;
}

export function WorkbenchClient({ agentProfile, user, organizationId }: WorkbenchClientProps) {
  const displayName = agentProfile?.display_name ?? user.full_name;
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const supabase = createClient();
  
  // Check if this user is an active agent
  const isActiveAgent = agentProfile?.is_active === true;
  
  // Fetch recording settings
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>({
    enabled: false,
    retention_days: 30,
  });

  useEffect(() => {
    async function fetchRecordingSettings() {
      const { data, error } = await supabase
        .from("organizations")
        .select("recording_settings")
        .eq("id", organizationId)
        .single();
      
      console.log("[Recording] Fetched settings:", data?.recording_settings, "Error:", error);
      
      if (data?.recording_settings) {
        setRecordingSettings(data.recording_settings);
      }
    }
    fetchRecordingSettings();
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const {
    isConnected,
    activeCall,
    cobrowse,
    isMarkedAway,
    endCall,
    setBack,
    socket,
  } = useSignalingContext();

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

  // Call recording
  const {
    isRecording,
    recordingError,
    startRecording,
    stopRecording,
  } = useCallRecording({
    organizationId,
    callLogId: activeCall?.callLogId ?? null,
    isRecordingEnabled: recordingSettings.enabled,
  });

  // Start recording when WebRTC is connected
  const hasStartedRecording = useRef(false);
  useEffect(() => {
    console.log("[Recording] Check start conditions:", {
      webrtcConnected,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
      recordingEnabled: recordingSettings.enabled,
      isRecording,
      hasStarted: hasStartedRecording.current,
      callLogId: activeCall?.callLogId,
    });
    
    if (
      webrtcConnected &&
      localStream &&
      remoteStream &&
      recordingSettings.enabled &&
      !isRecording &&
      !hasStartedRecording.current &&
      activeCall
    ) {
      console.log("[Recording] ✅ Starting recording for call:", activeCall.callLogId);
      hasStartedRecording.current = true;
      startRecording(localStream, remoteStream);
    }
  }, [webrtcConnected, localStream, remoteStream, recordingSettings.enabled, isRecording, activeCall, startRecording]);

  // Stop recording and reset flag when call ends
  const prevActiveCall = useRef(activeCall);
  useEffect(() => {
    if (prevActiveCall.current && !activeCall && isRecording) {
      stopRecording();
    }
    if (!activeCall) {
      hasStartedRecording.current = false;
    }
    prevActiveCall.current = activeCall;
  }, [activeCall, isRecording, stopRecording]);

  // Camera preview when active but not on a call
  const shouldShowPreview = isConnected && !isMarkedAway && !activeCall;
  const {
    stream: previewStream,
    isLoading: previewLoading,
    error: previewError,
    retry: retryPreview,
  } = useCameraPreview({ enabled: shouldShowPreview });

  // Attach preview stream to video element
  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const hasVideos = agentProfile?.intro_video_url && agentProfile?.loop_video_url;

  // If user is not an active agent, show the activation prompt
  if (!isActiveAgent) {
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
          </div>
        </header>

        <div className="p-8">
          <div className="max-w-xl mx-auto">
            <div className="glass rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Phone className="w-10 h-10 text-primary" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3">You're not set up to take calls</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Configure your agent profile to start receiving live video calls from website visitors.
              </p>

              <a
                href="/admin/agents"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Agent Settings
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

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
              isRecording={isRecording}
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
        ) : isMarkedAway ? (
          <div className="glass rounded-2xl p-8 min-h-[500px]">
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Coffee className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">You're Away</h2>
              <p className="text-muted-foreground max-w-md">
                You're not receiving calls right now. Set your status to Active when you're ready.
              </p>
              <button
                onClick={setBack}
                className="mt-6 px-6 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
              >
                Go Active
              </button>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl p-8 min-h-[500px]">
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              {/* Camera Preview */}
              <div className="relative w-full max-w-lg mb-6">
                <div className="aspect-video rounded-2xl overflow-hidden bg-black/90 shadow-2xl ring-1 ring-white/10">
                  {previewLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                      <span className="text-sm">Starting camera...</span>
                    </div>
                  ) : previewError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <Camera className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-sm text-red-400 mb-4 max-w-xs">{previewError}</p>
                      <button
                        onClick={retryPreview}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                    </div>
                  ) : previewStream ? (
                    <video
                      ref={previewVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Camera className="w-12 h-12 mb-4 opacity-50" />
                      <span className="text-sm">Camera preview</span>
                    </div>
                  )}
                </div>
                
                {/* Live indicator badge */}
                {isConnected && previewStream && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-sm font-medium shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Live
                  </div>
                )}

                {/* Name tag */}
                {previewStream && (
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-sm font-medium">
                    {displayName}
                  </div>
                )}
              </div>
              
              {/* Status text */}
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Ready for Calls</h2>
                <p className="text-muted-foreground max-w-md">
                  Your simulated presence is broadcasting to visitors. When someone
                  requests to connect, you'll see it here.
                </p>
                {isConnected && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-500">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                    <span className="text-sm font-medium">Broadcasting Live</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
}

