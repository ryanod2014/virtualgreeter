"use client";

import { useState, useCallback } from "react";
import {
  Globe,
  Copy,
  Check,
  Plus,
  Trash2,
  Users,
  Route,
  Code,
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || "http://localhost:3001";

interface Agent {
  id: string;
  display_name: string;
  user_id: string;
  status: string;
}

interface PoolMember {
  id: string;
  pool_id: string;
  agent_profile_id: string;
  agent_profile: {
    id: string;
    display_name: string;
    user_id: string;
  };
}

interface Pool {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  agent_pool_members: PoolMember[];
}

interface PathRule {
  id: string;
  site_id: string;
  path_pattern: string;
  pool_id: string;
  priority: number;
  is_active: boolean;
}

interface Site {
  id: string;
  organization_id: string;
  name: string;
  domain: string;
  is_active: boolean;
  default_pool_id: string | null;
  site_path_rules: PathRule[];
}

interface Props {
  sites: Site[];
  pools: Pool[];
  agents: Agent[];
  organizationId: string;
}

export function SiteSetupClient({ sites: initialSites, pools: initialPools, agents, organizationId }: Props) {
  const [sites, setSites] = useState(initialSites);
  const [pools, setPools] = useState(initialPools);
  const [selectedSite, setSelectedSite] = useState<Site | null>(initialSites[0] ?? null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAddingPool, setIsAddingPool] = useState(false);
  const [isAddingSite, setIsAddingSite] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteDomain, setNewSiteDomain] = useState("");
  const [newRulePath, setNewRulePath] = useState("");
  const [newRulePoolId, setNewRulePoolId] = useState("");
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());

  const supabase = createClient();

  // Sync site config to the signaling server
  const syncSiteConfigToServer = useCallback(async (site: Site) => {
    try {
      await fetch(`${SIGNALING_SERVER_URL}/api/config/site`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          defaultPoolId: site.default_pool_id,
          pathRules: site.site_path_rules.map(rule => ({
            id: rule.id,
            siteId: rule.site_id,
            pathPattern: rule.path_pattern,
            poolId: rule.pool_id,
            priority: rule.priority,
            isActive: rule.is_active,
          })),
        }),
      });
      console.log("[SiteSetup] Synced site config to server:", site.id);
    } catch (error) {
      console.error("[SiteSetup] Failed to sync site config:", error);
    }
  }, []);

  const [showDevEmbed, setShowDevEmbed] = useState(true);

  // Generate embed code for a site
  const getEmbedCode = (siteId: string, isDev: boolean) => {
    if (isDev) {
      return `<!-- Ghost-Greeter Widget (DEVELOPMENT) -->
<script type="module">
  import { init } from 'http://localhost:5174/src/main.tsx';
  init({ 
    siteId: '${siteId}',
    serverUrl: 'http://localhost:3001'
  });
</script>`;
    }
    return `<!-- Ghost-Greeter Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['GhostGreeter']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','gg','https://cdn.ghost-greeter.com/widget.js'));
  gg('init', { siteId: '${siteId}' });
</script>`;
  };

  const copyEmbedCode = async () => {
    if (!selectedSite) return;
    await navigator.clipboard.writeText(getEmbedCode(selectedSite.id, showDevEmbed));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Site management
  const handleAddSite = async () => {
    if (!newSiteName.trim() || !newSiteDomain.trim()) return;

    const defaultPool = pools.find(p => p.is_default);
    
    const { data, error } = await supabase
      .from("sites")
      .insert({
        organization_id: organizationId,
        name: newSiteName,
        domain: newSiteDomain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        default_pool_id: defaultPool?.id ?? null,
        widget_config: {
          position: "bottom-right",
          trigger_delay: 500,
          primary_color: "#6366f1",
          accent_color: "#22c55e",
          border_radius: 16,
          show_agent_name: true,
        },
      })
      .select("*, site_path_rules(*)")
      .single();

    if (data && !error) {
      setSites([data, ...sites]);
      setSelectedSite(data);
      setNewSiteName("");
      setNewSiteDomain("");
      setIsAddingSite(false);
    }
  };

  // Pool management
  const handleAddPool = async () => {
    if (!newPoolName.trim()) return;

    const { data, error } = await supabase
      .from("agent_pools")
      .insert({
        organization_id: organizationId,
        name: newPoolName,
        is_default: false,
      })
      .select("*, agent_pool_members(*, agent_profile:agent_profiles(id, display_name, user_id))")
      .single();

    if (data && !error) {
      setPools([...pools, data]);
      setNewPoolName("");
      setIsAddingPool(false);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    const pool = pools.find(p => p.id === poolId);
    if (pool?.is_default) return; // Can't delete default pool

    const { error } = await supabase.from("agent_pools").delete().eq("id", poolId);
    if (!error) {
      setPools(pools.filter(p => p.id !== poolId));
    }
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

  // Agent assignment
  const handleAddAgentToPool = async (poolId: string, agentId: string) => {
    const { data, error } = await supabase
      .from("agent_pool_members")
      .insert({
        pool_id: poolId,
        agent_profile_id: agentId,
      })
      .select("*, agent_profile:agent_profiles(id, display_name, user_id)")
      .single();

    if (data && !error) {
      setPools(pools.map(pool => {
        if (pool.id === poolId) {
          return {
            ...pool,
            agent_pool_members: [...pool.agent_pool_members, data],
          };
        }
        return pool;
      }));
    }
  };

  const handleRemoveAgentFromPool = async (poolId: string, memberId: string) => {
    const { error } = await supabase.from("agent_pool_members").delete().eq("id", memberId);
    if (!error) {
      setPools(pools.map(pool => {
        if (pool.id === poolId) {
          return {
            ...pool,
            agent_pool_members: pool.agent_pool_members.filter(m => m.id !== memberId),
          };
        }
        return pool;
      }));
    }
  };

  // Path rules management
  const handleAddPathRule = async () => {
    if (!selectedSite || !newRulePath.trim() || !newRulePoolId) return;

    const maxPriority = Math.max(0, ...selectedSite.site_path_rules.map(r => r.priority));

    const { data, error } = await supabase
      .from("site_path_rules")
      .insert({
        site_id: selectedSite.id,
        path_pattern: newRulePath,
        pool_id: newRulePoolId,
        priority: maxPriority + 1,
        is_active: true,
      })
      .select()
      .single();

    if (data && !error) {
      const updatedSite = {
        ...selectedSite,
        site_path_rules: [...selectedSite.site_path_rules, data],
      };
      setSites(sites.map(s => s.id === selectedSite.id ? updatedSite : s));
      setSelectedSite(updatedSite);
      setNewRulePath("");
      setNewRulePoolId("");
      setIsAddingRule(false);
      
      // Sync to signaling server
      syncSiteConfigToServer(updatedSite);
    }
  };

  const handleDeletePathRule = async (ruleId: string) => {
    if (!selectedSite) return;

    const { error } = await supabase.from("site_path_rules").delete().eq("id", ruleId);
    if (!error) {
      const updatedSite = {
        ...selectedSite,
        site_path_rules: selectedSite.site_path_rules.filter(r => r.id !== ruleId),
      };
      setSites(sites.map(s => s.id === selectedSite.id ? updatedSite : s));
      setSelectedSite(updatedSite);
      
      // Sync to signaling server
      syncSiteConfigToServer(updatedSite);
    }
  };

  const handleSetDefaultPool = async (poolId: string) => {
    if (!selectedSite) return;

    const { error } = await supabase
      .from("sites")
      .update({ default_pool_id: poolId })
      .eq("id", selectedSite.id);

    if (!error) {
      const updatedSite = { ...selectedSite, default_pool_id: poolId };
      setSites(sites.map(s => s.id === selectedSite.id ? updatedSite : s));
      setSelectedSite(updatedSite);
      
      // Sync to signaling server
      syncSiteConfigToServer(updatedSite);
    }
  };

  const getAgentsNotInPool = (pool: Pool) => {
    const memberIds = new Set(pool.agent_pool_members.map(m => m.agent_profile_id));
    return agents.filter(a => !memberIds.has(a.id));
  };

  const getPoolName = (poolId: string) => {
    return pools.find(p => p.id === poolId)?.name ?? "Unknown Pool";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Site Setup</h1>
        <p className="text-muted-foreground">
          Configure your embed code, agent pools, and path routing rules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sites List */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Your Sites
              </h2>
              <button
                onClick={() => setIsAddingSite(true)}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isAddingSite && (
              <div className="mb-4 p-4 rounded-xl bg-muted/50 space-y-3">
                <input
                  type="text"
                  placeholder="Site name"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                />
                <input
                  type="text"
                  placeholder="Domain (e.g., example.com)"
                  value={newSiteDomain}
                  onChange={(e) => setNewSiteDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSite}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                  >
                    Add Site
                  </button>
                  <button
                    onClick={() => setIsAddingSite(false)}
                    className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSelectedSite(site)}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    selectedSite?.id === site.id
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/30 hover:bg-muted/50 border-2 border-transparent"
                  }`}
                >
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-muted-foreground">{site.domain}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      site.is_active 
                        ? "bg-green-500/10 text-green-500" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {site.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {site.site_path_rules.length} rule{site.site_path_rules.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))}

              {sites.length === 0 && !isAddingSite && (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No sites yet</p>
                  <button
                    onClick={() => setIsAddingSite(true)}
                    className="mt-2 text-primary hover:underline text-sm"
                  >
                    Add your first site
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Site Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSite ? (
            <>
              {/* Embed Code Section */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Embed Code</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDevEmbed(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        showDevEmbed 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Development
                    </button>
                    <button
                      onClick={() => setShowDevEmbed(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        !showDevEmbed 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Production
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {showDevEmbed ? (
                    <>Use this code for <strong>local testing</strong>. Make sure widget dev server is running on port 5174.</>
                  ) : (
                    <>Add this code to your website's <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">&lt;head&gt;</code> tag for production.</>
                  )}
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-xl bg-[#1a1a2e] text-green-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    {getEmbedCode(selectedSite.id, showDevEmbed)}
                  </pre>
                  <button
                    onClick={copyEmbedCode}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Path Rules Section */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Path Routing Rules</h2>
                  </div>
                  <button
                    onClick={() => setIsAddingRule(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rule
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Route visitors to specific agent pools based on the page they're viewing. 
                  Rules are matched in priority order (highest first).
                </p>

                {/* Default Pool Selector */}
                <div className="mb-4 p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Default Pool</div>
                      <div className="text-xs text-muted-foreground">
                        Used when no path rules match
                      </div>
                    </div>
                    <select
                      value={selectedSite.default_pool_id ?? ""}
                      onChange={(e) => handleSetDefaultPool(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                    >
                      <option value="">No default pool</option>
                      {pools.map((pool) => (
                        <option key={pool.id} value={pool.id}>
                          {pool.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {isAddingRule && (
                  <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Path Pattern</label>
                        <input
                          type="text"
                          placeholder="/pricing*, /faq/*, /blog/**"
                          value={newRulePath}
                          onChange={(e) => setNewRulePath(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Route to Pool</label>
                        <select
                          value={newRulePoolId}
                          onChange={(e) => setNewRulePoolId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                        >
                          <option value="">Select a pool</option>
                          {pools.map((pool) => (
                            <option key={pool.id} value={pool.id}>
                              {pool.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddPathRule}
                        disabled={!newRulePath.trim() || !newRulePoolId}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add Rule
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingRule(false);
                          setNewRulePath("");
                          setNewRulePoolId("");
                        }}
                        className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Rules List */}
                <div className="space-y-2">
                  {selectedSite.site_path_rules
                    .sort((a, b) => b.priority - a.priority)
                    .map((rule, index) => (
                      <div
                        key={rule.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                        <div className="flex-1 flex items-center gap-4">
                          <code className="px-2 py-1 rounded bg-background font-mono text-sm">
                            {rule.path_pattern}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {getPoolName(rule.pool_id)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Priority: {rule.priority}
                        </span>
                        <button
                          onClick={() => handleDeletePathRule(rule.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                  {selectedSite.site_path_rules.length === 0 && !isAddingRule && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No path rules yet. All visitors will use the default pool.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Select a Site</h3>
              <p className="text-muted-foreground">
                Choose a site from the left to configure its embed code and routing rules
              </p>
            </div>
          )}

          {/* Agent Pools Section */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Agent Pools</h2>
              </div>
              <button
                onClick={() => setIsAddingPool(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Pool
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Group agents into pools. Agents can belong to multiple pools. Path rules route visitors to specific pools.
            </p>

            {isAddingPool && (
              <div className="mb-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Pool name (e.g., Sales Team, Support)"
                    value={newPoolName}
                    onChange={(e) => setNewPoolName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleAddPool}
                    disabled={!newPoolName.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingPool(false);
                      setNewPoolName("");
                    }}
                    className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Pools List */}
            <div className="space-y-3">
              {pools.map((pool) => {
                const isExpanded = expandedPools.has(pool.id);
                const availableAgents = getAgentsNotInPool(pool);

                return (
                  <div key={pool.id} className="rounded-xl bg-muted/30 overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => togglePoolExpanded(pool.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pool.name}</span>
                            {pool.is_default && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {pool.agent_pool_members.length} agent{pool.agent_pool_members.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      {!pool.is_default && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePool(pool.id);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Current Members */}
                        <div className="flex flex-wrap gap-2">
                          {pool.agent_pool_members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border"
                            >
                              <span className="text-sm">{member.agent_profile.display_name}</span>
                              <button
                                onClick={() => handleRemoveAgentFromPool(pool.id, member.id)}
                                className="p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {pool.agent_pool_members.length === 0 && (
                            <span className="text-sm text-muted-foreground">No agents in this pool</span>
                          )}
                        </div>

                        {/* Add Agent Dropdown */}
                        {availableAgents.length > 0 && (
                          <div className="flex items-center gap-2">
                            <select
                              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddAgentToPool(pool.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="">+ Add agent to pool...</option>
                              {availableAgents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.display_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {pools.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No pools yet. Create your first pool to start organizing agents.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

