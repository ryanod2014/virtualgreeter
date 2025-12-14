import "dotenv/config";
// Infrastructure v2: Redis, health checks, rate limiting
import * as Sentry from "@sentry/node";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { setupSocketHandlers } from "./features/signaling/socket-handlers.js";
import { setupRedisSocketHandlers } from "./features/signaling/redis-socket-handlers.js";
import { PoolManager } from "./features/routing/pool-manager.js";
import { RedisPoolManager } from "./features/routing/redis-pool-manager.js";
import { 
  initializeRedis, 
  initializePubSub, 
  closeRedis,
  isRedisConnected,
  getRedisClient,
} from "./lib/redis.js";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import {
  HealthChecker,
  createMemoryCheck,
  createRedisCheck,
  createSupabaseCheck,
  markShuttingDown,
  isInShutdownMode,
} from "./lib/health.js";
import type {
  WidgetToServerEvents,
  DashboardToServerEvents,
  ServerToWidgetEvents,
  ServerToDashboardEvents,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";
import { handleStripeWebhook } from "./features/billing/stripe-webhook-handler.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialize Sentry for error tracking
if (process.env["SENTRY_DSN"]) {
  Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    environment: process.env["NODE_ENV"] ?? "development",
    tracesSampleRate: 1.0,
  });
  console.log("🔍 Sentry error tracking enabled");
}

const PORT = process.env["PORT"] ?? 3001;

// Redis configuration
// USE_REDIS=true enables Redis for state management and Socket.io adapter
// Defaults to false (in-memory) if not set or if REDIS_URL is missing
const USE_REDIS = process.env["USE_REDIS"] === "true" && !!process.env["REDIS_URL"];

// CORS configuration
const ALLOWED_ORIGINS_ENV = process.env["ALLOWED_ORIGINS"];
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV && ALLOWED_ORIGINS_ENV !== "*"
  ? ALLOWED_ORIGINS_ENV.split(",")
  : ["http://localhost:3000", "http://localhost:5173"];

const IS_PRODUCTION = !!process.env["RAILWAY_ENVIRONMENT"] || process.env["NODE_ENV"] === "production";
const CORS_ORIGIN = ALLOWED_ORIGINS_ENV === "*" || IS_PRODUCTION
  ? true
  : ALLOWED_ORIGINS;

// Health check configuration
const HEALTH_CHECK_TIMEOUT_MS = parseInt(process.env["HEALTH_CHECK_TIMEOUT_MS"] ?? "5000", 10);
const METRICS_API_KEY = process.env["METRICS_API_KEY"];

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

// ============================================================================
// STRIPE WEBHOOK (must be before express.json() for raw body access)
// ============================================================================
// Stripe webhooks require the raw request body for signature verification
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());

// Rate limiting configuration
const RATE_LIMIT_ENABLED = process.env["RATE_LIMIT_ENABLED"] !== "false";
const RATE_LIMIT_WINDOW_MS = parseInt(process.env["RATE_LIMIT_WINDOW_MS"] ?? "60000", 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] ?? "100", 10);

/**
 * Creates a rate limiter that uses Redis store when available, 
 * otherwise falls back to in-memory store.
 * Redis-backed rate limiting ensures limits work correctly across multiple server replicas.
 */
function createRateLimiter() {
  const baseConfig = {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for observability endpoints
    skip: (req: express.Request) => ["/health", "/ready", "/live", "/metrics"].includes(req.path),
  };

  // Use Redis store if Redis is connected, otherwise fall back to memory
  if (USE_REDIS && isRedisConnected()) {
    console.log("📊 Rate limiting: Redis-backed (distributed)");
    return rateLimit({
      ...baseConfig,
      store: new RedisStore({
        sendCommand: (...args: string[]) => getRedisClient().sendCommand(args),
        prefix: "rl:", // Rate limit key prefix
      }),
    });
  } else {
    console.log("📊 Rate limiting: In-memory (single instance only)");
    return rateLimit(baseConfig);
  }
}

