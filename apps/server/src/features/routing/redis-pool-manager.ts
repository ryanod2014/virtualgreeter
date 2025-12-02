/**
 * RedisPoolManager - Redis-backed implementation of PoolManager
 * 
 * Replaces all in-memory Maps with Redis for:
 * - Horizontal scaling (multiple server instances)
 * - Zero-downtime deploys (state survives server restarts)
 * - Distributed state management
 * 
 * All methods are async since Redis operations return Promises.
 */

import type {
  AgentState,
  AgentProfile,
  VisitorSession,
  VisitorLocation,
  CallRequest,
  ActiveCall,
} from "@ghost-greeter/domain";
import { getRedisClient, REDIS_KEYS, REDIS_TTL } from "../../lib/redis.js";

/**
 * Rule condition types for flexible matching
 */
type RuleMatchType = "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with";
type RuleConditionType = "domain" | "path" | "query_param";

interface RuleCondition {
  type: RuleConditionType;
  matchType: RuleMatchType;
  value: string;
  paramName?: string;
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
 * Pool membership with priority rank for tiered routing
 */
interface PoolMembership {
  poolId: string;
  priorityRank: number;
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/**
 * Serialize an object for Redis storage
 */
function serialize<T>(obj: T): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === null) {
      result[key] = "null";
    } else if (value === undefined) {
      result[key] = "undefined";
    } else if (typeof value === "object") {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Deserialize agent state from Redis
 */
function deserializeAgent(data: Record<string, string>): AgentState | null {
  if (!data || Object.keys(data).length === 0) return null;
  
  return {
    agentId: data["agentId"] ?? "",
    socketId: data["socketId"] ?? "",
    profile: JSON.parse(data["profile"] ?? "{}") as AgentProfile,
    currentSimulations: JSON.parse(data["currentSimulations"] ?? "[]") as string[],
    currentCallVisitorId: data["currentCallVisitorId"] === "null" ? null : data["currentCallVisitorId"] ?? null,
    connectedAt: parseInt(data["connectedAt"] ?? "0", 10),
    lastActivityAt: parseInt(data["lastActivityAt"] ?? "0", 10),
  };
}

/**
 * Deserialize visitor session from Redis
 */
function deserializeVisitor(data: Record<string, string>): VisitorSession | null {
  if (!data || Object.keys(data).length === 0) return null;
  
  return {
    visitorId: data["visitorId"] ?? "",
    socketId: data["socketId"] ?? "",
    assignedAgentId: data["assignedAgentId"] === "null" ? null : data["assignedAgentId"] ?? null,
    state: (data["state"] ?? "browsing") as VisitorSession["state"],
    orgId: data["orgId"] ?? "",
    pageUrl: data["pageUrl"] ?? "",
    connectedAt: parseInt(data["connectedAt"] ?? "0", 10),
    interactedAt: data["interactedAt"] === "null" ? null : parseInt(data["interactedAt"] ?? "0", 10),
    ipAddress: data["ipAddress"] === "null" ? null : data["ipAddress"] ?? null,
    location: data["location"] && data["location"] !== "null" ? JSON.parse(data["location"]) as VisitorLocation : null,
    matchedPoolId: data["matchedPoolId"] === "null" || data["matchedPoolId"] === "undefined" ? null : data["matchedPoolId"],
  };
}

/**
 * Deserialize call request from Redis
 */
function deserializeCallRequest(data: Record<string, string>): CallRequest | null {
  if (!data || Object.keys(data).length === 0) return null;
  
  return {
    requestId: data["requestId"] ?? "",
    visitorId: data["visitorId"] ?? "",
    agentId: data["agentId"] ?? "",
    orgId: data["orgId"] ?? "",
    pageUrl: data["pageUrl"] ?? "",
    requestedAt: parseInt(data["requestedAt"] ?? "0", 10),
  };
}

/**
 * Deserialize active call from Redis
 */
function deserializeActiveCall(data: Record<string, string>): ActiveCall | null {
  if (!data || Object.keys(data).length === 0) return null;
  
  return {
    callId: data["callId"] ?? "",
    visitorId: data["visitorId"] ?? "",
    agentId: data["agentId"] ?? "",
    startedAt: parseInt(data["startedAt"] ?? "0", 10),
    endedAt: data["endedAt"] === "null" ? null : parseInt(data["endedAt"] ?? "0", 10),
  };
}

// ============================================================================
// REDIS POOL MANAGER CLASS
// ============================================================================

export class RedisPoolManager {
  
  // ---------------------------------------------------------------------------
  // ORGANIZATION & POOL CONFIGURATION
  // ---------------------------------------------------------------------------

  /**
   * Load organization configuration including path rules
   */
  async setOrgConfig(orgId: string, defaultPoolId: string | null, pathRules: PathRule[]): Promise<void> {
    const redis = getRedisClient();
    const config: OrgConfig = {
      orgId,
      defaultPoolId,
      pathRules: pathRules.filter(r => r.isActive).sort((a, b) => b.priority - a.priority),
    };
    
    await redis.set(REDIS_KEYS.orgConfig(orgId), JSON.stringify(config));
    console.log(`[RedisPoolManager] Org config loaded: ${orgId} with ${pathRules.length} path rules`);
  }

  /**
   * Get organization configuration
   */
  private async getOrgConfig(orgId: string): Promise<OrgConfig | null> {
    const redis = getRedisClient();
    const data = await redis.get(REDIS_KEYS.orgConfig(orgId));
    if (!data) return null;
    return JSON.parse(data) as OrgConfig;
  }

  /**
   * Add an agent to a pool with a priority rank
   */
  async addAgentToPool(agentId: string, poolId: string, priorityRank: number = 1): Promise<void> {
    const redis = getRedisClient();
    
    await Promise.all([
      // Add agent to pool's agent set
      redis.sAdd(REDIS_KEYS.poolAgents(poolId), agentId),
      // Add pool to agent's pool set
      redis.sAdd(REDIS_KEYS.agentPools(agentId), poolId),
      // Store priority rank
      redis.hSet(REDIS_KEYS.agentPoolPriorities(agentId), poolId, priorityRank.toString()),
    ]);
    
    console.log(`[RedisPoolManager] Agent ${agentId} added to pool ${poolId} with priority ${priorityRank}`);
  }

  /**
   * Remove an agent from a pool
   */
  async removeAgentFromPool(agentId: string, poolId: string): Promise<void> {
    const redis = getRedisClient();
    
    await Promise.all([
      redis.sRem(REDIS_KEYS.poolAgents(poolId), agentId),
      redis.sRem(REDIS_KEYS.agentPools(agentId), poolId),
      redis.hDel(REDIS_KEYS.agentPoolPriorities(agentId), poolId),
    ]);
  }

  /**
   * Load all pool memberships for an agent with their priority ranks
   */
  async setAgentPoolMemberships(agentId: string, memberships: PoolMembership[]): Promise<void> {
    const redis = getRedisClient();
    
    // Get existing pools to remove agent from them
    const existingPools = await redis.sMembers(REDIS_KEYS.agentPools(agentId));
    
    // Remove from all existing pools
    const removePromises = existingPools.map(poolId =>
      redis.sRem(REDIS_KEYS.poolAgents(poolId), agentId)
    );
    await Promise.all(removePromises);
    
    // Clear existing pool set and priorities
    await Promise.all([
      redis.del(REDIS_KEYS.agentPools(agentId)),
      redis.del(REDIS_KEYS.agentPoolPriorities(agentId)),
    ]);
    
    // Add new memberships
    for (const { poolId, priorityRank } of memberships) {
      await this.addAgentToPool(agentId, poolId, priorityRank);
    }
  }

  /**
   * Get an agent's priority rank within a specific pool
   */
  async getAgentPriorityInPool(agentId: string, poolId: string): Promise<number> {
    const redis = getRedisClient();
    const priority = await redis.hGet(REDIS_KEYS.agentPoolPriorities(agentId), poolId);
    return priority ? parseInt(priority, 10) : 1;
  }

  /**
   * Match a URL path to a pool using path rules
   */
  async matchPathToPool(orgId: string, pageUrl: string): Promise<string | null> {
    const config = await this.getOrgConfig(orgId);
    if (!config) return null;

    const urlContext = this.parseUrlContext(pageUrl);

    for (const rule of config.pathRules) {
      if (rule.conditions && rule.conditions.length > 0) {
        if (this.matchConditions(urlContext, rule.conditions)) {
          console.log(`[RedisPoolManager] URL "${pageUrl}" matched conditions -> pool ${rule.poolId}`);
          return rule.poolId;
        }
      } else {
        const domainMatches = rule.domainPattern === "*" || 
          this.matchDomainPattern(urlContext.domain, rule.domainPattern);
        const pathMatches = this.matchPathPattern(urlContext.path, rule.pathPattern);
        
        if (domainMatches && pathMatches) {
          console.log(`[RedisPoolManager] Path "${urlContext.path}" matched rule "${rule.pathPattern}" -> pool ${rule.poolId}`);
          return rule.poolId;
        }
      }
    }

    console.log(`[RedisPoolManager] URL "${pageUrl}" using default pool: ${config.defaultPoolId}`);
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
      url.searchParams.forEach((value, key) => {
        queryParams.set(key.toLowerCase(), value);
      });
    } catch {
      path = pageUrl.startsWith("/") ? pageUrl : `/${pageUrl}`;
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

  private matchConditions(urlContext: { domain: string; path: string; queryParams: Map<string, string> }, conditions: RuleCondition[]): boolean {
    return conditions.every(condition => this.matchCondition(urlContext, condition));
  }

  private matchCondition(urlContext: { domain: string; path: string; queryParams: Map<string, string> }, condition: RuleCondition): boolean {
    let testValue: string;
    
    switch (condition.type) {
      case "domain":
        testValue = urlContext.domain;
        break;
      case "path":
        testValue = urlContext.path;
        break;
      case "query_param": {
        const paramName = condition.paramName?.toLowerCase() || "";
        testValue = urlContext.queryParams.get(paramName) || "";
        if (!urlContext.queryParams.has(paramName) && condition.matchType !== "does_not_contain") {
          return false;
        }
        break;
      }
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

  private matchDomainPattern(domain: string, pattern: string): boolean {
    if (pattern === "*") return true;
    domain = domain.toLowerCase();
    pattern = pattern.toLowerCase();
    if (pattern === domain) return true;
    if (pattern.startsWith("*.")) {
      const baseDomain = pattern.slice(2);
      return domain === baseDomain || domain.endsWith("." + baseDomain);
    }
    return domain.includes(pattern);
  }

  private matchPathPattern(path: string, pattern: string): boolean {
    path = path.replace(/\/+$/, "") || "/";
    pattern = pattern.replace(/\/+$/, "") || "/";
    if (pattern === path) return true;
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      return path === prefix || path.startsWith(prefix + "/");
    }
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      if (!path.startsWith(prefix + "/")) return false;
      const remainder = path.slice(prefix.length + 1);
      return !remainder.includes("/");
    }
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }
    return false;
  }

  /**
   * Get agents in a specific pool
   */
  async getAgentsInPool(poolId: string): Promise<AgentState[]> {
    const redis = getRedisClient();
    const agentIds = await redis.sMembers(REDIS_KEYS.poolAgents(poolId));
    
    const agents: AgentState[] = [];
    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent) agents.push(agent);
    }
    return agents;
  }

