import "dotenv/config";
import * as Sentry from "@sentry/node";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./features/signaling/socket-handlers.js";
import { PoolManager } from "./features/routing/pool-manager.js";
import type {
  WidgetToServerEvents,
  DashboardToServerEvents,
  ServerToWidgetEvents,
  ServerToDashboardEvents,
} from "@ghost-greeter/domain";

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
// CORS configuration
// If ALLOWED_ORIGINS is "*" or not set (in production), allow all origins
// This is needed because the widget can be embedded on any customer website
const ALLOWED_ORIGINS_ENV = process.env["ALLOWED_ORIGINS"];
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV && ALLOWED_ORIGINS_ENV !== "*"
  ? ALLOWED_ORIGINS_ENV.split(",")
  : ["http://localhost:3000", "http://localhost:5173"];

// Allow all origins if ALLOWED_ORIGINS is "*" or if running on Railway/production
const IS_PRODUCTION = !!process.env["RAILWAY_ENVIRONMENT"] || process.env["NODE_ENV"] === "production";
const CORS_ORIGIN = ALLOWED_ORIGINS_ENV === "*" || IS_PRODUCTION
  ? true  // Allow all origins (widget can be embedded anywhere)
  : ALLOWED_ORIGINS;

// Initialize Express
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Rate limiting configuration
const RATE_LIMIT_ENABLED = process.env["RATE_LIMIT_ENABLED"] !== "false";
const RATE_LIMIT_WINDOW_MS = parseInt(process.env["RATE_LIMIT_WINDOW_MS"] ?? "60000", 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] ?? "100", 10);

// Apply rate limiting to API endpoints
if (RATE_LIMIT_ENABLED) {
  const apiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks
    skip: (req) => req.path === "/health",
  });
  
  app.use("/api", apiLimiter);
  console.log(`📊 Rate limiting enabled: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS}ms`);
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// API: Update organization configuration (path rules for pools)
// Note: In production, this should verify the request comes from an authorized source
// For now, we trust internal dashboard requests
app.post("/api/config/org", (req, res) => {
  const { orgId, defaultPoolId, pathRules } = req.body;
  
  if (!orgId) {
    res.status(400).json({ error: "orgId is required" });
    return;
  }

  // Validate pathRules structure
  if (pathRules && !Array.isArray(pathRules)) {
    res.status(400).json({ error: "pathRules must be an array" });
    return;
  }

  poolManager.setOrgConfig(orgId, defaultPoolId ?? null, pathRules ?? []);
  console.log(`[API] Org config updated: ${orgId} with ${pathRules?.length ?? 0} rules`);
  res.json({ success: true });
});

// API: Update agent pool memberships
app.post("/api/config/agent-pools", (req, res) => {
  const { agentId, poolIds } = req.body;
  
  if (!agentId || !Array.isArray(poolIds)) {
    res.status(400).json({ error: "agentId and poolIds array are required" });
    return;
  }

  poolManager.setAgentPoolMemberships(agentId, poolIds);
  console.log(`[API] Agent ${agentId} pool memberships updated: ${poolIds.length} pools`);
  res.json({ success: true });
});

// API: Get pool manager stats
app.get("/api/stats", (_req, res) => {
  const stats = poolManager.getGlobalStats();
  res.json(stats);
});

// API: Test URL matching (for debugging)
app.get("/api/test-match", (req, res) => {
  const { orgId, url } = req.query;
  
  if (!orgId || !url || typeof orgId !== "string" || typeof url !== "string") {
    res.status(400).json({ error: "orgId and url query params are required" });
    return;
  }

  const matchedPoolId = poolManager.matchPathToPool(orgId, url);
  res.json({ 
    orgId,
    url,
    matchedPoolId,
    timestamp: Date.now()
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with typed events
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

// Initialize the Pool Manager (singleton)
const poolManager = new PoolManager();

// Setup socket handlers
setupSocketHandlers(io, poolManager);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Ghost-Greeter signaling server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🔒 CORS enabled for: ${CORS_ORIGIN === true ? "all origins (production mode)" : ALLOWED_ORIGINS.join(", ")}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Global error handlers for Sentry
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  Sentry.captureException(error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  Sentry.captureException(reason);
});

