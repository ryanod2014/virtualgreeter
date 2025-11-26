"use client";

import { useState, useEffect } from "react";
import {
  Video,
  Users,
  Phone,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { useSignaling } from "@/features/signaling/use-signaling";
import { useWebRTC } from "@/features/webrtc/use-webrtc";
import { IncomingCallModal } from "@/features/workbench/incoming-call-modal";
import { ActiveCallStage } from "@/features/webrtc/active-call-stage";
import { StatsCard } from "@/features/workbench/stats-card";
import { CobrowseViewer } from "@/features/cobrowse/CobrowseViewer";
import type { AgentProfile, User } from "@ghost-greeter/domain/database.types";

interface WorkbenchClientProps {
  agentProfile: AgentProfile | null;
  user: User;
}

export function WorkbenchClient({ agentProfile, user }: WorkbenchClientProps) {
  const agentId = agentProfile?.id ?? user.id;
  const displayName = agentProfile?.display_name ?? user.full_name;
  
  const {
    isConnected,
    incomingCall,
    activeCall,
    stats,
    cobrowse,
    acceptCall,
    rejectCall,
    endCall,
    socket,
  } = useSignaling(agentId);

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
            <h1 className="text-2xl font-bold">Workbench</h1>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Active Simulations"
            value={stats?.activeSimulations ?? 0}
            icon={Video}
            color="primary"
          />
          <StatsCard
            title="Visitors Watching"
            value={stats?.totalVisitorsWatching ?? 0}
            icon={Users}
            color="success"
          />
          <StatsCard
            title="Calls Today"
            value={stats?.callsToday ?? 0}
            icon={Phone}
            color="accent"
          />
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
        onAccept={acceptCall}
        onReject={rejectCall}
      />
    </>
  );
}

