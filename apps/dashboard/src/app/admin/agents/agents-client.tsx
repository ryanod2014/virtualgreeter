"use client";

import { useState } from "react";
import {
  Users,
  Phone,
  Clock,
  CheckCircle,
  UserPlus,
  Layers,
  X,
  MoreVertical,
  Video,
  Circle,
  BarChart3,
  Loader2,
  Mail,
  Shield,
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
}

interface Agent {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
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

interface Props {
  agents: Agent[];
  pools: Pool[];
  agentStats: Record<string, AgentStats>;
  organizationId: string;
  pendingInvites?: PendingInvite[];
}

export function AgentsClient({ agents: initialAgents, pools, agentStats, organizationId, pendingInvites: initialInvites = [] }: Props) {
  const [agents, setAgents] = useState(initialAgents);
  const [pendingInvites, setPendingInvites] = useState(initialInvites);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState<"admin" | "agent">("agent");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const supabase = createClient();

  // Send invite
  const handleSendInvite = async () => {
    if (!newAgentEmail || !newAgentName) return;
    
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

      // Add to pending invites list
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

      setInviteSuccess(true);
      
      // Reset form after short delay
      setTimeout(() => {
        setIsAddingAgent(false);
        setNewAgentEmail("");
        setNewAgentName("");
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

  // Revoke invite
  const handleRevokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from("invites").delete().eq("id", inviteId);
    if (!error) {
      setPendingInvites(pendingInvites.filter(i => i.id !== inviteId));
    }
  };

  const getAgentPools = (agent: Agent) => {
    return agent.agent_pool_members.map(m => m.pool);
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
      setAgents(agents.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            agent_pool_members: [...a.agent_pool_members, data as PoolMembership],
          };
        }
        return a;
      }));
      
      // Update selected agent if needed
      if (selectedAgent?.id === agentId) {
        setSelectedAgent({
          ...selectedAgent,
          agent_pool_members: [...selectedAgent.agent_pool_members, data as PoolMembership],
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

      // Update selected agent if needed
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agents</h1>
          <p className="text-muted-foreground">
            Manage your agents and assign them to pools
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite New Team Member</h3>
              <button
                onClick={() => {
                  setIsAddingAgent(false);
                  setNewAgentEmail("");
                  setNewAgentName("");
                  setNewAgentRole("agent");
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Invite Sent!</h4>
                <p className="text-muted-foreground">
                  An email has been sent to {newAgentEmail}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inviteError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {inviteError}
                  </div>
                )}

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
                      disabled={isInviting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                    disabled={isInviting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    They can change this after accepting the invite
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewAgentRole("agent")}
                      disabled={isInviting}
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
                      disabled={isInviting}
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

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSendInvite}
                    disabled={!newAgentEmail || !newAgentName || isInviting}
                    className="flex-1 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Invite
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingAgent(false);
                      setNewAgentEmail("");
                      setNewAgentName("");
                      setNewAgentRole("agent");
                      setInviteError(null);
                    }}
                    disabled={isInviting}
                    className="px-6 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
                const agentPools = getAgentPools(agent);

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
                        <div className="font-medium">{agent.display_name}</div>
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
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {agents.length === 0 && pendingInvites.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite your first agent to get started
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
                      Pending Invites ({pendingInvites.length})
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
                          title="Revoke invite"
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

              {/* Video Status */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Videos
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Intro Video</span>
                    {selectedAgent.intro_video_url ? (
                      <span className="text-green-500">✓ Uploaded</span>
                    ) : (
                      <span className="text-yellow-500">Not set</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Loop Video</span>
                    {selectedAgent.loop_video_url ? (
                      <span className="text-green-500">✓ Uploaded</span>
                    ) : (
                      <span className="text-yellow-500">Not set</span>
                    )}
                  </div>
                </div>
              </div>
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

