/**
 * Socket.io Rate Limiting
 * 
 * Redis-backed rate limiting for Socket.io events to prevent abuse.
 * Uses simple counter with TTL pattern for distributed rate limiting.
 */

import { getRedisClient, isRedisConnected } from "../../lib/redis.js";

/**
 * Rate limit configuration for different socket events.
 * Each event can have different limits based on expected usage patterns.
 */
const SOCKET_RATE_LIMITS: Record<string, { max: number; windowSec: number }> = {
  // Widget events
  "widget:requestCall": { max: 5, windowSec: 60 },    // 5 call requests per minute (prevent call spam)
  "widget:join": { max: 10, windowSec: 60 },          // 10 joins per minute (allow page refreshes)
  "widget:pageview": { max: 30, windowSec: 60 },      // 30 pageviews per minute
  "widget:interaction": { max: 60, windowSec: 60 },   // 60 interactions per minute
  
  // Dashboard/Agent events  
  "dashboard:setStatus": { max: 30, windowSec: 60 },  // 30 status changes per minute
  "dashboard:login": { max: 10, windowSec: 60 },      // 10 login attempts per minute
  
  // Call events
  "call:request": { max: 5, windowSec: 60 },          // 5 call requests per minute
  "call:accept": { max: 10, windowSec: 60 },          // 10 accepts per minute
  "call:reject": { max: 10, windowSec: 60 },          // 10 rejects per minute
  "call:cancel": { max: 10, windowSec: 60 },          // 10 cancels per minute
  "call:end": { max: 10, windowSec: 60 },             // 10 call ends per minute
  
  // WebRTC signaling (higher limits for real-time communication)
  "webrtc:signal": { max: 100, windowSec: 60 },       // 100 signals per minute
  
  // Co-browsing events (higher limits for real-time data)
  "cobrowse:snapshot": { max: 10, windowSec: 60 },    // 10 snapshots per minute
  "cobrowse:mouse": { max: 300, windowSec: 60 },      // 300 mouse events per minute (5/sec)
  "cobrowse:scroll": { max: 120, windowSec: 60 },     // 120 scroll events per minute (2/sec)
};

// In-memory fallback storage when Redis is not available
const inMemoryCounters = new Map<string, { count: number; expiresAt: number }>();

/**
 * Check if an event from a specific identifier is rate limited.
 * 
 * @param event - The socket event name (e.g., "widget:requestCall")
 * @param identifier - Unique identifier (visitorId, agentId, or socket.id)
 * @returns Object with allowed status and remaining requests
 */
export async function checkSocketRateLimit(
  event: string,
  identifier: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = SOCKET_RATE_LIMITS[event];
  
  // If no limit defined for this event, allow
  if (!limit) {
    return { allowed: true, remaining: -1 };
  }

  const key = `socket_rl:${event}:${identifier}`;

  // Use Redis if connected, otherwise fall back to in-memory
  if (isRedisConnected()) {
    return checkRedisRateLimit(key, limit.max, limit.windowSec);
  } else {
    return checkInMemoryRateLimit(key, limit.max, limit.windowSec);
  }
}

/**
 * Redis-backed rate limit check using INCR with TTL.
 */
async function checkRedisRateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedisClient();
    
    // Increment counter
    const current = await redis.incr(key);
    
    // Set TTL on first request in window
    if (current === 1) {
      await redis.expire(key, windowSec);
    }
    
    const allowed = current <= max;
    const remaining = Math.max(0, max - current);
    
    return { allowed, remaining };
  } catch (error) {
    // On Redis error, fail open (allow the request)
    console.error("[RateLimit] Redis error, failing open:", error);
    return { allowed: true, remaining: -1 };
  }
}

/**
 * In-memory rate limit check as fallback when Redis is not available.
 * Note: This only works for single-instance deployments.
 */
function checkInMemoryRateLimit(
  key: string,
  max: number,
  windowSec: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = inMemoryCounters.get(key);
  
  // Clean up expired entry
  if (entry && entry.expiresAt <= now) {
    inMemoryCounters.delete(key);
  }
  
  const currentEntry = inMemoryCounters.get(key);
  
  if (!currentEntry) {
    // First request in window
    inMemoryCounters.set(key, {
      count: 1,
      expiresAt: now + (windowSec * 1000),
    });
    return { allowed: true, remaining: max - 1 };
  }
  
  // Increment counter
  currentEntry.count++;
  
  const allowed = currentEntry.count <= max;
  const remaining = Math.max(0, max - currentEntry.count);
  
  return { allowed, remaining };
}

/**
 * Get rate limit info for an event without incrementing counter.
 * Useful for debugging or displaying limit info to users.
 */
export function getRateLimitInfo(event: string): { max: number; windowSec: number } | null {
  return SOCKET_RATE_LIMITS[event] ?? null;
}

/**
 * Periodic cleanup of expired in-memory counters.
 * Should be called on an interval to prevent memory leaks.
 */
export function cleanupExpiredInMemoryCounters(): void {
  const now = Date.now();
  for (const [key, entry] of inMemoryCounters.entries()) {
    if (entry.expiresAt <= now) {
      inMemoryCounters.delete(key);
    }
  }
}

// Run cleanup every 60 seconds for in-memory counters
setInterval(cleanupExpiredInMemoryCounters, 60000);

