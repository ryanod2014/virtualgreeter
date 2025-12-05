"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Coffee } from "lucide-react";
import { SignalingProvider, useSignalingContext } from "./signaling-provider";
import { IncomingCallModal } from "@/features/workbench/incoming-call-modal";
import { PostCallDispositionModal } from "@/features/workbench/post-call-disposition-modal";
import { SurveyTrigger } from "@/features/surveys";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

interface AppShellProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

export function AppShell({
  children,
  user,
  organization,
  agentProfile,
  isAdmin,
}: AppShellProps) {
  return (
    <SignalingProvider
      user={user}
      agentProfile={agentProfile}
      organizationId={organization.id}
    >
      <AppShellInner
        user={user}
        organization={organization}
        agentProfile={agentProfile}
        isAdmin={isAdmin}
      >
        {children}
      </AppShellInner>
    </SignalingProvider>
  );
}

interface AppShellInnerProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

function AppShellInner({
  children,
  user,
  organization,
  agentProfile,
  isAdmin,
}: AppShellInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    incomingCall,
    activeCall,
    isMarkedAway,
    awayReason,
    acceptCall,
    rejectCall,
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

  // Handle call acceptance - if on admin pages, redirect to bullpen first
  const handleAcceptCall = (requestId: string) => {
    // Accept the call first (this happens on the same socket connection)
    acceptCall(requestId);
    
    // If on admin pages, navigate to bullpen to see the call UI
    if (pathname.startsWith("/admin")) {
      router.push("/dashboard");
    }
  };

  return (
    <>
      {children}

      {/* Incoming Call Modal - shown on any page */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={handleAcceptCall}
        onReject={rejectCall}
        rnaTimeoutSeconds={organization.recording_settings?.rna_timeout_seconds}
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

      {/* PMF Survey Trigger - random prompt for eligible users */}
      <SurveyTrigger user={user} />
    </>
  );
}

