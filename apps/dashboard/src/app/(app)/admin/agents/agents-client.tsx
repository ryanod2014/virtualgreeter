"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
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
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { 
  type HourlyStats, 
  type DayHourStats, 
  type DayOfWeekStats,
  findProblemHours 
} from "@/lib/stats/coverage-stats";
import { DateRangePicker } from "@/lib/components/date-range-picker";

interface Pool {
  id: string;
  name: string;
  is_catch_all: boolean;
}

interface PoolMembership {
  id: string;
  pool: Pool;
  priority_rank?: number; // 1 = Primary, 2 = Standard, 3 = Backup
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
  usedSeats: number;        // Active agents + pending invites
  purchasedSeats: number;   // What they're paying for (billing floor)
  availableSeats: number;   // purchasedSeats - usedSeats
  activeAgents: number;
  pendingInvites: number;
  pricePerSeat: number;
  monthlyCost: number;
}

interface PoolCoverageStats {
  poolId: string;
  poolName: string;
  totalPageviews: number;
  coveredPageviews: number;
  missedPageviews: number;
  totalRings: number;
}

interface StaffingMetrics {
  ringRate: number;
  avgCallDurationSeconds: number;
  poolsNeedingCoverage: PoolCoverageStats[];
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
  hourlyCoverage: HourlyStats[];
  dailyHourlyCoverage: { byDayHour: DayHourStats[][]; byDayOfWeek: DayOfWeekStats[] };
  dateRange: { from: string; to: string };
  staffingMetrics: StaffingMetrics;
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
  hourlyCoverage,
  dailyHourlyCoverage,
  dateRange,
  staffingMetrics,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  
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
  
  // State for editing agent name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  
  // Coverage chart view state
  const [coverageView, setCoverageView] = useState<"hourly" | "daily" | "heatmap">("hourly");

  const supabase = createClient();
  
