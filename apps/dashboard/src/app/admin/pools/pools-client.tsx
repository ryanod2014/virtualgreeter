"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Globe,
  ChevronDown,
  ChevronRight,
  Layers,
  UserPlus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RoutingRule {
  id: string;
  pool_id: string;
  domain_pattern: string;
  path_pattern: string;
  priority: number;
  is_active: boolean;
}

interface Agent {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PoolMember {
  id: string;
  agent_profile_id: string;
  agent_profiles: Agent;
}

interface Pool {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_catch_all: boolean;
  pool_routing_rules: RoutingRule[];
  agent_pool_members: PoolMember[];
}

interface PathWithVisitors {
  path: string;
  visitorCount: number;
}

interface Props {
  pools: Pool[];
  agents: Agent[];
  organizationId: string;
  pathsWithVisitors: PathWithVisitors[];
}

export function PoolsClient({ 
  pools: initialPools, 
  agents,
  organizationId,
  pathsWithVisitors,
}: Props) {
  const [pools, setPools] = useState(initialPools);
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set([initialPools[0]?.id]));
  const [isAddingPool, setIsAddingPool] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolDescription, setNewPoolDescription] = useState("");
  const [addingRuleToPool, setAddingRuleToPool] = useState<string | null>(null);
  const [newRulePath, setNewRulePath] = useState("");
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  const [addingAgentToPool, setAddingAgentToPool] = useState<string | null>(null);

  const supabase = createClient();

  // Filter paths based on input - show matching paths as user types
  const filteredPaths = pathsWithVisitors.filter(p => 
    newRulePath === "" || p.path.toLowerCase().includes(newRulePath.toLowerCase())
  );

  // Get agents not already in a specific pool
  const getAvailableAgents = (pool: Pool) => {
    const memberIds = pool.agent_pool_members.map(m => m.agent_profile_id);
    return agents.filter(a => !memberIds.includes(a.id));
  };

  const togglePoolExpanded = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  // Pool management
  const handleAddPool = async () => {
    if (!newPoolName.trim()) return;

    const { data, error } = await supabase
      .from("agent_pools")
      .insert({
        organization_id: organizationId,
        name: newPoolName,
        description: newPoolDescription || null,
        is_default: false,
        is_catch_all: false,
      })
      .select(`
        *,
        pool_routing_rules(*),
        agent_pool_members(id, agent_profile_id, agent_profiles(id, display_name, avatar_url))
      `)
      .single();

    if (data && !error) {
      setPools([...pools, data]);
      setNewPoolName("");
      setNewPoolDescription("");
      setIsAddingPool(false);
      setExpandedPools(new Set([...expandedPools, data.id]));
    }
  };

  // Agent management
  const handleAddAgentToPool = async (poolId: string, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const { data, error } = await supabase
      .from("agent_pool_members")
      .insert({
        pool_id: poolId,
        agent_profile_id: agentId,
      })
      .select("id, agent_profile_id")
      .single();

    if (data && !error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            agent_pool_members: [
              ...p.agent_pool_members,
              { ...data, agent_profiles: agent }
            ],
          };
        }
        return p;
      }));
      setAddingAgentToPool(null);
    }
  };

  const handleRemoveAgentFromPool = async (poolId: string, memberId: string) => {
    const { error } = await supabase
      .from("agent_pool_members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            agent_pool_members: p.agent_pool_members.filter(m => m.id !== memberId),
          };
        }
        return p;
      }));
    }
  };

  const handleDeletePool = async (poolId: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool?.is_catch_all) return; // Can't delete the "All" pool

    const { error } = await supabase.from("agent_pools").delete().eq("id", poolId);
    if (!error) {
      setPools(pools.filter(p => p.id !== poolId));
    }
  };

  // Routing rule management
  const handleAddRoutingRule = async (poolId: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return;

    const maxPriority = Math.max(0, ...pool.pool_routing_rules.map(r => r.priority));

    const { data, error } = await supabase
      .from("pool_routing_rules")
      .insert({
        pool_id: poolId,
        domain_pattern: "*",
        path_pattern: newRulePath || "*",
        priority: maxPriority + 1,
        is_active: true,
      })
      .select()
      .single();

    if (data && !error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            pool_routing_rules: [...p.pool_routing_rules, data],
          };
        }
        return p;
      }));
      setAddingRuleToPool(null);
      setNewRulePath("");
    }
  };

  const handleDeleteRoutingRule = async (poolId: string, ruleId: string) => {
    const { error } = await supabase.from("pool_routing_rules").delete().eq("id", ruleId);
    if (!error) {
      setPools(pools.map(p => {
        if (p.id === poolId) {
          return {
            ...p,
            pool_routing_rules: p.pool_routing_rules.filter(r => r.id !== ruleId),
          };
        }
        return p;
      }));
    }
  };

  const getMemberCount = (pool: Pool) => {
    return pool.agent_pool_members?.length ?? 0;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Pools</h1>
          <p className="text-muted-foreground">
            Show different agents on different pages of your website
          </p>
        </div>
        <button
          onClick={() => setIsAddingPool(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Pool
        </button>
      </div>

      {/* How it works - Simple explanation */}
      <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
        <h3 className="font-semibold mb-4 text-lg">🎯 How Pools Work (3 Simple Steps)</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
            <div>
              <div className="font-medium">Create a Pool</div>
              <div className="text-sm text-muted-foreground">Name it like "Sales Team" or "Support Squad"</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
            <div>
              <div className="font-medium">Add Page Rules</div>
              <div className="text-sm text-muted-foreground">Example: "/pricing" or "/contact"</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
            <div>
              <div className="font-medium">Assign Agents</div>
              <div className="text-sm text-muted-foreground">Add team members to each pool</div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-primary/20 text-sm text-muted-foreground">
          <strong>Example:</strong> Create a "Sales" pool → Add rule for "/pricing" → Assign your best closers → 
          Now when someone visits your pricing page, they'll see your sales team!
        </div>
      </div>

      {/* Add Pool Form */}
      {isAddingPool && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Pool</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pool Name</label>
              <input
                type="text"
                placeholder="e.g., Sales Team, Support, Enterprise"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <input
                type="text"
                placeholder="What is this pool for?"
                value={newPoolDescription}
                onChange={(e) => setNewPoolDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddPool}
                disabled={!newPoolName.trim()}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Create Pool
              </button>
              <button
                onClick={() => {
                  setIsAddingPool(false);
                  setNewPoolName("");
                  setNewPoolDescription("");
                }}
                className="px-6 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pools List */}
      <div className="space-y-4">
        {pools.map((pool) => {
          const isExpanded = expandedPools.has(pool.id);
          const memberCount = getMemberCount(pool);

          return (
            <div key={pool.id} className="glass rounded-2xl overflow-hidden">
              {/* Pool Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => togglePoolExpanded(pool.id)}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{pool.name}</span>
                      {pool.is_catch_all && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                          Default
                        </span>
                      )}
                    </div>
                    {pool.description && (
                      <p className="text-sm text-muted-foreground">{pool.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Agents</div>
                    <div className="font-semibold">{memberCount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Rules</div>
                    <div className="font-semibold">{pool.pool_routing_rules.length}</div>
                  </div>
                  {!pool.is_catch_all && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePool(pool.id);
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Routing Rules Section */}
                  <div className="p-5 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          Which website pages should use this pool?
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add the website URLs where you want these agents to appear
                        </p>
                      </div>
                    </div>

                    {pool.is_catch_all ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-500 text-lg">✓</span>
                          </div>
                          <div>
                            <h5 className="font-medium text-green-400">Default Pool - Always Active</h5>
                            <p className="text-sm text-muted-foreground mt-1">
                              This pool catches ALL visitors that don't match any other pool's rules. 
                              You don't need to add any URLs here.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Current Rules */}
                        {pool.pool_routing_rules.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Active Rules
                            </div>
                            {pool.pool_routing_rules
                              .sort((a, b) => b.priority - a.priority)
                              .map((rule) => (
                                <div
                                  key={rule.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 group"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-500">●</span>
                                    <span className="text-sm">
                                      {rule.domain_pattern === "*" ? "Any website" : rule.domain_pattern}
                                    </span>
                                    <span className="text-muted-foreground mx-1">→</span>
                                    <code className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-sm">
                                      {rule.path_pattern === "*" ? "all pages" : rule.path_pattern}
                                    </code>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteRoutingRule(pool.id, rule.id)}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Remove this rule"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Add Rule Section */}
                        {addingRuleToPool === pool.id ? (
                          <div className="bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl p-5">
                            <h5 className="font-semibold text-lg mb-2">Add a Page Rule</h5>
                            <p className="text-sm text-muted-foreground mb-4">
                              Type a page path to see matching pages with visitor counts
                            </p>
                            
                            {/* Path Input with Autocomplete */}
                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">
                                Which page(s) should use this pool?
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Start typing... e.g. /pricing, /contact"
                                  value={newRulePath}
                                  onChange={(e) => setNewRulePath(e.target.value)}
                                  onFocus={() => setShowPathDropdown(true)}
                                  onBlur={() => setTimeout(() => setShowPathDropdown(false), 200)}
                                  className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:border-primary outline-none font-mono text-lg"
                                  autoFocus
                                />
                                {newRulePath === "" && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    All pages
                                  </span>
                                )}
                                
                                {/* Dropdown with paths and visitor counts */}
                                {showPathDropdown && (
                                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-auto">
                                    {/* All pages option */}
                                    <div
                                      className={`px-4 py-3 hover:bg-muted cursor-pointer border-b border-border flex justify-between items-center ${
                                        newRulePath === "" ? "bg-primary/10" : ""
                                      }`}
                                      onClick={() => {
                                        setNewRulePath("");
                                        setShowPathDropdown(false);
                                      }}
                                    >
                                      <div>
                                        <div className="font-medium">All pages</div>
                                        <div className="text-xs text-muted-foreground">Match every page on your website</div>
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {pathsWithVisitors.reduce((sum, p) => sum + p.visitorCount, 0).toLocaleString()} total
                                      </div>
                                    </div>
                                    
                                    {filteredPaths.length > 0 ? (
                                      <>
                                        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b border-border flex justify-between">
                                          <span>Pages detected (last 30 days)</span>
                                          <span>Visitors</span>
                                        </div>
                                        {filteredPaths.slice(0, 10).map((item) => (
                                          <div
                                            key={item.path}
                                            className={`px-4 py-3 hover:bg-muted cursor-pointer flex justify-between items-center ${
                                              newRulePath === item.path ? "bg-primary/10" : ""
                                            }`}
                                            onClick={() => {
                                              setNewRulePath(item.path);
                                              setShowPathDropdown(false);
                                            }}
                                          >
                                            <code className="font-mono text-sm">{item.path}</code>
                                            <div className="flex items-center gap-2">
                                              <span className={`text-sm font-medium ${item.visitorCount > 10 ? "text-green-500" : "text-muted-foreground"}`}>
                                                {item.visitorCount.toLocaleString()}
                                              </span>
                                              <span className={item.visitorCount > 0 ? "text-green-500" : "text-muted-foreground"}>
                                                {item.visitorCount > 10 ? "●" : item.visitorCount > 0 ? "◐" : "○"}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                        {filteredPaths.length > 10 && (
                                          <div className="px-4 py-2 text-xs text-muted-foreground text-center bg-muted/30">
                                            +{filteredPaths.length - 10} more paths...
                                          </div>
                                        )}
                                      </>
                                    ) : newRulePath !== "" ? (
                                      <div className="px-4 py-3 text-sm text-muted-foreground">
                                        No matching pages found. You can still use "{newRulePath}" as a custom path.
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                💡 <strong>Tip:</strong> Add <code className="bg-muted px-1 rounded">*</code> at the end for wildcards. 
                                Example: <code className="bg-muted px-1 rounded">/pricing*</code> matches /pricing, /pricing-enterprise, etc.
                              </p>
                            </div>

                            {/* Preview */}
                            <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                              <div className="text-xs font-medium text-green-500 mb-1">✓ This rule will:</div>
                              <div className="text-sm">
                                Show agents from <strong>"{pool.name}"</strong> when visitors are on{" "}
                                <code className="px-2 py-0.5 rounded bg-background font-mono">
                                  {newRulePath === "" ? "any page" : newRulePath}
                                </code>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleAddRoutingRule(pool.id)}
                                className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-lg"
                              >
                                ✓ Save This Rule
                              </button>
                              <button
                                onClick={() => {
                                  setAddingRuleToPool(null);
                                  setNewRulePath("");
                                  setShowPathDropdown(false);
                                }}
                                className="px-4 py-3 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingRuleToPool(pool.id)}
                            className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
                          >
                            {pool.pool_routing_rules.length === 0 ? (
                              <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                                  <Plus className="w-6 h-6 text-primary" />
                                </div>
                                <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                                  Add Your First Page Rule
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                                  Click here to choose which pages on your website should show agents from this pool
                                </p>
                                <div className="mt-3 text-xs text-muted-foreground">
                                  Examples: /pricing, /contact, /demo, /checkout
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                                <Plus className="w-5 h-5" />
                                <span className="font-medium">Add Another Page Rule</span>
                              </div>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Agents Section */}
                  <div className="p-5 bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Agents in this pool ({memberCount})
                      </h4>
                      <button
                        onClick={() => setAddingAgentToPool(addingAgentToPool === pool.id ? null : pool.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Agent
                      </button>
                    </div>

                    {/* Add Agent Dropdown */}
                    {addingAgentToPool === pool.id && (
                      <div className="mb-4 p-3 rounded-lg bg-background border border-border">
                        <div className="text-sm font-medium mb-2">Select an agent to add:</div>
                        {getAvailableAgents(pool).length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2">
                            All agents are already in this pool
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-auto">
                            {getAvailableAgents(pool).map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => handleAddAgentToPool(pool.id, agent.id)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                                  {agent.avatar_url ? (
                                    <img src={agent.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    agent.display_name?.charAt(0).toUpperCase() || "?"
                                  )}
                                </div>
                                <span className="font-medium">{agent.display_name || "Unnamed Agent"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current Agents */}
                    {memberCount > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pool.agent_pool_members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border group"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                              {member.agent_profiles?.avatar_url ? (
                                <img src={member.agent_profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                member.agent_profiles?.display_name?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <span className="text-sm font-medium">
                              {member.agent_profiles?.display_name || "Unnamed Agent"}
                            </span>
                            <button
                              onClick={() => handleRemoveAgentFromPool(pool.id, member.id)}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remove from pool"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-2">
                        No agents assigned yet. Click "Add Agent" to get started.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {pools.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <Layers className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Create Your First Pool</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Pools let you assign specific agents to specific pages. 
              For example, put your sales team on pricing pages and support team on help pages.
            </p>
            <button
              onClick={() => setIsAddingPool(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-lg"
            >
              <Plus className="w-5 h-5" />
              Create Your First Pool
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

