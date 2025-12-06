/**
 * Redis-enabled Socket Handlers
 * 
 * This is a modified version of socket-handlers.ts that works with the
 * async RedisPoolManager for distributed state management.
 * 
 * Key differences from the in-memory version:
 * - All pool manager operations are async/await
 * - Timeout management uses Redis instead of local Maps
 * - State is distributed across server instances
 */

import type { Server, Socket } from "socket.io";
import type {
  WidgetToServerEvents,
  DashboardToServerEvents,
  ServerToWidgetEvents,
  ServerToDashboardEvents,
  VisitorJoinPayload,
  VisitorInteractionPayload,
  WidgetPageviewPayload,
  AgentLoginPayload,
  AgentStatusPayload,
  AgentAwayPayload,
  StatusAckPayload,
  CallRequestPayload,
  CallAcceptPayload,
  CallRejectPayload,
  CallCancelPayload,
  CallEndPayload,
  CallReconnectPayload,
  WebRTCSignalPayload,
  CobrowseSnapshotPayload,
  CobrowseMousePayload,
  CobrowseScrollPayload,
  CobrowseSelectionPayload,
  AgentProfile,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS, ERROR_CODES, TIMING } from "@ghost-greeter/domain";
import type { RedisPoolManager } from "../routing/redis-pool-manager.js";
import {
  createCallLog,
  markCallAccepted,
  markCallEnded,
  markCallMissed,
  markCallRejected,
  markCallCancelled,
  getCallLogId,
  getCallByReconnectToken,
  markCallReconnected,
  markCallReconnectFailed,
} from "../../lib/call-logger.js";
import { verifyAgentToken, fetchAgentPoolMemberships } from "../../lib/auth.js";
import {
  startSession,
  endSession,
  recordStatusChange,
} from "../../lib/session-tracker.js";
import { recordEmbedVerification } from "../../lib/embed-tracker.js";
import { recordPageview } from "../../lib/pageview-logger.js";
import { getWidgetSettings } from "../../lib/widget-settings.js";
import { getCallSettings } from "../../lib/call-settings.js";
import { getClientIP, getLocationFromIP } from "../../lib/geolocation.js";
import { isCountryBlocked } from "../../lib/country-blocklist.js";
import { trackWidgetView, trackCallStarted } from "../../lib/greetnow-retargeting.js";
import {
  startRNATimeout,
  clearRNATimeout,
  getExpiredRNATimeouts,
  startPendingDisconnect,
  clearPendingDisconnect,
  getExpiredPendingDisconnects,
  startPendingReconnect,
  clearPendingReconnect,
  getPendingReconnect,
  findPendingReconnectBySocket,
  getExpiredPendingReconnects,
} from "../../lib/redis-timeouts.js";
import { checkSocketRateLimit } from "./socket-rate-limit.js";

const AGENT_DISCONNECT_GRACE_PERIOD = 10000; // 10 seconds

type AppSocket = Socket<
  WidgetToServerEvents & DashboardToServerEvents,
  ServerToWidgetEvents & ServerToDashboardEvents
>;

type AppServer = Server<
  WidgetToServerEvents & DashboardToServerEvents,
  ServerToWidgetEvents & ServerToDashboardEvents
>;

