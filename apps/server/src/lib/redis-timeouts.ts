/**
 * Redis-based Timeout Management
 * 
 * Handles distributed timeouts that work across multiple server instances:
 * - RNA (Ring-No-Answer) timeouts
 * - Agent disconnect grace periods  
 * - Call reconnect timeouts
 * 
 * Uses Redis keys with TTL for state, and a polling mechanism for execution.
 * Operations are idempotent - they check Redis state before acting.
 */

import { getRedisClient, REDIS_KEYS, REDIS_TTL, isRedisConnected } from "./redis.js";
import { TIMING } from "@ghost-greeter/domain";

// ============================================================================
// TYPES
// ============================================================================

interface RNATimeoutData {
  requestId: string;
  agentId: string;
  visitorId: string;
  createdAt: number;
  expiresAt: number;
}

interface PendingDisconnectData {
  agentId: string;
  previousStatus: string;
  createdAt: number;
  expiresAt: number;
}

interface PendingReconnectData {
  callLogId: string;
  agentSocketId: string | null;
  visitorSocketId: string | null;
  agentId: string;
  visitorId: string;
  newCallId: string;
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// RNA TIMEOUT MANAGEMENT
// ============================================================================

/**
 * Start an RNA timeout for a call request
 */
export async function startRNATimeout(
  requestId: string,
  agentId: string,
  visitorId: string
): Promise<void> {
  if (!isRedisConnected()) {
    console.warn("[RedisTimeouts] Redis not connected, skipping RNA timeout");
    return;
  }

  const redis = getRedisClient();
  const now = Date.now();
  const data: RNATimeoutData = {
    requestId,
    agentId,
    visitorId,
    createdAt: now,
    expiresAt: now + TIMING.RNA_TIMEOUT,
  };

  const key = REDIS_KEYS.rnaTimeout(requestId);
  await redis.set(key, JSON.stringify(data), { EX: REDIS_TTL.RNA_TIMEOUT });
  
  console.log(`[RedisTimeouts] RNA timeout started for request ${requestId}`);
}

/**
 * Clear an RNA timeout (call was answered or cancelled)
 */
export async function clearRNATimeout(requestId: string): Promise<void> {
  if (!isRedisConnected()) return;

  const redis = getRedisClient();
  await redis.del(REDIS_KEYS.rnaTimeout(requestId));
  
  console.log(`[RedisTimeouts] RNA timeout cleared for request ${requestId}`);
}

/**
 * Get an RNA timeout's data
 */
export async function getRNATimeout(requestId: string): Promise<RNATimeoutData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const data = await redis.get(REDIS_KEYS.rnaTimeout(requestId));
  
  if (!data) return null;
  return JSON.parse(data) as RNATimeoutData;
}

/**
 * Get all expired RNA timeouts
 */
export async function getExpiredRNATimeouts(): Promise<RNATimeoutData[]> {
  if (!isRedisConnected()) return [];

  const redis = getRedisClient();
  const now = Date.now();
  const expired: RNATimeoutData[] = [];

  // Scan for all RNA timeout keys
  const pattern = "rna:*";
  let cursor = 0;
  
  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    
    for (const key of result.keys) {
      const data = await redis.get(key);
      if (data) {
        const timeout = JSON.parse(data) as RNATimeoutData;
        if (timeout.expiresAt <= now) {
          expired.push(timeout);
        }
      }
    }
  } while (cursor !== 0);

  return expired;
}

// ============================================================================
// PENDING DISCONNECT MANAGEMENT
// ============================================================================

/**
 * Start a pending disconnect for an agent (grace period for reconnection)
 */
export async function startPendingDisconnect(
  agentId: string,
  previousStatus: string
): Promise<void> {
  if (!isRedisConnected()) {
    console.warn("[RedisTimeouts] Redis not connected, skipping pending disconnect");
    return;
  }

  const redis = getRedisClient();
  const now = Date.now();
  const data: PendingDisconnectData = {
    agentId,
    previousStatus,
    createdAt: now,
    expiresAt: now + (REDIS_TTL.PENDING_DISCONNECT * 1000),
  };

  const key = REDIS_KEYS.pendingDisconnect(agentId);
  await redis.set(key, JSON.stringify(data), { EX: REDIS_TTL.PENDING_DISCONNECT });
  
  console.log(`[RedisTimeouts] Pending disconnect started for agent ${agentId}`);
}

/**
 * Clear a pending disconnect (agent reconnected)
 */
export async function clearPendingDisconnect(agentId: string): Promise<PendingDisconnectData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const key = REDIS_KEYS.pendingDisconnect(agentId);
  const data = await redis.get(key);
  
  if (data) {
    await redis.del(key);
    console.log(`[RedisTimeouts] Pending disconnect cleared for agent ${agentId}`);
    return JSON.parse(data) as PendingDisconnectData;
  }
  
  return null;
}

/**
 * Get a pending disconnect's data
 */
