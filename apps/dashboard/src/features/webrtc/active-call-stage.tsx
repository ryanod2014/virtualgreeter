"use client";

import { useEffect, useRef, useState } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Clock,
  Loader2,
  Monitor,
  MonitorUp,
  MonitorOff,
} from "lucide-react";
import type { ActiveCall } from "@ghost-greeter/domain";

interface ActiveCallStageProps {
  call: ActiveCall;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  isConnecting: boolean;
  isConnected: boolean;
  isVisitorScreenSharing: boolean;
  isAgentScreenSharing: boolean;
  onStartScreenShare: () => Promise<boolean>;
  onStopScreenShare: () => void;
  onEndCall: (callId: string) => void;
}

export function ActiveCallStage({
  call,
  localStream,
  remoteStream,
  screenShareStream,
  isConnecting,
  isConnected,
  isVisitorScreenSharing,
  isAgentScreenSharing,
  onStartScreenShare,
  onStopScreenShare,
  onEndCall,
}: ActiveCallStageProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  // Re-run when screen sharing state changes since the video element changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isVisitorScreenSharing]);

  // Attach screen share stream to video element
  useEffect(() => {
    if (screenShareRef.current && screenShareStream) {
      screenShareRef.current.srcObject = screenShareStream;
    }
  }, [screenShareStream]);

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - call.startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [call.startedAt]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="relative h-full min-h-[500px] bg-background">
      {/* Main View - Screen Share or Remote Video */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-muted">
        {/* Screen Share (when active) */}
        {isVisitorScreenSharing && screenShareStream ? (
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <>
            {/* Remote Video (Full) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${remoteStream ? "block" : "hidden"}`}
            />
            {/* Placeholder when no remote video */}
            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {isConnecting ? (
                    <>
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      </div>
                      <p className="text-muted-foreground">Connecting to visitor...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-24 h-24 rounded-full bg-muted-foreground/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl font-bold text-muted-foreground">V</span>
                      </div>
                      <p className="text-muted-foreground">Waiting for visitor video...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Visitor Camera (PiP when screen sharing) */}
      {isVisitorScreenSharing && remoteStream && (
        <div className="absolute top-6 right-6 w-48 aspect-video rounded-xl overflow-hidden border-2 border-primary shadow-xl">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-xs text-white flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Visitor
          </div>
        </div>
      )}

      {/* Local Video (PiP) */}
      <div className={`absolute ${isVisitorScreenSharing ? "bottom-6 right-6" : "bottom-24 right-6"} w-48 aspect-video rounded-xl overflow-hidden border-2 border-border shadow-xl`}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${localStream ? "block" : "hidden"}`}
        />
        {isVideoOff && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {!localStream && !isVideoOff && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>

      {/* Call Info */}
      <div className="absolute top-6 left-6 flex items-center gap-4">
        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-sm font-medium text-red-500">LIVE</span>
        </div>
        <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono text-sm">{formatDuration(callDuration)}</span>
        </div>
        {isConnected && (
          <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-sm font-medium text-green-500">Connected</span>
          </div>
        )}
        {isVisitorScreenSharing && (
          <div className="glass rounded-full px-4 py-2 flex items-center gap-2 bg-primary/20">
            <Monitor className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Visitor Sharing</span>
          </div>
        )}
        {isAgentScreenSharing && (
          <div className="glass rounded-full px-4 py-2 flex items-center gap-2 bg-green-500/20">
            <MonitorUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">You're Sharing</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="glass rounded-2xl px-6 py-4 flex items-center gap-4">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isMuted
                ? "bg-destructive/20 text-destructive"
                : "bg-muted hover:bg-muted-foreground/10"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isVideoOff
                ? "bg-destructive/20 text-destructive"
                : "bg-muted hover:bg-muted-foreground/10"
            }`}
          >
            {isVideoOff ? (
              <VideoOff className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
          </button>

          {/* Screen Share for demos */}
          <button
            onClick={isAgentScreenSharing ? onStopScreenShare : onStartScreenShare}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isAgentScreenSharing
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted-foreground/10"
            }`}
            title={isAgentScreenSharing ? "Stop sharing screen" : "Share screen for demo"}
          >
            {isAgentScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <MonitorUp className="w-5 h-5" />
            )}
          </button>

          <div className="w-px h-8 bg-border" />

          <button
            onClick={() => onEndCall(call.callId)}
            className="w-14 h-14 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <div className="w-px h-8 bg-border" />

          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 rounded-xl bg-muted hover:bg-muted-foreground/10 flex items-center justify-center transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