// Note: Rate limiter is applied after Redis initialization in startServer()
// This placeholder will be replaced with the actual limiter
let rateLimiterApplied = false;

// ============================================================================
// POOL MANAGER (will be set after Redis initialization)
// ============================================================================

let redisPoolManager: RedisPoolManager | null = null;
let inMemoryPoolManager: PoolManager | null = null;

// Socket.io server reference for metrics
let ioServer: Server | null = null;

// ============================================================================
// HEALTH CHECKER INITIALIZATION
// ============================================================================

const healthChecker = new HealthChecker(HEALTH_CHECK_TIMEOUT_MS);

// Register memory check (always available)
healthChecker.register(createMemoryCheck());

// Register Redis check (only if Redis is enabled)
if (USE_REDIS) {
  healthChecker.register(
    createRedisCheck(isRedisConnected, async () => {
      const client = getRedisClient();
      return client.ping();
    })
  );
}

// Register Supabase check (non-critical)
healthChecker.register(createSupabaseCheck(isSupabaseConfigured, supabase));

// ============================================================================
// OBSERVABILITY ENDPOINTS
// ============================================================================

/**
 * GET /health - Comprehensive health check
 * Checks all critical dependencies and returns appropriate status
 * Returns: 200 if healthy/degraded, 503 if unhealthy
 */
app.get("/health", async (_req, res) => {
  try {
    const result = await healthChecker.runAll();
    const statusCode = result.status === "unhealthy" ? 503 : 200;
    
    // Add mode information for backwards compatibility
    const response = {
      ...result,
      mode: USE_REDIS ? "redis" : "in-memory",
    };
    
    res.status(statusCode).json(response);
  } catch (error) {
    console.error("[Health] Health check error:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: Date.now(),
      error: "Health check failed",
    });
  }
});

/**
 * GET /ready - Readiness probe for load balancers
 * Indicates if the server is ready to accept traffic
 * Returns: 200 if ready, 503 if not ready
 */
app.get("/ready", async (_req, res) => {
  try {
    // Not ready if shutting down
    if (isInShutdownMode()) {
      res.status(503).json({ ready: false, reason: "Server is shutting down" });
      return;
    }

    const result = await healthChecker.runAll();

    if (result.status === "unhealthy") {
      // Find the first critical failure for the reason
      const failedCheck = Object.entries(result.checks).find(
        ([, check]) => check.status === "unhealthy" && check.error
      );
      const reason = failedCheck
        ? `${failedCheck[0]}: ${failedCheck[1].error}`
        : "Critical dependency failed";
      res.status(503).json({ ready: false, reason });
    } else {
      res.json({ ready: true });
    }
  } catch (error) {
    console.error("[Ready] Readiness check error:", error);
    res.status(503).json({ ready: false, reason: "Readiness check failed" });
  }
});

/**
 * GET /live - Liveness probe
 * Indicates if the server process is alive
 * Always returns 200 if the process is running
 */
app.get("/live", (_req, res) => {
  res.json({ alive: true, pid: process.pid });
});

/**
 * GET /metrics - Server metrics for monitoring dashboards
 * Returns connection counts, call stats, memory usage, and uptime
 * 
 * SECURITY:
 * - In production: REQUIRES API key via query param or header
 * - Internal requests (x-internal-request header) bypass API key check
 * - In development: API key is optional
 */
