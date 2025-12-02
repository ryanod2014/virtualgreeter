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
  WebRTCSignalPayload,
  CobrowseSnapshotPayload,
  CobrowseMousePayload,
  CobrowseScrollPayload,
  CobrowseSelectionPayload,
  AgentProfile,
} from "@ghost-greeter/domain";
import { SOCKET_EVENTS, ERROR_CODES, TIMING } from "@ghost-greeter/domain";
import type { PoolManager } from "../routing/pool-manager.js";
import {
  createCallLog,
  markCallAccepted,
  markCallEnded,
  markCallMissed,
  markCallRejected,
  markCallCancelled,
  getCallLogId,
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
import { getClientIP, getLocationFromIP } from "../../lib/geolocation.js";
import { isCountryBlocked } from "../../lib/country-blocklist.js";
import { trackWidgetView, trackCallStarted } from "../../lib/greetnow-retargeting.js";

// Track RNA (Ring-No-Answer) timeouts
const rnaTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

// Track pending agent disconnects (grace period for page refreshes)
// Key: agentId, Value: { timeout, previousStatus }
const pendingDisconnects: Map<string, { timeout: ReturnType<typeof setTimeout>; previousStatus: string }> = new Map();
const AGENT_DISCONNECT_GRACE_PERIOD = 10000; // 10 seconds to allow for page refresh

type AppSocket = Socket<
  WidgetToServerEvents & DashboardToServerEvents,
  ServerToWidgetEvents & ServerToDashboardEvents
>;

type AppServer = Server<
  WidgetToServerEvents & DashboardToServerEvents,
  ServerToWidgetEvents & ServerToDashboardEvents
>;

export function setupSocketHandlers(io: AppServer, poolManager: PoolManager) {
  io.on("connection", (socket: AppSocket) => {
    console.log(`[Socket] New connection: ${socket.id}`);

    // -------------------------------------------------------------------------
    // VISITOR EVENTS (Widget)
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.VISITOR_JOIN, async (data: VisitorJoinPayload) => {
      console.log("[Socket] 👤 VISITOR_JOIN received:", { orgId: data.orgId, pageUrl: data.pageUrl });
      
      // Record embed verification (fire-and-forget, non-blocking)
      recordEmbedVerification(data.orgId, data.pageUrl).catch(() => {
        // Silently ignore - verification is best-effort
      });
      
      const visitorId = data.visitorId ?? `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      // Get visitor's IP address from socket handshake
      const ipAddress = getClientIP(socket.handshake);
      console.log("[Socket] Visitor IP:", ipAddress);
      
      // Resolve location FIRST to check country blocklist
      let location = null;
      try {
        location = await getLocationFromIP(ipAddress);
        if (location) {
          console.log(`[Socket] Visitor ${visitorId} location resolved: ${location.city}, ${location.region}, ${location.countryCode}`);
        }
      } catch {
        // Silently ignore - geolocation is best-effort
      }
      
      // Check if visitor's country is blocked
      const countryBlocked = await isCountryBlocked(data.orgId, location?.countryCode ?? null);
      if (countryBlocked) {
        console.log(`[Socket] 🚫 Visitor ${visitorId} blocked from country: ${location?.countryCode}`);
        // Silently disconnect - don't show widget to blocked countries
        // We don't emit an error because we don't want to reveal we're blocking
        socket.disconnect(true);
        return;
      }
      
      // Register visitor (country not blocked)
      const session = poolManager.registerVisitor(
        socket.id,
        visitorId,
        data.orgId,
        data.pageUrl,
        ipAddress
      );
      console.log("[Socket] Visitor registered:", visitorId);
      
      // Update visitor's location if we resolved it
      if (location) {
        poolManager.updateVisitorLocation(visitorId, location);
      }

      // Find and assign best agent using path-based routing
      const result = poolManager.findBestAgentForVisitor(data.orgId, data.pageUrl);
      console.log("[Socket] Best agent found:", result?.agent.agentId ?? "NONE", "pool:", result?.poolId ?? "none");
      
      if (result) {
        const { agent, poolId } = result;
        poolManager.assignVisitorToAgent(visitorId, agent.agentId);
        console.log(`[Socket] ✅ Assigned visitor ${visitorId} to agent ${agent.agentId}, simulations: ${agent.currentSimulations.length}`);
        
        // Emit updated stats to the agent (live visitor count)
        const updatedStats = poolManager.getAgentStats(agent.agentId);
        if (updatedStats) {
          const agentSocket = io.sockets.sockets.get(agent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.STATS_UPDATE, updatedStats);
        }
        
        // Get widget settings for this visitor (pool-specific or org defaults)
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
        // No agents available - record as missed opportunity pageview
        recordPageview({
          visitorId,
          agentId: null, // No agent was available - this is a missed opportunity
          orgId: data.orgId,
          pageUrl: data.pageUrl,
          poolId: null,
        }).catch(() => {
          // Silently ignore - pageview tracking is best-effort
        });
        
        console.log(`[Socket] ⚠️ No agents available for visitor ${visitorId} - recorded as missed opportunity`);
        
        // Emit error to visitor
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.AGENT_UNAVAILABLE,
          message: "No agents are currently available. Please try again later.",
        });
      }
    });

    socket.on(SOCKET_EVENTS.VISITOR_INTERACTION, (_data: VisitorInteractionPayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (visitor && !visitor.interactedAt) {
        poolManager.updateVisitorState(visitor.visitorId, "watching_simulation");
      }
    });

    // Track pageviews when widget popup is shown to visitor
    socket.on(SOCKET_EVENTS.WIDGET_PAGEVIEW, (data: WidgetPageviewPayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        console.log("[Socket] Pageview received but no visitor found for socket:", socket.id);
        return;
      }

      // Get the agent to find the pool they're in
      const agent = poolManager.getAgent(data.agentId);
      const poolId = agent ? poolManager.getAgentPrimaryPool(data.agentId) : null;

      // Record the pageview (fire-and-forget, non-blocking)
      recordPageview({
        visitorId: visitor.visitorId,
        agentId: data.agentId,
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        poolId,
      }).catch(() => {
        // Silently ignore - pageview tracking is best-effort
      });

      // Track GreetNow retargeting pixel (fire-and-forget, non-blocking)
      // Only fires for orgs with retargeting enabled
      trackWidgetView({
        orgId: visitor.orgId,
        visitorId: visitor.visitorId,
        pageUrl: visitor.pageUrl,
        ipAddress: visitor.ipAddress ?? undefined,
        userAgent: socket.handshake.headers["user-agent"],
      }).catch(() => {
        // Silently ignore - retargeting is best-effort
      });

      console.log(`[Socket] 👁️ WIDGET_PAGEVIEW recorded for visitor ${visitor.visitorId}`);
    });

    socket.on(SOCKET_EVENTS.CALL_REQUEST, (data: CallRequestPayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.VISITOR_NOT_FOUND,
          message: "Visitor session not found",
        });
        return;
      }

      // Check if this visitor has an active call that needs to be cleaned up first
      // This handles the race condition where user ends call and quickly calls again
      const existingCall = poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (existingCall) {
        console.log(`[Socket] Visitor ${visitor.visitorId} has existing call ${existingCall.callId}, cleaning up first`);
        // End the existing call - this resets the agent status to "idle"
        poolManager.endCall(existingCall.callId);
        markCallEnded(existingCall.callId);
        
        // Notify the agent that the previous call ended
        const previousAgent = poolManager.getAgent(existingCall.agentId);
        if (previousAgent) {
          const agentSocket = io.sockets.sockets.get(previousAgent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
            callId: existingCall.callId,
            reason: "visitor_ended",
          });
        }
      }

      let targetAgent = poolManager.getAgent(data.agentId);
      let targetAgentId = data.agentId;

      // If the requested agent is unavailable, immediately find an alternative
      if (!targetAgent || targetAgent.profile.status === "in_call" || targetAgent.profile.status === "offline" || targetAgent.profile.status === "away") {
        const alternativeResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
        
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
        // If no alternative available and original agent exists but busy, fall through to queue
      }

      // Create call request for the target agent (original or alternative)
      const request = poolManager.createCallRequest(
        visitor.visitorId,
        targetAgentId,
        visitor.orgId,
        visitor.pageUrl
      );

      console.log(`[Socket] CALL_REQUEST from visitor ${visitor.visitorId} for agent ${targetAgentId}`);
      console.log(`[Socket] Agent status: ${targetAgent.profile.status}, socketId: ${targetAgent.socketId}`);

      // Log to database (ring started)
      createCallLog(request.requestId, {
        visitorId: visitor.visitorId,
        agentId: targetAgentId,
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        ipAddress: visitor.ipAddress,
        location: visitor.location,
      });

      // If agent is available, notify them immediately
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

          // Start RNA (Ring-No-Answer) timeout
          startRNATimeout(io, poolManager, request.requestId, targetAgentId, visitor.visitorId);
        } else {
          console.log(`[Socket] WARNING: Agent ${targetAgentId} socket not found! socketId: ${targetAgent.socketId}`);
          // Agent socket might be stale - they may have disconnected
        }
      } else {
        // Agent is busy and no alternatives - visitor will wait (rare edge case)
        console.log(`[Socket] All agents busy. Visitor ${visitor.visitorId} queued for ${targetAgentId}.`);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_CANCEL, (data: CallCancelPayload) => {
      // Clear RNA timeout since call was cancelled
      clearRNATimeout(data.requestId);
      
      // Mark call as cancelled in database
      markCallCancelled(data.requestId);
      
      const request = poolManager.cancelCall(data.requestId);
      if (request) {
        const agent = poolManager.getAgent(request.agentId);
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
      // Verify the agent's token
      const verification = await verifyAgentToken(data.token, data.agentId);
      
      if (!verification.valid) {
        console.error("[Socket] ❌ AGENT_LOGIN failed - invalid token:", verification.error);
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.AUTH_INVALID_TOKEN,
          message: verification.error ?? "Authentication failed",
        });
        return;
      }

      // Check if this agent has a pending disconnect (page refresh scenario)
      const pendingDisconnect = pendingDisconnects.get(data.agentId);
      if (pendingDisconnect) {
        clearTimeout(pendingDisconnect.timeout);
        pendingDisconnects.delete(data.agentId);
        console.log(`[Socket] 🔄 Agent ${data.agentId} reconnected within grace period, restoring status: ${pendingDisconnect.previousStatus}`);
      }

      // Fetch and set agent's pool memberships (with priority ranks for tiered routing)
      const poolMemberships = await fetchAgentPoolMemberships(data.agentId);
      if (poolMemberships.length > 0) {
        poolManager.setAgentPoolMemberships(data.agentId, poolMemberships);
      }

      // Use profile from login payload (already verified ownership via token)
      // If reconnecting, use the previous status; otherwise default to "away"
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

      const agentState = poolManager.registerAgent(socket.id, profile);
      console.log("[Socket] 🟢 AGENT_LOGIN successful:", {
        agentId: data.agentId,
        socketId: socket.id,
        status: agentState.profile.status,
        poolCount: poolMemberships.length,
        reconnected: !!pendingDisconnect,
      });

      // Start activity session tracking
      if (verification.organizationId) {
        await startSession(data.agentId, verification.organizationId);
      }
      
      socket.emit(SOCKET_EVENTS.LOGIN_SUCCESS, { agentState });
      
      // Send initial stats
      const stats = poolManager.getAgentStats(data.agentId);
      if (stats) {
        socket.emit(SOCKET_EVENTS.STATS_UPDATE, stats);
      }

      // Check for unassigned visitors and assign them to this agent
      const unassignedVisitors = poolManager.getUnassignedVisitors();
      for (const visitor of unassignedVisitors) {
        poolManager.assignVisitorToAgent(visitor.visitorId, agentState.agentId);
        
        // Get widget settings for this visitor's org and matched pool
        const poolId = poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
        const widgetSettings = await getWidgetSettings(visitor.orgId, poolId);
        
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
        });
        console.log(`[Socket] Assigned unassigned visitor ${visitor.visitorId} to newly logged in agent ${agentState.agentId}`);
      }
    });

    socket.on(SOCKET_EVENTS.AGENT_STATUS, async (data: AgentStatusPayload) => {
      const agent = poolManager.getAgentBySocketId(socket.id);
      if (agent) {
        poolManager.updateAgentStatus(agent.agentId, data.status);
        
        // Track status change for activity reporting
        await recordStatusChange(agent.agentId, data.status, "manual");
        
        // If agent goes offline, reassign their visitors
        if (data.status === "offline") {
          const reassignments = poolManager.reassignVisitors(agent.agentId);
          notifyReassignments(io, poolManager, reassignments, "agent_offline");
        }
      }
    });

    // Agent manually sets themselves as away (e.g., from idle timer)
    socket.on(SOCKET_EVENTS.AGENT_AWAY, async (data: AgentAwayPayload, ack?: (response: StatusAckPayload) => void) => {
      const agent = poolManager.getAgentBySocketId(socket.id);
      if (!agent) {
        console.error(`[Socket] AGENT_AWAY failed - agent not found for socket ${socket.id}`);
        ack?.({ success: false, status: "offline", error: "Agent not found" });
        return;
      }

      try {
        console.log(`[Socket] 🚫 Agent ${agent.agentId} marked as away, reason: ${data.reason}`);
        console.log(`[Socket] Agent had ${agent.currentSimulations.length} visitors in simulations:`, agent.currentSimulations);
        
        poolManager.updateAgentStatus(agent.agentId, "away");
        
        // Track away status for activity reporting
        await recordStatusChange(agent.agentId, "away", data.reason);
        
        // Send acknowledgment first so client knows the status change succeeded
        ack?.({ success: true, status: "away" });
        
        // Reassign visitors watching this agent's simulation to another agent
        // (or notify them if no agent available - widget will hide)
        const reassignments = poolManager.reassignVisitors(agent.agentId);
        console.log(`[Socket] Reassignment results: ${reassignments.reassigned.size} reassigned, ${reassignments.unassigned.length} unassigned`);
        notifyReassignments(io, poolManager, reassignments, "agent_away");
        
        // Cancel any pending call requests for this agent
        const pendingRequests = poolManager.getWaitingRequestsForAgent(agent.agentId);
        for (const request of pendingRequests) {
          // Try to find another agent for the waiting visitor
          const visitor = poolManager.getVisitor(request.visitorId);
          if (visitor) {
            const newResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
            if (newResult && newResult.agent.agentId !== agent.agentId) {
              const newAgent = newResult.agent;
              // Mark old call as missed (agent went away)
              markCallMissed(request.requestId);
              
              // Cancel old request and create new one for the new agent
              poolManager.cancelCall(request.requestId);
              const newRequest = poolManager.createCallRequest(
                visitor.visitorId,
                newAgent.agentId,
                visitor.orgId,
                visitor.pageUrl
              );
              
              // Create call log for the new agent
              createCallLog(newRequest.requestId, {
                visitorId: visitor.visitorId,
                agentId: newAgent.agentId,
                orgId: visitor.orgId,
                pageUrl: visitor.pageUrl,
                ipAddress: visitor.ipAddress,
                location: visitor.location,
              });
              
              // Notify new agent
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
                startRNATimeout(io, poolManager, newRequest.requestId, newAgent.agentId, visitor.visitorId);
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Socket] Error in AGENT_AWAY handler:`, error);
        ack?.({ success: false, status: agent.profile.status, error: "Internal error" });
      }
    });

    // Agent returns from away
    socket.on(SOCKET_EVENTS.AGENT_BACK, async (ack?: (response: StatusAckPayload) => void) => {
      const agent = poolManager.getAgentBySocketId(socket.id);
      if (!agent) {
        console.error(`[Socket] AGENT_BACK failed - agent not found for socket ${socket.id}`);
        ack?.({ success: false, status: "offline", error: "Agent not found" });
        return;
      }

      try {
        console.log(`[Socket] Agent ${agent.agentId} is back from away`);
        poolManager.updateAgentStatus(agent.agentId, "idle");
        
        // Track status change for activity reporting
        await recordStatusChange(agent.agentId, "idle", "back_from_away");
        
        // Send acknowledgment first so client knows the status change succeeded
        ack?.({ success: true, status: "idle" });
        
        // Re-assign unassigned visitors (whose widgets were hidden when agent went away)
        const unassignedVisitors = poolManager.getUnassignedVisitors();
        for (const visitor of unassignedVisitors) {
          poolManager.assignVisitorToAgent(visitor.visitorId, agent.agentId);
          
          // Get widget settings for this visitor's org and matched pool
          const poolId = poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
          const widgetSettings = await getWidgetSettings(visitor.orgId, poolId);
          
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
          });
          console.log(`[Socket] Re-assigned visitor ${visitor.visitorId} to agent ${agent.agentId} returning from away`);
        }
        
        // Check for waiting call requests
        const waitingRequest = poolManager.getNextWaitingRequest(agent.agentId);
        if (waitingRequest) {
          const visitor = poolManager.getVisitor(waitingRequest.visitorId);
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
            startRNATimeout(io, poolManager, waitingRequest.requestId, agent.agentId, visitor.visitorId);
          }
        }
      } catch (error) {
        console.error(`[Socket] Error in AGENT_BACK handler:`, error);
        ack?.({ success: false, status: agent.profile.status, error: "Internal error" });
      }
    });

    // Handle heartbeat from client - update activity timestamp for staleness detection
    socket.on("heartbeat" as never, (_data: { timestamp: number }) => {
      const agent = poolManager.getAgentBySocketId(socket.id);
      if (agent) {
        poolManager.updateAgentActivity(agent.agentId);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPT, async (data: CallAcceptPayload) => {
      // Clear RNA timeout since agent answered
      clearRNATimeout(data.requestId);

      const request = poolManager.getCallRequest(data.requestId);
      if (!request) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.CALL_NOT_FOUND,
          message: "Call request not found or expired",
        });
        return;
      }

      const activeCall = poolManager.acceptCall(data.requestId);
      if (!activeCall) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: "Failed to accept call",
        });
        return;
      }

      // Get the database call log ID before we transfer the mapping
      const callLogId = getCallLogId(data.requestId);

      // Mark call as accepted in database
      markCallAccepted(data.requestId, activeCall.callId);
      
      // Track in_call status for activity reporting
      await recordStatusChange(request.agentId, "in_call", "call_started");

      // Notify the visitor
      const visitor = poolManager.getVisitor(request.visitorId);

      // Track GreetNow retargeting pixel for call started (fire-and-forget, non-blocking)
      // Only fires for orgs with retargeting enabled
      trackCallStarted({
        orgId: request.orgId,
        visitorId: request.visitorId,
        callId: activeCall.callId,
        agentId: request.agentId,
        pageUrl: request.pageUrl,
        ipAddress: visitor?.ipAddress ?? undefined,
      }).catch(() => {
        // Silently ignore - retargeting is best-effort
      });
      if (visitor) {
        const visitorSocket = io.sockets.sockets.get(visitor.socketId);
        visitorSocket?.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
          callId: activeCall.callId,
          agentId: request.agentId,
        });
      }

      // Reassign other visitors watching this agent
      const reassignments = poolManager.reassignVisitors(
        request.agentId,
        request.visitorId // Exclude the visitor in the call
      );
      notifyReassignments(io, poolManager, reassignments, "agent_busy");

      // Notify agent that call started (include callLogId for disposition updates)
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

    socket.on(SOCKET_EVENTS.CALL_REJECT, (data: CallRejectPayload) => {
      // Clear RNA timeout since agent responded (even if rejected)
      clearRNATimeout(data.requestId);
      
      const request = poolManager.getCallRequest(data.requestId);
      if (request) {
        // Mark original call as rejected in database
        markCallRejected(data.requestId);
        
        // Don't reject the visitor - they keep waiting
        // Just remove this specific request so we can create a new one later
        poolManager.rejectCall(data.requestId);
        
        console.log(`[Socket] Agent rejected call. Visitor ${request.visitorId} will keep waiting.`);
        
        // Create a new request so the agent will be notified again when available
        // The visitor stays in "call_requested" state
        const visitor = poolManager.getVisitor(request.visitorId);
        if (visitor) {
          const newRequest = poolManager.createCallRequest(
            request.visitorId,
            request.agentId,
            request.orgId,
            request.pageUrl
          );
          console.log(`[Socket] Created new request ${newRequest.requestId} for waiting visitor`);
          
          // Create a new call log for the retry
          createCallLog(newRequest.requestId, {
            visitorId: visitor.visitorId,
            agentId: request.agentId,
            orgId: request.orgId,
            pageUrl: request.pageUrl,
            ipAddress: visitor.ipAddress,
            location: visitor.location,
          });
        }
        
        // NOTE: We do NOT emit CALL_REJECTED to the visitor - they keep waiting
      }
    });

    socket.on(SOCKET_EVENTS.CALL_END, async (data: CallEndPayload) => {
      const call = poolManager.endCall(data.callId);
      if (call) {
        console.log("[Socket] Call ended:", data.callId, "by socket:", socket.id);
        
        // Mark call as completed in database
        markCallEnded(data.callId);
        
        // Track idle status for activity reporting (call ended)
        await recordStatusChange(call.agentId, "idle", "call_ended");
        
        // Determine who ended the call
        const agent = poolManager.getAgentBySocketId(socket.id);
        const isAgentEnding = !!agent;
        
        // Notify visitor
        const visitor = poolManager.getVisitor(call.visitorId);
        if (visitor) {
          const visitorSocket = io.sockets.sockets.get(visitor.socketId);
          visitorSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
            callId: data.callId,
            reason: isAgentEnding ? "agent_ended" : "visitor_ended",
          });
        }
        
        // Notify agent
        const callAgent = poolManager.getAgent(call.agentId);
        if (callAgent) {
          const agentSocket = io.sockets.sockets.get(callAgent.socketId);
          agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
            callId: data.callId,
            reason: isAgentEnding ? "agent_ended" : "visitor_ended",
          });
          
          // Check if there are any visitors waiting for this agent
          // and notify the agent immediately
          setTimeout(() => {
            const waitingRequest = poolManager.getNextWaitingRequest(call.agentId);
            if (waitingRequest && agentSocket) {
              const waitingVisitor = poolManager.getVisitor(waitingRequest.visitorId);
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
          }, 1000); // Small delay to let the UI update first
        }
      }
    });

    // -------------------------------------------------------------------------
    // WEBRTC SIGNALING (Both)
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.WEBRTC_SIGNAL, (data: WebRTCSignalPayload) => {
      // Determine if sender is agent or visitor
      const agent = poolManager.getAgentBySocketId(socket.id);
      const visitor = poolManager.getVisitorBySocketId(socket.id);

      if (agent) {
        // Agent sending signal to visitor
        const targetVisitor = poolManager.getVisitor(data.targetId);
        if (targetVisitor) {
          const targetSocket = io.sockets.sockets.get(targetVisitor.socketId);
          targetSocket?.emit(SOCKET_EVENTS.WEBRTC_SIGNAL, {
            targetId: agent.agentId,
            signal: data.signal,
          });
        }
      } else if (visitor) {
        // Visitor sending signal to agent
        const targetAgent = poolManager.getAgent(data.targetId);
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
    // CO-BROWSING (Visitor -> Agent)
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.COBROWSE_SNAPSHOT, (data: CobrowseSnapshotPayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        console.log("[Cobrowse] Snapshot received but no visitor found for socket:", socket.id);
        return;
      }

      // Find the agent in call with this visitor
      const activeCall = poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) {
        console.log("[Cobrowse] Snapshot received but no active call for visitor:", visitor.visitorId);
        return;
      }

      const agent = poolManager.getAgent(activeCall.agentId);
      if (!agent) {
        console.log("[Cobrowse] Snapshot received but agent not found:", activeCall.agentId);
        return;
      }

      console.log("[Cobrowse] Relaying snapshot:", { 
        visitorId: visitor.visitorId,
        viewport: data.viewport,
        url: data.url,
      });

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_SNAPSHOT, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    socket.on(SOCKET_EVENTS.COBROWSE_MOUSE, (data: CobrowseMousePayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = poolManager.getAgent(activeCall.agentId);
      if (!agent) return;

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_MOUSE, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    socket.on(SOCKET_EVENTS.COBROWSE_SCROLL, (data: CobrowseScrollPayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = poolManager.getAgent(activeCall.agentId);
      if (!agent) return;

      const agentSocket = io.sockets.sockets.get(agent.socketId);
      agentSocket?.emit(SOCKET_EVENTS.COBROWSE_SCROLL, {
        ...data,
        visitorId: visitor.visitorId,
      });
    });

    socket.on(SOCKET_EVENTS.COBROWSE_SELECTION, (data: CobrowseSelectionPayload) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) return;

      const activeCall = poolManager.getActiveCallByVisitorId(visitor.visitorId);
      if (!activeCall) return;

      const agent = poolManager.getAgent(activeCall.agentId);
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

      // Check if this was an agent
      const agent = poolManager.getAgentBySocketId(socket.id);
      if (agent) {
        const agentId = agent.agentId;
        const previousStatus = agent.profile.status;
        
        // End any active call immediately (can't wait for grace period)
        const activeCall = poolManager.getActiveCallByAgentId(agentId);
        if (activeCall) {
          markCallEnded(activeCall.callId);
          poolManager.endCall(activeCall.callId);
          const visitor = poolManager.getVisitor(activeCall.visitorId);
          if (visitor) {
            const visitorSocket = io.sockets.sockets.get(visitor.socketId);
            visitorSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
              callId: activeCall.callId,
              reason: "agent_ended",
            });
          }
        }

        // Mark agent as temporarily offline (they might reconnect)
        poolManager.updateAgentStatus(agentId, "offline");
        
        // Start grace period - don't fully unregister yet
        console.log(`[Socket] Agent ${agentId} disconnected, starting ${AGENT_DISCONNECT_GRACE_PERIOD}ms grace period (was ${previousStatus})`);
        
        const timeout = setTimeout(async () => {
          // Grace period expired - fully unregister the agent
          console.log(`[Socket] Grace period expired for agent ${agentId}, unregistering`);
          pendingDisconnects.delete(agentId);
          
          // End the activity session
          await endSession(agentId, "disconnect");
          
          // Reassign visitors and unregister
          const affectedVisitors = poolManager.unregisterAgent(agentId);
          if (affectedVisitors.length > 0) {
            for (const visitorId of affectedVisitors) {
              const visitor = poolManager.getVisitor(visitorId);
              if (visitor) {
                const newResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
                if (newResult) {
                  const newAgent = newResult.agent;
                  poolManager.assignVisitorToAgent(visitorId, newAgent.agentId);
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
                  // No other agent available
                  const visitorSocket = io.sockets.sockets.get(visitor.socketId);
                  visitorSocket?.emit(SOCKET_EVENTS.ERROR, {
                    code: ERROR_CODES.AGENT_UNAVAILABLE,
                    message: "All agents are currently unavailable",
                  });
                }
              }
            }
          }
        }, AGENT_DISCONNECT_GRACE_PERIOD);
        
        pendingDisconnects.set(agentId, { timeout, previousStatus });
        return;
      }

      // Check if this was a visitor
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (visitor) {
        // End any active call
        const activeCall = poolManager.getActiveCallByVisitorId(visitor.visitorId);
        if (activeCall) {
          // Mark call as completed in database
          markCallEnded(activeCall.callId);
          
          // Track agent going back to idle for activity reporting
          await recordStatusChange(activeCall.agentId, "idle", "call_ended");
          
          poolManager.endCall(activeCall.callId);
          const callAgent = poolManager.getAgent(activeCall.agentId);
          if (callAgent) {
            const agentSocket = io.sockets.sockets.get(callAgent.socketId);
            agentSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
              callId: activeCall.callId,
              reason: "visitor_ended",
            });
          }
        }

        // Get the agent BEFORE unregistering visitor so we can update their stats
        const assignedAgent = visitor.assignedAgentId 
          ? poolManager.getAgent(visitor.assignedAgentId) 
          : null;
        
        poolManager.unregisterVisitor(visitor.visitorId);
        
        // Emit updated stats to the agent (live visitor count)
        if (assignedAgent) {
          const updatedStats = poolManager.getAgentStats(assignedAgent.agentId);
          if (updatedStats) {
            const agentSocket = io.sockets.sockets.get(assignedAgent.socketId);
            agentSocket?.emit(SOCKET_EVENTS.STATS_UPDATE, updatedStats);
          }
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // PERIODIC STALENESS CHECK
  // ---------------------------------------------------------------------------
  // Check every 60 seconds for agents with no heartbeat for 2+ minutes
  const STALENESS_CHECK_INTERVAL = 60_000; // 60 seconds
  const STALENESS_THRESHOLD = 120_000; // 2 minutes without heartbeat = stale

  setInterval(() => {
    const staleAgents = poolManager.getStaleAgents(STALENESS_THRESHOLD);
    
    for (const agent of staleAgents) {
      console.log(`[Staleness] ⚠️ Agent ${agent.agentId} is stale (no heartbeat for ${STALENESS_THRESHOLD / 1000}s), marking as away`);
      
      // Mark agent as away
      poolManager.updateAgentStatus(agent.agentId, "away");
      
      // Track away status for activity reporting
      recordStatusChange(agent.agentId, "away", "heartbeat_stale");
      
      // Notify the agent they've been marked away
      const agentSocket = io.sockets.sockets.get(agent.socketId);
      if (agentSocket) {
        agentSocket.emit(SOCKET_EVENTS.AGENT_MARKED_AWAY, {
          reason: "idle",
          message: "You've been marked as Away due to connection inactivity.",
        });
      }
      
      // Reassign visitors watching this agent's simulation to another agent
      const reassignments = poolManager.reassignVisitors(agent.agentId);
      if (reassignments.reassigned.size > 0 || reassignments.unassigned.length > 0) {
        console.log(`[Staleness] Reassignment results for ${agent.agentId}: ${reassignments.reassigned.size} reassigned, ${reassignments.unassigned.length} unassigned`);
        notifyReassignments(io, poolManager, reassignments, "agent_away");
      }
    }
  }, STALENESS_CHECK_INTERVAL);
}

