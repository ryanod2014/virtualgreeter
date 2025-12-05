import type {
  AgentState,
  AgentProfile,
  VisitorSession,
  VisitorLocation,
  CallRequest,
  ActiveCall,
} from "@ghost-greeter/domain";

/**
 * Rule condition types for flexible matching
 */
type RuleMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
type RuleConditionType = "domain" | "path" | "query_param";

interface RuleCondition {
  type: RuleConditionType;
  matchType: RuleMatchType;
  value: string;
  paramName?: string; // For query_param type
}


/**
 * Path routing rule for mapping URL patterns to agent pools
 */
interface PathRule {
  id: string;
  orgId: string;
  pathPattern: string;
  domainPattern: string;
  conditions: RuleCondition[];
  poolId: string;
  priority: number;
  isActive: boolean;
}

/**
 * Organization configuration for routing
 */
interface OrgConfig {
  orgId: string;
  defaultPoolId: string | null;
  pathRules: PathRule[];
}

/**
 * PoolManager - Handles agent/visitor routing and elastic pooling
 * 
 * Key responsibilities:
 * - Track connected agents and their states
 * - Track visitors and their assigned agents
 * - Implement path-based routing to agent pools
 * - Implement "least connections" algorithm for agent assignment within pools
 * - Handle re-assignment when agents become unavailable
 */
/**
 * Pool membership with priority rank for tiered routing
 */
interface PoolMembership {
  poolId: string;
  priorityRank: number; // Lower = higher priority (1 = primary, 2+ = overflow)
}

export class PoolManager {
  private agents: Map<string, AgentState> = new Map();
  private visitors: Map<string, VisitorSession> = new Map();
  private pendingCalls: Map<string, CallRequest> = new Map();
  private activeCalls: Map<string, ActiveCall> = new Map();
  
  // Pool-based routing
  private poolMemberships: Map<string, Set<string>> = new Map(); // poolId -> Set<agentId>
  private agentPools: Map<string, Set<string>> = new Map(); // agentId -> Set<poolId>
  private orgConfigs: Map<string, OrgConfig> = new Map(); // orgId -> config
  
  // Priority-based routing: tracks agent priority within each pool
  // Structure: agentId -> (poolId -> priorityRank)
  private agentPoolPriorities: Map<string, Map<string, number>> = new Map();

  // Track assignment order for fair round-robin distribution
  // Uses a monotonically increasing counter to ensure unique ordering
  private assignmentCounter = 0;
  private lastAssignmentOrder: Map<string, number> = new Map(); // agentId -> assignment order

  // ---------------------------------------------------------------------------
  // ORGANIZATION & POOL CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Load organization configuration including path rules
   */
  setOrgConfig(orgId: string, defaultPoolId: string | null, pathRules: PathRule[]): void {
    this.orgConfigs.set(orgId, {
      orgId,
      defaultPoolId,
      pathRules: pathRules.filter(r => r.isActive).sort((a, b) => b.priority - a.priority),
    });
    console.log(`[PoolManager] Org config loaded: ${orgId} with ${pathRules.length} path rules`);
  }

  /**
   * Add an agent to a pool with a priority rank
   * @param priorityRank - Lower number = higher priority (1 = primary, 2+ = overflow). Default: 1
   */
  addAgentToPool(agentId: string, poolId: string, priorityRank: number = 1): void {
    // Add to pool -> agents mapping
    if (!this.poolMemberships.has(poolId)) {
      this.poolMemberships.set(poolId, new Set());
    }
    this.poolMemberships.get(poolId)!.add(agentId);

    // Add to agent -> pools mapping
    if (!this.agentPools.has(agentId)) {
      this.agentPools.set(agentId, new Set());
    }
    this.agentPools.get(agentId)!.add(poolId);
    
    // Track priority rank for this agent in this pool
    if (!this.agentPoolPriorities.has(agentId)) {
      this.agentPoolPriorities.set(agentId, new Map());
    }
    this.agentPoolPriorities.get(agentId)!.set(poolId, priorityRank);

    console.log(`[PoolManager] Agent ${agentId} added to pool ${poolId} with priority ${priorityRank}`);
  }