  /**
   * Get the primary pool for an agent
   */
  async getAgentPrimaryPool(agentId: string): Promise<string | null> {
    const redis = getRedisClient();
    const poolIds = await redis.sMembers(REDIS_KEYS.agentPools(agentId));
    return poolIds.length > 0 ? poolIds[0] ?? null : null;
  }

  // ---------------------------------------------------------------------------
  // AGENT MANAGEMENT
  // ---------------------------------------------------------------------------

  async registerAgent(socketId: string, profile: AgentProfile): Promise<AgentState> {
    const redis = getRedisClient();
    const existingAgent = await this.getAgent(profile.id);
    
    if (existingAgent) {
      console.log(`[RedisPoolManager] Agent reconnecting: ${profile.displayName} (${profile.id}), updating socket ${existingAgent.socketId} -> ${socketId}, status: ${profile.status}`);
      
      // Delete old socket mapping
      await redis.del(REDIS_KEYS.agentBySocket(existingAgent.socketId));
      
      // Update agent state
      existingAgent.socketId = socketId;
      existingAgent.profile = profile;
      existingAgent.lastActivityAt = Date.now();
      
      await Promise.all([
        redis.hSet(REDIS_KEYS.agent(profile.id), serialize(existingAgent)),
        redis.set(REDIS_KEYS.agentBySocket(socketId), profile.id),
      ]);
      
      return existingAgent;
    }
    
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
    
    await Promise.all([
      redis.hSet(REDIS_KEYS.agent(profile.id), serialize(agentState)),
      redis.sAdd(REDIS_KEYS.agentsAll(), profile.id),
      redis.set(REDIS_KEYS.agentBySocket(socketId), profile.id),
    ]);
    
    console.log(`[RedisPoolManager] Agent registered: ${profile.displayName} (${profile.id})`);
    return agentState;
  }