/**
 * Start RNA (Ring-No-Answer) timeout for a call request
 * If agent doesn't answer within the timeout, mark them as away and route to next agent
 */
function startRNATimeout(
  io: AppServer,
  poolManager: PoolManager,
  requestId: string,
  agentId: string,
  visitorId: string
): void {
  // Clear any existing timeout for this request
  clearRNATimeout(requestId);

  console.log(`[RNA] Starting ${TIMING.RNA_TIMEOUT}ms timeout for request ${requestId}`);

  const timeout = setTimeout(() => {
    console.log(`[RNA] ⏰ Timeout reached for request ${requestId}`);
    
    // Get the request (it may have been handled already)
    const request = poolManager.getCallRequest(requestId);
    if (!request) {
      console.log(`[RNA] Request ${requestId} no longer exists, skipping`);
      rnaTimeouts.delete(requestId);
      return;
    }

    // Get the agent
    const agent = poolManager.getAgent(agentId);
    if (!agent) {
      console.log(`[RNA] Agent ${agentId} no longer exists, skipping`);
      rnaTimeouts.delete(requestId);
      return;
    }

    // Mark agent as away (they walked away from their desk)
    console.log(`[RNA] Marking agent ${agentId} as away due to RNA`);
    poolManager.updateAgentStatus(agentId, "away");
    
    // Track away status for activity reporting (fire and forget)
    recordStatusChange(agentId, "away", "ring_no_answer");

    // Notify the agent they've been marked away
    const agentSocket = io.sockets.sockets.get(agent.socketId);
    if (agentSocket) {
      agentSocket.emit(SOCKET_EVENTS.CALL_CANCELLED, { requestId });
      agentSocket.emit(SOCKET_EVENTS.AGENT_MARKED_AWAY, {
        reason: "ring_no_answer",
        message: "You've been marked as Away because you didn't answer an incoming call.",
      });
    }

    // Mark call as missed in database
    markCallMissed(requestId);
    
    // Cancel the old request
    poolManager.rejectCall(requestId);

    // Try to find another agent for the visitor
    const visitor = poolManager.getVisitor(visitorId);
    if (visitor) {
      const newResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
      
      if (newResult && newResult.agent.agentId !== agentId) {
        const newAgent = newResult.agent;
        console.log(`[RNA] Routing visitor ${visitorId} to agent ${newAgent.agentId}`);
        
        // Create new request for the new agent
        const newRequest = poolManager.createCallRequest(
          visitorId,
          newAgent.agentId,
          visitor.orgId,
          visitor.pageUrl
        );
        
        // Create call log for the new agent
        createCallLog(newRequest.requestId, {
          visitorId: visitor.visitorId,
          agentId: newAgent.agentId,
          orgId: visitor.orgId,
          pageUrl: visitor.pageUrl,
          ipAddress: visitor.ipAddress,
          location: visitor.location,
        });

        // Notify new agent
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
          
          // Start RNA timeout for new agent too
          startRNATimeout(io, poolManager, newRequest.requestId, newAgent.agentId, visitorId);
        }
      } else {
        console.log(`[RNA] No other agents available for visitor ${visitorId}`);
        // Visitor keeps waiting - request is already cancelled above
      }
    }

    rnaTimeouts.delete(requestId);
  }, TIMING.RNA_TIMEOUT);

  rnaTimeouts.set(requestId, timeout);
}

