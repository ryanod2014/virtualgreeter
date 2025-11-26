"use client";

import {
  Video,
  Users,
  AlertTriangle,
  Coffee,
} from "lucide-react";
import { useWebRTC } from "@/features/webrtc/use-webrtc";
import { ActiveCallStage } from "@/features/webrtc/active-call-stage";
import { CobrowseViewer } from "@/features/cobrowse/CobrowseViewer";
import { useSignalingContext } from "@/features/signaling/signaling-provider";
import type { AgentProfile, User } from "@ghost-greeter/domain/database.types";

interface WorkbenchClientProps {
  agentProfile: AgentProfile | null;
  user: User;
  organizationId: string;
}

export function WorkbenchClient({ agentProfile, user, organizationId }: WorkbenchClientProps) {
  const displayName = agentProfile?.display_name ?? user.full_name;
  
  const {
    isConnected,
    activeCall,
    stats,
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
            <div className="relative">
              {isConnected && !isMarkedAway && (
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

    </>
  );
}