  async unregisterAgent(agentId: string): Promise<string[]> {
    const redis = getRedisClient();
    const agent = await this.getAgent(agentId);
    if (!agent) return [];

    const affectedVisitorIds = [...agent.currentSimulations];
    
    // Get all pools agent belongs to and remove from them
    const poolIds = await redis.sMembers(REDIS_KEYS.agentPools(agentId));
    const removePromises = poolIds.map(poolId =>
      redis.sRem(REDIS_KEYS.poolAgents(poolId), agentId)
    );
    
    await Promise.all([
      ...removePromises,
      redis.del(REDIS_KEYS.agent(agentId)),
      redis.del(REDIS_KEYS.agentBySocket(agent.socketId)),
      redis.del(REDIS_KEYS.agentPools(agentId)),
      redis.del(REDIS_KEYS.agentPoolPriorities(agentId)),
      redis.del(REDIS_KEYS.lastAssignment(agentId)),
      redis.sRem(REDIS_KEYS.agentsAll(), agentId),
    ]);
    
    console.log(`[RedisPoolManager] Agent unregistered: ${agentId}`);
    return affectedVisitorIds;
  }

  async getAgent(agentId: string): Promise<AgentState | undefined> {
    const redis = getRedisClient();
    const data = await redis.hGetAll(REDIS_KEYS.agent(agentId));
    const agent = deserializeAgent(data);
    return agent ?? undefined;
  }