export function setupRedisSocketHandlers(io: AppServer, poolManager: RedisPoolManager) {
  io.on("connection", (socket: AppSocket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    // -------------------------------------------------------------------------
    // VISITOR EVENTS (Widget)
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.VISITOR_JOIN, async (data: VisitorJoinPayload) => {
      // Rate limit visitor join events
      const { allowed } = await checkSocketRateLimit("widget:join", socket.id);
      if (!allowed) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait.",
        });
        return;
      }
      
      console.log("[Socket] 👤 VISITOR_JOIN received:", { orgId: data.orgId, pageUrl: data.pageUrl });
      
      const existingVisitor = await poolManager.getVisitorBySocketId(socket.id);
      if (existingVisitor && existingVisitor.state === "in_call") {
        console.log(`[Socket] 👤 Visitor ${existingVisitor.visitorId} already in call, skipping VISITOR_JOIN registration`);
        // Just update the page URL in case it changed (would need separate method)
        return;
      }
      
      recordEmbedVerification(data.orgId, data.pageUrl).catch(() => {});
      
      const visitorId = data.visitorId ?? `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      const ipAddress = getClientIP(socket.handshake);
      console.log("[Socket] Visitor IP:", ipAddress);
      
      let location = null;
      try {
        location = await getLocationFromIP(ipAddress);
        if (location) {
          console.log(`[Socket] Visitor ${visitorId} location resolved: ${location.city}, ${location.region}, ${location.countryCode}`);
        }
      } catch {
        // Silently ignore
      }
      
      const countryBlocked = await isCountryBlocked(data.orgId, location?.countryCode ?? null);
      if (countryBlocked) {
        console.log(`[Socket] 🚫 Visitor ${visitorId} blocked from country: ${location?.countryCode}`);
        socket.disconnect(true);
        return;
      }
      
      const session = await poolManager.registerVisitor(
        socket.id,
        visitorId,
        data.orgId,
        data.pageUrl,
        ipAddress
      );
      console.log("[Socket] Visitor registered:", visitorId);
      
      if (location) {
        await poolManager.updateVisitorLocation(visitorId, location);
      }

      const result = await poolManager.findBestAgentForVisitor(data.orgId, data.pageUrl);
      console.log("[Socket] Best agent found:", result?.agent.agentId ?? "NONE", "pool:", result?.poolId ?? "none");
      
      if (result) {
        const { agent, poolId } = result;
        await poolManager.assignVisitorToAgent(visitorId, agent.agentId);
        console.log(`[Socket] ✅ Assigned visitor ${visitorId} to agent ${agent.agentId}, simulations: ${agent.currentSimulations.length}`);
        
        const updatedStats = await poolManager.getAgentStats(agent.agentId);
        if (updatedStats) {
          const agentSocket = io.sockets.sockets.get(agent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.STATS_UPDATE, updatedStats);
        }
        
        const widgetSettings = await getWidgetSettings(data.orgId, poolId);
        
        socket.emit(SOCKET_EVENTS.AGENT_ASSIGNED, {
          agent: {
            id: agent.profile.id,
            displayName: agent.profile.displayName,
            avatarUrl: agent.profile.avatarUrl,
            waveVideoUrl: agent.profile.waveVideoUrl,
            introVideoUrl: agent.profile.introVideoUrl,
            connectVideoUrl: agent.profile.connectVideoUrl,
            loopVideoUrl: agent.profile.loopVideoUrl,
          },
          visitorId: session.visitorId,
          widgetSettings,
        });
      } else {
        const poolId = await poolManager.matchPathToPool(data.orgId, data.pageUrl);
        const widgetSettings = await getWidgetSettings(data.orgId, poolId);
        
        console.log(`[Socket] ⚠️ No agents available for visitor ${visitorId}, sending widget settings (trigger_delay: ${widgetSettings.trigger_delay}s)`);
        
        socket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
          visitorId: session.visitorId,
          widgetSettings,
          poolId,
        });
      }
    });

    socket.on(SOCKET_EVENTS.VISITOR_INTERACTION, async (_data: VisitorInteractionPayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (visitor && !visitor.interactedAt) {
        await poolManager.updateVisitorState(visitor.visitorId, "watching_simulation");
      }
    });

    socket.on(SOCKET_EVENTS.WIDGET_PAGEVIEW, async (data: WidgetPageviewPayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        console.log("[Socket] Pageview received but no visitor found for socket:", socket.id);
        return;
      }

      const agent = await poolManager.getAgent(data.agentId);
      const poolId = agent ? await poolManager.getAgentPrimaryPool(data.agentId) : null;

      recordPageview({
        visitorId: visitor.visitorId,
        agentId: data.agentId,
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        poolId,
        visitorCountryCode: visitor.location?.countryCode ?? null,
      }).catch(() => {});

      trackWidgetView({
        orgId: visitor.orgId,
        visitorId: visitor.visitorId,
        pageUrl: visitor.pageUrl,
        ipAddress: visitor.ipAddress ?? undefined,
        userAgent: socket.handshake.headers["user-agent"],
      }).catch(() => {});

      console.log(`[Socket] 👁️ WIDGET_PAGEVIEW recorded for visitor ${visitor.visitorId}`);
    });

    socket.on(SOCKET_EVENTS.WIDGET_MISSED_OPPORTUNITY, async (data: { triggerDelaySeconds: number; poolId: string | null }) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        console.log("[Socket] Missed opportunity received but no visitor found for socket:", socket.id);
        return;
      }

      recordPageview({
        visitorId: visitor.visitorId,
        agentId: null,
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        poolId: data.poolId,
        visitorCountryCode: visitor.location?.countryCode ?? null,
        triggerDelaySeconds: data.triggerDelaySeconds,
      }).catch(() => {});

      console.log(`[Socket] ⚠️ MISSED_OPPORTUNITY recorded for visitor ${visitor.visitorId} (trigger_delay: ${data.triggerDelaySeconds}s)`);
    });

    socket.on(SOCKET_EVENTS.CALL_REQUEST, async (data: CallRequestPayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.VISITOR_NOT_FOUND,
          message: "Visitor session not found",
        });
        return;
      }

      // Rate limit call requests to prevent spam
      const { allowed } = await checkSocketRateLimit("widget:requestCall", visitor.visitorId);
      if (!allowed) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "RATE_LIMITED",
          message: "Too many call requests. Please wait.",
        });
        return;
      }

      const existingCall = await poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (existingCall) {
        console.log(`[Socket] Visitor ${visitor.visitorId} has existing call ${existingCall.callId}, cleaning up first`);
        await poolManager.endCall(existingCall.callId);
        markCallEnded(existingCall.callId);
        
        const previousAgent = await poolManager.getAgent(existingCall.agentId);
        if (previousAgent) {
          const agentSocket = io.sockets.sockets.get(previousAgent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
            callId: existingCall.callId,
            reason: "visitor_ended",
          });
        }
      }

      let targetAgent = await poolManager.getAgent(data.agentId);
      let targetAgentId = data.agentId;

      if (!targetAgent || targetAgent.profile.status === "in_call" || targetAgent.profile.status === "offline" || targetAgent.profile.status === "away") {
        const alternativeResult = await poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
        
        if (alternativeResult && alternativeResult.agent.agentId !== data.agentId) {
          console.log(`[Socket] Agent ${data.agentId} unavailable (${targetAgent?.profile.status ?? 'not found'}), rerouting to ${alternativeResult.agent.agentId}`);
          targetAgent = alternativeResult.agent;
          targetAgentId = alternativeResult.agent.agentId;
        } else if (!targetAgent) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            code: ERROR_CODES.AGENT_NOT_FOUND,
            message: "Agent not found",
          });
          return;
        }
      }

      const request = await poolManager.createCallRequest(
        visitor.visitorId,
        targetAgentId,
        visitor.orgId,
        visitor.pageUrl
      );

      console.log(`[Socket] CALL_REQUEST from visitor ${visitor.visitorId} for agent ${targetAgentId}`);
      console.log(`[Socket] Agent status: ${targetAgent.profile.status}, socketId: ${targetAgent.socketId}`);

      createCallLog(request.requestId, {
        visitorId: visitor.visitorId,
        agentId: targetAgentId,
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        ipAddress: visitor.ipAddress,
        location: visitor.location,
      });

      if (targetAgent.profile.status !== "in_call" && targetAgent.profile.status !== "offline" && targetAgent.profile.status !== "away") {
        const agentSocket = io.sockets.sockets.get(targetAgent.socketId);
        if (agentSocket) {
          console.log(`[Socket] Sending CALL_INCOMING to agent ${targetAgentId}`);
          agentSocket.emit(SOCKET_EVENTS.CALL_INCOMING, {
            request,
            visitor: {
              visitorId: visitor.visitorId,
              pageUrl: visitor.pageUrl,
              connectedAt: visitor.connectedAt,
              location: visitor.location,
            },
          });

          // Start RNA timeout using Redis
          await startRNATimeout(request.requestId, targetAgentId, visitor.visitorId);
        } else {
          console.log(`[Socket] WARNING: Agent ${targetAgentId} socket not found! socketId: ${targetAgent.socketId}`);
        }
      } else {
        console.log(`[Socket] All agents busy. Visitor ${visitor.visitorId} queued for ${targetAgentId}.`);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_CANCEL, async (data: CallCancelPayload) => {
      await clearRNATimeout(data.requestId);
      markCallCancelled(data.requestId);
      
      const request = await poolManager.cancelCall(data.requestId);
      if (request) {
        const agent = await poolManager.getAgent(request.agentId);
        if (agent) {
          const agentSocket = io.sockets.sockets.get(agent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.CALL_CANCELLED, {
            requestId: data.requestId,
          });
        }
      }
    });

    // -------------------------------------------------------------------------
    // AGENT EVENTS (Dashboard)
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.AGENT_LOGIN, async (data: AgentLoginPayload) => {
      // Rate limit login attempts to prevent brute force
      const { allowed } = await checkSocketRateLimit("dashboard:login", socket.id);
      if (!allowed) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: "RATE_LIMITED",
          message: "Too many login attempts. Please wait.",
        });
        return;
      }

      const verification = await verifyAgentToken(data.token, data.agentId);
      
      if (!verification.valid) {
        console.error("[Socket] ❌ AGENT_LOGIN failed - invalid token:", verification.error);
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.AUTH_INVALID_TOKEN,
          message: verification.error ?? "Authentication failed",
        });
        return;
      }

      // Check for pending disconnect in Redis
      const pendingDisconnect = await clearPendingDisconnect(data.agentId);
      if (pendingDisconnect) {
        console.log(`[Socket] 🔄 Agent ${data.agentId} reconnected within grace period, restoring status: ${pendingDisconnect.previousStatus}`);
      }

      const poolMemberships = await fetchAgentPoolMemberships(data.agentId);
      if (poolMemberships.length > 0) {
        await poolManager.setAgentPoolMemberships(data.agentId, poolMemberships);
      }

      const statusToUse = pendingDisconnect?.previousStatus ?? "away";
      const profile: AgentProfile = {
        id: data.agentId,
        userId: verification.userId ?? data.agentId,
        displayName: data.profile.displayName,
        avatarUrl: data.profile.avatarUrl,
        waveVideoUrl: data.profile.waveVideoUrl,
        introVideoUrl: data.profile.introVideoUrl ?? "",
        connectVideoUrl: data.profile.connectVideoUrl,
        loopVideoUrl: data.profile.loopVideoUrl ?? "",
        status: statusToUse as AgentProfile["status"],
        maxSimultaneousSimulations: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const agentState = await poolManager.registerAgent(socket.id, profile);
      console.log("[Socket] 🟢 AGENT_LOGIN successful:", {
        agentId: data.agentId,
        socketId: socket.id,
        status: agentState.profile.status,
        poolCount: poolMemberships.length,
        reconnected: !!pendingDisconnect,
      });

      if (verification.organizationId) {
        await startSession(data.agentId, verification.organizationId);
      }
      
      socket.emit(SOCKET_EVENTS.LOGIN_SUCCESS, { agentState });
      
      const stats = await poolManager.getAgentStats(data.agentId);
      if (stats) {
        socket.emit(SOCKET_EVENTS.STATS_UPDATE, stats);
      }

      // Assign unassigned visitors
      const unassignedVisitors = await poolManager.getUnassignedVisitors();
      for (const visitor of unassignedVisitors) {
        const matchResult = await poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
        
        if (matchResult && matchResult.agent.agentId === agentState.agentId) {
          await poolManager.assignVisitorToAgent(visitor.visitorId, agentState.agentId);
          
          const widgetSettings = await getWidgetSettings(visitor.orgId, matchResult.poolId);
          
          const visitorSocket = io.sockets.sockets.get(visitor.socketId);
          visitorSocket?.emit(SOCKET_EVENTS.AGENT_ASSIGNED, {
            agent: {
              id: profile.id,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
              waveVideoUrl: profile.waveVideoUrl,
              introVideoUrl: profile.introVideoUrl,
              connectVideoUrl: profile.connectVideoUrl,
              loopVideoUrl: profile.loopVideoUrl,
            },
            visitorId: visitor.visitorId,
            widgetSettings,
            visitorConnectedAt: visitor.connectedAt,
          });
          console.log(`[Socket] Assigned unassigned visitor ${visitor.visitorId} to newly logged in agent ${agentState.agentId} (pool: ${matchResult.poolId})`);
        }
      }
    });

    socket.on(SOCKET_EVENTS.AGENT_STATUS, async (data: AgentStatusPayload) => {
      const agent = await poolManager.getAgentBySocketId(socket.id);
      if (agent) {
        // Rate limit status changes
        const { allowed } = await checkSocketRateLimit("dashboard:setStatus", agent.agentId);
        if (!allowed) {
          socket.emit(SOCKET_EVENTS.ERROR, {
            code: "RATE_LIMITED",
            message: "Too many status changes. Please wait.",
          });
          return;
        }

        await poolManager.updateAgentStatus(agent.agentId, data.status);
        await recordStatusChange(agent.agentId, data.status, "manual");
        
        if (data.status === "offline") {
          const reassignments = await poolManager.reassignVisitors(agent.agentId);
          await notifyReassignments(io, poolManager, reassignments, "agent_offline", agent.profile.displayName);
        }
      }
    });

    socket.on(SOCKET_EVENTS.AGENT_AWAY, async (data: AgentAwayPayload, ack?: (response: StatusAckPayload) => void) => {
      const agent = await poolManager.getAgentBySocketId(socket.id);
      if (!agent) {
        console.error(`[Socket] AGENT_AWAY failed - agent not found for socket ${socket.id}`);
        ack?.({ success: false, status: "offline", error: "Agent not found" });
        return;
      }

      try {
        console.log(`[Socket] 🚫 Agent ${agent.agentId} marked as away, reason: ${data.reason}`);
        console.log(`[Socket] Agent had ${agent.currentSimulations.length} visitors in simulations:`, agent.currentSimulations);
        
        await poolManager.updateAgentStatus(agent.agentId, "away");
        await recordStatusChange(agent.agentId, "away", data.reason);
        
        ack?.({ success: true, status: "away" });
        
        const reassignments = await poolManager.reassignVisitors(agent.agentId);
        console.log(`[Socket] Reassignment results: ${reassignments.reassigned.size} reassigned, ${reassignments.unassigned.length} unassigned`);
        await notifyReassignments(io, poolManager, reassignments, "agent_away", agent.profile.displayName);
        
        // Handle pending call requests
        const pendingRequests = await poolManager.getWaitingRequestsForAgent(agent.agentId);
        for (const request of pendingRequests) {
          const visitor = await poolManager.getVisitor(request.visitorId);
          if (visitor) {
            const newResult = await poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
            if (newResult && newResult.agent.agentId !== agent.agentId) {
              const newAgent = newResult.agent;
              markCallMissed(request.requestId);
              await poolManager.cancelCall(request.requestId);
              
              const newRequest = await poolManager.createCallRequest(
                visitor.visitorId,
                newAgent.agentId,
                visitor.orgId,
                visitor.pageUrl
              );
              
              createCallLog(newRequest.requestId, {
                visitorId: visitor.visitorId,
                agentId: newAgent.agentId,
                orgId: visitor.orgId,
                pageUrl: visitor.pageUrl,
                ipAddress: visitor.ipAddress,
                location: visitor.location,
              });
              
              const newAgentSocket = io.sockets.sockets.get(newAgent.socketId);
              if (newAgentSocket) {
                newAgentSocket.emit(SOCKET_EVENTS.CALL_INCOMING, {
                  request: newRequest,
                  visitor: {
                    visitorId: visitor.visitorId,
                    pageUrl: visitor.pageUrl,
                    connectedAt: visitor.connectedAt,
                    location: visitor.location,
                  },
                });
                await startRNATimeout(newRequest.requestId, newAgent.agentId, visitor.visitorId);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Socket] Error in AGENT_AWAY handler:`, error);
        ack?.({ success: false, status: agent.profile.status, error: "Internal error" });
      }
    });

    socket.on(SOCKET_EVENTS.AGENT_BACK, async (ack?: (response: StatusAckPayload) => void) => {
      const agent = await poolManager.getAgentBySocketId(socket.id);
      if (!agent) {
        console.error(`[Socket] AGENT_BACK failed - agent not found for socket ${socket.id}`);
        ack?.({ success: false, status: "offline", error: "Agent not found" });
        return;
      }

      try {
        console.log(`[Socket] Agent ${agent.agentId} is back from away`);
        await poolManager.updateAgentStatus(agent.agentId, "idle");
        await recordStatusChange(agent.agentId, "idle", "back_from_away");
        
        ack?.({ success: true, status: "idle" });
        
        const unassignedVisitors = await poolManager.getUnassignedVisitors();
        for (const visitor of unassignedVisitors) {
          const matchResult = await poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
          
          if (matchResult && matchResult.agent.agentId === agent.agentId) {
            await poolManager.assignVisitorToAgent(visitor.visitorId, agent.agentId);
            
            const widgetSettings = await getWidgetSettings(visitor.orgId, matchResult.poolId);
            
            const visitorSocket = io.sockets.sockets.get(visitor.socketId);
            visitorSocket?.emit(SOCKET_EVENTS.AGENT_ASSIGNED, {
              agent: {
                id: agent.profile.id,
                displayName: agent.profile.displayName,
                avatarUrl: agent.profile.avatarUrl,
                waveVideoUrl: agent.profile.waveVideoUrl,
                introVideoUrl: agent.profile.introVideoUrl,
                connectVideoUrl: agent.profile.connectVideoUrl,
                loopVideoUrl: agent.profile.loopVideoUrl,
              },
              visitorId: visitor.visitorId,
              widgetSettings,
              visitorConnectedAt: visitor.connectedAt,
            });
            console.log(`[Socket] Re-assigned visitor ${visitor.visitorId} to agent ${agent.agentId} returning from away (pool: ${matchResult.poolId})`);
          }
        }
        
        const waitingRequest = await poolManager.getNextWaitingRequest(agent.agentId);
        if (waitingRequest) {
          const visitor = await poolManager.getVisitor(waitingRequest.visitorId);
          if (visitor) {
            console.log(`[Socket] Notifying agent ${agent.agentId} of waiting visitor ${waitingRequest.visitorId}`);
            socket.emit(SOCKET_EVENTS.CALL_INCOMING, {
              request: waitingRequest,
              visitor: {
                visitorId: visitor.visitorId,
                pageUrl: visitor.pageUrl,
                connectedAt: visitor.connectedAt,
                location: visitor.location,
              },
            });
            await startRNATimeout(waitingRequest.requestId, agent.agentId, visitor.visitorId);
          }
        }
      } catch (error) {
        console.error(`[Socket] Error in AGENT_BACK handler:`, error);
        ack?.({ success: false, status: agent.profile.status, error: "Internal error" });
      }
    });

    socket.on("heartbeat" as never, async (_data: { timestamp: number }) => {
      const agent = await poolManager.getAgentBySocketId(socket.id);
      if (agent) {
        await poolManager.updateAgentActivity(agent.agentId);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPT, async (data: CallAcceptPayload) => {
      await clearRNATimeout(data.requestId);

      const request = await poolManager.getCallRequest(data.requestId);
      if (!request) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.CALL_NOT_FOUND,
          message: "Call request not found or expired",
        });
        return;
      }

      // Fetch org call settings for recording status
      const callSettings = await getCallSettings(request.orgId);

      const activeCall = await poolManager.acceptCall(data.requestId);
      if (!activeCall) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: "Failed to accept call",
        });
        return;
      }

      const callLogId = getCallLogId(data.requestId);
      const reconnectToken = await markCallAccepted(data.requestId, activeCall.callId);
      await recordStatusChange(request.agentId, "in_call", "call_started");

      const visitor = await poolManager.getVisitor(request.visitorId);

      trackCallStarted({
        orgId: request.orgId,
        visitorId: request.visitorId,
        callId: activeCall.callId,
        agentId: request.agentId,
        pageUrl: request.pageUrl,
        ipAddress: visitor?.ipAddress ?? undefined,
      }).catch(() => {});

      if (visitor) {
        const visitorSocket = io.sockets.sockets.get(visitor.socketId);
        visitorSocket?.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
          callId: activeCall.callId,
          agentId: request.agentId,
          reconnectToken: reconnectToken ?? "",
          isRecordingEnabled: callSettings.is_recording_enabled,
        });
      }

      const acceptingAgent = await poolManager.getAgent(request.agentId);
      const reassignments = await poolManager.reassignVisitors(
        request.agentId,
        request.visitorId
      );
      await notifyReassignments(io, poolManager, reassignments, "agent_busy", acceptingAgent?.profile.displayName);

      socket.emit(SOCKET_EVENTS.CALL_STARTED, {
        call: {
          ...activeCall,
          callLogId: callLogId ?? null,
        },
        visitor: {
          visitorId: request.visitorId,
          pageUrl: request.pageUrl,
        },
      });
    });

    socket.on(SOCKET_EVENTS.CALL_REJECT, async (data: CallRejectPayload) => {
      await clearRNATimeout(data.requestId);
      
      const request = await poolManager.getCallRequest(data.requestId);
      if (request) {
        markCallRejected(data.requestId);
        await poolManager.rejectCall(data.requestId);
        
        console.log(`[Socket] Agent ${request.agentId} rejected call from visitor ${request.visitorId}`);
        
        const visitor = await poolManager.getVisitor(request.visitorId);
        if (visitor) {
          const newResult = await poolManager.findBestAgentForVisitor(
            visitor.orgId, 
            visitor.pageUrl,
            request.agentId
          );
          
          if (newResult && newResult.agent.agentId !== request.agentId) {
            const newAgent = newResult.agent;
            
            const newRequest = await poolManager.createCallRequest(
              request.visitorId,
              newAgent.agentId,
              request.orgId,
              request.pageUrl
            );
            
            console.log(`[Socket] Agent ${request.agentId} rejected, routing visitor ${request.visitorId} to agent ${newAgent.agentId}`);
            
            createCallLog(newRequest.requestId, {
              visitorId: visitor.visitorId,
              agentId: newAgent.agentId,
              orgId: request.orgId,
              pageUrl: request.pageUrl,
              ipAddress: visitor.ipAddress,
              location: visitor.location,
            });
            
            const newAgentSocket = io.sockets.sockets.get(newAgent.socketId);
            if (newAgentSocket) {
              newAgentSocket.emit(SOCKET_EVENTS.CALL_INCOMING, {
                request: newRequest,
                visitor: {
                  visitorId: visitor.visitorId,
                  pageUrl: visitor.pageUrl,
                  connectedAt: visitor.connectedAt,
                  location: visitor.location,
                },
              });
              
              await startRNATimeout(newRequest.requestId, newAgent.agentId, visitor.visitorId);
            }
          } else {
            console.log(`[Socket] Agent ${request.agentId} rejected, no other agents available for visitor ${request.visitorId} - hiding widget`);
            
            const rejectingAgent = await poolManager.getAgent(request.agentId);
            const agentName = rejectingAgent?.profile.displayName;
            
            // Mark visitor as unassigned - need to update Redis directly
            await poolManager.updateVisitorState(request.visitorId, "browsing");
            
            const visitorSocket = io.sockets.sockets.get(visitor.socketId);
            if (visitorSocket) {
              const poolId = await poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
              const widgetSettings = await getWidgetSettings(visitor.orgId, poolId);
              visitorSocket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
                visitorId: visitor.visitorId,
                widgetSettings,
                poolId,
                previousAgentName: agentName,
                reason: "agent_away",
              });
            }
          }
        }
      }
    });

    socket.on(SOCKET_EVENTS.CALL_END, async (data: CallEndPayload) => {
      const call = await poolManager.endCall(data.callId);
      if (call) {
        console.log("[Socket] Call ended:", data.callId, "by socket:", socket.id);
        
        markCallEnded(data.callId);
        await recordStatusChange(call.agentId, "idle", "call_ended");
        
        const agent = await poolManager.getAgentBySocketId(socket.id);
        const isAgentEnding = !!agent;
        
        const visitor = await poolManager.getVisitor(call.visitorId);
        if (visitor) {
          const visitorSocket = io.sockets.sockets.get(visitor.socketId);
          visitorSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
            callId: data.callId,
            reason: isAgentEnding ? "agent_ended" : "visitor_ended",
          });
        }
        
        const callAgent = await poolManager.getAgent(call.agentId);
        if (callAgent) {
          const agentSocket = io.sockets.sockets.get(callAgent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
            callId: data.callId,
            reason: isAgentEnding ? "agent_ended" : "visitor_ended",
          });
          
          setTimeout(async () => {
            const waitingRequest = await poolManager.getNextWaitingRequest(call.agentId);
            if (waitingRequest && agentSocket) {
              const waitingVisitor = await poolManager.getVisitor(waitingRequest.visitorId);
              if (waitingVisitor) {
                console.log(`[Socket] Agent ${call.agentId} now available. Notifying of waiting visitor ${waitingRequest.visitorId}`);
                agentSocket.emit(SOCKET_EVENTS.CALL_INCOMING, {
                  request: waitingRequest,
                  visitor: {
                    visitorId: waitingVisitor.visitorId,
                    pageUrl: waitingVisitor.pageUrl,
                    connectedAt: waitingVisitor.connectedAt,
                    location: waitingVisitor.location,
                  },
                });
              }
            }
          }, 1000);
        }
      }
    });

    // -------------------------------------------------------------------------
    // CALL RECONNECTION
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.CALL_RECONNECT, async (data: CallReconnectPayload) => {
      console.log(`[Socket] 🔄 CALL_RECONNECT request from ${data.role}:`, data.reconnectToken.slice(0, 8) + "...");

      const callInfo = await getCallByReconnectToken(data.reconnectToken);
      
      if (!callInfo) {
        console.log("[Socket] ❌ No active call found for reconnect token");
        socket.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
          callId: "",
          reason: "error",
          message: "No active call found",
        });
        return;
      }

      if (data.role === "visitor") {
        const existingReconnect = await getPendingReconnect(callInfo.id);
        if (existingReconnect && existingReconnect.agentSocketId) {
          console.log(`[Socket] ✅ Both parties ready - completing reconnection for call ${callInfo.id}`);
          
          await clearPendingReconnect(callInfo.id);
          
          const visitorSession = await poolManager.registerVisitor(
            socket.id,
            callInfo.visitor_id,
            callInfo.organization_id,
            callInfo.page_url,
            null
          );

          const newCallId = existingReconnect.newCallId;
          const newToken = await markCallReconnected(callInfo.id, newCallId) ?? data.reconnectToken;

          await poolManager.reconnectVisitorToCall(visitorSession.visitorId, existingReconnect.agentId, newCallId);

          const agent = await poolManager.getAgent(existingReconnect.agentId);
          
          socket.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
            callId: newCallId,
            reconnectToken: newToken,
            peerId: existingReconnect.agentId,
            agent: agent ? {
              id: agent.profile.id,
              displayName: agent.profile.displayName,
              avatarUrl: agent.profile.avatarUrl,
              waveVideoUrl: agent.profile.waveVideoUrl,
              introVideoUrl: agent.profile.introVideoUrl,
              connectVideoUrl: agent.profile.connectVideoUrl,
              loopVideoUrl: agent.profile.loopVideoUrl,
            } : undefined,
          });

          const agentSocket = io.sockets.sockets.get(existingReconnect.agentSocketId);
          agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
            callId: newCallId,
            reconnectToken: newToken,
            peerId: visitorSession.visitorId,
          });

          console.log(`[Socket] ✅ Visitor ${visitorSession.visitorId} reconnected to call with agent ${existingReconnect.agentId}`);
          return;
        }

        const agent = await poolManager.getAgent(callInfo.agent_id);
        
        if (!agent) {
          console.log(`[Socket] ⏳ Visitor ${callInfo.visitor_id} reconnecting but agent not online yet - waiting for agent`);
          
          const visitorSession = await poolManager.registerVisitor(
            socket.id,
            callInfo.visitor_id,
            callInfo.organization_id,
            callInfo.page_url,
            null
          );
          
          await poolManager.updateVisitorState(visitorSession.visitorId, "in_call");

          socket.emit(SOCKET_EVENTS.CALL_RECONNECTING, {
            callId: callInfo.id,
            message: "Reconnecting to your call...",
            timeoutSeconds: TIMING.CALL_RECONNECT_TIMEOUT / 1000,
          });

          const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          await startPendingReconnect(callInfo.id, {
            agentSocketId: null,
            visitorSocketId: socket.id,
            agentId: callInfo.agent_id,
            visitorId: callInfo.visitor_id,
            newCallId,
          });
          return;
        }

        if (agent.profile.status !== "in_call") {
          console.log("[Socket] ❌ Agent is not in a call anymore");
          socket.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
            callId: callInfo.id,
            reason: "other_party_disconnected", 
            message: "Call has already ended",
          });
          await markCallReconnectFailed(callInfo.id);
          return;
        }

        const visitorSession = await poolManager.registerVisitor(
          socket.id,
          callInfo.visitor_id,
          callInfo.organization_id,
          callInfo.page_url,
          null
        );

        const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        await poolManager.reconnectVisitorToCall(
          visitorSession.visitorId,
          agent.agentId,
          newCallId
        );

        const newToken = await markCallReconnected(callInfo.id, newCallId) ?? data.reconnectToken;

        console.log(`[Socket] ✅ Visitor ${callInfo.visitor_id} reconnected to call with agent ${agent.agentId}`);

        socket.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
          callId: newCallId,
          reconnectToken: newToken,
          peerId: agent.agentId,
          agent: {
            id: agent.profile.id,
            displayName: agent.profile.displayName,
            avatarUrl: agent.profile.avatarUrl,
            waveVideoUrl: agent.profile.waveVideoUrl,
            introVideoUrl: agent.profile.introVideoUrl,
            connectVideoUrl: agent.profile.connectVideoUrl,
            loopVideoUrl: agent.profile.loopVideoUrl,
          },
        });

        const agentSocket = io.sockets.sockets.get(agent.socketId);
        agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
          callId: newCallId,
          reconnectToken: newToken,
          peerId: visitorSession.visitorId,
        });

      } else if (data.role === "agent") {
        const agent = await poolManager.getAgentBySocketId(socket.id);
        
        if (!agent) {
          console.log("[Socket] ❌ Agent not logged in for reconnection");
          socket.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
            callId: callInfo.id,
            reason: "error",
            message: "Agent not logged in",
          });
          return;
        }

        if (agent.agentId !== callInfo.agent_id) {
          console.log("[Socket] ❌ Agent mismatch for reconnection");
          socket.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
            callId: callInfo.id,
            reason: "error",
            message: "Call belongs to a different agent",
          });
          return;
        }

        const existingReconnect = await getPendingReconnect(callInfo.id);
        if (existingReconnect && existingReconnect.visitorSocketId) {
          console.log(`[Socket] ✅ Both parties ready - completing reconnection for call ${callInfo.id}`);
          
          await clearPendingReconnect(callInfo.id);
          
          const newCallId = existingReconnect.newCallId;
          const newToken = await markCallReconnected(callInfo.id, newCallId) ?? data.reconnectToken;

          await poolManager.reconnectVisitorToCall(callInfo.visitor_id, agent.agentId, newCallId);

          socket.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
            callId: newCallId,
            reconnectToken: newToken,
            peerId: callInfo.visitor_id,
          });

          const visitorSocket = io.sockets.sockets.get(existingReconnect.visitorSocketId);
          visitorSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
            callId: newCallId,
            reconnectToken: newToken,
            peerId: agent.agentId,
            agent: {
              id: agent.profile.id,
              displayName: agent.profile.displayName,
              avatarUrl: agent.profile.avatarUrl,
              waveVideoUrl: agent.profile.waveVideoUrl,
              introVideoUrl: agent.profile.introVideoUrl,
              connectVideoUrl: agent.profile.connectVideoUrl,
              loopVideoUrl: agent.profile.loopVideoUrl,
            },
          });

          console.log(`[Socket] ✅ Agent ${agent.agentId} reconnected to call with visitor ${callInfo.visitor_id}`);
          return;
        }

        const visitor = await poolManager.getVisitor(callInfo.visitor_id);
        
        if (visitor) {
          const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const newToken = await markCallReconnected(callInfo.id, newCallId) ?? data.reconnectToken;

          await poolManager.reconnectVisitorToCall(visitor.visitorId, agent.agentId, newCallId);

          console.log(`[Socket] ✅ Agent ${agent.agentId} reconnected to call with visitor ${visitor.visitorId}`);

          socket.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
            callId: newCallId,
            reconnectToken: newToken,
            peerId: visitor.visitorId,
          });

          const visitorSocket = io.sockets.sockets.get(visitor.socketId);
          visitorSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
            callId: newCallId,
            reconnectToken: newToken,
            peerId: agent.agentId,
            agent: {
              id: agent.profile.id,
              displayName: agent.profile.displayName,
              avatarUrl: agent.profile.avatarUrl,
              waveVideoUrl: agent.profile.waveVideoUrl,
              introVideoUrl: agent.profile.introVideoUrl,
              connectVideoUrl: agent.profile.connectVideoUrl,
              loopVideoUrl: agent.profile.loopVideoUrl,
            },
          });
        } else {
          console.log(`[Socket] ⏳ Agent ${agent.agentId} waiting for visitor ${callInfo.visitor_id} to reconnect`);
          
          await poolManager.setAgentInCall(agent.agentId, callInfo.visitor_id);

          socket.emit(SOCKET_EVENTS.CALL_RECONNECTING, {
            callId: callInfo.id,
            message: "Waiting for visitor to reconnect...",
            timeoutSeconds: TIMING.CALL_RECONNECT_TIMEOUT / 1000,
          });

          const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          await startPendingReconnect(callInfo.id, {
            agentSocketId: socket.id,
            visitorSocketId: null,
            agentId: agent.agentId,
            visitorId: callInfo.visitor_id,
            newCallId,
          });
        }
      }
    });

    // -------------------------------------------------------------------------
    // WEBRTC SIGNALING
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.WEBRTC_SIGNAL, async (data: WebRTCSignalPayload) => {
      const agent = await poolManager.getAgentBySocketId(socket.id);
      const visitor = await poolManager.getVisitorBySocketId(socket.id);

      if (agent) {
        const targetVisitor = await poolManager.getVisitor(data.targetId);
        if (targetVisitor) {
          const targetSocket = io.sockets.sockets.get(targetVisitor.socketId);
          targetSocket?.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: agent.agentId,
            signal: data.signal,
          });
        }
      } else if (visitor) {
        const targetAgent = await poolManager.getAgent(data.targetId);
        if (targetAgent) {
          const targetSocket = io.sockets.sockets.get(targetAgent.socketId);
          targetSocket?.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: visitor.visitorId,
            signal: data.signal,
          });
        }
      }
    });

    // -------------------------------------------------------------------------
    // CO-BROWSING
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.COBROWSE_SNAPSHOT, async (data: CobrowseSnapshotPayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = await poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = await poolManager.getAgent(activeCall.agentId);
      if (!agent) return;

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_SNAPSHOT, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    socket.on(SOCKET_EVENTS.COBROWSE_MOUSE, async (data: CobrowseMousePayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = await poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = await poolManager.getAgent(activeCall.agentId);
      if (!agent) return;

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_MOUSE, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    socket.on(SOCKET_EVENTS.COBROWSE_SCROLL, async (data: CobrowseScrollPayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = await poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = await poolManager.getAgent(activeCall.agentId);
      if (!agent) return;

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_SCROLL, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    socket.on(SOCKET_EVENTS.COBROWSE_SELECTION, async (data: CobrowseSelectionPayload) => {
      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = await poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = await poolManager.getAgent(activeCall.agentId);
      if (!agent) return;

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_SELECTION, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    // -------------------------------------------------------------------------
    // DISCONNECT
    // -------------------------------------------------------------------------

    socket.on("disconnect", async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Handle pending reconnects
      await handleReconnectPartyDisconnect(io, poolManager, socket.id, "agent");
      await handleReconnectPartyDisconnect(io, poolManager, socket.id, "visitor");

      const agent = await poolManager.getAgentBySocketId(socket.id);
      if (agent) {
        const agentId = agent.agentId;
        const previousStatus = agent.profile.status;
        
        const activeCall = await poolManager.getActiveCallByAgentId(agentId);
        if (activeCall) {
          markCallEnded(activeCall.callId);
          await poolManager.endCall(activeCall.callId);
          const visitor = await poolManager.getVisitor(activeCall.visitorId);
          if (visitor) {
            const visitorSocket = io.sockets.sockets.get(visitor.socketId);
            visitorSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
              callId: activeCall.callId,
              reason: "agent_ended",
            });
          }
        }

        await poolManager.updateAgentStatus(agentId, "offline");
        
        console.log(`[Socket] Agent ${agentId} disconnected, starting ${AGENT_DISCONNECT_GRACE_PERIOD}ms grace period (was ${previousStatus})`);
        
        // Start pending disconnect in Redis
        await startPendingDisconnect(agentId, previousStatus);
        return;
      }

      const visitor = await poolManager.getVisitorBySocketId(socket.id);
      if (visitor) {
        const activeCall = await poolManager.getActiveCallByVisitorId(visitor.visitorId);
        if (activeCall) {
          markCallEnded(activeCall.callId);
          await recordStatusChange(activeCall.agentId, "idle", "call_ended");
          await poolManager.endCall(activeCall.callId);
          const callAgent = await poolManager.getAgent(activeCall.agentId);
          if (callAgent) {
            const agentSocket = io.sockets.sockets.get(callAgent.socketId);
            agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
              callId: activeCall.callId,
              reason: "visitor_ended",
            });
          }
        }

        const assignedAgent = visitor.assignedAgentId 
          ? await poolManager.getAgent(visitor.assignedAgentId) 
          : null;
        
        await poolManager.unregisterVisitor(visitor.visitorId);
        
        if (assignedAgent) {
          const updatedStats = await poolManager.getAgentStats(assignedAgent.agentId);
          if (updatedStats) {
            const agentSocket = io.sockets.sockets.get(assignedAgent.socketId);
            agentSocket?.emit(SOCKET_EVENTS.STATS_UPDATE, updatedStats);
          }
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // PERIODIC TIMEOUT CHECKS
  // ---------------------------------------------------------------------------
  
  // Check for expired RNA timeouts every 5 seconds
  setInterval(async () => {
    try {
      const expiredRNAs = await getExpiredRNATimeouts();
      for (const rna of expiredRNAs) {
        await handleRNATimeout(io, poolManager, rna.requestId, rna.agentId, rna.visitorId);
      }
    } catch (error) {
      console.error("[Timeout] Error checking RNA timeouts:", error);
    }
  }, 5000);

  // Check for expired pending disconnects every 2 seconds
  setInterval(async () => {
    try {
      const expiredDisconnects = await getExpiredPendingDisconnects();
      for (const disconnect of expiredDisconnects) {
        await handleExpiredDisconnect(io, poolManager, disconnect.agentId);
      }
    } catch (error) {
      console.error("[Timeout] Error checking pending disconnects:", error);
    }
  }, 2000);

  // Check for expired pending reconnects every 5 seconds
  setInterval(async () => {
    try {
      const expiredReconnects = await getExpiredPendingReconnects();
      for (const reconnect of expiredReconnects) {
        await handleExpiredReconnect(io, poolManager, reconnect);
      }
    } catch (error) {
      console.error("[Timeout] Error checking pending reconnects:", error);
    }
  }, 5000);

  // Staleness check every 60 seconds
  const STALENESS_CHECK_INTERVAL = 60_000;
  const STALENESS_THRESHOLD = 120_000;

  setInterval(async () => {
    try {
      const staleAgents = await poolManager.getStaleAgents(STALENESS_THRESHOLD);
      
      for (const agent of staleAgents) {
        console.log(`[Staleness] ⚠️ Agent ${agent.agentId} is stale (no heartbeat for ${STALENESS_THRESHOLD / 1000}s), marking as away`);
        
        await poolManager.updateAgentStatus(agent.agentId, "away");
        recordStatusChange(agent.agentId, "away", "heartbeat_stale");
        
        const agentSocket = io.sockets.sockets.get(agent.socketId);
        if (agentSocket) {
          agentSocket.emit(SOCKET_EVENTS.AGENT_MARKED_AWAY, {
            reason: "idle",
            message: "You've been marked as Away due to connection inactivity.",
          });
        }
        
        const reassignments = await poolManager.reassignVisitors(agent.agentId);
        if (reassignments.reassigned.size > 0 || reassignments.unassigned.length > 0) {
          console.log(`[Staleness] Reassignment results for ${agent.agentId}: ${reassignments.reassigned.size} reassigned, ${reassignments.unassigned.length} unassigned`);
          await notifyReassignments(io, poolManager, reassignments, "agent_away", agent.profile.displayName);
        }
      }
    } catch (error) {
      console.error("[Staleness] Error checking stale agents:", error);
    }
  }, STALENESS_CHECK_INTERVAL);
}

// ============================================================================
// TIMEOUT HANDLERS
// ============================================================================

async function handleRNATimeout(
  io: AppServer,
  poolManager: RedisPoolManager,
  requestId: string,
  agentId: string,
  visitorId: string
): Promise<void> {
  console.log(`[RNA] ⏰ Timeout reached for request ${requestId}`);
  
  // Clear the timeout first
  await clearRNATimeout(requestId);
  
  // Small grace period for race conditions
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const request = await poolManager.getCallRequest(requestId);
  if (!request) {
    console.log(`[RNA] Request ${requestId} no longer exists, skipping`);
    return;
  }

  const activeCall = await poolManager.getActiveCallByVisitorId(visitorId);
  if (activeCall) {
    console.log(`[RNA] Call already active for visitor ${visitorId}, agent won the race - skipping timeout`);
    return;
  }

  const agent = await poolManager.getAgent(agentId);
  if (!agent) {
    console.log(`[RNA] Agent ${agentId} no longer exists, skipping`);
    return;
  }

  console.log(`[RNA] Marking agent ${agentId} as away due to RNA`);
  await poolManager.updateAgentStatus(agentId, "away");
  recordStatusChange(agentId, "away", "ring_no_answer");

  const agentSocket = io.sockets.sockets.get(agent.socketId);
  if (agentSocket) {
    agentSocket.emit(SOCKET_EVENTS.CALL_CANCELLED, { requestId });
    agentSocket.emit(SOCKET_EVENTS.AGENT_MARKED_AWAY, {
      reason: "ring_no_answer",
      message: "You've been marked as Away because you didn't answer an incoming call.",
    });
  }

  markCallMissed(requestId);
  await poolManager.rejectCall(requestId);

  const visitor = await poolManager.getVisitor(visitorId);
  if (visitor) {
    const newResult = await poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
    
    if (newResult && newResult.agent.agentId !== agentId) {
      const newAgent = newResult.agent;
      console.log(`[RNA] Routing visitor ${visitorId} to agent ${newAgent.agentId}`);
      
      const newRequest = await poolManager.createCallRequest(
        visitorId,
        newAgent.agentId,
        visitor.orgId,
        visitor.pageUrl
      );
      
      createCallLog(newRequest.requestId, {
        visitorId: visitor.visitorId,
        agentId: newAgent.agentId,
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        ipAddress: visitor.ipAddress,
        location: visitor.location,
      });

      const newAgentSocket = io.sockets.sockets.get(newAgent.socketId);
      if (newAgentSocket) {
        newAgentSocket.emit(SOCKET_EVENTS.CALL_INCOMING, {
          request: newRequest,
          visitor: {
            visitorId: visitor.visitorId,
            pageUrl: visitor.pageUrl,
            connectedAt: visitor.connectedAt,
            location: visitor.location,
          },
        });
        
        await startRNATimeout(newRequest.requestId, newAgent.agentId, visitorId);
      }
    } else {
      console.log(`[RNA] No other agents available for visitor ${visitorId} - hiding widget`);
      
      await poolManager.updateVisitorState(visitorId, "browsing");
      
      const visitorSocket = io.sockets.sockets.get(visitor.socketId);
      if (visitorSocket) {
        const poolId = await poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
        const widgetSettings = await getWidgetSettings(visitor.orgId, poolId);
        visitorSocket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
          visitorId: visitor.visitorId,
          widgetSettings,
          poolId,
          previousAgentName: agent.profile.displayName,
          reason: "rna_timeout",
        });
      }
    }
  }
}

async function handleExpiredDisconnect(
  io: AppServer,
  poolManager: RedisPoolManager,
  agentId: string
): Promise<void> {
  console.log(`[Disconnect] Grace period expired for agent ${agentId}, unregistering`);
  
  // Clear the pending disconnect
  await clearPendingDisconnect(agentId);
  
  await endSession(agentId, "disconnect");
  
  const affectedVisitors = await poolManager.unregisterAgent(agentId);
  if (affectedVisitors.length > 0) {
    for (const visitorId of affectedVisitors) {
      const visitor = await poolManager.getVisitor(visitorId);
      if (visitor) {
        const newResult = await poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
        if (newResult) {
          const newAgent = newResult.agent;
          await poolManager.assignVisitorToAgent(visitorId, newAgent.agentId);
          const visitorSocket = io.sockets.sockets.get(visitor.socketId);
          visitorSocket?.emit(SOCKET_EVENTS.AGENT_REASSIGNED, {
            previousAgentId: agentId,
            newAgent: {
              id: newAgent.profile.id,
              displayName: newAgent.profile.displayName,
              avatarUrl: newAgent.profile.avatarUrl,
              waveVideoUrl: newAgent.profile.waveVideoUrl,
              introVideoUrl: newAgent.profile.introVideoUrl,
              connectVideoUrl: newAgent.profile.connectVideoUrl,
              loopVideoUrl: newAgent.profile.loopVideoUrl,
            },
            reason: "agent_offline",
          });
        } else {
          const visitorSocket = io.sockets.sockets.get(visitor.socketId);
          if (visitorSocket) {
            const poolId = await poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
            const widgetSettings = await getWidgetSettings(visitor.orgId, poolId);
            visitorSocket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
              visitorId: visitor.visitorId,
              widgetSettings,
              poolId,
            });
          }
        }
      }
    }
  }
}

async function handleExpiredReconnect(
  io: AppServer,
  poolManager: RedisPoolManager,
  reconnect: {
    callLogId: string;
    agentSocketId: string | null;
    visitorSocketId: string | null;
    agentId: string;
    visitorId: string;
  }
): Promise<void> {
  console.log(`[Reconnect] ⏰ Timeout reached for call ${reconnect.callLogId}`);
  
  await clearPendingReconnect(reconnect.callLogId);
  await markCallReconnectFailed(reconnect.callLogId);

  if (reconnect.agentSocketId) {
    const agentSocket = io.sockets.sockets.get(reconnect.agentSocketId);
    agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
      callId: reconnect.callLogId,
      reason: "timeout",
      message: "Visitor did not reconnect in time",
    });
    await poolManager.setAgentInCall(reconnect.agentId, null);
  }

  if (reconnect.visitorSocketId) {
    const visitorSocket = io.sockets.sockets.get(reconnect.visitorSocketId);
    visitorSocket?.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
      callId: reconnect.callLogId,
      reason: "timeout",
      message: "Agent did not reconnect in time",
    });
    await poolManager.updateVisitorState(reconnect.visitorId, "browsing");
  }
}

