"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { useSignalingContext } from "@/features/signaling/signaling-provider";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

interface AdminLayoutClientProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
}

export function AdminLayoutClient({
  children,
  user,
  organization,
  agentProfile,
}: AdminLayoutClientProps) {
  const {
    isConnected,
    isReconnecting,
    activeCall,
    isMarkedAway,
    setAway,
    setBack,
    stats,
  } = useSignalingContext();

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        user={user}
        organization={organization}
        agentProfile={agentProfile}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        isMarkedAway={isMarkedAway}
        activeCall={activeCall}
        poolVisitors={stats?.poolVisitors ?? 0}
        onSetAway={() => setAway("manual")}
        onSetBack={setBack}
      />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}

