"use client";

import { useState } from "react";
import {
  Users,
  Phone,
  Clock,
  CheckCircle,
  Check,
  UserPlus,
  Layers,
  X,
  Video,
  Circle,
  BarChart3,
  Loader2,
  Mail,
  Shield,
  CreditCard,
  UserMinus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Pool {
  id: string;
  name: string;
  is_catch_all: boolean;
}

interface PoolMembership {
  id: string;
  pool: Pool;
  wave_video_url: string | null;
  intro_video_url: string | null;
  loop_video_url: string | null;
}

interface Agent {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  wave_video_url: string | null;
  intro_video_url: string | null;
  loop_video_url: string | null;
  max_simultaneous_simulations: number;
  user: {
    email: string;
    full_name: string;
  };
  agent_pool_members: PoolMembership[];
}

interface AgentStats {
  totalCalls: number;
  completedCalls: number;
  totalDuration: number;
}

interface PendingInvite {
  id: string;
  email: string;
  full_name: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface BillingInfo {
  totalAgents: number;
  includedSeats: number;
  additionalSeats: number;
  activeAgents: number;
  pendingInvites: number;
  baseSubscription: number;
  pricePerSeat: number;
  monthlyCost: number;
}

interface Props {
  agents: Agent[];
  pools: Pool[];
  agentStats: Record<string, AgentStats>;
  organizationId: string;
  pendingInvites?: PendingInvite[];
  currentUserId: string;
  currentUserName: string;
  isCurrentUserAgent: boolean;
  billingInfo: BillingInfo;
}

export function AgentsClient({ 
  agents: initialAgents, 
  pools, 
  agentStats, 
  organizationId, 
  pendingInvites: initialInvites = [], 
  currentUserId,
  currentUserName,
  isCurrentUserAgent: initialIsCurrentUserAgent,
  billingInfo: initialBillingInfo,
}: Props) {
  const [agents, setAgents] = useState(initialAgents);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [billingInfo, setBillingInfo] = useState(initialBillingInfo);
  const [isCurrentUserAgent, setIsCurrentUserAgent] = useState(initialIsCurrentUserAgent);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [addMode, setAddMode] = useState<"choose" | "myself" | "invite">("choose");
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState<"admin" | "agent">("agent");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [isAddingSelf, setIsAddingSelf] = useState(false);
  const [addSelfSuccess, setAddSelfSuccess] = useState(false);
  
  // New state for confirmations
  const [showInviteConfirm, setShowInviteConfirm] = useState(false);
  const [agentToRemove, setAgentToRemove] = useState<Agent | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  
  // State for expanded pool videos
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);

  const supabase = createClient();

  // Updated billing calculations
  // Base subscription + additional seats beyond the included one
  const wouldBeAdditionalSeats = Math.max(0, billingInfo.totalAgents + 1 - billingInfo.includedSeats);
  const newMonthlyCost = billingInfo.baseSubscription + (wouldBeAdditionalSeats * billingInfo.pricePerSeat);
  // Cost increase is only if they're beyond the included seats
  const costIncrease = billingInfo.totalAgents >= billingInfo.includedSeats ? billingInfo.pricePerSeat : 0;

  // Handle adding yourself as an agent
  const handleAddMyself = async () => {
    setIsAddingSelf(true);
    setInviteError(null);
    
    try {
      // Check for existing profile in this organization (including inactive ones)
      // Use maybeSingle() to handle cases where profile might not exist
      const { data: existingProfile, error: fetchError } = await supabase
        .from("agent_profiles")
        .select("id, display_name, is_active")
        .eq("user_id", currentUserId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing profile:", fetchError);
        throw fetchError;
      }

      let agentProfileId: string;
      let displayName = currentUserName;

      if (existingProfile) {
        // Profile exists - reactivate it if inactive
        if (!existingProfile.is_active) {
          const { error } = await supabase
            .from("agent_profiles")
            .update({ is_active: true, deactivated_at: null, deactivated_by: null })
            .eq("id", existingProfile.id);
          if (error) throw error;
        }
        agentProfileId = existingProfile.id;
        displayName = existingProfile.display_name;
      } else {
        // Create new profile
        const { data: newProfile, error } = await supabase
          .from("agent_profiles")
          .insert({
            user_id: currentUserId,
            organization_id: organizationId,
            display_name: currentUserName,
            is_active: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        agentProfileId = newProfile.id;
      }

      // Find the catch-all pool and add agent to it
      const catchAllPool = pools.find(p => p.is_catch_all);
      let poolMembership: PoolMembership | null = null;
      
      if (catchAllPool) {
        // Check if already a member
        const { data: existingMembership } = await supabase
          .from("agent_pool_members")
          .select("id")
          .eq("agent_profile_id", agentProfileId)
          .eq("pool_id", catchAllPool.id)
          .maybeSingle();

        if (!existingMembership) {
          // Add to catch-all pool
          const { data: newMembership } = await supabase
            .from("agent_pool_members")
            .insert({
              agent_profile_id: agentProfileId,
              pool_id: catchAllPool.id,
            })
            .select("id")
            .single();

          if (newMembership) {
            poolMembership = {
              id: newMembership.id,
              pool: catchAllPool,
              wave_video_url: null,
              intro_video_url: null,
              loop_video_url: null,
            };
          }
        }
      }

      // Add to local agents list
      const { data: userData } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", currentUserId)
        .single();

      const newAgent: Agent = {
        id: agentProfileId,
        user_id: currentUserId,
        display_name: displayName,
        status: "offline",
        wave_video_url: null,
        intro_video_url: null,
        loop_video_url: null,
        max_simultaneous_simulations: 25,
        user: userData || { email: "", full_name: currentUserName },
        agent_pool_members: poolMembership ? [poolMembership] : [],
      };

      setAgents([...agents, newAgent]);

      // Update billing
      const newTotalAgents = billingInfo.totalAgents + 1;
      const newAdditionalSeats = Math.max(0, newTotalAgents - billingInfo.includedSeats);
      setBillingInfo({
        ...billingInfo,
        totalAgents: newTotalAgents,
        additionalSeats: newAdditionalSeats,
        activeAgents: billingInfo.activeAgents + 1,
        monthlyCost: billingInfo.baseSubscription + (newAdditionalSeats * billingInfo.pricePerSeat),
      });

      setIsCurrentUserAgent(true);
      setAddSelfSuccess(true);
    } catch (error) {
      console.error("Error adding self as agent:", error);
      setInviteError("Failed to add yourself as an agent. Please try again.");
    } finally {
      setIsAddingSelf(false);
    }
  };

  // Show confirmation before sending invite
  const handleInviteClick = () => {
    if (!newAgentEmail || !newAgentName) return;
    setShowInviteConfirm(true);
  };

  // Actually send the invite after confirmation
  const handleConfirmInvite = async () => {
    setShowInviteConfirm(false);
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const response = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAgentEmail,
          fullName: newAgentName,
          role: newAgentRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || "Failed to send invite");
        setIsInviting(false);
        return;
      }

      // Update local state
      setPendingInvites([
        ...pendingInvites,
        {
          id: data.invite.id,
          email: data.invite.email,
          full_name: newAgentName,
          role: newAgentRole,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);

      // Update billing info
      const newTotalAgents = billingInfo.totalAgents + 1;
      const newAdditionalSeats = Math.max(0, newTotalAgents - billingInfo.includedSeats);
      setBillingInfo({
        ...billingInfo,
        totalAgents: newTotalAgents,
        additionalSeats: newAdditionalSeats,
        pendingInvites: billingInfo.pendingInvites + 1,
        monthlyCost: billingInfo.baseSubscription + (newAdditionalSeats * billingInfo.pricePerSeat),
      });

      setInviteSuccess(true);
      
      setTimeout(() => {
        setIsAddingAgent(false);
        setAddMode("choose");
        setNewAgentEmail("");
        setNewAgentName("");
        setAddSelfSuccess(false);
        setNewAgentRole("agent");
        setInviteSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Invite error:", error);
      setInviteError("An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  // Revoke invite with seat credit
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      if (response.ok) {
        setPendingInvites(pendingInvites.filter(i => i.id !== inviteId));
        const newTotalAgents = billingInfo.totalAgents - 1;
        const newAdditionalSeats = Math.max(0, newTotalAgents - billingInfo.includedSeats);
        setBillingInfo({
          ...billingInfo,
          totalAgents: newTotalAgents,
          additionalSeats: newAdditionalSeats,
          pendingInvites: billingInfo.pendingInvites - 1,
          monthlyCost: billingInfo.baseSubscription + (newAdditionalSeats * billingInfo.pricePerSeat),
        });
      }
    } catch (error) {
      console.error("Revoke error:", error);
    }
  };

  // Remove agent (soft delete)
  const handleRemoveAgent = async () => {
    if (!agentToRemove) return;
    
    setIsRemoving(true);
    setRemoveError(null);

    try {
      const response = await fetch("/api/agents/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentProfileId: agentToRemove.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRemoveError(data.error || "Failed to remove agent");
        setIsRemoving(false);
        return;
      }

      // Update local state
      setAgents(agents.filter(a => a.id !== agentToRemove.id));
      const newTotalAgents = billingInfo.totalAgents - 1;
      const newAdditionalSeats = Math.max(0, newTotalAgents - billingInfo.includedSeats);
      setBillingInfo({
        ...billingInfo,
        totalAgents: newTotalAgents,
        additionalSeats: newAdditionalSeats,
        activeAgents: billingInfo.activeAgents - 1,
        monthlyCost: billingInfo.baseSubscription + (newAdditionalSeats * billingInfo.pricePerSeat),
      });

      // If removing yourself, update the flag
      if (agentToRemove.user_id === currentUserId) {
        setIsCurrentUserAgent(false);
      }

      if (selectedAgent?.id === agentToRemove.id) {
        setSelectedAgent(null);
      }

      setAgentToRemove(null);
    } catch (error) {
      console.error("Remove error:", error);
      setRemoveError("An unexpected error occurred");
    } finally {
      setIsRemoving(false);
    }
  };

  const getAgentStats = (agentId: string): AgentStats => {
    return agentStats[agentId] ?? { totalCalls: 0, completedCalls: 0, totalDuration: 0 };
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle": return "text-green-500";
      case "in_simulation": return "text-yellow-500";
      case "in_call": return "text-blue-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "idle": return "Available";
      case "in_simulation": return "In Simulation";
      case "in_call": return "In Call";
      default: return "Offline";
    }
  };

  // Add agent to pool
  const handleAddToPool = async (agentId: string, poolId: string) => {
    const { data, error } = await supabase
      .from("agent_pool_members")
      .insert({ pool_id: poolId, agent_profile_id: agentId })
      .select("id, pool:agent_pools(id, name, is_catch_all)")
      .single();

    if (data && !error) {
      const membership = data as unknown as PoolMembership;
      
      setAgents(agents.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            agent_pool_members: [...a.agent_pool_members, membership],
          };
        }
        return a;
      }));
      
      if (selectedAgent?.id === agentId) {
        setSelectedAgent({
          ...selectedAgent,
          agent_pool_members: [...selectedAgent.agent_pool_members, membership],
        });
      }
    }
  };

  // Remove agent from pool
  const handleRemoveFromPool = async (agentId: string, membershipId: string) => {
    const { error } = await supabase.from("agent_pool_members").delete().eq("id", membershipId);
    
    if (!error) {
      setAgents(agents.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            agent_pool_members: a.agent_pool_members.filter(m => m.id !== membershipId),
          };
        }
        return a;
      }));

      if (selectedAgent?.id === agentId) {
        setSelectedAgent({
          ...selectedAgent,
          agent_pool_members: selectedAgent.agent_pool_members.filter(m => m.id !== membershipId),
        });
      }
    }
  };

  const getUnassignedPools = (agent: Agent) => {
    const assignedPoolIds = new Set(agent.agent_pool_members.map(m => m.pool.id));
    return pools.filter(p => !assignedPoolIds.has(p.id));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header with Billing Info */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team</h1>
          <p className="text-muted-foreground">
            Manage your agents and billing
          </p>
        </div>
        <button
          onClick={() => setIsAddingAgent(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Agent
        </button>
      </div>

      {/* Add Agent Modal */}
      {isAddingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4">
            {/* Show confirmation or form */}
            {showInviteConfirm ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    {costIncrease > 0 ? (
                      <CreditCard className="w-8 h-8 text-primary" />
                    ) : (
                      <UserPlus className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {costIncrease > 0 ? "Add Additional Seat" : "Add Agent"}
                  </h3>
                  <p className="text-muted-foreground">
                    {costIncrease > 0 
                      ? `Adding ${newAgentName} will add an additional seat.`
                      : `Adding ${newAgentName} using your included seat.`
                    }
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/30 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current</span>
                    <span><strong>${billingInfo.monthlyCost}/mo</strong> ({billingInfo.totalAgents} agent{billingInfo.totalAgents !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">After</span>
                    <span><strong>${newMonthlyCost}/mo</strong> ({billingInfo.totalAgents + 1} agents)</span>
                  </div>
                  <hr className="border-border" />
                  {costIncrease > 0 ? (
                    <div className="flex justify-between text-sm text-amber-500">
                      <span>Change</span>
                      <span>+${costIncrease}/mo (prorated)</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Change</span>
                      <span>No change (using included seat)</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmInvite}
                    disabled={isInviting}
                    className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm & Send Invite
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowInviteConfirm(false)}
                    disabled={isInviting}
                    className="px-6 py-3 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              </>
            ) : inviteSuccess || addSelfSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-semibold text-lg mb-2">
                  {addSelfSuccess ? "You're Now an Agent!" : "Invite Sent!"}
                </h4>
                <p className="text-muted-foreground mb-4">
                  {addSelfSuccess 
                    ? "You've been added to the agents list."
                    : `An email has been sent to ${newAgentEmail}`
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setIsAddingAgent(false);
                      setAddMode("choose");
                      setInviteSuccess(false);
                      setAddSelfSuccess(false);
                      setNewAgentEmail("");
                      setNewAgentName("");
                    }}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 font-medium"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setAddMode("choose");
                      setInviteSuccess(false);
                      setAddSelfSuccess(false);
                      setNewAgentEmail("");
                      setNewAgentName("");
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                  >
                    Add Another
                  </button>
                </div>
              </div>
            ) : addMode === "choose" ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add Agent</h3>
                  <button
                    onClick={() => {
                      setIsAddingAgent(false);
                      setAddMode("choose");
                      setInviteError(null);
                    }}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {inviteError && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {inviteError}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Add Myself Option - only show if not already an agent */}
                  {!isCurrentUserAgent && (
                    <button
                      onClick={handleAddMyself}
                      disabled={isAddingSelf}
                      className="w-full p-4 rounded-xl border-2 border-border hover:border-primary transition-all text-left group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          {isAddingSelf ? (
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          ) : (
                            <Users className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold mb-0.5">
                            {isAddingSelf ? "Adding..." : "Add Myself"}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Start taking calls yourself
                          </p>
                        </div>
                        {costIncrease > 0 ? (
                          <span className="text-xs text-amber-600 font-medium">+${costIncrease}/mo</span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">Included</span>
                        )}
                      </div>
                    </button>
                  )}

                  {/* Invite Someone Option */}
                  <button
                    onClick={() => setAddMode("invite")}
                    className="w-full p-4 rounded-xl border-2 border-border hover:border-primary transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                        <Mail className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold mb-0.5">Invite Someone</div>
                        <p className="text-sm text-muted-foreground">
                          Send an invite to a team member
                        </p>
                      </div>
                      {costIncrease > 0 || isCurrentUserAgent ? (
                        <span className="text-xs text-amber-600 font-medium">+${billingInfo.pricePerSeat}/mo</span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Included</span>
                      )}
                    </div>
                  </button>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <strong>${billingInfo.baseSubscription}/mo</strong> base includes 1 seat. Additional seats are <strong>${billingInfo.pricePerSeat}/mo</strong> each.
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddMode("choose")}
                      className="p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground rotate-45" />
                    </button>
                    <h3 className="text-lg font-semibold">Invite Agent</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddingAgent(false);
                      setAddMode("choose");
                      setNewAgentEmail("");
                      setNewAgentName("");
                      setNewAgentRole("agent");
                      setInviteError(null);
                    }}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-4">
                  {inviteError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {inviteError}
                    </div>
                  )}

                  {/* Email field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="agent@company.com"
                        value={newAgentEmail}
                        onChange={(e) => setNewAgentEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Name field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Display Name</label>
                    <input
                      type="text"
                      placeholder="John Smith"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                    />
                  </div>

                  {/* Role selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewAgentRole("agent")}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          newAgentRole === "agent"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Agent</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Can take calls and view their own stats
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAgentRole("admin")}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          newAgentRole === "admin"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium">Admin</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Full access to settings and team management
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Cost preview - different message based on role and seat availability */}
                  {newAgentRole === "agent" ? (
                    billingInfo.totalAgents < billingInfo.includedSeats ? (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Using Included Seat</span>
                        </div>
                        <p className="text-green-600/80">
                          This agent will use your included seat. No additional cost.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                          <CreditCard className="w-4 h-4" />
                          <span className="font-medium">Additional Seat</span>
                        </div>
                        <p className="text-amber-600/80">
                          Adding an agent will add +${billingInfo.pricePerSeat}/mo to your subscription.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Admin Invite</span>
                      </div>
                      <p className="text-muted-foreground">
                        Admins are free unless they choose to take calls when accepting.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleInviteClick}
                      disabled={!newAgentEmail || !newAgentName}
                      className="flex-1 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingAgent(false);
                        setAddMode("choose");
                        setNewAgentEmail("");
                        setNewAgentName("");
                        setNewAgentRole("agent");
                        setInviteError(null);
                      }}
                      className="px-6 py-2 rounded-lg bg-muted hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Remove Agent Confirmation Modal */}
      {agentToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <UserMinus className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {agentToRemove.user_id === currentUserId ? "Remove Yourself as Agent?" : "Remove Agent?"}
              </h3>
              <p className="text-muted-foreground">
                {agentToRemove.user_id === currentUserId 
                  ? "You will no longer be able to take calls."
                  : `${agentToRemove.display_name} will be removed from your team.`
                }
              </p>
            </div>

            {removeError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
                {removeError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-muted/30 mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Call history preserved</strong>
                  <p className="text-muted-foreground">All call logs and recordings will be kept.</p>
                </div>
              </div>
              {billingInfo.additionalSeats > 0 && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong>Billing reduced</strong>
                    <p className="text-muted-foreground">Your next invoice will be ${billingInfo.pricePerSeat} less (prorated credit applied).</p>
                  </div>
                </div>
              )}
              {agentToRemove.user_id === currentUserId && (
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <strong>Admin access stays</strong>
                    <p className="text-muted-foreground">You'll still be able to manage your team and settings.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRemoveAgent}
                disabled={isRemoving}
                className="flex-1 px-6 py-3 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {agentToRemove.user_id === currentUserId ? "Remove Myself" : "Remove Agent"}
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setAgentToRemove(null);
                  setRemoveError(null);
                }}
                disabled={isRemoving}
                className="px-6 py-3 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/30 text-sm font-medium text-muted-foreground border-b border-border">
              <div className="col-span-4">Agent</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Pools</div>
              <div className="col-span-2">Calls (30d)</div>
              <div className="col-span-1"></div>
            </div>

            {/* Agent Rows */}
            <div className="divide-y divide-border">
              {agents.map((agent) => {
                const stats = getAgentStats(agent.id);
                const agentPools = agent.agent_pool_members.map(m => m.pool);
                const isCurrentUser = agent.user_id === currentUserId;

                return (
                  <div
                    key={agent.id}
                    className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/20 cursor-pointer transition-colors ${
                      selectedAgent?.id === agent.id ? "bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    {/* Agent Info */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {agent.display_name}
                          {isCurrentUser && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">You</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{agent.user?.email}</div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <div className={`flex items-center gap-2 ${getStatusColor(agent.status)}`}>
                        <Circle className="w-2 h-2 fill-current" />
                        <span className="text-sm">{getStatusLabel(agent.status)}</span>
                      </div>
                    </div>

                    {/* Pools */}
                    <div className="col-span-3">
                      <div className="flex flex-wrap gap-1">
                        {agentPools.slice(0, 2).map((pool) => (
                          <span
                            key={pool.id}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              pool.is_catch_all
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {pool.name}
                          </span>
                        ))}
                        {agentPools.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                            +{agentPools.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="col-span-2">
                      <div className="text-sm">
                        <span className="font-medium">{stats.totalCalls}</span>
                        <span className="text-muted-foreground"> calls</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-1">
                      <Link
                        href={`/admin/agents/${agent.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                        title="View Stats"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                      {!isCurrentUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgentToRemove(agent);
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="Remove from team"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {agents.length === 0 && pendingInvites.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add yourself or invite someone to get started
                  </p>
                  <button
                    onClick={() => setIsAddingAgent(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    <UserPlus className="w-5 h-5" />
                    Add Agent
                  </button>
                </div>
              )}

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-muted/20 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pending Invites ({pendingInvites.length}) — Counts toward billing
                    </span>
                  </div>
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="grid grid-cols-12 gap-4 p-4 items-center bg-muted/5 border-t border-border"
                    >
                      {/* Invite Info */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <div className="font-medium">{invite.full_name}</div>
                          <div className="text-sm text-muted-foreground">{invite.email}</div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                          <Circle className="w-1.5 h-1.5 fill-current" />
                          Pending
                        </span>
                      </div>

                      {/* Role */}
                      <div className="col-span-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          invite.role === 'admin'
                            ? "bg-purple-500/10 text-purple-500"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {invite.role === 'admin' ? 'Admin' : 'Agent'}
                        </span>
                      </div>

                      {/* Expires */}
                      <div className="col-span-2 text-sm text-muted-foreground">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                          title="Revoke invite (credit refunded)"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Agent Details Panel */}
        <div className="lg:col-span-1">
          {selectedAgent ? (
            <div className="glass rounded-2xl p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{selectedAgent.display_name}</h3>
                <p className="text-sm text-muted-foreground">{selectedAgent.user?.email}</p>
                <div className={`inline-flex items-center gap-2 mt-2 ${getStatusColor(selectedAgent.status)}`}>
                  <Circle className="w-2 h-2 fill-current" />
                  <span className="text-sm">{getStatusLabel(selectedAgent.status)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <Phone className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{getAgentStats(selectedAgent.id).totalCalls}</div>
                  <div className="text-xs text-muted-foreground">Calls</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <CheckCircle className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{getAgentStats(selectedAgent.id).completedCalls}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/30">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{formatDuration(getAgentStats(selectedAgent.id).totalDuration)}</div>
                  <div className="text-xs text-muted-foreground">Talk Time</div>
                </div>
              </div>

              {/* Pool Assignments */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Pool Assignments
                </h4>
                <div className="space-y-2">
                  {selectedAgent.agent_pool_members.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <span className="text-sm font-medium">{membership.pool.name}</span>
                      {!membership.pool.is_catch_all && (
                        <button
                          onClick={() => handleRemoveFromPool(selectedAgent.id, membership.id)}
                          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add to Pool */}
                {getUnassignedPools(selectedAgent).length > 0 && (
                  <select
                    className="w-full mt-3 px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddToPool(selectedAgent.id, e.target.value);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">+ Add to pool...</option>
                    {getUnassignedPools(selectedAgent).map((pool) => (
                      <option key={pool.id} value={pool.id}>
                        {pool.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Video Status - Per Pool */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Videos by Pool
                </h4>
                {selectedAgent.agent_pool_members.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Assign to a pool to record videos
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedAgent.agent_pool_members.map((membership) => {
                      const hasWave = !!membership.wave_video_url;
                      const hasIntro = !!membership.intro_video_url;
                      const hasLoop = !!membership.loop_video_url;
                      const videoCount = [hasWave, hasIntro, hasLoop].filter(Boolean).length;
                      const isComplete = videoCount === 3;
                      const isMissing = videoCount === 0;
                      const hasAnyVideo = videoCount > 0;
                      const isExpanded = expandedPoolId === membership.id;
                      
                      return (
                        <div 
                          key={membership.id}
                          className="rounded-lg bg-muted/30 border border-border/50 overflow-hidden"
                        >
                          {/* Pool Header - Clickable if has videos */}
                          <button
                            onClick={() => hasAnyVideo && setExpandedPoolId(isExpanded ? null : membership.id)}
                            disabled={!hasAnyVideo}
                            className={`w-full p-3 text-left ${hasAnyVideo ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'} transition-colors`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Layers className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-sm">{membership.pool.name}</span>
                                {hasAnyVideo && (
                                  isExpanded ? (
                                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                  )
                                )}
                              </div>
                              {isComplete ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                                  Ready
                                </span>
                              ) : isMissing ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">
                                  No videos
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                                  {3 - videoCount} missing
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={hasWave ? "text-green-500" : "text-muted-foreground/50"}>
                                {hasWave ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                                Wave
                              </span>
                              <span className={hasIntro ? "text-green-500" : "text-muted-foreground/50"}>
                                {hasIntro ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                                Intro
                              </span>
                              <span className={hasLoop ? "text-green-500" : "text-muted-foreground/50"}>
                                {hasLoop ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                                Loop
                              </span>
                            </div>
                          </button>
                          
                          {/* Expanded Video Players */}
                          {isExpanded && hasAnyVideo && (
                            <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                              {hasWave && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Play className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Wave Video</span>
                                  </div>
                                  <video
                                    src={membership.wave_video_url!}
                                    controls
                                    className="w-full rounded-lg bg-black aspect-video"
                                    preload="metadata"
                                  />
                                </div>
                              )}
                              {hasIntro && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Play className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Intro Video</span>
                                  </div>
                                  <video
                                    src={membership.intro_video_url!}
                                    controls
                                    className="w-full rounded-lg bg-black aspect-video"
                                    preload="metadata"
                                  />
                                </div>
                              )}
                              {hasLoop && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Play className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Loop Video</span>
                                  </div>
                                  <video
                                    src={membership.loop_video_url!}
                                    controls
                                    className="w-full rounded-lg bg-black aspect-video"
                                    preload="metadata"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => setAgentToRemove(selectedAgent)}
                className="w-full px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
              >
                <UserMinus className="w-4 h-4" />
                {selectedAgent.user_id === currentUserId ? "Remove Myself as Agent" : "Remove Agent"}
              </button>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Select an agent to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
