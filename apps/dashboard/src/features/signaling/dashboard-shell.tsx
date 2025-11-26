"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Coffee } from "lucide-react";
import { SignalingProvider, useSignalingContext } from "./signaling-provider";
import { IncomingCallModal } from "@/features/workbench/incoming-call-modal";
import { PostCallDispositionModal } from "@/features/workbench/post-call-disposition-modal";
import { AgentSidebar } from "@/features/workbench/agent-sidebar";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

interface DashboardShellProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

export function DashboardShell({
  children,
  user,
  organization,
  agentProfile,
  isAdmin,
}: DashboardShellProps) {
  return (
    <SignalingProvider
      user={user}
      agentProfile={agentProfile}
      organizationId={organization.id}
    >
      <DashboardShellInner
        user={user}
        organization={organization}
        agentProfile={agentProfile}
        isAdmin={isAdmin}
      >
        {children}
      </DashboardShellInner>
    </SignalingProvider>
  );
}

interface DashboardShellInnerProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

function DashboardShellInner({
  children,
  user,
  organization,
  agentProfile,
  isAdmin,
}: DashboardShellInnerProps) {
  const {
    isConnected,
    incomingCall,
    activeCall,
    isMarkedAway,
    awayReason,
    acceptCall,
    rejectCall,
    setAway,
    setBack,
  } = useSignalingContext();

  // Track ended call for disposition modal
  const [endedCallId, setEndedCallId] = useState<string | null>(null);
  const previousCallRef = useRef<string | null>(null);

  // Track when call ends to show disposition modal
  useEffect(() => {
    if (activeCall) {
      previousCallRef.current = activeCall.callLogId ?? null;
    } else if (previousCallRef.current) {
      setEndedCallId(previousCallRef.current);
      previousCallRef.current = null;
    }
  }, [activeCall]);

  return (
    <div className="min-h-screen bg-background">
      <AgentSidebar
        user={user}
        organization={organization}
        agentProfile={agentProfile}
        isAdmin={isAdmin}
        isConnected={isConnected}
        isMarkedAway={isMarkedAway}
        activeCall={activeCall}
        onSetAway={() => setAway("manual")}
        onSetBack={setBack}
      />
      <main className="ml-64 min-h-screen">{children}</main>

      {/* Incoming Call Modal - shown on any page */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      {/* Away Modal - only show for automatic away (idle/RNA), not manual breaks */}
      {isMarkedAway && awayReason && !awayReason.includes("set yourself") && (
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
              <h2 className="text-2xl font-bold mb-2">You've Been Marked Away</h2>
              <p className="text-muted-foreground mb-6">{awayReason}</p>

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
        organizationId={organization.id}
        onClose={() => setEndedCallId(null)}
      />
    </div>
  );
}