/**
 * Clear RNA timeout for a request (call was answered or cancelled)
 */
function clearRNATimeout(requestId: string): void {
  const timeout = rnaTimeouts.get(requestId);
  if (timeout) {
    console.log(`[RNA] Clearing timeout for request ${requestId}`);
    clearTimeout(timeout);
    rnaTimeouts.delete(requestId);
  }
}

/**
 * Helper to notify visitors about agent reassignments and unavailability
 */
function notifyReassignments(
  io: AppServer,
  poolManager: PoolManager,
  result: { reassigned: Map<string, string>; unassigned: string[] },
  reason: "agent_busy" | "agent_offline" | "agent_away"
) {
  // Notify reassigned visitors of their new agent
  for (const [visitorId, newAgentId] of result.reassigned) {
    const visitor = poolManager.getVisitor(visitorId);
    const newAgent = poolManager.getAgent(newAgentId);
    
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

  // Notify unassigned visitors that no agents are available
  for (const visitorId of result.unassigned) {
    const visitor = poolManager.getVisitor(visitorId);
    if (visitor) {
      const visitorSocket = io.sockets.sockets.get(visitor.socketId);
      if (visitorSocket && visitorSocket.connected) {
        console.log(`[Socket] 📤 Emitting AGENT_UNAVAILABLE to visitor ${visitorId} (socket: ${visitor.socketId})`);
        visitorSocket.emit(SOCKET_EVENTS.ERROR, {
          code: ERROR_CODES.AGENT_UNAVAILABLE,
          message: "All agents are currently unavailable",
        });
      } else {
        console.log(`[Socket] ⚠️ Visitor ${visitorId} socket not connected (socketId: ${visitor.socketId}, exists: ${!!visitorSocket}, connected: ${visitorSocket?.connected})`);
      }
    } else {
      console.log(`[Socket] ⚠️ Visitor ${visitorId} not found in pool manager`);
    }
  }
}