async function handleReconnectPartyDisconnect(
  io: AppServer,
  poolManager: RedisPoolManager,
  socketId: string,
  role: "agent" | "visitor"
): Promise<void> {
  const pending = await findPendingReconnectBySocket(socketId, role);
  if (!pending) return;

  console.log(`[Reconnect] ${role} disconnected while waiting for reconnection, call ${pending.callLogId}`);
  
  await clearPendingReconnect(pending.callLogId);
  await markCallReconnectFailed(pending.callLogId);
  
  if (role === "agent" && pending.visitorSocketId) {
    const visitorSocket = io.sockets.sockets.get(pending.visitorSocketId);
    visitorSocket?.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
      callId: pending.callLogId,
      reason: "other_party_disconnected",
      message: "Agent disconnected",
    });
    await poolManager.updateVisitorState(pending.visitorId, "browsing");
  } else if (role === "visitor" && pending.agentSocketId) {
    const agentSocket = io.sockets.sockets.get(pending.agentSocketId);
    agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
      callId: pending.callLogId,
      reason: "other_party_disconnected",
      message: "Visitor disconnected",
    });
    await poolManager.setAgentInCall(pending.agentId, null);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function notifyReassignments(
  io: AppServer,
  poolManager: RedisPoolManager,
  result: { reassigned: Map<string, string>; unassigned: string[] },
  reason: "agent_busy" | "agent_offline" | "agent_away",
  previousAgentName?: string
) {
  for (const [visitorId, newAgentId] of result.reassigned) {
    const visitor = await poolManager.getVisitor(visitorId);
    const newAgent = await poolManager.getAgent(newAgentId);
    
    if (visitor && newAgent) {
      const visitorSocket = io.sockets.sockets.get(visitor.socketId);
      visitorSocket?.emit(SOCKET_EVENTS.AGENT_REASSIGNED, {
        previousAgentId: visitor.assignedAgentId ?? "",
        newAgent: {
          id: newAgent.profile.id,
          displayName: newAgent.profile.displayName,
          avatarUrl: newAgent.profile.avatarUrl,
          waveVideoUrl: newAgent.profile.waveVideoUrl,
          introVideoUrl: newAgent.profile.introVideoUrl,
          connectVideoUrl: newAgent.profile.connectVideoUrl,
          loopVideoUrl: newAgent.profile.loopVideoUrl,
        },
        reason,
      });
    }
  }

  for (const visitorId of result.unassigned) {
    const visitor = await poolManager.getVisitor(visitorId);
    if (visitor) {
      const visitorSocket = io.sockets.sockets.get(visitor.socketId);
      if (visitorSocket && visitorSocket.connected) {
        const poolId = await poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
        const widgetSettings = await getWidgetSettings(visitor.orgId, poolId);
        console.log(`[Socket] 📤 Emitting AGENT_UNAVAILABLE to visitor ${visitorId} (socket: ${visitor.socketId}), previousAgent: ${previousAgentName}`);
        visitorSocket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
          visitorId: visitor.visitorId,
          widgetSettings,
          poolId,
          previousAgentName,
          reason: reason === "agent_away" ? "agent_away" : "agent_offline",
        });
      } else {
        console.log(`[Socket] ⚠️ Visitor ${visitorId} socket not connected`);
      }
    } else {
      console.log(`[Socket] ⚠️ Visitor ${visitorId} not found in pool manager`);
    }
  }
}