  /**
   * Remove an agent from a pool
   */
  removeAgentFromPool(agentId: string, poolId: string): void {
    this.poolMemberships.get(poolId)?.delete(agentId);
    this.agentPools.get(agentId)?.delete(poolId);
    this.agentPoolPriorities.get(agentId)?.delete(poolId);
  }

  /**
   * Load all pool memberships for an agent with their priority ranks (called when agent connects)
   * @param memberships - Array of {poolId, priorityRank} objects
   */
  setAgentPoolMemberships(agentId: string, memberships: PoolMembership[]): void {
    // Clear existing memberships
    const existingPools = this.agentPools.get(agentId);
    if (existingPools) {
      for (const poolId of existingPools) {
        this.poolMemberships.get(poolId)?.delete(agentId);
      }
    }
    this.agentPools.set(agentId, new Set());
    this.agentPoolPriorities.set(agentId, new Map());

    // Add new memberships with priority ranks
    for (const { poolId, priorityRank } of memberships) {
      this.addAgentToPool(agentId, poolId, priorityRank);
    }
  }
  
  /**
   * Get an agent's priority rank within a specific pool
   * Returns 1 (highest priority) if not explicitly set
   */
  getAgentPriorityInPool(agentId: string, poolId: string): number {
    return this.agentPoolPriorities.get(agentId)?.get(poolId) ?? 1;
  }

  /**
   * Match a URL path to a pool using path rules
   * Returns the matched pool ID or the default pool ID
   */
  matchPathToPool(orgId: string, pageUrl: string): string | null {
    const config = this.orgConfigs.get(orgId);
    if (!config) return null;

    // Parse URL components
    const urlContext = this.parseUrlContext(pageUrl);

    // Check each rule in priority order (rules are ORed - first match wins)
    for (const rule of config.pathRules) {
      // Use conditions if available (AND logic within a rule)
      if (rule.conditions && rule.conditions.length > 0) {
        if (this.matchConditions(urlContext, rule.conditions)) {
          console.log(`[PoolManager] URL "${pageUrl}" matched conditions -> pool ${rule.poolId}`);
          return rule.poolId;
        }
      } 
      // Fallback to legacy pattern matching
      else {
        const domainMatches = rule.domainPattern === "*" || 
          this.matchDomainPattern(urlContext.domain, rule.domainPattern);
        const pathMatches = this.matchPathPattern(urlContext.path, rule.pathPattern);
        
        if (domainMatches && pathMatches) {
          console.log(`[PoolManager] Path "${urlContext.path}" matched rule "${rule.pathPattern}" -> pool ${rule.poolId}`);
          return rule.poolId;
        }
      }
    }

    // Fall back to default pool
    console.log(`[PoolManager] URL "${pageUrl}" using default pool: ${config.defaultPoolId}`);
    return config.defaultPoolId;
  }

  /**
   * Parse URL into components for matching
   */
  private parseUrlContext(pageUrl: string): { domain: string; path: string; queryParams: Map<string, string> } {
    let domain = "";
    let path = "/";
    const queryParams = new Map<string, string>();

    try {
      const url = new URL(pageUrl);
      domain = url.hostname;
      path = url.pathname;
      
      // Parse query parameters
      url.searchParams.forEach((value, key) => {
        queryParams.set(key.toLowerCase(), value);
      });
    } catch {
      // If not a valid URL, treat it as a path
      path = pageUrl.startsWith("/") ? pageUrl : `/${pageUrl}`;
      
      // Try to extract query params from path
      const queryIndex = path.indexOf("?");
      if (queryIndex !== -1) {
        const queryString = path.substring(queryIndex + 1);
        path = path.substring(0, queryIndex);
        
        queryString.split("&").forEach(param => {
          const [key, value] = param.split("=");
          if (key) {
            queryParams.set(key.toLowerCase(), value || "");
          }
        });
      }
    }

    return { domain, path, queryParams };
  }

  /**
   * Match conditions against URL context (all conditions must match - AND logic)
   */
  private matchConditions(urlContext: { domain: string; path: string; queryParams: Map<string, string> }, conditions: RuleCondition[]): boolean {
    // All conditions must match (AND logic)
    return conditions.every(condition => this.matchCondition(urlContext, condition));
  }