app.get("/metrics", async (req, res) => {
  // Security: In production, require API key
  if (IS_PRODUCTION) {
    // Log warning if API key not configured (security misconfiguration)
    if (!METRICS_API_KEY) {
      console.warn("[Security] ⚠️ METRICS_API_KEY not configured in production! Metrics endpoint will only allow internal requests.");
    }
    
    const providedKey = req.query["key"] || req.headers["x-metrics-api-key"];
    const internalHeader = req.headers["x-internal-request"];
    
    // Allow internal requests (from Railway/monitoring systems) without API key
    if (internalHeader === "true") {
      // Internal request - proceed without API key check
    } else if (!providedKey) {
      // No API key provided - unauthorized
      res.status(401).json({ error: "API key required" });
      return;
    } else if (providedKey !== METRICS_API_KEY) {
      // Wrong API key - forbidden
      res.status(403).json({ error: "Invalid API key" });
      return;
    }
  } else if (METRICS_API_KEY) {
    // Development with API key configured - still enforce it
    const providedKey = req.query["key"] || req.headers["x-metrics-api-key"];
    const internalHeader = req.headers["x-internal-request"];

    if (providedKey !== METRICS_API_KEY && internalHeader !== "true") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    // Get stats from the appropriate pool manager
    let stats;
    let extendedStats;
    
    if (USE_REDIS && redisPoolManager) {
      stats = await redisPoolManager.getGlobalStats();
      extendedStats = await redisPoolManager.getExtendedStats();
    } else if (inMemoryPoolManager) {
      stats = inMemoryPoolManager.getGlobalStats();
      extendedStats = inMemoryPoolManager.getExtendedStats();
    } else {
      stats = { totalAgents: 0, onlineAgents: 0, totalVisitors: 0, activeCalls: 0, totalSimulations: 0 };
      extendedStats = { pendingCalls: 0, poolCount: 0, agentsByPool: {}, orgConfigCount: 0 };
    }

    const memory = process.memoryUsage();

    res.json({
      timestamp: Date.now(),
      mode: USE_REDIS ? "redis" : "in-memory",
      connections: {
        agents: stats.totalAgents,
        onlineAgents: stats.onlineAgents,
        visitors: stats.totalVisitors,
        sockets: ioServer?.sockets.sockets.size ?? 0,
      },
      calls: {
        active: stats.activeCalls,
        simulations: stats.totalSimulations,
        pending: extendedStats.pendingCalls,
      },
      pools: {
        total: extendedStats.poolCount,
        activeAgentsByPool: extendedStats.agentsByPool,
      },
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
      },
      uptime: Math.floor(process.uptime()),
    });
  } catch (error) {
    console.error("[Metrics] Metrics collection error:", error);
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

// API: Update organization configuration
app.post("/api/config/org", async (req, res) => {
  const { orgId, defaultPoolId, pathRules } = req.body;
  
  if (!orgId) {
    res.status(400).json({ error: "orgId is required" });
    return;
  }

  if (pathRules && !Array.isArray(pathRules)) {
    res.status(400).json({ error: "pathRules must be an array" });
    return;
  }

  if (USE_REDIS && redisPoolManager) {
    await redisPoolManager.setOrgConfig(orgId, defaultPoolId ?? null, pathRules ?? []);
  } else if (inMemoryPoolManager) {
    inMemoryPoolManager.setOrgConfig(orgId, defaultPoolId ?? null, pathRules ?? []);
  }
  
  console.log(`[API] Org config updated: ${orgId} with ${pathRules?.length ?? 0} rules`);
  res.json({ success: true });
});

// API: Update agent pool memberships
app.post("/api/config/agent-pools", async (req, res) => {
  const { agentId, poolIds } = req.body;
  
  if (!agentId || !Array.isArray(poolIds)) {
    res.status(400).json({ error: "agentId and poolIds array are required" });
    return;
  }

  if (USE_REDIS && redisPoolManager) {
    await redisPoolManager.setAgentPoolMemberships(agentId, poolIds);
  } else if (inMemoryPoolManager) {
    inMemoryPoolManager.setAgentPoolMemberships(agentId, poolIds);
  }
  
  console.log(`[API] Agent ${agentId} pool memberships updated: ${poolIds.length} pools`);
  res.json({ success: true });
});

// API: Get pool manager stats
app.get("/api/stats", async (_req, res) => {
  let stats;
  if (USE_REDIS && redisPoolManager) {
    stats = await redisPoolManager.getGlobalStats();
  } else if (inMemoryPoolManager) {
    stats = inMemoryPoolManager.getGlobalStats();
  } else {
    stats = { error: "Pool manager not initialized" };
  }
  res.json(stats);
});

// API: Test URL matching
app.get("/api/test-match", async (req, res) => {
  const { orgId, url } = req.query;

  if (!orgId || !url || typeof orgId !== "string" || typeof url !== "string") {
    res.status(400).json({ error: "orgId and url query params are required" });
    return;
  }

  let matchedPoolId: string | null = null;
  if (USE_REDIS && redisPoolManager) {
    matchedPoolId = await redisPoolManager.matchPathToPool(orgId, url);
  } else if (inMemoryPoolManager) {
    matchedPoolId = inMemoryPoolManager.matchPathToPool(orgId, url);
  }

  res.json({
    orgId,
    url,
    matchedPoolId,
    timestamp: Date.now()
  });
});

// API: End active call for agent (called during agent removal)
app.post("/api/agent/end-call", async (req, res) => {
  // Security: Authentication check
  const INTERNAL_API_KEY = process.env["INTERNAL_API_KEY"];
  const providedKey = req.headers["x-internal-api-key"];

  if (IS_PRODUCTION || INTERNAL_API_KEY) {
    // In production or when API key is configured, enforce authentication
    if (!INTERNAL_API_KEY) {
      console.error("[Security] ⚠️ INTERNAL_API_KEY not configured! This endpoint is vulnerable.");
      res.status(500).json({ error: "Server misconfiguration" });
      return;
    }

    if (!providedKey || providedKey !== INTERNAL_API_KEY) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const { agentId } = req.body;

  if (!agentId || typeof agentId !== "string") {
    res.status(400).json({ error: "agentId is required" });
    return;
  }

  // Security: Organization isolation check
  // Verify the agent exists and get its organization
  const { getAgentOrgId } = await import("./lib/auth.js");
  const agentOrgId = await getAgentOrgId(agentId);

  if (!agentOrgId) {
    // Return generic success to avoid information disclosure
    res.json({ success: true });
    return;
  }

  // This endpoint is called from the dashboard when removing an agent
  // It forcefully ends any active call the agent is in

  let activeCall = null;
  let poolManager = null;

  if (USE_REDIS && redisPoolManager) {
    poolManager = redisPoolManager;
    activeCall = await redisPoolManager.getActiveCallByAgentId(agentId);
  } else if (inMemoryPoolManager) {
    poolManager = inMemoryPoolManager;
    activeCall = inMemoryPoolManager.getActiveCallByAgentId(agentId);
  }

  if (!activeCall) {
    // Return generic success to avoid information disclosure
    res.json({ success: true });
    return;
  }

  console.log(`[API] Ending active call ${activeCall.callId} for agent ${agentId} (agent removal)`);

  // Import the call ending functions
  const { markCallEnded } = await import("./lib/call-logger.js");
  const { recordStatusChange } = await import("./lib/session-tracker.js");

  // Database operations with error handling
  try {
    // Mark call as completed in database
    await markCallEnded(activeCall.callId);
  } catch (error) {
    console.error(`[API] Failed to mark call ${activeCall.callId} as ended in database:`, error);
    // Continue with pool manager cleanup and notifications even if DB write fails
  }

  // End the call in pool manager
  if (USE_REDIS && redisPoolManager) {
    await redisPoolManager.endCall(activeCall.callId);
  } else if (inMemoryPoolManager) {
    inMemoryPoolManager.endCall(activeCall.callId);
  }

  // Record status change with error handling
  try {
    await recordStatusChange(agentId, "idle", "call_ended");
  } catch (error) {
    console.error(`[API] Failed to record status change for agent ${agentId}:`, error);
    // Continue - this is non-critical logging
  }

  // Notify the visitor that the call has ended
  const visitor = poolManager ?
    (USE_REDIS && redisPoolManager ? await redisPoolManager.getVisitor(activeCall.visitorId) : inMemoryPoolManager?.getVisitor(activeCall.visitorId))
    : null;

  if (visitor && ioServer) {
    const visitorSocket = ioServer.sockets.sockets.get(visitor.socketId);
    visitorSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
      callId: activeCall.callId,
      reason: "agent_ended",
      message: "Agent has ended the call",
    });
  }

  // Notify the agent (if still connected)
  const agent = poolManager ?
    (USE_REDIS && redisPoolManager ? await redisPoolManager.getAgent(agentId) : inMemoryPoolManager?.getAgent(agentId))
    : null;

  if (agent && ioServer) {
    const agentSocket = ioServer.sockets.sockets.get(agent.socketId);
    agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
      callId: activeCall.callId,
      reason: "agent_ended",
      message: "Call ended due to agent removal",
    });
  }

  // Return generic success message to avoid information disclosure
  res.json({ success: true });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.io
  const io = new Server<
    WidgetToServerEvents & DashboardToServerEvents,
    ServerToWidgetEvents & ServerToDashboardEvents
  >(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });
  
  // Set global reference for metrics endpoint
  ioServer = io;

  // ============================================================================
  // REDIS INITIALIZATION (if enabled)
  // ============================================================================

  if (USE_REDIS) {
    console.log("🔴 Redis mode enabled - initializing...");
    
    try {
      // Initialize main Redis client
      await initializeRedis();
      
      // Initialize pub/sub clients for Socket.io adapter
      const { pub, sub } = await initializePubSub();
      
      // Attach Redis adapter to Socket.io for horizontal scaling
      io.adapter(createAdapter(pub, sub));
      console.log("📡 Socket.io Redis adapter configured");
      
      // Use Redis-backed pool manager
      redisPoolManager = new RedisPoolManager();
      
      // Setup Redis socket handlers
      setupRedisSocketHandlers(io, redisPoolManager);
      
      console.log("✅ Redis initialization complete");

      // Apply Redis-backed rate limiter after Redis is connected
      if (RATE_LIMIT_ENABLED && !rateLimiterApplied) {
        app.use("/api", createRateLimiter());
        rateLimiterApplied = true;
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Redis initialization failed: ${message}`);
      console.error("💀 Cannot start server without Redis when USE_REDIS=true");
      console.error("   Set USE_REDIS=false to use in-memory mode, or fix Redis connection");
      process.exit(1);
    }
  } else {
    // ============================================================================
    // IN-MEMORY MODE
    // ============================================================================
    
    console.log("💾 In-memory mode - no Redis");
    
    // Use in-memory pool manager
    inMemoryPoolManager = new PoolManager();
    
    // Setup standard socket handlers
    setupSocketHandlers(io, inMemoryPoolManager);

    // Apply in-memory rate limiter
    if (RATE_LIMIT_ENABLED && !rateLimiterApplied) {
      app.use("/api", createRateLimiter());
      rateLimiterApplied = true;
    }
  }

  // ============================================================================
  // START SERVER
  // ============================================================================

  httpServer.listen(PORT, () => {
    console.log(`🚀 Ghost-Greeter signaling server running on port ${PORT}`);
    console.log(`📡 Socket.io ready for connections`);
    console.log(`🔒 CORS enabled for: ${CORS_ORIGIN === true ? "all origins (production mode)" : ALLOWED_ORIGINS.join(", ")}`);
    console.log(`📦 State management: ${USE_REDIS ? "Redis (distributed)" : "In-memory (single instance)"}`);
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN
  // ============================================================================

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    
    // Mark as shutting down so readiness probe returns 503
    markShuttingDown();
    
    // Close Socket.io connections
    io.close();
    
    // Close Redis connections if enabled
    if (USE_REDIS) {
      await closeRedis();
    }
    
    // Close HTTP server
    httpServer.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Global error handlers for Sentry
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    Sentry.captureException(error);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
    Sentry.captureException(reason);
  });
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