  async getAgentBySocketId(socketId: string): Promise<AgentState | undefined> {
    const redis = getRedisClient();
    const agentId = await redis.get(REDIS_KEYS.agentBySocket(socketId));
    if (!agentId) return undefined;
    return this.getAgent(agentId);
  }

  async updateAgentStatus(agentId: string, status: AgentProfile["status"]): Promise<void> {
    const redis = getRedisClient();
    const agent = await this.getAgent(agentId);
    if (agent) {
      agent.profile.status = status;
      await redis.hSet(REDIS_KEYS.agent(agentId), "profile", JSON.stringify(agent.profile));
    }
  }

  async setAgentInCall(agentId: string, visitorId: string | null): Promise<void> {
    const redis = getRedisClient();
    const agent = await this.getAgent(agentId);
    if (agent) {
      agent.currentCallVisitorId = visitorId;
      agent.profile.status = visitorId ? "in_call" : "idle";
      await redis.hSet(REDIS_KEYS.agent(agentId), {
        currentCallVisitorId: visitorId ?? "null",
        profile: JSON.stringify(agent.profile),
      });
    }
  }

  async updateAgentActivity(agentId: string): Promise<void> {
    const redis = getRedisClient();
    await redis.hSet(REDIS_KEYS.agent(agentId), "lastActivityAt", Date.now().toString());
  }

