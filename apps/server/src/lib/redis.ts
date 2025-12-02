/**
 * Redis Client Initialization
 * 
 * Provides a singleton Redis client for state management and pub/sub.
 * Supports both local Redis and Upstash Redis (TLS).
 */

import { createClient, type RedisClientType } from "redis";

// Redis client singleton
let redisClient: RedisClientType | null = null;
let pubClient: RedisClientType | null = null;
let subClient: RedisClientType | null = null;

// Connection state tracking
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

/**
 * Get the Redis URL from environment
 */
function getRedisUrl(): string {
  const url = process.env["REDIS_URL"];
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  return url;
}

/**
 * Create a Redis client with proper configuration
 */
function createRedisClient(): RedisClientType {
  const url = getRedisUrl();
  
  const client = createClient({
    url,
    socket: {
      // Connection timeout: 10 seconds
      connectTimeout: 10000,
      // Keep connection alive
      keepAlive: 30000,
      // Reconnect strategy with exponential backoff
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error("[Redis] Max reconnection attempts reached");
          return new Error("Max reconnection attempts reached");
        }
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, ... up to 30s max
        const delay = Math.min(100 * Math.pow(2, retries), 30000);
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
        return delay;
      },
    },
  });

  // Event handlers
  client.on("error", (err) => {
    console.error("[Redis] Client error:", err.message);
    isConnected = false;
  });

  client.on("connect", () => {
    console.log("[Redis] Connecting...");
  });

  client.on("ready", () => {
    console.log("[Redis] ✅ Connected and ready");
    isConnected = true;
  });

  client.on("end", () => {
    console.log("[Redis] Connection closed");
    isConnected = false;
  });

  client.on("reconnecting", () => {
    console.log("[Redis] Reconnecting...");
  });

  return client as RedisClientType;
}

/**
 * Initialize the Redis client
 * Call this on application startup
 */
export async function initializeRedis(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      console.log("[Redis] Initializing connection...");
      
      redisClient = createRedisClient();
      await redisClient.connect();
      
      // Verify connection with a ping
      await redisClient.ping();
      console.log("[Redis] ✅ Main client initialized");
      
    } catch (error) {
      redisClient = null;
      connectionPromise = null;
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Redis] ❌ Failed to initialize:", message);
      throw new Error(`Redis initialization failed: ${message}`);
    }
  })();

  return connectionPromise;
}

/**
 * Initialize pub/sub clients for Socket.io adapter
 * These need to be separate clients from the main client
 */
export async function initializePubSub(): Promise<{ pub: RedisClientType; sub: RedisClientType }> {
  if (!redisClient) {
    throw new Error("Main Redis client not initialized. Call initializeRedis() first.");
  }

  try {
    console.log("[Redis] Initializing pub/sub clients...");
    
    // Create separate clients for pub/sub
    pubClient = createRedisClient();
    subClient = createRedisClient();
    
    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
    ]);
    
    console.log("[Redis] ✅ Pub/Sub clients initialized");
    
    return { pub: pubClient, sub: subClient };
  } catch (error) {
    pubClient = null;
    subClient = null;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Redis] ❌ Failed to initialize pub/sub:", message);
    throw new Error(`Redis pub/sub initialization failed: ${message}`);
  }
}

/**
 * Get the main Redis client
 * Throws if not initialized
 */
export function getRedisClient(): RedisClientType {
  if (!redisClient || !isConnected) {
    throw new Error("Redis client not initialized or not connected");
  }
  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Gracefully close all Redis connections
 */
export async function closeRedis(): Promise<void> {
  console.log("[Redis] Closing connections...");
  
  const closePromises: Promise<unknown>[] = [];
  
  if (subClient) {
    closePromises.push(subClient.quit().catch(() => {}));
  }
  if (pubClient) {
    closePromises.push(pubClient.quit().catch(() => {}));
  }
  if (redisClient) {
    closePromises.push(redisClient.quit().catch(() => {}));
  }
  
  await Promise.all(closePromises);
  
  redisClient = null;
  pubClient = null;
  subClient = null;
  isConnected = false;
  connectionPromise = null;
  
  console.log("[Redis] All connections closed");
}

// ============================================================================
// REDIS KEY PREFIXES
// ============================================================================

export const REDIS_KEYS = {
  // Agent state: agents:{agentId} -> Hash
  agent: (agentId: string) => `agents:${agentId}`,
  
  // All agent IDs: agents:all -> Set
  agentsAll: () => "agents:all",
  
  // Agent socket mapping: agents:socket:{socketId} -> agentId
  agentBySocket: (socketId: string) => `agents:socket:${socketId}`,
  
  // Visitor session: visitors:{visitorId} -> Hash
  visitor: (visitorId: string) => `visitors:${visitorId}`,
  
  // All visitor IDs: visitors:all -> Set
  visitorsAll: () => "visitors:all",
  
  // Visitor socket mapping: visitors:socket:{socketId} -> visitorId
  visitorBySocket: (socketId: string) => `visitors:socket:${socketId}`,
  
  // Pending call request: pending_calls:{requestId} -> Hash (with TTL)
  pendingCall: (requestId: string) => `pending_calls:${requestId}`,
  
  // All pending call IDs: pending_calls:all -> Set
  pendingCallsAll: () => "pending_calls:all",
  
  // Active call: active_calls:{callId} -> Hash
  activeCall: (callId: string) => `active_calls:${callId}`,
  
  // All active call IDs: active_calls:all -> Set
  activeCallsAll: () => "active_calls:all",
  
  // Pool membership: pool:{poolId}:agents -> Set of agentIds
  poolAgents: (poolId: string) => `pool:${poolId}:agents`,
  
  // Agent pools: agent:{agentId}:pools -> Set of poolIds
  agentPools: (agentId: string) => `agent:${agentId}:pools`,
  
  // Agent pool priorities: agent:{agentId}:pool_priorities -> Hash (poolId -> priority)
  agentPoolPriorities: (agentId: string) => `agent:${agentId}:pool_priorities`,
  
  // Organization config: org:{orgId}:config -> JSON string
  orgConfig: (orgId: string) => `org:${orgId}:config`,
  
  // Assignment counter: routing:assignment_counter -> String (number)
  assignmentCounter: () => "routing:assignment_counter",
  
  // Last assignment order: routing:last_assignment:{agentId} -> String (number)
  lastAssignment: (agentId: string) => `routing:last_assignment:${agentId}`,
  
  // RNA (Ring-No-Answer) timeout tracking: rna:{requestId} -> Hash
  rnaTimeout: (requestId: string) => `rna:${requestId}`,
  
  // Pending disconnect: pending_disconnect:{agentId} -> Hash
  pendingDisconnect: (agentId: string) => `pending_disconnect:${agentId}`,
  
  // Pending reconnect: pending_reconnect:{callLogId} -> Hash
  pendingReconnect: (callLogId: string) => `pending_reconnect:${callLogId}`,
} as const;

// ============================================================================
// TTL CONSTANTS (in seconds)
// ============================================================================

export const REDIS_TTL = {
  // Pending calls expire after 5 minutes (RNA + buffer)
  PENDING_CALL: 300,
  
  // Agent disconnect grace period: 10 seconds
  PENDING_DISCONNECT: 10,
  
  // Call reconnect timeout: 30 seconds
  PENDING_RECONNECT: 30,
  
  // RNA timeout tracking: 35 seconds (RNA timeout + buffer)
  RNA_TIMEOUT: 35,
  
  // Session data: 24 hours (cleanup buffer)
  SESSION: 86400,
} as const;