  // Handle date range change
  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  };

  // PRE-PAID SEATS billing calculations
  // Only charge more if exceeding purchased seats
  const hasAvailableSeats = billingInfo.availableSeats > 0;
  const wouldExceedPurchased = billingInfo.usedSeats >= billingInfo.purchasedSeats;
  
  // Cost increase only if they would exceed their purchased seats
  const costIncrease = wouldExceedPurchased ? billingInfo.pricePerSeat : 0;
  const newMonthlyCost = wouldExceedPurchased 
    ? (billingInfo.purchasedSeats + 1) * billingInfo.pricePerSeat 
    : billingInfo.monthlyCost;

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

      // Only add a seat if we're activating/creating a NEW active agent
      // If they're already active, no billing change needed
      const needsBillingSeat = !existingProfile || !existingProfile.is_active;
      
      // === STEP 1: Update billing FIRST (if needed) ===
      // This ensures we don't create an unbilled agent
      let billingResponse: { 
        usedSeats: number; 
        purchasedSeats: number; 
        availableSeats: number;
        billingExpanded: boolean;
      } | null = null;
      
      if (needsBillingSeat) {
        const seatResponse = await fetch("/api/billing/seats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", quantity: 1 }),
        });
        
        if (!seatResponse.ok) {
          const errorData = await seatResponse.json();
          throw new Error(errorData.error || "Failed to add billing seat");
        }
        
        billingResponse = await seatResponse.json();
      }

      let agentProfileId: string;
      let displayName = currentUserName;

      // === STEP 2: Create/activate agent profile ===
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

      // Update billing state from API response (if we called the API) or calculate locally
      if (billingResponse) {
        setBillingInfo({
          ...billingInfo,
          usedSeats: billingResponse.usedSeats,
          purchasedSeats: billingResponse.purchasedSeats,
          availableSeats: billingResponse.availableSeats,
          activeAgents: billingInfo.activeAgents + 1,
          monthlyCost: billingResponse.purchasedSeats * billingInfo.pricePerSeat,
        });
      } else {
        // Already an active agent, no billing change needed
        setBillingInfo({
          ...billingInfo,
          activeAgents: billingInfo.activeAgents + 1,
        });
      }

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

      // Update billing info - only expand if exceeding purchased seats
      const newUsedSeats = billingInfo.usedSeats + 1;
      const needsExpansion = newUsedSeats > billingInfo.purchasedSeats;
      const newPurchasedSeats = needsExpansion ? newUsedSeats : billingInfo.purchasedSeats;
      setBillingInfo({
        ...billingInfo,
        usedSeats: newUsedSeats,
        purchasedSeats: newPurchasedSeats,
        availableSeats: newPurchasedSeats - newUsedSeats,
        pendingInvites: billingInfo.pendingInvites + 1,
        monthlyCost: newPurchasedSeats * billingInfo.pricePerSeat,
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
        // Pre-paid model: revoking frees up a seat but doesn't reduce billing
        const newUsedSeats = billingInfo.usedSeats - 1;
        setBillingInfo({
          ...billingInfo,
          usedSeats: newUsedSeats,
          availableSeats: billingInfo.purchasedSeats - newUsedSeats,
          pendingInvites: billingInfo.pendingInvites - 1,
          // monthlyCost stays the same - they still pay for purchased seats
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
      // Pre-paid model: removing agent frees up a seat but doesn't reduce billing
      const newUsedSeats = billingInfo.usedSeats - 1;
      setBillingInfo({
        ...billingInfo,
        usedSeats: newUsedSeats,
        availableSeats: billingInfo.purchasedSeats - newUsedSeats,
        activeAgents: billingInfo.activeAgents - 1,
        // monthlyCost stays the same - they still pay for purchased seats
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

  // Handle editing agent name
  const handleStartEditingName = () => {
    if (selectedAgent) {
      setEditedName(selectedAgent.display_name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (!selectedAgent || !editedName.trim()) return;
    
    const trimmedName = editedName.trim();
    if (trimmedName === selectedAgent.display_name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from("agent_profiles")
        .update({ display_name: trimmedName })
        .eq("id", selectedAgent.id);

      if (error) throw error;

      // Update local state
      const updatedAgent = { ...selectedAgent, display_name: trimmedName };
      setAgents(agents.map(a => a.id === selectedAgent.id ? updatedAgent : a));
      setSelectedAgent(updatedAgent);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating agent name:", error);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team</h1>
          <p className="text-muted-foreground">
            Manage your agents and team seats
          </p>
        </div>
      </div>

      {/* Staffing Guide */}
      <CoverageHoursChart 
        hourlyData={hourlyCoverage}
        dailyHourlyData={dailyHourlyCoverage}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        view={coverageView}
        onViewChange={setCoverageView}
        staffingMetrics={staffingMetrics}
      />

      {/* Seat Info Banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">{billingInfo.purchasedSeats} seat{billingInfo.purchasedSeats !== 1 ? 's' : ''} prepaid</span>
          </div>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>{billingInfo.activeAgents} active</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{billingInfo.pendingInvites} pending</span>
            {billingInfo.availableSeats > 0 ? (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-green-600 font-medium">{billingInfo.availableSeats} available</span>
              </>
            ) : (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-muted-foreground font-medium">0 available</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {billingInfo.availableSeats > 0 && (
            <span className="text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full hidden md:inline-flex">
              Invite without extra cost
            </span>
          )}
          <Link
            href="/admin/settings/billing"
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            Manage seats →
          </Link>
        </div>
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
                    <span className="text-muted-foreground">Your seats</span>
                    <span><strong>{billingInfo.usedSeats}</strong> of <strong>{billingInfo.purchasedSeats}</strong> used</span>
                  </div>
                  <hr className="border-border" />
                  {hasAvailableSeats ? (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>This invite</span>
                      <span>Uses 1 prepaid seat ({billingInfo.availableSeats - 1} remaining)</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Additional seat</span>
                        <span>+${costIncrease}/mo</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">New monthly cost</span>
                        <span><strong>${newMonthlyCost}/mo</strong></span>
                      </div>
                    </>
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
                      {hasAvailableSeats ? (
                        <span className="text-xs text-green-600 font-medium">
                          {billingInfo.availableSeats} prepaid seat{billingInfo.availableSeats !== 1 ? 's' : ''} remaining
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">+${billingInfo.pricePerSeat}/mo per seat</span>
                      )}
                    </div>
                  </button>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span><strong>{billingInfo.purchasedSeats}</strong> seats prepaid</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span><strong>{billingInfo.activeAgents}</strong> active</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span><strong>{billingInfo.pendingInvites}</strong> pending</span>
                    {billingInfo.availableSeats > 0 ? (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-green-600"><strong>{billingInfo.availableSeats}</strong> available</span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-muted-foreground"><strong>0</strong> available</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-xs">
                    Current billing: <strong>${billingInfo.monthlyCost}/mo</strong>
                  </div>
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
                    hasAvailableSeats ? (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Using Prepaid Seat</span>
                        </div>
                        <p className="text-green-600/80">
                          Uses 1 of your {billingInfo.availableSeats} prepaid seats — no additional cost.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <CreditCard className="w-4 h-4" />
                          <span className="font-medium">Additional Seat</span>
                        </div>
                        <p className="text-muted-foreground/80">
                          All {billingInfo.purchasedSeats} prepaid seats in use. This adds +${billingInfo.pricePerSeat}/mo.
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
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Seat freed up</strong>
                  <p className="text-muted-foreground">
                    You&apos;ll have {billingInfo.availableSeats + 1} of {billingInfo.purchasedSeats} seats available for new invites.
                  </p>
                </div>
              </div>
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

      <div className="space-y-6">
        {/* Agents List */}
        <div>
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
                const isExpanded = selectedAgent?.id === agent.id;

                return (
                  <div key={agent.id}>
                    <div
                      className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/20 cursor-pointer transition-colors ${
                        isExpanded ? "bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedAgent(isExpanded ? null : agent)}
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

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-primary/5 border-t border-border/50">
                        <div className="pt-4 space-y-4">
                          {/* Stats Row - Horizontal */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-background/50">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{getAgentStats(agent.id).totalCalls}</span>
                              <span className="text-xs text-muted-foreground">Calls</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-background/50">
                              <CheckCircle className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{getAgentStats(agent.id).completedCalls}</span>
                              <span className="text-xs text-muted-foreground">Completed</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-background/50">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{formatDuration(getAgentStats(agent.id).totalDuration)}</span>
                              <span className="text-xs text-muted-foreground">Talk Time</span>
                            </div>
                          </div>

                          {/* Pool Assignments & Videos */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Pool Assignments */}
                            <div className="p-3 rounded-xl bg-background/50">
                              <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                                <Layers className="w-4 h-4" />
                                Pool Assignments
                              </h4>
                              <div className="space-y-1.5">
                                {agent.agent_pool_members.map((membership) => (
                                  <div
                                    key={membership.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                                  >
                                    <span className="text-sm">{membership.pool.name}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromPool(agent.id, membership.id);
                                      }}
                                      className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {getUnassignedPools(agent).length > 0 && (
                                  <select
                                    className="w-full px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-sm"
                                    value=""
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      handleAddToPool(agent.id, e.target.value);
                                      e.target.value = "";
                                    }}
                                  >
                                    <option value="">+ Add to pool...</option>
                                    {getUnassignedPools(agent).map((pool) => (
                                      <option key={pool.id} value={pool.id}>
                                        {pool.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {/* Videos by Pool */}
                            <div className="p-3 rounded-xl bg-background/50">
                              <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                                <Video className="w-4 h-4" />
                                Videos by Pool
                              </h4>
                              {agent.agent_pool_members.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Assign to a pool to manage videos</p>
                              ) : (
                                <div className="space-y-2">
                                  {agent.agent_pool_members.map((membership) => {
                                    const hasWave = !!membership.wave_video_url;
                                    const hasIntro = !!membership.intro_video_url;
                                    const hasLoop = !!membership.loop_video_url;
                                    const videoCount = [hasWave, hasIntro, hasLoop].filter(Boolean).length;
                                    const hasAnyVideo = videoCount > 0;
                                    const isPoolExpanded = expandedPoolId === membership.id;

                                    return (
                                      <div 
                                        key={membership.id}
                                        className="rounded-lg bg-muted/30 border border-border/50 overflow-hidden"
                                      >
                                        {/* Pool Header - Clickable */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            hasAnyVideo && setExpandedPoolId(isPoolExpanded ? null : membership.id);
                                          }}
                                          disabled={!hasAnyVideo}
                                          className={`w-full p-2 text-left ${hasAnyVideo ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'} transition-colors`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium">{membership.pool.name}</span>
                                              {hasAnyVideo && (
                                                isPoolExpanded ? (
                                                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                                                ) : (
                                                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                                )
                                              )}
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                              videoCount === 3 
                                                ? "bg-green-500/10 text-green-500" 
                                                : videoCount === 0 
                                                  ? "bg-red-500/10 text-red-500"
                                                  : "bg-muted text-muted-foreground"
                                            }`}>
                                              {videoCount === 3 ? "Ready" : videoCount === 0 ? "No videos" : `${videoCount}/3`}
                                            </span>
                                          </div>
                                        </button>
                                        
                                        {/* Expanded Video Players */}
                                        {isPoolExpanded && hasAnyVideo && (
                                          <div className="px-2 pb-2 space-y-2 border-t border-border/50 pt-2">
                                            {hasWave && (
                                              <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Play className="w-3 h-3 text-muted-foreground" />
                                                  <span className="text-xs font-medium text-muted-foreground">Wave</span>
                                                </div>
                                                <video
                                                  src={membership.wave_video_url!}
                                                  controls
                                                  className="w-full rounded-lg bg-black aspect-video"
                                                  preload="metadata"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              </div>
                                            )}
                                            {hasIntro && (
                                              <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Play className="w-3 h-3 text-muted-foreground" />
                                                  <span className="text-xs font-medium text-muted-foreground">Intro</span>
                                                </div>
                                                <video
                                                  src={membership.intro_video_url!}
                                                  controls
                                                  className="w-full rounded-lg bg-black aspect-video"
                                                  preload="metadata"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              </div>
                                            )}
                                            {hasLoop && (
                                              <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                  <Play className="w-3 h-3 text-muted-foreground" />
                                                  <span className="text-xs font-medium text-muted-foreground">Loop</span>
                                                </div>
                                                <video
                                                  src={membership.loop_video_url!}
                                                  controls
                                                  className="w-full rounded-lg bg-black aspect-video"
                                                  preload="metadata"
                                                  onClick={(e) => e.stopPropagation()}
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
                          </div>

                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgentToRemove(agent);
                            }}
                            className="px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 text-sm"
                          >
                            <UserMinus className="w-4 h-4" />
                            {agent.user_id === currentUserId ? "Remove Myself" : "Remove Agent"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {agents.length === 0 && pendingInvites.length === 0 && (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                  <p className="text-muted-foreground">
                    Click below to add yourself or invite someone to get started
                  </p>
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
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{invite.full_name}</div>
                          <div className="text-sm text-muted-foreground">{invite.email}</div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
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

              {/* Add Agent Row */}
              <div
                onClick={() => setIsAddingAgent(true)}
                onKeyDown={(e) => e.key === 'Enter' && setIsAddingAgent(true)}
                role="button"
                tabIndex={0}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/20 cursor-pointer transition-colors border-t border-dashed border-border group"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-colors">
                    <UserPlus className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                    Add Agent
                  </span>
                </div>
                <div className="col-span-8 text-left text-sm text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  {hasAvailableSeats 
                    ? `${billingInfo.availableSeats} of ${billingInfo.purchasedSeats} seat${billingInfo.purchasedSeats !== 1 ? 's' : ''} available — no extra cost`
                    : `All ${billingInfo.purchasedSeats} seats in use — +$${billingInfo.pricePerSeat}/mo per additional seat`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Types for staffing recommendations
interface StaffingGap {
  id: string;
  days: string[];
  dayIndices: number[];
  startHour: number;
  endHour: number;
  missedVisitors: number;
  totalVisitors: number;
  coverageRate: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedAgents: number;
}

// Staffing Gap Card Component with expandable pool breakdown
function StaffingGapCard({ 
  gap, 
  poolsNeedingCoverage 
}: { 
  gap: StaffingGap; 
  poolsNeedingCoverage: PoolCoverageStats[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxVisiblePools = 3;
  const hasMorePools = poolsNeedingCoverage.length > maxVisiblePools;
  const visiblePools = isExpanded ? poolsNeedingCoverage : poolsNeedingCoverage.slice(0, maxVisiblePools);

  return (
    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
      {/* Header */}
      <p className="text-sm font-semibold">
        Add {gap.suggestedAgents} agent{gap.suggestedAgents > 1 ? 's' : ''} 
        <span className="font-normal text-muted-foreground"> • </span>
        <span className="font-normal">{gap.days.join(', ')}</span>
        <span className="font-normal text-muted-foreground"> • </span>
        <span className="font-normal">{formatTimeRange(gap.startHour, gap.endHour)}</span>
      </p>

      {/* Pool breakdown */}
      {poolsNeedingCoverage.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {visiblePools.map((pool) => (
            <div 
              key={pool.poolId} 
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
            >
              <Layers className="w-3 h-3 text-rose-400" />
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {pool.poolName}
              </span>
              <span className="text-xs text-rose-500/70">
                ({pool.missedPageviews} missed)
              </span>
            </div>
          ))}
          
          {/* Expand/collapse for many pools */}
          {hasMorePools && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>Show less</>
              ) : (
                <>+{poolsNeedingCoverage.length - maxVisiblePools} more</>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to format hour ranges nicely
function formatTimeRange(start: number, end: number): string {
  const formatHour = (h: number) => {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  return `${formatHour(start)} – ${formatHour(end)}`;
}

// Helper to group consecutive hours into shifts
function groupConsecutiveHours(hours: number[]): { start: number; end: number }[] {
  if (hours.length === 0) return [];
  
  const sorted = [...hours].sort((a, b) => a - b);
  const groups: { start: number; end: number }[] = [];
  let currentStart = sorted[0];
  let currentEnd = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === currentEnd + 1) {
      currentEnd = sorted[i];
    } else {
      groups.push({ start: currentStart, end: currentEnd + 1 });
      currentStart = sorted[i];
      currentEnd = sorted[i];
    }
  }
  groups.push({ start: currentStart, end: currentEnd + 1 });
  
  return groups;
}

// Analyze data to generate staffing recommendations (understaffed only)
// Uses ring rate and call duration for accurate agent capacity estimation
function generateStaffingRecommendations(
  dailyHourlyData: DayHourStats[][],
  ringRate: number,
  avgCallDurationSeconds: number
): StaffingGap[] {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const gaps: StaffingGap[] = [];
  
  // Calculate agent capacity: how many calls can 1 agent handle per hour?
  // Formula: effectiveMinutes / (callDuration + ringTime + wrapUp)
  const avgCallMinutes = avgCallDurationSeconds / 60;
  const effectiveMinutesPerHour = 50; // ~83% efficiency (breaks, context switching)
  const ringAndWrapUpMinutes = 1.25; // ~30s ring + ~45s wrap-up
  const timePerCall = avgCallMinutes + ringAndWrapUpMinutes;
  const capacityPerAgentPerHour = Math.max(1, Math.floor(effectiveMinutesPerHour / timePerCall));
  
  // Find all cells with missed visitors
  const problemCells: { day: number; hour: number; missed: number; total: number }[] = [];
  
  dailyHourlyData.forEach((dayData, dayIndex) => {
    dayData.forEach((cell) => {
      if (cell.missedOpportunities > 0) {
        problemCells.push({
          day: dayIndex,
          hour: cell.hour,
          missed: cell.missedOpportunities,
          total: cell.totalPageviews,
        });
      }
    });
  });
  
  if (problemCells.length === 0) return [];
  
  // Group by hour to find patterns
  const hourToDays: Map<number, { days: Set<number>; missed: number; total: number }> = new Map();
  
  problemCells.forEach((cell) => {
    if (!hourToDays.has(cell.hour)) {
      hourToDays.set(cell.hour, { days: new Set(), missed: 0, total: 0 });
    }
    const entry = hourToDays.get(cell.hour)!;
    entry.days.add(cell.day);
    entry.missed += cell.missed;
    entry.total += cell.total;
  });
  
  const hours = Array.from(hourToDays.keys()).sort((a, b) => a - b);
  const hourGroups = groupConsecutiveHours(hours);
  
  hourGroups.forEach((group, idx) => {
    const daysInGroup = new Set<number>();
    let totalMissed = 0;
    let totalVisitors = 0;
    
    for (let h = group.start; h < group.end; h++) {
      const hourData = hourToDays.get(h);
      if (hourData) {
        hourData.days.forEach(d => daysInGroup.add(d));
        totalMissed += hourData.missed;
        totalVisitors += hourData.total;
      }
    }
    
    const dayIndices = Array.from(daysInGroup).sort((a, b) => a - b);
    const dayNames = dayIndices.map(d => DAY_NAMES[d]);
    
    // Format days nicely (e.g., "Mon-Fri" or "Tue, Thu")
    let daysLabel: string[];
    if (dayIndices.length >= 5 && dayIndices.every((d, i) => i === 0 || d === dayIndices[i-1] + 1)) {
      daysLabel = [`${DAY_NAMES[dayIndices[0]]}-${DAY_NAMES[dayIndices[dayIndices.length - 1]]}`];
    } else {
      daysLabel = dayNames;
    }
    
    const coverageRate = totalVisitors > 0 ? ((totalVisitors - totalMissed) / totalVisitors) * 100 : 100;
    
    let priority: 'critical' | 'high' | 'medium' | 'low';
    if (totalMissed >= 50) priority = 'critical';
    else if (totalMissed >= 20) priority = 'high';
    else if (totalMissed >= 10) priority = 'medium';
    else priority = 'low';
    
    // Calculate agents needed based on expected call volume
    // 1. How many missed pageviews per hour in this slot?
    const hoursInRange = group.end - group.start;
    const slotsCount = hoursInRange * dayIndices.length;
    const missedPerHour = totalMissed / slotsCount;
    
    // 2. How many of those would actually ring? (apply ring rate)
    const expectedRingsPerHour = missedPerHour * ringRate;
    
    // 3. How many agents needed to handle that call volume?
    const suggestedAgents = Math.max(1, Math.ceil(expectedRingsPerHour / capacityPerAgentPerHour));
    
    gaps.push({
      id: `gap-${idx}`,
      days: daysLabel,
      dayIndices,
      startHour: group.start,
      endHour: group.end,
      missedVisitors: totalMissed,
      totalVisitors,
      coverageRate,
      priority,
      suggestedAgents,
    });
  });
  
  // Sort by missed visitors (highest first)
  return gaps.sort((a, b) => b.missedVisitors - a.missedVisitors);
}

// Coverage Hours Chart Component
interface CoverageChartProps {
  hourlyData: HourlyStats[];
  dailyHourlyData: { byDayHour: DayHourStats[][]; byDayOfWeek: DayOfWeekStats[] };
  dateRange: { from: string; to: string };
  onDateRangeChange: (from: Date, to: Date) => void;
  view: "hourly" | "daily" | "heatmap";
  onViewChange: (view: "hourly" | "daily" | "heatmap") => void;
  staffingMetrics: StaffingMetrics;
}

// Generate staffing insights from data
function generateStaffingInsights(dailyHourlyData: DayHourStats[][]) {
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const allCells = dailyHourlyData.flat();
  const totalVisitors = allCells.reduce((sum, c) => sum + c.totalPageviews, 0);
  
  if (totalVisitors === 0) return { peakTimes: [], slowTimes: [], needsCoverage: [] };
  
  // Calculate average visitors per cell
  const avgPerCell = totalVisitors / allCells.filter(c => c.totalPageviews > 0).length || 0;
  
  // Find peak times (cells with > 2x average traffic)
  const peakCells = allCells.filter(c => c.totalPageviews > avgPerCell * 1.5);
  // Find slow times (cells with < 0.3x average traffic but some traffic)
  const slowCells = allCells.filter(c => c.totalPageviews > 0 && c.totalPageviews < avgPerCell * 0.3);
  // Find times needing coverage (missed visitors)
  const needsCoverageCells = allCells.filter(c => c.missedOpportunities > 0);
  
  // Group peak times by hour ranges
  const peakByHour: Map<number, { days: Set<number>; visitors: number }> = new Map();
  peakCells.forEach(c => {
    if (!peakByHour.has(c.hour)) peakByHour.set(c.hour, { days: new Set(), visitors: 0 });
    const entry = peakByHour.get(c.hour)!;
    entry.days.add(c.dayOfWeek);
    entry.visitors += c.totalPageviews;
  });
  
  // Group slow times
  const slowByHour: Map<number, { days: Set<number>; visitors: number }> = new Map();
  slowCells.forEach(c => {
    if (!slowByHour.has(c.hour)) slowByHour.set(c.hour, { days: new Set(), visitors: 0 });
    const entry = slowByHour.get(c.hour)!;
    entry.days.add(c.dayOfWeek);
    entry.visitors += c.totalPageviews;
  });
  
  // Format time ranges
  const formatTimeBlock = (hours: number[]) => {
    if (hours.length === 0) return '';
    const sorted = [...hours].sort((a, b) => a - b);
    const groups = groupConsecutiveHours(sorted);
    return groups.map(g => formatTimeRange(g.start, g.end)).join(', ');
  };
  
  const formatDays = (days: Set<number>) => {
    const arr = Array.from(days).sort((a, b) => a - b);
    // Reorder to start from Monday
    const reordered = arr.map(d => (d + 6) % 7).sort((a, b) => a - b).map(d => (d + 1) % 7);
    if (arr.length >= 5) {
      const consecutive = arr.every((d, i) => i === 0 || arr[i-1] === d - 1 || (arr[i-1] === 6 && d === 0));
      if (consecutive) return `${DAY_NAMES[arr[0]]}-${DAY_NAMES[arr[arr.length-1]]}`;
    }
    return arr.map(d => DAY_NAMES[d]).join(', ');
  };
  
  // Build peak times summary
  const peakTimes: { time: string; days: string; visitors: number }[] = [];
  const peakHours = Array.from(peakByHour.keys()).sort((a, b) => a - b);
  if (peakHours.length > 0) {
    const peakGroups = groupConsecutiveHours(peakHours);
    peakGroups.forEach(g => {
      let totalV = 0;
      const allDays = new Set<number>();
      for (let h = g.start; h < g.end; h++) {
        const entry = peakByHour.get(h);
        if (entry) {
          totalV += entry.visitors;
          entry.days.forEach(d => allDays.add(d));
        }
      }
      peakTimes.push({
        time: formatTimeRange(g.start, g.end),
        days: formatDays(allDays),
        visitors: totalV
      });
    });
  }
  
  // Build slow times summary  
  const slowTimes: { time: string; days: string; visitors: number }[] = [];
  const slowHours = Array.from(slowByHour.keys()).sort((a, b) => a - b);
  if (slowHours.length > 0) {
    const slowGroups = groupConsecutiveHours(slowHours);
    slowGroups.slice(0, 2).forEach(g => {
      let totalV = 0;
      const allDays = new Set<number>();
      for (let h = g.start; h < g.end; h++) {
        const entry = slowByHour.get(h);
        if (entry) {
          totalV += entry.visitors;
          entry.days.forEach(d => allDays.add(d));
        }
      }
      slowTimes.push({
        time: formatTimeRange(g.start, g.end),
        days: formatDays(allDays),
        visitors: totalV
      });
    });
  }
  
  return { peakTimes: peakTimes.slice(0, 3), slowTimes: slowTimes.slice(0, 2), needsCoverage: needsCoverageCells };
}

function CoverageHoursChart({ 
  hourlyData, 
  dailyHourlyData, 
  dateRange, 
  onDateRangeChange,
  view,
  onViewChange,
  staffingMetrics,
}: CoverageChartProps) {
  const hasPageviews = hourlyData.some(d => d.totalPageviews > 0);
  const hasAgentActivity = hourlyData.some(d => d.avgAgentsOnline > 0);
  
  // Calculate totals
  const totalPageviews = hourlyData.reduce((sum, d) => sum + d.totalPageviews, 0);
  const totalCovered = hourlyData.reduce((sum, d) => sum + d.pageviewsWithAgent, 0);
  const totalMissed = hourlyData.reduce((sum, d) => sum + d.missedOpportunities, 0);
  
  // Generate insights using ring rate and call duration for accurate agent estimates
  const realStaffingGaps = generateStaffingRecommendations(
    dailyHourlyData.byDayHour,
    staffingMetrics.ringRate,
    staffingMetrics.avgCallDurationSeconds
  );
  
  // Traffic details dropdown state
  const [trafficDetailsOpen, setTrafficDetailsOpen] = useState(false);
  
  const staffingGaps = realStaffingGaps;
  const poolsNeedingCoverage = staffingMetrics.poolsNeedingCoverage;

  // Calculate which preset matches the current date range
  const getDaysDiff = () => {
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    // Use floor to avoid rounding up due to time components (e.g., 7.99 days -> 7)
    return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  };
  const daysDiff = getDaysDiff();
  // Use slightly higher thresholds to account for time component variations
  const activePreset = daysDiff <= 8 ? 7 : daysDiff <= 15 ? 14 : daysDiff <= 31 ? 30 : 90;

  const handlePresetChange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onDateRangeChange(from, to);
  };

  // Format the active preset label
  const presetLabel = activePreset === 7 ? 'last 7 days' : activePreset === 14 ? 'last 14 days' : activePreset === 30 ? 'last 30 days' : 'last 90 days';

  return (
    <div className="glass rounded-2xl p-6 mt-8 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <h3 className="text-xl font-semibold">Staffing Guide</h3>
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {[
            { days: 7, label: '7 days' },
            { days: 14, label: '14 days' },
            { days: 30, label: '30 days' },
            { days: 90, label: '90 days' },
          ].map(({ days, label }) => (
            <button
              key={days}
              onClick={() => handlePresetChange(days)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                activePreset === days 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Context line */}
      <p className="text-sm text-muted-foreground mb-6">
        Based on average traffic patterns from the <span className="font-medium text-foreground">{presetLabel}</span>
      </p>

      {/* Empty state */}
      {!hasPageviews && !hasAgentActivity ? (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium">No visitor data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Recommendations will appear once visitors arrive
          </p>
        </div>
      ) : (
        <>
          {/* Recommendations - The main value */}
          <div className="mb-6">
            {staffingGaps.length > 0 ? (
              <div className="space-y-4">
                {/* Shifts to Fill */}
                {staffingGaps.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-sm font-medium">{staffingGaps.length} shift{staffingGaps.length > 1 ? 's' : ''} need coverage</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {staffingGaps.reduce((sum, g) => sum + g.missedVisitors, 0)} visitors typically missed
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {staffingGaps.slice(0, 6).map((gap) => (
                        <StaffingGapCard 
                          key={gap.id} 
                          gap={gap} 
                          poolsNeedingCoverage={poolsNeedingCoverage} 
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-primary/5 border border-primary/20">
                <CheckCircle className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="font-semibold text-primary">Staffing looks good!</p>
                <p className="text-xs text-muted-foreground mt-1">No coverage gaps detected based on {presetLabel} traffic</p>
              </div>
            )}
          </div>

          {/* Traffic Details - Collapsible Dropdown (supporting data) */}
          <div className="pt-4 border-t border-border/50">
            <button
              onClick={() => setTrafficDetailsOpen(!trafficDetailsOpen)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${trafficDetailsOpen ? 'rotate-180' : ''}`} />
                <h4 className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Traffic Details
                </h4>
                <span className="text-xs text-muted-foreground/70">
                  {totalPageviews} visitors • {totalCovered} covered{totalMissed > 0 && ` • ${totalMissed} missed`}
                </span>
              </div>
            </button>
            
            {trafficDetailsOpen && (
              <div className="mt-4">
                {/* Date Range & View Toggle */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <DateRangePicker
                    from={new Date(dateRange.from)}
                    to={new Date(dateRange.to)}
                    onRangeChange={onDateRangeChange}
                  />
                  <div className="flex gap-0.5 p-0.5 bg-muted/50 rounded-lg">
                    <button
                      onClick={() => onViewChange("heatmap")}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        view === "heatmap" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => onViewChange("hourly")}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        view === "hourly" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Hourly
                    </button>
                    <button
                      onClick={() => onViewChange("daily")}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        view === "daily" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Daily
                    </button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl p-4 bg-muted/30 text-center">
                    <div className="text-2xl font-bold">{totalPageviews}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Visitors</div>
                  </div>
                  <div className="rounded-xl p-4 bg-primary/10 border border-primary/20 text-center">
                    <div className="text-2xl font-bold text-primary">{totalCovered}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Covered</div>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${totalMissed > 0 ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-muted/30'}`}>
                    <div className={`text-2xl font-bold ${totalMissed > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {totalMissed}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Missed</div>
                  </div>
                </div>

                {view === "heatmap" && <StaffingHeatmap data={dailyHourlyData.byDayHour} />}
                {view === "hourly" && <HourlyGapChart data={hourlyData} />}
                {view === "daily" && <DailyGapChart data={dailyHourlyData.byDayOfWeek} />}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Hourly Gap Chart - Shows covered vs missed in single stacked bars
function HourlyGapChart({ data }: { data: HourlyStats[] }) {
  const maxTraffic = Math.max(...data.map(d => d.totalPageviews), 1);
  const totalVisitors = data.reduce((sum, d) => sum + d.totalPageviews, 0);
  const totalMissed = data.reduce((sum, d) => sum + d.missedOpportunities, 0);
  
  // Find peak hours (top 3)
  const sortedHours = [...data].sort((a, b) => b.totalPageviews - a.totalPageviews);
  const peakHours = sortedHours.slice(0, 3).filter(h => h.totalPageviews > 0);
  
  const formatHourRange = (h: number) => {
    const start = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    const end = (h + 1) === 24 ? '12am' : (h + 1) < 12 ? `${h + 1}am` : (h + 1) === 12 ? '12pm' : `${h + 1 - 12}pm`;
    return `${start}-${end}`;
  };

  return (
    <div>
      {/* Peak hours insight */}
      {peakHours.length > 0 && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-1">Peak Traffic Hours</div>
          <div className="flex flex-wrap gap-2">
            {peakHours.map((h, i) => (
              <div key={h.hour} className="flex items-center gap-2 px-2 py-1 bg-background rounded text-sm">
                <span className="font-semibold">{formatHourRange(h.hour)}</span>
                <span className="text-muted-foreground">({h.totalPageviews} visitors)</span>
                {h.missedOpportunities > 0 && (
                  <span className="text-rose-500 text-xs">• {h.missedOpportunities} missed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Covered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
          <span className="text-muted-foreground">Missed</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          <span className="font-semibold text-foreground">{totalVisitors}</span> total visitors
          {totalMissed > 0 && (
            <span className="text-rose-500 ml-2">({totalMissed} missed)</span>
          )}
        </div>
      </div>
      
      <div className="flex items-end gap-0.5 h-48 mb-2">
        {data.map((hour) => {
          const totalHeight = (hour.totalPageviews / maxTraffic) * 100;
          const coveredHeight = hour.totalPageviews > 0 
            ? (hour.pageviewsWithAgent / hour.totalPageviews) * totalHeight 
            : 0;
          const missedHeight = totalHeight - coveredHeight;
          const hasMissed = hour.missedOpportunities > 0;
          
          return (
            <div key={hour.hour} className="flex-1 flex flex-col items-center relative group h-full">
              <div className="w-full flex flex-col justify-end h-full">
                {/* Missed portion (top - red) */}
                {hasMissed && (
                  <div 
                    className="w-full bg-rose-500 rounded-t-sm transition-all"
                    style={{ height: `${missedHeight}%` }}
                  />
                )}
                {/* Covered portion (bottom - green) */}
                {hour.pageviewsWithAgent > 0 && (
                  <div 
                    className={`w-full bg-primary transition-all ${!hasMissed ? 'rounded-t-sm' : ''}`}
                    style={{ height: `${coveredHeight}%` }}
                  />
                )}
                {/* Empty state */}
                {hour.totalPageviews === 0 && (
                  <div 
                    className="w-full bg-muted/50 rounded-t-sm"
                    style={{ height: '4px' }}
                  />
                )}
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                <div className="bg-popover border border-border rounded-lg p-3 text-xs shadow-lg whitespace-nowrap">
                  <div className="font-semibold mb-2 text-sm">
                    {hour.hour.toString().padStart(2, '0')}:00 - {((hour.hour + 1) % 24).toString().padStart(2, '0')}:00
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Total visitors</span>
                      <span className="font-medium">{hour.totalPageviews}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-primary">✓ Covered</span>
                      <span className="font-medium text-primary">{hour.pageviewsWithAgent}</span>
                    </div>
                    {hour.missedOpportunities > 0 && (
                      <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border">
                        <span className="text-rose-500 font-medium">✗ Missed</span>
                        <span className="font-bold text-rose-500">{hour.missedOpportunities}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* X-axis labels - show every 4 hours with AM/PM */}
      <div className="flex gap-1 text-[10px] text-muted-foreground mt-1">
        {data.map((hour) => {
          const showLabel = hour.hour % 4 === 0;
          const formatHour = (h: number) => {
            if (h === 0) return '12am';
            if (h === 12) return '12pm';
            return h < 12 ? `${h}am` : `${h - 12}pm`;
          };
          return (
            <div key={hour.hour} className="flex-1 text-center">
              {showLabel ? formatHour(hour.hour) : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Daily Gap Chart - Day of week breakdown showing visitor counts
function DailyGapChart({ data }: { data: DayOfWeekStats[] }) {
  const maxTraffic = Math.max(...data.map(d => d.totalPageviews), 1);
  const totalVisitors = data.reduce((sum, d) => sum + d.totalPageviews, 0);
  // Reorder to start from Monday
  const reorderedData = [...data.slice(1), data[0]];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Covered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
          <span className="text-muted-foreground">Missed</span>
        </div>
      </div>
      
      {/* Horizontal bar chart - easier to read */}
      <div className="space-y-3">
        {reorderedData.map((day, index) => {
          const widthPercent = totalVisitors > 0 ? (day.totalPageviews / maxTraffic) * 100 : 0;
          const coveredPercent = day.totalPageviews > 0 
            ? (day.pageviewsWithAgent / day.totalPageviews) * 100 
            : 0;
          const hasMissed = day.missedOpportunities > 0;
          
          return (
            <div key={day.dayOfWeek} className="flex items-center gap-3 group">
              {/* Day label */}
              <div className="w-12 text-sm font-medium text-right flex-shrink-0">
                {shortDayLabels[index]}
              </div>
              
              {/* Bar container */}
              <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                {day.totalPageviews > 0 ? (
                  <div 
                    className="h-full flex transition-all"
                    style={{ width: `${Math.max(widthPercent, 5)}%` }}
                  >
                    {/* Covered portion */}
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${coveredPercent}%` }}
                    />
                    {/* Missed portion */}
                    {hasMissed && (
                      <div 
                        className="h-full bg-rose-500"
                        style={{ width: `${100 - coveredPercent}%` }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                    No visitors
                  </div>
                )}
                
                {/* Tooltip */}
                <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                  <div className="bg-popover border border-border rounded-lg p-3 text-xs shadow-lg whitespace-nowrap">
                    <div className="font-semibold mb-2 text-sm">{dayLabels[index]}</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Total visitors</span>
                        <span className="font-bold">{day.totalPageviews}</span>
                      </div>
                      {day.totalPageviews > 0 && (
                        <>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-primary">✓ Covered</span>
                            <span className="font-medium text-primary">{day.pageviewsWithAgent}</span>
                          </div>
                          {day.missedOpportunities > 0 && (
                            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border">
                              <span className="text-rose-500 font-medium">✗ Missed</span>
                              <span className="font-bold text-rose-500">{day.missedOpportunities}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Visitor count */}
              <div className="w-20 text-right flex-shrink-0">
                {day.totalPageviews > 0 ? (
                  <div>
                    <span className="font-semibold">{day.totalPageviews}</span>
                    <span className="text-xs text-muted-foreground ml-1">visitors</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Staffing Heatmap - Shows traffic volume with coverage status
function StaffingHeatmap({ data }: { data: DayHourStats[][] }) {
  // Reorder to start from Monday
  const reorderedData = [...data.slice(1), data[0]];
  const reorderedLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const allCells = data.flat();
  const maxVisitors = Math.max(...allCells.map(c => c.totalPageviews), 1);
  const totalMissed = allCells.reduce((sum, c) => sum + c.missedOpportunities, 0);
  const totalVisitors = allCells.reduce((sum, c) => sum + c.totalPageviews, 0);
  
  // Find busiest hours for insights
  const hourTotals = Array.from({ length: 24 }, (_, h) => 
    allCells.filter(c => c.hour === h).reduce((sum, c) => sum + c.totalPageviews, 0)
  );
  const busiestHour = hourTotals.indexOf(Math.max(...hourTotals));
  
  // Find busiest day
  const dayTotals = reorderedData.map(day => 
    day.reduce((sum, c) => sum + c.totalPageviews, 0)
  );
  const busiestDayIndex = dayTotals.indexOf(Math.max(...dayTotals));

  const getCellStyles = (cell: DayHourStats) => {
    // No visitors = empty
    if (cell.totalPageviews === 0) {
      return { 
        bg: 'bg-muted/10', 
        text: 'text-muted-foreground/30',
        content: '',
        intensity: 0
      };
    }
    
    // Has missed visitors = red, show missed count
    if (cell.missedOpportunities > 0) {
      const intensity = Math.min(cell.missedOpportunities / Math.max(...allCells.map(c => c.missedOpportunities), 1), 1);
      if (intensity >= 0.6) {
        return { bg: 'bg-rose-500', text: 'text-white font-bold', content: cell.missedOpportunities.toString(), intensity };
      }
      if (intensity >= 0.3) {
        return { bg: 'bg-rose-400', text: 'text-white font-semibold', content: cell.missedOpportunities.toString(), intensity };
      }
      return { bg: 'bg-rose-300', text: 'text-rose-900 font-medium', content: cell.missedOpportunities.toString(), intensity };
    }
    
    // Covered = green, intensity based on traffic volume, show visitor count
    const intensity = cell.totalPageviews / maxVisitors;
    if (intensity >= 0.6) {
      return { bg: 'bg-primary', text: 'text-white font-semibold', content: cell.totalPageviews.toString(), intensity };
    }
    if (intensity >= 0.3) {
      return { bg: 'bg-primary/80', text: 'text-white font-medium', content: cell.totalPageviews.toString(), intensity };
    }
    if (intensity >= 0.1) {
      return { bg: 'bg-primary/60', text: 'text-white/90', content: cell.totalPageviews.toString(), intensity };
    }
    return { bg: 'bg-primary/40', text: 'text-white/80', content: cell.totalPageviews.toString(), intensity };
  };

  return (
    <div className="overflow-x-auto">
      {/* Traffic Insights */}
      {totalVisitors > 0 && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">Busiest day:</span>
            <span className="font-semibold">{reorderedLabels[busiestDayIndex]}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">Peak hour:</span>
            <span className="font-semibold">{busiestHour}:00 - {busiestHour + 1}:00</span>
          </div>
          {totalMissed > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 rounded-lg">
              <span className="text-rose-500 font-semibold">{totalMissed} visitors missed</span>
              <span className="text-muted-foreground">({Math.round((totalMissed / totalVisitors) * 100)}%)</span>
            </div>
          )}
        </div>
      )}
      
      <p className="text-sm text-muted-foreground mb-3">
        {totalMissed > 0 
          ? `Numbers show visitor counts. Red = missed (need coverage). Purple = covered.`
          : totalVisitors > 0
          ? `Numbers show visitor counts per hour. Darker purple = busier times.`
          : `No visitor data yet for this period.`
        }
      </p>
      
      <div className="min-w-[700px]">
        {/* Hour labels */}
        <div className="flex mb-2 ml-14">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
              {i % 3 === 0 ? `${i}:00` : ''}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        {reorderedData.map((dayData, dayIndex) => (
          <div key={dayIndex} className="flex items-center mb-1">
            {/* Day label */}
            <div className="w-14 text-sm font-semibold text-right pr-3">
              {reorderedLabels[dayIndex]}
            </div>
            
            {/* Hour cells */}
            <div className="flex flex-1 gap-0.5">
              {dayData.map((cell) => {
                const styles = getCellStyles(cell);
                return (
                  <div
                    key={cell.hour}
                    className={`flex-1 h-9 rounded ${styles.bg} transition-all hover:ring-2 hover:ring-primary hover:ring-offset-1 cursor-pointer relative group flex items-center justify-center`}
                  >
                    {/* Show visitor count if > 0 */}
                    {styles.content && (
                      <span className={`text-[10px] ${styles.text}`}>
                        {styles.content}
                      </span>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-popover border border-border rounded-lg p-3 text-xs shadow-lg whitespace-nowrap">
                        <div className="font-semibold mb-2 text-sm">
                          {reorderedLabels[dayIndex]} {cell.hour.toString().padStart(2, '0')}:00 - {((cell.hour + 1) % 24).toString().padStart(2, '0')}:00
                        </div>
                        {cell.totalPageviews === 0 ? (
                          <div className="text-muted-foreground">No visitors</div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Total visitors</span>
                              <span className="font-bold">{cell.totalPageviews}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-primary">✓ Covered</span>
                              <span className="font-medium text-primary">{cell.pageviewsWithAgent}</span>
                            </div>
                            {cell.missedOpportunities > 0 && (
                              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border">
                                <span className="text-rose-500 font-medium">✗ Missed</span>
                                <span className="font-bold text-rose-500">{cell.missedOpportunities}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Covered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-500" />
            <span className="text-muted-foreground">Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted/30" />
            <span className="text-muted-foreground">No traffic</span>
          </div>
        </div>
      </div>
    </div>
  );
}