  async getStaleAgents(threshold: number): Promise<AgentState[]> {
    const redis = getRedisClient();
    const now = Date.now();
    const staleAgents: AgentState[] = [];
    
    const agentIds = await redis.sMembers(REDIS_KEYS.agentsAll());
    
    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent && agent.profile.status === "idle") {
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

  async registerVisitor(
    socketId: string,
    visitorId: string,
    orgId: string,
    pageUrl: string,
    ipAddress: string | null = null,
    location: VisitorLocation | null = null
  ): Promise<VisitorSession> {
    const redis = getRedisClient();
    
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
    
    await Promise.all([
      redis.hSet(REDIS_KEYS.visitor(visitorId), serialize(session)),
      redis.sAdd(REDIS_KEYS.visitorsAll(), visitorId),
      redis.set(REDIS_KEYS.visitorBySocket(socketId), visitorId),
    ]);
    
    console.log(`[RedisPoolManager] Visitor registered: ${visitorId}${location ? ` from ${location.city}, ${location.region}` : ""}`);
    return session;
  }

  async updateVisitorLocation(visitorId: string, location: VisitorLocation | null): Promise<void> {
    const redis = getRedisClient();
    await redis.hSet(REDIS_KEYS.visitor(visitorId), "location", JSON.stringify(location));
  }

  async unregisterVisitor(visitorId: string): Promise<void> {
    const redis = getRedisClient();
    const visitor = await this.getVisitor(visitorId);
    
    if (visitor?.assignedAgentId) {
      await this.removeVisitorFromAgent(visitor.assignedAgentId, visitorId);
    }
    
    if (visitor) {
      await redis.del(REDIS_KEYS.visitorBySocket(visitor.socketId));
    }
    
    await Promise.all([
      redis.del(REDIS_KEYS.visitor(visitorId)),
      redis.sRem(REDIS_KEYS.visitorsAll(), visitorId),
    ]);
    
    console.log(`[RedisPoolManager] Visitor unregistered: ${visitorId}`);
  }

  async getVisitor(visitorId: string): Promise<VisitorSession | undefined> {
    const redis = getRedisClient();
    const data = await redis.hGetAll(REDIS_KEYS.visitor(visitorId));
    const visitor = deserializeVisitor(data);
    return visitor ?? undefined;
  }

  async getVisitorBySocketId(socketId: string): Promise<VisitorSession | undefined> {
    const redis = getRedisClient();
    const visitorId = await redis.get(REDIS_KEYS.visitorBySocket(socketId));
    if (!visitorId) return undefined;
    return this.getVisitor(visitorId);
  }

  async getUnassignedVisitors(): Promise<VisitorSession[]> {
    const redis = getRedisClient();
    const unassigned: VisitorSession[] = [];
    
    const visitorIds = await redis.sMembers(REDIS_KEYS.visitorsAll());
    
    for (const visitorId of visitorIds) {
      const visitor = await this.getVisitor(visitorId);
      if (visitor && !visitor.assignedAgentId) {
        unassigned.push(visitor);
      }
    }
    
    return unassigned;
  }

  async updateVisitorState(visitorId: string, state: VisitorSession["state"]): Promise<void> {
    const redis = getRedisClient();
    const visitor = await this.getVisitor(visitorId);
    if (visitor) {
      visitor.state = state;
      const updates: Record<string, string> = { state };
      if (state === "watching_simulation" && !visitor.interactedAt) {
        updates["interactedAt"] = Date.now().toString();
      }
      await redis.hSet(REDIS_KEYS.visitor(visitorId), updates);
    }
  }

  // ---------------------------------------------------------------------------
  // AGENT ASSIGNMENT (Tiered Routing with Elastic Pooling)
  // ---------------------------------------------------------------------------

  async findBestAgent(poolId?: string | null, excludeAgentId?: string): Promise<AgentState | undefined> {
    let candidates: AgentState[];
    
    if (poolId) {
      candidates = await this.getAgentsInPool(poolId);
    } else {
      const redis = getRedisClient();
      const agentIds = await redis.sMembers(REDIS_KEYS.agentsAll());
      candidates = [];
      for (const agentId of agentIds) {
        const agent = await this.getAgent(agentId);
        if (agent) candidates.push(agent);
      }
    }

    if (excludeAgentId) {
      candidates = candidates.filter(a => a.agentId !== excludeAgentId);
    }

    if (!poolId) {
      return this.findBestAgentInTier(candidates);
    }

    // Group agents by priority rank
    const tiers = new Map<number, AgentState[]>();
    for (const agent of candidates) {
      const priorityRank = await this.getAgentPriorityInPool(agent.agentId, poolId);
      if (!tiers.has(priorityRank)) {
        tiers.set(priorityRank, []);
      }
      tiers.get(priorityRank)!.push(agent);
    }

    const sortedTierRanks = [...tiers.keys()].sort((a, b) => a - b);

    for (const tierRank of sortedTierRanks) {
      const tierAgents = tiers.get(tierRank)!;
      const availableAgent = await this.findBestAgentInTier(tierAgents);
      
      if (availableAgent) {
        console.log(`[RedisPoolManager] Found agent ${availableAgent.profile.displayName} in tier ${tierRank}`);
        return availableAgent;
      }
      console.log(`[RedisPoolManager] Tier ${tierRank} at capacity, trying next tier...`);
    }

    return undefined;
  }

  private async findBestAgentInTier(tierAgents: AgentState[]): Promise<AgentState | undefined> {
    const redis = getRedisClient();
    let bestAgent: AgentState | undefined;
    let lowestLoad = Infinity;
    let oldestOrder = Infinity;

    for (const agent of tierAgents) {
      if (agent.profile.status === "in_call" || agent.profile.status === "offline" || agent.profile.status === "away") {
        continue;
      }

      const currentLoad = agent.currentSimulations.length;
      if (currentLoad >= agent.profile.maxSimultaneousSimulations) {
        continue;
      }

      const orderStr = await redis.get(REDIS_KEYS.lastAssignment(agent.agentId));
      const assignmentOrder = orderStr ? parseInt(orderStr, 10) : 0;

      if (agent.profile.status === "idle" && currentLoad === 0) {
        if (assignmentOrder < oldestOrder) {
          oldestOrder = assignmentOrder;
          bestAgent = agent;
        }
        continue;
      }

      if (currentLoad < lowestLoad) {
        lowestLoad = currentLoad;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  async findBestAgentForVisitor(orgId: string, pageUrl: string, excludeAgentId?: string): Promise<{ agent: AgentState; poolId: string | null } | undefined> {
    const poolId = await this.matchPathToPool(orgId, pageUrl);
    
    if (poolId) {
      const agent = await this.findBestAgent(poolId, excludeAgentId);
      if (agent) {
        console.log(`[RedisPoolManager] Found agent ${agent.profile.displayName} in pool ${poolId} for ${pageUrl}`);
        return { agent, poolId };
      }
      console.log(`[RedisPoolManager] No available agent in pool ${poolId}, falling back to any agent`);
    }

    const fallbackAgent = await this.findBestAgent(null, excludeAgentId);
    if (fallbackAgent) {
      return { agent: fallbackAgent, poolId: null };
    }
    
    return undefined;
  }

  async assignVisitorToAgent(visitorId: string, agentId: string): Promise<boolean> {
    const redis = getRedisClient();
    const visitor = await this.getVisitor(visitorId);
    const agent = await this.getAgent(agentId);

    if (!visitor || !agent) return false;

    if (visitor.assignedAgentId && visitor.assignedAgentId !== agentId) {
      await this.removeVisitorFromAgent(visitor.assignedAgentId, visitorId);
    }

    visitor.assignedAgentId = agentId;
    visitor.state = "watching_simulation";
    agent.currentSimulations.push(visitorId);

    // Increment assignment counter
    const counter = await redis.incr(REDIS_KEYS.assignmentCounter());
    await redis.set(REDIS_KEYS.lastAssignment(agentId), counter.toString());
    
    if (agent.currentSimulations.length === 1 && agent.profile.status === "idle") {
      agent.profile.status = "in_simulation";
    }

    await Promise.all([
      redis.hSet(REDIS_KEYS.visitor(visitorId), {
        assignedAgentId: agentId,
        state: "watching_simulation",
      }),
      redis.hSet(REDIS_KEYS.agent(agentId), {
        currentSimulations: JSON.stringify(agent.currentSimulations),
        profile: JSON.stringify(agent.profile),
      }),
    ]);

    console.log(
      `[RedisPoolManager] Assigned visitor ${visitorId} to agent ${agent.profile.displayName} ` +
      `(${agent.currentSimulations.length} simulations)`
    );
    
    return true;
  }

  async removeVisitorFromAgent(agentId: string, visitorId: string): Promise<void> {
    const redis = getRedisClient();
    const agent = await this.getAgent(agentId);
    if (!agent) return;

    agent.currentSimulations = agent.currentSimulations.filter(id => id !== visitorId);
    
    if (agent.currentSimulations.length === 0 && agent.profile.status === "in_simulation") {
      agent.profile.status = "idle";
    }

    await redis.hSet(REDIS_KEYS.agent(agentId), {
      currentSimulations: JSON.stringify(agent.currentSimulations),
      profile: JSON.stringify(agent.profile),
    });
  }

  async reassignVisitors(fromAgentId: string, excludeVisitorId?: string): Promise<{ 
    reassigned: Map<string, string>; 
    unassigned: string[];
  }> {
    const reassigned = new Map<string, string>();
    const unassigned: string[] = [];
    const fromAgent = await this.getAgent(fromAgentId);
    
    if (!fromAgent) return { reassigned, unassigned };

    const visitorsToReassign = fromAgent.currentSimulations.filter(
      id => id !== excludeVisitorId
    );

    for (const visitorId of visitorsToReassign) {
      const newAgent = await this.findBestAgent();
      if (newAgent && newAgent.agentId !== fromAgentId) {
        await this.assignVisitorToAgent(visitorId, newAgent.agentId);
        reassigned.set(visitorId, newAgent.agentId);
      } else {
        const visitor = await this.getVisitor(visitorId);
        if (visitor) {
          visitor.assignedAgentId = null;
          const redis = getRedisClient();
          await redis.hSet(REDIS_KEYS.visitor(visitorId), "assignedAgentId", "null");
          unassigned.push(visitorId);
        }
      }
    }

    // Update from agent - remove visitors except excluded
    fromAgent.currentSimulations = fromAgent.currentSimulations.filter(
      id => id === excludeVisitorId
    );
    
    const redis = getRedisClient();
    await redis.hSet(REDIS_KEYS.agent(fromAgentId), "currentSimulations", JSON.stringify(fromAgent.currentSimulations));

    console.log(
      `[RedisPoolManager] Reassigned ${reassigned.size} visitors, ${unassigned.length} now waiting for agent`
    );
    
    return { reassigned, unassigned };
  }

  // ---------------------------------------------------------------------------
  // CALL MANAGEMENT
  // ---------------------------------------------------------------------------

  async createCallRequest(visitorId: string, agentId: string, orgId: string, pageUrl: string): Promise<CallRequest> {
    const redis = getRedisClient();
    const requestId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const request: CallRequest = {
      requestId,
      visitorId,
      agentId,
      orgId,
      pageUrl,
      requestedAt: Date.now(),
    };
    
    await Promise.all([
      redis.hSet(REDIS_KEYS.pendingCall(requestId), serialize(request)),
      redis.sAdd(REDIS_KEYS.pendingCallsAll(), requestId),
      redis.expire(REDIS_KEYS.pendingCall(requestId), REDIS_TTL.PENDING_CALL),
    ]);
    
    await this.updateVisitorState(visitorId, "call_requested");
    
    return request;
  }

  async getCallRequest(requestId: string): Promise<CallRequest | undefined> {
    const redis = getRedisClient();
    const data = await redis.hGetAll(REDIS_KEYS.pendingCall(requestId));
    const request = deserializeCallRequest(data);
    return request ?? undefined;
  }

  async acceptCall(requestId: string): Promise<ActiveCall | undefined> {
    const redis = getRedisClient();
    const request = await this.getCallRequest(requestId);
    if (!request) return undefined;

    const callId = `active_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const activeCall: ActiveCall = {
      callId,
      visitorId: request.visitorId,
      agentId: request.agentId,
      startedAt: Date.now(),
      endedAt: null,
    };

    await Promise.all([
      redis.hSet(REDIS_KEYS.activeCall(callId), serialize(activeCall)),
      redis.sAdd(REDIS_KEYS.activeCallsAll(), callId),
      redis.del(REDIS_KEYS.pendingCall(requestId)),
      redis.sRem(REDIS_KEYS.pendingCallsAll(), requestId),
    ]);

    await this.updateVisitorState(request.visitorId, "in_call");
    await this.setAgentInCall(request.agentId, request.visitorId);

    return activeCall;
  }

  async rejectCall(requestId: string): Promise<void> {
    const redis = getRedisClient();
    await Promise.all([
      redis.del(REDIS_KEYS.pendingCall(requestId)),
      redis.sRem(REDIS_KEYS.pendingCallsAll(), requestId),
    ]);
  }

  async cancelCall(requestId: string): Promise<CallRequest | undefined> {
    const redis = getRedisClient();
    const request = await this.getCallRequest(requestId);
    if (request) {
      await this.updateVisitorState(request.visitorId, "watching_simulation");
      await Promise.all([
        redis.del(REDIS_KEYS.pendingCall(requestId)),
        redis.sRem(REDIS_KEYS.pendingCallsAll(), requestId),
      ]);
    }
    return request;
  }

  async endCall(callId: string): Promise<ActiveCall | undefined> {
    const redis = getRedisClient();
    const call = await this.getActiveCall(callId);
    if (!call) return undefined;

    call.endedAt = Date.now();
    
    await this.updateVisitorState(call.visitorId, "browsing");
    await this.setAgentInCall(call.agentId, null);
    
    await Promise.all([
      redis.del(REDIS_KEYS.activeCall(callId)),
      redis.sRem(REDIS_KEYS.activeCallsAll(), callId),
    ]);
    
    return call;
  }

  async getActiveCall(callId: string): Promise<ActiveCall | undefined> {
    const redis = getRedisClient();
    const data = await redis.hGetAll(REDIS_KEYS.activeCall(callId));
    const call = deserializeActiveCall(data);
    return call ?? undefined;
  }

  async getActiveCallByVisitorId(visitorId: string): Promise<ActiveCall | undefined> {
    const redis = getRedisClient();
    const callIds = await redis.sMembers(REDIS_KEYS.activeCallsAll());
    
    for (const callId of callIds) {
      const call = await this.getActiveCall(callId);
      if (call && call.visitorId === visitorId) return call;
    }
    return undefined;
  }

  async getActiveCallByAgentId(agentId: string): Promise<ActiveCall | undefined> {
    const redis = getRedisClient();
    const callIds = await redis.sMembers(REDIS_KEYS.activeCallsAll());
    
    for (const callId of callIds) {
      const call = await this.getActiveCall(callId);
      if (call && call.agentId === agentId) return call;
    }
    return undefined;
  }

  async reconnectVisitorToCall(visitorId: string, agentId: string, callId: string): Promise<ActiveCall | undefined> {
    const redis = getRedisClient();
    const visitor = await this.getVisitor(visitorId);
    const agent = await this.getAgent(agentId);
    
    if (!visitor || !agent) {
      console.warn(`[RedisPoolManager] Cannot reconnect - visitor or agent not found`);
      return undefined;
    }

    const existingCall = await this.getActiveCallByAgentId(agentId);
    if (existingCall) {
      await Promise.all([
        redis.del(REDIS_KEYS.activeCall(existingCall.callId)),
        redis.sRem(REDIS_KEYS.activeCallsAll(), existingCall.callId),
      ]);
    }

    const activeCall: ActiveCall = {
      callId,
      visitorId,
      agentId,
      startedAt: existingCall?.startedAt ?? Date.now(),
      endedAt: null,
    };

    await Promise.all([
      redis.hSet(REDIS_KEYS.activeCall(callId), serialize(activeCall)),
      redis.sAdd(REDIS_KEYS.activeCallsAll(), callId),
    ]);
    
    await redis.hSet(REDIS_KEYS.visitor(visitorId), "assignedAgentId", agentId);
    await this.updateVisitorState(visitorId, "in_call");
    await this.setAgentInCall(agentId, visitorId);
    
    console.log(`[RedisPoolManager] Visitor ${visitorId} reconnected to call ${callId} with agent ${agentId}`);
    return activeCall;
  }

  async getNextWaitingRequest(agentId: string): Promise<CallRequest | undefined> {
    const redis = getRedisClient();
    let oldestRequest: CallRequest | undefined;
    let oldestTime = Infinity;

    const requestIds = await redis.sMembers(REDIS_KEYS.pendingCallsAll());
    
    for (const requestId of requestIds) {
      const request = await this.getCallRequest(requestId);
      if (request && request.agentId === agentId && request.requestedAt < oldestTime) {
        oldestRequest = request;
        oldestTime = request.requestedAt;
      }
    }

    return oldestRequest;
  }

  async getWaitingRequestsForAgent(agentId: string): Promise<CallRequest[]> {
    const redis = getRedisClient();
    const requests: CallRequest[] = [];
    
    const requestIds = await redis.sMembers(REDIS_KEYS.pendingCallsAll());
    
    for (const requestId of requestIds) {
      const request = await this.getCallRequest(requestId);
      if (request && request.agentId === agentId) {
        requests.push(request);
      }
    }
    
    return requests.sort((a, b) => a.requestedAt - b.requestedAt);
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------

  async getAgentStats(agentId: string) {
    const redis = getRedisClient();
    const agent = await this.getAgent(agentId);
    if (!agent) return null;

    const agentPoolIds = await redis.sMembers(REDIS_KEYS.agentPools(agentId));
    let poolVisitors = 0;
    
    if (agentPoolIds.length > 0) {
      const poolAgentIds = new Set<string>();
      for (const poolId of agentPoolIds) {
        const agentsInPool = await redis.sMembers(REDIS_KEYS.poolAgents(poolId));
        for (const aid of agentsInPool) {
          poolAgentIds.add(aid);
        }
      }
      
      for (const aid of poolAgentIds) {
        const poolAgent = await this.getAgent(aid);
        if (poolAgent) {
          poolVisitors += poolAgent.currentSimulations.length;
        }
      }
    } else {
      poolVisitors = agent.currentSimulations.length;
    }

    return {
      poolVisitors,
    };
  }

  async getGlobalStats() {
    const redis = getRedisClient();
    let totalAgents = 0;
    let onlineAgents = 0;
    let totalSimulations = 0;
    let activeCallsCount = 0;

    const agentIds = await redis.sMembers(REDIS_KEYS.agentsAll());
    const visitorIds = await redis.sMembers(REDIS_KEYS.visitorsAll());

    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent) {
        totalAgents++;
        if (agent.profile.status !== "offline") {
          onlineAgents++;
          totalSimulations += agent.currentSimulations.length;
        }
        if (agent.currentCallVisitorId) {
          activeCallsCount++;
        }
      }
    }

    return {
      totalAgents,
      onlineAgents,
      totalSimulations,
      totalVisitors: visitorIds.length,
      activeCalls: activeCallsCount,
    };
  }

  /**
   * Get extended stats for metrics endpoint
   * Provides detailed breakdown by pool and pending calls
   */
  async getExtendedStats() {
    const redis = getRedisClient();
    
    // Get pending calls count
    const pendingCallIds = await redis.sMembers(REDIS_KEYS.pendingCallsAll());
    
    // Get all pool IDs by scanning for pool:*:agents keys
    const agentIds = await redis.sMembers(REDIS_KEYS.agentsAll());
    const poolSet = new Set<string>();
    const agentsByPool: Record<string, number> = {};
    
    for (const agentId of agentIds) {
      const poolIds = await redis.sMembers(REDIS_KEYS.agentPools(agentId));
      const agent = await this.getAgent(agentId);
      const isOnline = agent && agent.profile.status !== "offline";
      
      for (const poolId of poolIds) {
        poolSet.add(poolId);
        if (isOnline) {
          agentsByPool[poolId] = (agentsByPool[poolId] ?? 0) + 1;
        }
      }
    }
    
    // Get org config count (scan for org:*:config keys)
    let orgConfigCount = 0;
    let cursor = "0";
    do {
      const result = await redis.scan(Number(cursor), { MATCH: "org:*:config", COUNT: 100 });
      cursor = result.cursor.toString();
      orgConfigCount += result.keys.length;
    } while (cursor !== "0");

    return {
      pendingCalls: pendingCallIds.length,
      poolCount: poolSet.size,
      agentsByPool,
      orgConfigCount,
    };
  }
}

