import type {
  AgentState,
  AgentProfile,
  VisitorSession,
  CallRequest,
  ActiveCall,
} from "@ghost-greeter/domain";

/**
 * Path routing rule for mapping URL patterns to agent pools
 */
interface PathRule {
  id: string;
  siteId: string;
  pathPattern: string;
  poolId: string;
  priority: number;
  isActive: boolean;
}

/**
 * Site configuration for routing
 */
interface SiteConfig {
  siteId: string;
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
export class PoolManager {
  private agents: Map<string, AgentState> = new Map();
  private visitors: Map<string, VisitorSession> = new Map();
  private pendingCalls: Map<string, CallRequest> = new Map();
  private activeCalls: Map<string, ActiveCall> = new Map();
  
  // Pool-based routing
  private poolMemberships: Map<string, Set<string>> = new Map(); // poolId -> Set<agentId>
  private agentPools: Map<string, Set<string>> = new Map(); // agentId -> Set<poolId>
  private siteConfigs: Map<string, SiteConfig> = new Map(); // siteId -> config

  // Track assignment order for fair round-robin distribution
  // Uses a monotonically increasing counter to ensure unique ordering
  private assignmentCounter = 0;
  private lastAssignmentOrder: Map<string, number> = new Map(); // agentId -> assignment order

  // ---------------------------------------------------------------------------
  // SITE & POOL CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Load site configuration including path rules
   */
  setSiteConfig(siteId: string, defaultPoolId: string | null, pathRules: PathRule[]): void {
    this.siteConfigs.set(siteId, {
      siteId,
      defaultPoolId,
      pathRules: pathRules.filter(r => r.isActive).sort((a, b) => b.priority - a.priority),
    });
    console.log(`[PoolManager] Site config loaded: ${siteId} with ${pathRules.length} path rules`);
  }

  /**
   * Add an agent to a pool
   */
  addAgentToPool(agentId: string, poolId: string): void {
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

    console.log(`[PoolManager] Agent ${agentId} added to pool ${poolId}`);
  }

  /**
   * Remove an agent from a pool
   */
  removeAgentFromPool(agentId: string, poolId: string): void {
    this.poolMemberships.get(poolId)?.delete(agentId);
    this.agentPools.get(agentId)?.delete(poolId);
  }

  /**
   * Load all pool memberships for an agent (called when agent connects)
   */
  setAgentPoolMemberships(agentId: string, poolIds: string[]): void {
    // Clear existing memberships
    const existingPools = this.agentPools.get(agentId);
    if (existingPools) {
      for (const poolId of existingPools) {
        this.poolMemberships.get(poolId)?.delete(agentId);
      }
    }
    this.agentPools.set(agentId, new Set());

    // Add new memberships
    for (const poolId of poolIds) {
      this.addAgentToPool(agentId, poolId);
    }
  }

  /**
   * Match a URL path to a pool using path rules
   * Returns the matched pool ID or the default pool ID
   */
  matchPathToPool(siteId: string, pageUrl: string): string | null {
    const config = this.siteConfigs.get(siteId);
    if (!config) return null;

    // Extract path from URL
    let path: string;
    try {
      const url = new URL(pageUrl);
      path = url.pathname;
    } catch {
      // If not a valid URL, treat it as a path
      path = pageUrl.startsWith("/") ? pageUrl : `/${pageUrl}`;
    }

    // Check each rule in priority order
    for (const rule of config.pathRules) {
      if (this.matchPathPattern(path, rule.pathPattern)) {
        console.log(`[PoolManager] Path "${path}" matched rule "${rule.pathPattern}" -> pool ${rule.poolId}`);
        return rule.poolId;
      }
    }

    // Fall back to default pool
    console.log(`[PoolManager] Path "${path}" using default pool: ${config.defaultPoolId}`);
    return config.defaultPoolId;
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

  // ---------------------------------------------------------------------------
  // AGENT MANAGEMENT
  // ---------------------------------------------------------------------------

  registerAgent(socketId: string, profile: AgentProfile): AgentState {
    // Check if agent already exists (reconnection scenario)
    const existingAgent = this.agents.get(profile.id);
    
    if (existingAgent) {
      // Agent is reconnecting - update socket ID but preserve state
      console.log(`[PoolManager] Agent reconnecting: ${profile.displayName} (${profile.id}), updating socket ${existingAgent.socketId} -> ${socketId}`);
      existingAgent.socketId = socketId;
      existingAgent.profile = profile;
      return existingAgent;
    }
    
    // New agent registration
    const agentState: AgentState = {
      agentId: profile.id,
      socketId,
      profile,
      currentSimulations: [],
      currentCallVisitorId: null,
      connectedAt: Date.now(),
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

  // ---------------------------------------------------------------------------
  // VISITOR MANAGEMENT
  // ---------------------------------------------------------------------------

  registerVisitor(
    socketId: string,
    visitorId: string,
    siteId: string,
    pageUrl: string
  ): VisitorSession {
    const session: VisitorSession = {
      visitorId,
      socketId,
      assignedAgentId: null,
      state: "browsing",
      siteId,
      pageUrl,
      connectedAt: Date.now(),
      interactedAt: null,
    };
    
    this.visitors.set(visitorId, session);
    console.log(`[PoolManager] Visitor registered: ${visitorId}`);
    return session;
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
  // AGENT ASSIGNMENT (Elastic Pooling)
  // ---------------------------------------------------------------------------

  /**
   * Find the best available agent using "least connections" algorithm
   * Priority: idle agents (fair round-robin by oldest assignment order) > agents with fewer simulations
   * 
   * @param poolId - Optional pool ID to restrict search to a specific pool
   */
  findBestAgent(poolId?: string | null): AgentState | undefined {
    let bestAgent: AgentState | undefined;
    let lowestLoad = Infinity;
    let oldestOrder = Infinity;

    // Get candidate agents - either from a specific pool or all agents
    const candidates = poolId 
      ? this.getAgentsInPool(poolId)
      : Array.from(this.agents.values());

    for (const agent of candidates) {
      // Skip agents in call or offline
      if (agent.profile.status === "in_call" || agent.profile.status === "offline") {
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
   * Find the best agent for a visitor based on their site and page URL
   * Uses path-based routing to determine the appropriate pool
   */
  findBestAgentForVisitor(siteId: string, pageUrl: string): AgentState | undefined {
    // First, try to find an agent in the matched pool
    const poolId = this.matchPathToPool(siteId, pageUrl);
    
    if (poolId) {
      const agent = this.findBestAgent(poolId);
      if (agent) {
        console.log(`[PoolManager] Found agent ${agent.profile.displayName} in pool ${poolId} for ${pageUrl}`);
        return agent;
      }
      console.log(`[PoolManager] No available agent in pool ${poolId}, falling back to any agent`);
    }

    // Fallback: find any available agent
    return this.findBestAgent();
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
      const newAgent = this.findBestAgent();
      if (newAgent && newAgent.agentId !== fromAgentId) {
        this.assignVisitorToAgent(visitorId, newAgent.agentId);
        reassigned.set(visitorId, newAgent.agentId);
      } else {
        // No agent available - mark visitor as unassigned
        const visitor = this.visitors.get(visitorId);
        if (visitor) {
          visitor.assignedAgentId = null;
          unassigned.push(visitorId);
        }
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

  createCallRequest(visitorId: string, agentId: string, siteId: string, pageUrl: string): CallRequest {
    const requestId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const request: CallRequest = {
      requestId,
      visitorId,
      agentId,
      siteId,
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
}