  /**
   * Match a single condition against URL context
   */
  private matchCondition(urlContext: { domain: string; path: string; queryParams: Map<string, string> }, condition: RuleCondition): boolean {
    let testValue: string;
    
    switch (condition.type) {
      case "domain":
        testValue = urlContext.domain;
        break;
      case "path":
        testValue = urlContext.path;
        break;
      case "query_param":
        // For query params, we need to get the specific parameter value
        const paramName = condition.paramName?.toLowerCase() || "";
        testValue = urlContext.queryParams.get(paramName) || "";
        
        // Special case: if checking "contains" or "is_exactly" and param doesn't exist, it's a non-match
        if (!urlContext.queryParams.has(paramName) && condition.matchType !== "does_not_contain") {
          return false;
        }
        break;
      default:
        return false;
    }

    const normalizedValue = testValue.toLowerCase();
    const normalizedConditionValue = condition.value.toLowerCase();

    switch (condition.matchType) {
      case "is_exactly":
        return normalizedValue === normalizedConditionValue;
      case "contains":
        return normalizedValue.includes(normalizedConditionValue);
      case "does_not_contain":
        return !normalizedValue.includes(normalizedConditionValue);
      case "starts_with":
        return normalizedValue.startsWith(normalizedConditionValue);
      case "ends_with":
        return normalizedValue.endsWith(normalizedConditionValue);
      default:
        return false;
    }
  }

  /**
   * Match a domain against a pattern (legacy support)
   */
  private matchDomainPattern(domain: string, pattern: string): boolean {
    if (pattern === "*") return true;
    
    domain = domain.toLowerCase();
    pattern = pattern.toLowerCase();

    // Exact match
    if (pattern === domain) return true;

    // Wildcard subdomain matching (*.example.com)
    if (pattern.startsWith("*.")) {
      const baseDomain = pattern.slice(2);
      return domain === baseDomain || domain.endsWith("." + baseDomain);
    }

    // Contains matching
    return domain.includes(pattern);
  }

  /**
   * Match a path against a pattern
   * Supports: /path, /path*, /path/*, /path/**
   */
  private matchPathPattern(path: string, pattern: string): boolean {
    // Normalize paths
    path = path.replace(/\/+$/, "") || "/";
    pattern = pattern.replace(/\/+$/, "") || "/";

    // Exact match
    if (pattern === path) return true;

    // Wildcard patterns
    if (pattern.endsWith("/**")) {
      // Match path and all descendants
      const prefix = pattern.slice(0, -3);
      return path === prefix || path.startsWith(prefix + "/");
    }

    if (pattern.endsWith("/*")) {
      // Match direct children only
      const prefix = pattern.slice(0, -2);
      if (!path.startsWith(prefix + "/")) return false;
      const remainder = path.slice(prefix.length + 1);
      return !remainder.includes("/");
    }

    if (pattern.endsWith("*")) {
      // Match prefix
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }

    return false;
  }

