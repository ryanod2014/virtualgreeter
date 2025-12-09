"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { useSignalingContext } from "@/features/signaling/signaling-provider";
import { FeedbackButtons } from "@/features/feedback";
import { PaymentBlocker } from "@/components/PaymentBlocker";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

interface AdminLayoutClientProps {
  children: ReactNode;
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

export function AdminLayoutClient({
  children,
  user,
  organization,
  agentProfile,
  isAdmin,
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

  // Check if organization has payment issues
  const isPastDue = organization.subscription_status === "past_due";

  return (
    <div className="min-h-screen bg-background dark relative overflow-hidden">
      {/* Payment blocker - shows when subscription is past_due */}
      {isPastDue && <PaymentBlocker isAdmin={isAdmin} />}

      {/* Background effects - matching landing page */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[600px] h-[600px] -top-[300px] left-1/2 -translate-x-1/2 bg-primary/15" />
        <div className="glow-orb w-[400px] h-[400px] top-[60%] -left-[150px] bg-purple-600/10" />
        <div className="glow-orb w-[350px] h-[350px] top-[40%] -right-[100px] bg-fuchsia-600/8" />
      </div>

      {/* Grid pattern */}
      <div className="fixed inset-0 grid-pattern pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
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
        <FeedbackButtons organizationId={organization.id} userId={user.id} />
      </div>
    </div>
  );
}