export async function getPendingDisconnect(agentId: string): Promise<PendingDisconnectData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const data = await redis.get(REDIS_KEYS.pendingDisconnect(agentId));
  
  if (!data) return null;
  return JSON.parse(data) as PendingDisconnectData;
}

/**
 * Get all expired pending disconnects
 */
export async function getExpiredPendingDisconnects(): Promise<PendingDisconnectData[]> {
  if (!isRedisConnected()) return [];

  const redis = getRedisClient();
  const now = Date.now();
  const expired: PendingDisconnectData[] = [];

  const pattern = "pending_disconnect:*";
  let cursor = 0;
  
  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    
    for (const key of result.keys) {
      const data = await redis.get(key);
      if (data) {
        const disconnect = JSON.parse(data) as PendingDisconnectData;
        if (disconnect.expiresAt <= now) {
          expired.push(disconnect);
        }
      }
    }
  } while (cursor !== 0);

  return expired;
}

// ============================================================================
// PENDING RECONNECT MANAGEMENT
// ============================================================================

/**
 * Start a pending reconnect for a call (waiting for both parties to reconnect)
 */
export async function startPendingReconnect(
  callLogId: string,
  data: Omit<PendingReconnectData, "callLogId" | "createdAt" | "expiresAt">
): Promise<void> {
  if (!isRedisConnected()) {
    console.warn("[RedisTimeouts] Redis not connected, skipping pending reconnect");
    return;
  }

  const redis = getRedisClient();
  const now = Date.now();
  const fullData: PendingReconnectData = {
    ...data,
    callLogId,
    createdAt: now,
    expiresAt: now + TIMING.CALL_RECONNECT_TIMEOUT,
  };

  const key = REDIS_KEYS.pendingReconnect(callLogId);
  await redis.set(key, JSON.stringify(fullData), { EX: REDIS_TTL.PENDING_RECONNECT });
  
  console.log(`[RedisTimeouts] Pending reconnect started for call ${callLogId}`);
}

/**
 * Update a pending reconnect (e.g., when one party reconnects)
 */
export async function updatePendingReconnect(
  callLogId: string,
  updates: Partial<Pick<PendingReconnectData, "agentSocketId" | "visitorSocketId">>
): Promise<PendingReconnectData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const key = REDIS_KEYS.pendingReconnect(callLogId);
  const existing = await redis.get(key);
  
  if (!existing) return null;
  
  const data = JSON.parse(existing) as PendingReconnectData;
  const updated = { ...data, ...updates };
  
  // Calculate remaining TTL
  const ttl = Math.ceil((data.expiresAt - Date.now()) / 1000);
  if (ttl > 0) {
    await redis.set(key, JSON.stringify(updated), { EX: ttl });
  }
  
  return updated;
}

/**
 * Clear a pending reconnect (reconnection completed or failed)
 */
export async function clearPendingReconnect(callLogId: string): Promise<PendingReconnectData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const key = REDIS_KEYS.pendingReconnect(callLogId);
  const data = await redis.get(key);
  
  if (data) {
    await redis.del(key);
    console.log(`[RedisTimeouts] Pending reconnect cleared for call ${callLogId}`);
    return JSON.parse(data) as PendingReconnectData;
  }
  
  return null;
}

/**
 * Get a pending reconnect's data
 */
export async function getPendingReconnect(callLogId: string): Promise<PendingReconnectData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const data = await redis.get(REDIS_KEYS.pendingReconnect(callLogId));
  
  if (!data) return null;
  return JSON.parse(data) as PendingReconnectData;
}

/**
 * Find a pending reconnect by socket ID (for handling disconnects)
 */
export async function findPendingReconnectBySocket(
  socketId: string,
  role: "agent" | "visitor"
): Promise<PendingReconnectData | null> {
  if (!isRedisConnected()) return null;

  const redis = getRedisClient();
  const pattern = "pending_reconnect:*";
  let cursor = 0;
  
  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    
    for (const key of result.keys) {
      const data = await redis.get(key);
      if (data) {
        const reconnect = JSON.parse(data) as PendingReconnectData;
        if (role === "agent" && reconnect.agentSocketId === socketId) {
          return reconnect;
        }
        if (role === "visitor" && reconnect.visitorSocketId === socketId) {
          return reconnect;
        }
      }
    }
  } while (cursor !== 0);

  return null;
}

/**
 * Get all expired pending reconnects
 */
export async function getExpiredPendingReconnects(): Promise<PendingReconnectData[]> {
  if (!isRedisConnected()) return [];

  const redis = getRedisClient();
  const now = Date.now();
  const expired: PendingReconnectData[] = [];

  const pattern = "pending_reconnect:*";
  let cursor = 0;
  
  do {
    const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
    cursor = result.cursor;
    
    for (const key of result.keys) {
      const data = await redis.get(key);
      if (data) {
        const reconnect = JSON.parse(data) as PendingReconnectData;
        if (reconnect.expiresAt <= now) {
          expired.push(reconnect);
        }
      }
    }
  } while (cursor !== 0);

  return expired;
}

