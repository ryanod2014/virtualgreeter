"use client";

import type { ReactNode } from "react";
import { AgentSidebar } from "@/features/workbench/agent-sidebar";
import { useSignalingContext } from "@/features/signaling/signaling-provider";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

interface DashboardLayoutClientProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

export function DashboardLayoutClient({
  children,
  user,
  organization,
  agentProfile,
  isAdmin,
}: DashboardLayoutClientProps) {
  const {
    isConnected,
    isReconnecting,
    activeCall,
    isMarkedAway,
    setAway,
    setBack,
  } = useSignalingContext();

  return (
    <div className="min-h-screen bg-background">
      <AgentSidebar
        user={user}
        organization={organization}
        agentProfile={agentProfile}
        isAdmin={isAdmin}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        isMarkedAway={isMarkedAway}
        activeCall={activeCall}
        onSetAway={() => setAway("manual")}
        onSetBack={setBack}
      />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}