  /**
   * Get agents in a specific pool
   */
  getAgentsInPool(poolId: string): AgentState[] {
    const agentIds = this.poolMemberships.get(poolId);
    if (!agentIds) return [];

    const agents: AgentState[] = [];
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (agent) agents.push(agent);
    }
    return agents;
  }

  /**
   * Get the primary pool for an agent (first pool they belong to)
   * Used for analytics tracking
   */
  getAgentPrimaryPool(agentId: string): string | null {
    const poolIds = this.agentPools.get(agentId);
    if (!poolIds || poolIds.size === 0) return null;
    return [...poolIds][0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // AGENT MANAGEMENT
  // ---------------------------------------------------------------------------

  registerAgent(socketId: string, profile: AgentProfile): AgentState {
    // Check if agent already exists (reconnection scenario)
    const existingAgent = this.agents.get(profile.id);
    
    if (existingAgent) {
      // Agent is reconnecting - update socket ID and profile
      // The profile.status passed in should already have the correct value
      // (either from pendingDisconnects for quick reconnects, or "idle" for new sessions)
      console.log(`[PoolManager] Agent reconnecting: ${profile.displayName} (${profile.id}), updating socket ${existingAgent.socketId} -> ${socketId}, status: ${profile.status}`);
      existingAgent.socketId = socketId;
      existingAgent.profile = profile;
      existingAgent.lastActivityAt = Date.now(); // Reset activity on reconnect
      return existingAgent;
    }
    
    // New agent registration
    const now = Date.now();
    const agentState: AgentState = {
      agentId: profile.id,
      socketId,
      profile,
      currentSimulations: [],
      currentCallVisitorId: null,
      connectedAt: now,
      lastActivityAt: now,
    };
    
    this.agents.set(profile.id, agentState);
    console.log(`[PoolManager] Agent registered: ${profile.displayName} (${profile.id})`);
    return agentState;
  }

  unregisterAgent(agentId: string): string[] {
    const agent = this.agents.get(agentId);
    if (!agent) return [];

    // Get all visitors watching this agent's simulation
    const affectedVisitorIds = [...agent.currentSimulations];
    
    this.agents.delete(agentId);
    console.log(`[PoolManager] Agent unregistered: ${agentId}`);
    
    return affectedVisitorIds;
  }

  getAgent(agentId: string): AgentState | undefined {
    return this.agents.get(agentId);
  }

  getAgentBySocketId(socketId: string): AgentState | undefined {
    for (const agent of this.agents.values()) {
      if (agent.socketId === socketId) return agent;
    }
    return undefined;
  }

  updateAgentStatus(agentId: string, status: AgentProfile["status"]): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.profile.status = status;
    }
  }

  setAgentInCall(agentId: string, visitorId: string | null): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentCallVisitorId = visitorId;
      agent.profile.status = visitorId ? "in_call" : "idle";
    }
  }

  /**
   * Update agent's last activity timestamp (called on heartbeat)
   */
  updateAgentActivity(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastActivityAt = Date.now();
    }
  }

  /**
   * Get all agents whose last activity is older than the threshold
   * Only returns agents who are currently "idle" (not in call, not already away)
   * @param threshold Time in milliseconds since last activity
   */
  getStaleAgents(threshold: number): AgentState[] {
    const now = Date.now();
    const staleAgents: AgentState[] = [];
    
    for (const agent of this.agents.values()) {
      // Only check idle agents - don't mark agents as stale if they're in a call or already away
      if (agent.profile.status === "idle") {
        const timeSinceActivity = now - agent.lastActivityAt;
        if (timeSinceActivity > threshold) {
          staleAgents.push(agent);
        }
      }
    }
    
    return staleAgents;
  }

  // ---------------------------------------------------------------------------
  // VISITOR MANAGEMENT
  // ---------------------------------------------------------------------------

  registerVisitor(
    socketId: string,
    visitorId: string,
    orgId: string,
    pageUrl: string,
    ipAddress: string | null = null,
    location: VisitorLocation | null = null
  ): VisitorSession {
    const session: VisitorSession = {
      visitorId,
      socketId,
      assignedAgentId: null,
      state: "browsing",
      orgId,
      pageUrl,
      connectedAt: Date.now(),
      interactedAt: null,
      ipAddress,
      location,
    };
    
    this.visitors.set(visitorId, session);
    console.log(`[PoolManager] Visitor registered: ${visitorId}${location ? ` from ${location.city}, ${location.region}` : ""}`);
    return session;
  }

  /**
   * Update visitor's location (called after async geolocation lookup)
   */
  updateVisitorLocation(visitorId: string, location: VisitorLocation | null): void {
    const visitor = this.visitors.get(visitorId);
    if (visitor) {
      visitor.location = location;
    }
  }

  unregisterVisitor(visitorId: string): void {
    const visitor = this.visitors.get(visitorId);
    if (visitor?.assignedAgentId) {
      this.removeVisitorFromAgent(visitor.assignedAgentId, visitorId);
    }
    this.visitors.delete(visitorId);
    console.log(`[PoolManager] Visitor unregistered: ${visitorId}`);
  }

  getVisitor(visitorId: string): VisitorSession | undefined {
    return this.visitors.get(visitorId);
  }

  getVisitorBySocketId(socketId: string): VisitorSession | undefined {
    for (const visitor of this.visitors.values()) {
      if (visitor.socketId === socketId) return visitor;
    }
    return undefined;
  }

  /**
   * Get all visitors who haven't been assigned to an agent yet
   * These are visitors waiting for an agent to become available
   */
  getUnassignedVisitors(): VisitorSession[] {
    const unassigned: VisitorSession[] = [];
    for (const visitor of this.visitors.values()) {
      if (!visitor.assignedAgentId) {
        unassigned.push(visitor);
      }
    }
    return unassigned;
  }

  updateVisitorState(visitorId: string, state: VisitorSession["state"]): void {
    const visitor = this.visitors.get(visitorId);
    if (visitor) {
      visitor.state = state;
      if (state === "watching_simulation" && !visitor.interactedAt) {
        visitor.interactedAt = Date.now();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // AGENT ASSIGNMENT (Tiered Routing with Elastic Pooling)
  // ---------------------------------------------------------------------------

  /**
   * Find the best available agent using tiered routing algorithm
   * 
   * Tiered Routing Logic:
   * 1. Group agents by priority rank (lower rank = higher priority)
   * 2. Try each tier in order (tier 1 first, then tier 2, etc.)
   * 3. Within each tier: use round-robin for idle agents, then least-connections
   * 4. Only move to next tier if all agents in current tier are at capacity
   * 
   * This allows senior reps to get leads first while junior reps provide overflow coverage.
   * 
   * @param poolId - Optional pool ID to restrict search to a specific pool
   * @param excludeAgentId - Optional agent ID to exclude from consideration (used when re-routing after rejection)
   */
  findBestAgent(poolId?: string | null, excludeAgentId?: string): AgentState | undefined {
    // Get candidate agents - either from a specific pool or all agents
    let candidates = poolId 
      ? this.getAgentsInPool(poolId)
      : Array.from(this.agents.values());

    // Filter out excluded agent if specified
    if (excludeAgentId) {
      candidates = candidates.filter(a => a.agentId !== excludeAgentId);
    }

    // If no pool specified (fallback case), use original algorithm without tiering
    if (!poolId) {
      return this.findBestAgentInTier(candidates);
    }

    // Group agents by priority rank for tiered routing
    const tiers = new Map<number, AgentState[]>();
    for (const agent of candidates) {
      const priorityRank = this.getAgentPriorityInPool(agent.agentId, poolId);
      if (!tiers.has(priorityRank)) {
        tiers.set(priorityRank, []);
      }
      tiers.get(priorityRank)!.push(agent);
    }

    // Sort tiers by priority rank (lower = higher priority)
    const sortedTierRanks = [...tiers.keys()].sort((a, b) => a - b);

    // Try each tier in order
    for (const tierRank of sortedTierRanks) {
      const tierAgents = tiers.get(tierRank)!;
      
      // Check if anyone in this tier has capacity
      const availableAgent = this.findBestAgentInTier(tierAgents);
      
      if (availableAgent) {
        console.log(`[PoolManager] Found agent ${availableAgent.profile.displayName} in tier ${tierRank}`);
        return availableAgent;
      }
      
      // All agents in this tier are at capacity, try next tier
      console.log(`[PoolManager] Tier ${tierRank} at capacity, trying next tier...`);
    }

    // No agent available in any tier
    return undefined;
  }

  /**
   * Find the best agent within a single tier using round-robin + least-connections
   * This is the original algorithm, now applied per-tier
   */
  private findBestAgentInTier(tierAgents: AgentState[]): AgentState | undefined {
    let bestAgent: AgentState | undefined;
    let lowestLoad = Infinity;
    let oldestOrder = Infinity;

    for (const agent of tierAgents) {
      // Skip agents in call, offline, or away
      if (agent.profile.status === "in_call" || agent.profile.status === "offline" || agent.profile.status === "away") {
        continue;
      }

      // Check if agent has capacity
      const currentLoad = agent.currentSimulations.length;
      if (currentLoad >= agent.profile.maxSimultaneousSimulations) {
        continue;
      }

      // Get assignment order (0 means never assigned - highest priority)
      const assignmentOrder = this.lastAssignmentOrder.get(agent.agentId) ?? 0;

      // For idle agents with 0 load, use fair round-robin (pick oldest assignment order)
      if (agent.profile.status === "idle" && currentLoad === 0) {
        if (assignmentOrder < oldestOrder) {
          oldestOrder = assignmentOrder;
          bestAgent = agent;
        }
        continue; // Keep looking for potentially older assignments
      }

      // Otherwise, pick agent with lowest load
      if (currentLoad < lowestLoad) {
        lowestLoad = currentLoad;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * Find the best agent for a visitor based on their org and page URL
   * Uses path-based routing to determine the appropriate pool
   * Returns the agent and the matched pool ID (for widget settings lookup)
   * 
   * @param orgId - Organization ID
   * @param pageUrl - Page URL for routing
   * @param excludeAgentId - Optional agent ID to exclude (used when re-routing after rejection)
   */
  findBestAgentForVisitor(orgId: string, pageUrl: string, excludeAgentId?: string): { agent: AgentState; poolId: string | null } | undefined {
    // First, try to find an agent in the matched pool
    const poolId = this.matchPathToPool(orgId, pageUrl);
    
    if (poolId) {
      const agent = this.findBestAgent(poolId, excludeAgentId);
      if (agent) {
        console.log(`[PoolManager] Found agent ${agent.profile.displayName} in pool ${poolId} for ${pageUrl}`);
        return { agent, poolId };
      }
      console.log(`[PoolManager] No available agent in pool ${poolId}, falling back to any agent`);
    }

    // Fallback: find any available agent (no specific pool)
    const fallbackAgent = this.findBestAgent(null, excludeAgentId);
    if (fallbackAgent) {
      return { agent: fallbackAgent, poolId: null };
    }
    
    return undefined;
  }

  /**
   * Assign a visitor to an agent for simulation
   */
  assignVisitorToAgent(visitorId: string, agentId: string): boolean {
    const visitor = this.visitors.get(visitorId);
    const agent = this.agents.get(agentId);

    if (!visitor || !agent) return false;

    // Remove from previous agent if any
    if (visitor.assignedAgentId && visitor.assignedAgentId !== agentId) {
      this.removeVisitorFromAgent(visitor.assignedAgentId, visitorId);
    }

    // Assign to new agent
    visitor.assignedAgentId = agentId;
    visitor.state = "watching_simulation";
    agent.currentSimulations.push(visitorId);

    // Track assignment order for fair round-robin distribution
    this.assignmentCounter++;
    this.lastAssignmentOrder.set(agentId, this.assignmentCounter);
    
    // Update agent status if this is their first simulation
    if (agent.currentSimulations.length === 1 && agent.profile.status === "idle") {
      agent.profile.status = "in_simulation";
    }

    console.log(
      `[PoolManager] Assigned visitor ${visitorId} to agent ${agent.profile.displayName} ` +
      `(${agent.currentSimulations.length} simulations)`
    );
    
    return true;
  }

  /**
   * Remove a visitor from an agent's simulation pool
   */
  removeVisitorFromAgent(agentId: string, visitorId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.currentSimulations = agent.currentSimulations.filter(id => id !== visitorId);
    
    // Update agent status if no more simulations
    if (agent.currentSimulations.length === 0 && agent.profile.status === "in_simulation") {
      agent.profile.status = "idle";
    }
  }

  /**
   * Re-assign all visitors from one agent to another
   * Used when an agent becomes unavailable (goes into a call or disconnects)
   * Returns: { reassigned: Map<visitorId, newAgentId>, unassigned: visitorId[] }
   */
  reassignVisitors(fromAgentId: string, excludeVisitorId?: string): { 
    reassigned: Map<string, string>; 
    unassigned: string[];
  } {
    const reassigned = new Map<string, string>();
    const unassigned: string[] = [];
    const fromAgent = this.agents.get(fromAgentId);
    
    if (!fromAgent) return { reassigned, unassigned };

    const visitorsToReassign = fromAgent.currentSimulations.filter(
      id => id !== excludeVisitorId
    );

    for (const visitorId of visitorsToReassign) {
      const visitor = this.visitors.get(visitorId);
      if (!visitor) {
        continue;
      }

      // Get the visitor's pool based on their org and page URL
      const poolId = this.matchPathToPool(visitor.orgId, visitor.pageUrl);
      
      // Find best agent within the same pool (pass fromAgentId as excludeAgentId)
      const newAgent = this.findBestAgent(poolId, fromAgentId);
      
      if (newAgent) {
        this.assignVisitorToAgent(visitorId, newAgent.agentId);
        reassigned.set(visitorId, newAgent.agentId);
      } else {
        // No agent available in pool - do NOT fall back to cross-pool assignment
        if (poolId) {
          console.warn(
            `[PoolManager] No available agents in pool ${poolId} for visitor ${visitorId}. ` +
            `Visitor will be unassigned (no cross-pool reassignment).`
          );
        }
        visitor.assignedAgentId = null;
        unassigned.push(visitorId);
      }
    }

    // Remove visitors from the old agent's simulation list
    fromAgent.currentSimulations = fromAgent.currentSimulations.filter(
      id => id === excludeVisitorId
    );

    console.log(
      `[PoolManager] Reassigned ${reassigned.size} visitors, ${unassigned.length} now waiting for agent`
    );
    
    return { reassigned, unassigned };
  }

  // ---------------------------------------------------------------------------
  // CALL MANAGEMENT
  // ---------------------------------------------------------------------------

  createCallRequest(visitorId: string, agentId: string, orgId: string, pageUrl: string): CallRequest {
    const requestId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const request: CallRequest = {
      requestId,
      visitorId,
      agentId,
      orgId,
      pageUrl,
      requestedAt: Date.now(),
    };
    
    this.pendingCalls.set(requestId, request);
    
    // Update visitor state
    this.updateVisitorState(visitorId, "call_requested");
    
    return request;
  }

  getCallRequest(requestId: string): CallRequest | undefined {
    return this.pendingCalls.get(requestId);
  }

  acceptCall(requestId: string): ActiveCall | undefined {
    const request = this.pendingCalls.get(requestId);
    if (!request) return undefined;

    const callId = `active_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const activeCall: ActiveCall = {
      callId,
      visitorId: request.visitorId,
      agentId: request.agentId,
      startedAt: Date.now(),
      endedAt: null,
    };

    this.activeCalls.set(callId, activeCall);
    this.pendingCalls.delete(requestId);

    // Update states
    this.updateVisitorState(request.visitorId, "in_call");
    this.setAgentInCall(request.agentId, request.visitorId);

    return activeCall;
  }

  rejectCall(requestId: string): void {
    const request = this.pendingCalls.get(requestId);
    if (request) {
      // Don't reset visitor state - they stay in "call_requested" waiting for agent
      // Only remove this specific pending request
      this.pendingCalls.delete(requestId);
    }
  }

  cancelCall(requestId: string): CallRequest | undefined {
    const request = this.pendingCalls.get(requestId);
    if (request) {
      this.updateVisitorState(request.visitorId, "watching_simulation");
      this.pendingCalls.delete(requestId);
    }
    return request;
  }

  endCall(callId: string): ActiveCall | undefined {
    const call = this.activeCalls.get(callId);
    if (!call) return undefined;

    call.endedAt = Date.now();
    
    // Update states
    this.updateVisitorState(call.visitorId, "browsing");
    this.setAgentInCall(call.agentId, null);
    
    this.activeCalls.delete(callId);
    
    return call;
  }

  getActiveCall(callId: string): ActiveCall | undefined {
    return this.activeCalls.get(callId);
  }

  getActiveCallByVisitorId(visitorId: string): ActiveCall | undefined {
    for (const call of this.activeCalls.values()) {
      if (call.visitorId === visitorId) return call;
    }
    return undefined;
  }

  getActiveCallByAgentId(agentId: string): ActiveCall | undefined {
    for (const call of this.activeCalls.values()) {
      if (call.agentId === agentId) return call;
    }
    return undefined;
  }

  /**
   * Reconnect a visitor to an existing call (after page navigation)
   * This re-establishes the call state without going through the request flow
   */
  reconnectVisitorToCall(visitorId: string, agentId: string, callId: string): ActiveCall | undefined {
    const visitor = this.visitors.get(visitorId);
    const agent = this.agents.get(agentId);
    
    if (!visitor || !agent) {
      console.warn(`[PoolManager] Cannot reconnect - visitor or agent not found`);
      return undefined;
    }

    // Remove any existing active call for this agent (the old one before page nav)
    const existingCall = this.getActiveCallByAgentId(agentId);
    if (existingCall) {
      this.activeCalls.delete(existingCall.callId);
    }

    // Create new active call
    const activeCall: ActiveCall = {
      callId,
      visitorId,
      agentId,
      startedAt: existingCall?.startedAt ?? Date.now(),
      endedAt: null,
    };

    this.activeCalls.set(callId, activeCall);
    
    // Update visitor state
    visitor.assignedAgentId = agentId;
    this.updateVisitorState(visitorId, "in_call");
    
    // Ensure agent is marked as in_call
    this.setAgentInCall(agentId, visitorId);
    
    console.log(`[PoolManager] Visitor ${visitorId} reconnected to call ${callId} with agent ${agentId}`);
    return activeCall;
  }

  /**
   * Get the next waiting call request for an agent (FIFO order)
   * Used to notify agent of waiting visitors when they become available
   */
  getNextWaitingRequest(agentId: string): CallRequest | undefined {
    let oldestRequest: CallRequest | undefined;
    let oldestTime = Infinity;

    for (const request of this.pendingCalls.values()) {
      if (request.agentId === agentId && request.requestedAt < oldestTime) {
        oldestRequest = request;
        oldestTime = request.requestedAt;
      }
    }

    return oldestRequest;
  }

  /**
   * Get all waiting call requests for an agent
   */
  getWaitingRequestsForAgent(agentId: string): CallRequest[] {
    const requests: CallRequest[] = [];
    for (const request of this.pendingCalls.values()) {
      if (request.agentId === agentId) {
        requests.push(request);
      }
    }
    // Sort by oldest first
    return requests.sort((a, b) => a.requestedAt - b.requestedAt);
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------

  getAgentStats(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    // Count all visitors in the pools this agent belongs to
    const agentPoolIds = this.agentPools.get(agentId);
    let poolVisitors = 0;
    
    if (agentPoolIds && agentPoolIds.size > 0) {
      // Get all agents in the same pools
      const poolAgentIds = new Set<string>();
      for (const poolId of agentPoolIds) {
        const agentsInPool = this.poolMemberships.get(poolId);
        if (agentsInPool) {
          for (const aid of agentsInPool) {
            poolAgentIds.add(aid);
          }
        }
      }
      
      // Count visitors assigned to any agent in these pools
      for (const aid of poolAgentIds) {
        const poolAgent = this.agents.get(aid);
        if (poolAgent) {
          poolVisitors += poolAgent.currentSimulations.length;
        }
      }
    } else {
      // No pool memberships - just count this agent's visitors
      poolVisitors = agent.currentSimulations.length;
    }

    return {
      poolVisitors,
    };
  }

  getGlobalStats() {
    let totalAgents = 0;
    let onlineAgents = 0;
    let totalSimulations = 0;
    let activeCallsCount = 0;

    for (const agent of this.agents.values()) {
      totalAgents++;
      if (agent.profile.status !== "offline") {
        onlineAgents++;
        totalSimulations += agent.currentSimulations.length;
      }
      if (agent.currentCallVisitorId) {
        activeCallsCount++;
      }
    }

    return {
      totalAgents,
      onlineAgents,
      totalSimulations,
      totalVisitors: this.visitors.size,
      activeCalls: activeCallsCount,
    };
  }

  /**
   * Get extended stats for metrics endpoint
   * Provides detailed breakdown by pool and pending calls
   */
  getExtendedStats() {
    // Count agents by pool
    const agentsByPool: Record<string, number> = {};
    for (const [poolId, agentIds] of this.poolMemberships.entries()) {
      // Only count online agents in each pool
      let onlineCount = 0;
      for (const agentId of agentIds) {
        const agent = this.agents.get(agentId);
        if (agent && agent.profile.status !== "offline") {
          onlineCount++;
        }
      }
      if (onlineCount > 0) {
        agentsByPool[poolId] = onlineCount;
      }
    }

    return {
      pendingCalls: this.pendingCalls.size,
      poolCount: this.poolMemberships.size,
      agentsByPool,
      orgConfigCount: this.orgConfigs.size,
    };
  }
}

