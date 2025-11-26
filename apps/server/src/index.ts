import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./features/signaling/socket-handlers.js";
import { PoolManager } from "./features/routing/pool-manager.js";
import type {
  WidgetToServerEvents,
  DashboardToServerEvents,
  ServerToWidgetEvents,
  ServerToDashboardEvents,
} from "@ghost-greeter/domain";

const PORT = process.env["PORT"] ?? 3001;
const ALLOWED_ORIGINS = process.env["ALLOWED_ORIGINS"]?.split(",") ?? [
  "http://localhost:3000",
  "http://localhost:5173",
];

// Initialize Express
const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// API: Update organization configuration (path rules for pools)
app.post("/api/config/org", (req, res) => {
  const { orgId, defaultPoolId, pathRules } = req.body;
  
  if (!orgId) {
    res.status(400).json({ error: "orgId is required" });
    return;
  }

  poolManager.setOrgConfig(orgId, defaultPoolId ?? null, pathRules ?? []);
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
  res.json({ success: true });
});

// API: Get pool manager stats
app.get("/api/stats", (_req, res) => {
  const stats = poolManager.getGlobalStats();
  res.json(stats);
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with typed events
const io = new Server<
  WidgetToServerEvents & DashboardToServerEvents,
  ServerToWidgetEvents & ServerToDashboardEvents
>(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
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
  console.log(`🔒 CORS enabled for: ${ALLOWED_ORIGINS.join(", ")}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

