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
import type { PoolManager } from "../routing/pool-manager.js";
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
      
      // Check if this visitor already exists and is in a call (reconnection scenario)
      // If so, skip the normal registration - CALL_RECONNECT already handled it
      const existingVisitor = poolManager.getVisitorBySocketId(socket.id);
      if (existingVisitor && existingVisitor.state === "in_call") {
        console.log(`[Socket] 👤 Visitor ${existingVisitor.visitorId} already in call, skipping VISITOR_JOIN registration`);
        // Just update the page URL in case it changed
        existingVisitor.pageUrl = data.pageUrl;
        return;
      }
      
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
        // No agents available - DON'T record pageview immediately
        // Instead, send widget settings so widget can track trigger_delay
        // and send WIDGET_MISSED_OPPORTUNITY only if visitor stays long enough
        
        // Still determine the pool for widget settings
        const poolId = poolManager.matchPathToPool(data.orgId, data.pageUrl);
        const widgetSettings = await getWidgetSettings(data.orgId, poolId);
        
        console.log(`[Socket] ⚠️ No agents available for visitor ${visitorId}, sending widget settings (trigger_delay: ${widgetSettings.trigger_delay}s)`);
        
        // Store pool ID in visitor session for later use
        session.matchedPoolId = poolId;
        
        // Emit agent unavailable with settings (widget will track trigger_delay)
        socket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
          visitorId: session.visitorId,
          widgetSettings,
          poolId,
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
        visitorCountryCode: visitor.location?.countryCode ?? null,
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

    // Track missed opportunities ONLY when trigger delay has passed
    // This ensures we only count visitors who would have actually seen the widget
    socket.on(SOCKET_EVENTS.WIDGET_MISSED_OPPORTUNITY, (data: { triggerDelaySeconds: number; poolId: string | null }) => {
      const visitor = poolManager.getVisitorBySocketId(socket.id);
      if (!visitor) {
        console.log("[Socket] Missed opportunity received but no visitor found for socket:", socket.id);
        return;
      }

      // Record the pageview as a missed opportunity (fire-and-forget, non-blocking)
      recordPageview({
        visitorId: visitor.visitorId,
        agentId: null, // No agent was available - this is a missed opportunity
        orgId: visitor.orgId,
        pageUrl: visitor.pageUrl,
        poolId: data.poolId,
        visitorCountryCode: visitor.location?.countryCode ?? null,
        triggerDelaySeconds: data.triggerDelaySeconds,
      }).catch(() => {
        // Silently ignore - pageview tracking is best-effort
      });

      console.log(`[Socket] ⚠️ MISSED_OPPORTUNITY recorded for visitor ${visitor.visitorId} (trigger_delay: ${data.triggerDelaySeconds}s)`);
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

      // Check for unassigned visitors and assign them to this agent IF they match this agent's pools
      // Only assign visitors whose page URL matches a pool this agent belongs to (respects pool routing)
      const unassignedVisitors = poolManager.getUnassignedVisitors();
      for (const visitor of unassignedVisitors) {
        // Use findBestAgentForVisitor to respect pool-based routing
        // This ensures visitors are only assigned to agents in matching pools
        const matchResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
        
        // Only assign if this agent is the best match
        if (matchResult && matchResult.agent.agentId === agentState.agentId) {
          poolManager.assignVisitorToAgent(visitor.visitorId, agentState.agentId);
          
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
            // Include when visitor connected so widget can calculate remaining trigger delay
            visitorConnectedAt: visitor.connectedAt,
          });
          console.log(`[Socket] Assigned unassigned visitor ${visitor.visitorId} to newly logged in agent ${agentState.agentId} (pool: ${matchResult.poolId})`);
        }
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
          await notifyReassignments(io, poolManager, reassignments, "agent_offline", agent.profile.displayName);
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
        await notifyReassignments(io, poolManager, reassignments, "agent_away", agent.profile.displayName);
        
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
        // Only assign visitors whose page URL matches a pool this agent belongs to (respects pool routing)
        const unassignedVisitors = poolManager.getUnassignedVisitors();
        for (const visitor of unassignedVisitors) {
          // Use findBestAgentForVisitor to respect pool-based routing
          const matchResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
          
          // Only assign if this agent is the best match
          if (matchResult && matchResult.agent.agentId === agent.agentId) {
            poolManager.assignVisitorToAgent(visitor.visitorId, agent.agentId);
            
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
              // Include when visitor connected so widget can calculate remaining trigger delay
              visitorConnectedAt: visitor.connectedAt,
            });
            console.log(`[Socket] Re-assigned visitor ${visitor.visitorId} to agent ${agent.agentId} returning from away (pool: ${matchResult.poolId})`);
          }
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

      // Mark call as accepted in database and get reconnect token
      const reconnectToken = await markCallAccepted(data.requestId, activeCall.callId);
      
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
          reconnectToken: reconnectToken ?? "", // Token for reconnecting after page navigation
        });
      }

      // Reassign other visitors watching this agent
      const acceptingAgent = poolManager.getAgent(request.agentId);
      const reassignments = poolManager.reassignVisitors(
        request.agentId,
        request.visitorId // Exclude the visitor in the call
      );
      await notifyReassignments(io, poolManager, reassignments, "agent_busy", acceptingAgent?.profile.displayName);

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

    socket.on(SOCKET_EVENTS.CALL_REJECT, async (data: CallRejectPayload) => {
      // Clear RNA timeout since agent responded (even if rejected)
      clearRNATimeout(data.requestId);
      
      const request = poolManager.getCallRequest(data.requestId);
      if (request) {
        // Mark original call as rejected in database
        markCallRejected(data.requestId);
        
        // Remove the rejected request
        poolManager.rejectCall(data.requestId);
        
        console.log(`[Socket] Agent ${request.agentId} rejected call from visitor ${request.visitorId}`);
        
        // Try to find a DIFFERENT agent for this visitor
        const visitor = poolManager.getVisitor(request.visitorId);
        if (visitor) {
          // Find another agent, EXCLUDING the one who just rejected
          const newResult = poolManager.findBestAgentForVisitor(
            visitor.orgId, 
            visitor.pageUrl,
            request.agentId // Exclude the rejecting agent
          );
          
          if (newResult && newResult.agent.agentId !== request.agentId) {
            // Route to the new agent
            const newAgent = newResult.agent;
            
            const newRequest = poolManager.createCallRequest(
              request.visitorId,
              newAgent.agentId,
              request.orgId,
              request.pageUrl
            );
            
            console.log(`[Socket] Agent ${request.agentId} rejected, routing visitor ${request.visitorId} to agent ${newAgent.agentId}`);
            
            // Create a new call log for the new agent
            createCallLog(newRequest.requestId, {
              visitorId: visitor.visitorId,
              agentId: newAgent.agentId,
              orgId: request.orgId,
              pageUrl: request.pageUrl,
              ipAddress: visitor.ipAddress,
              location: visitor.location,
            });
            
            // Notify the new agent
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
              
              // Start RNA timeout for new agent
              startRNATimeout(io, poolManager, newRequest.requestId, newAgent.agentId, visitor.visitorId);
            }
          } else {
            // No other agents available - hide the widget with "got pulled away" message
            console.log(`[Socket] Agent ${request.agentId} rejected, no other agents available for visitor ${request.visitorId} - hiding widget`);
            
            // Get rejecting agent's name for the message
            const rejectingAgent = poolManager.getAgent(request.agentId);
            const agentName = rejectingAgent?.profile.displayName;
            
            // Mark visitor as unassigned since no agents available
            visitor.assignedAgentId = null;
            poolManager.updateVisitorState(request.visitorId, "browsing");
            
            // Send AGENT_UNAVAILABLE with agent name so widget can show "got pulled away" message
            const visitorSocket = io.sockets.sockets.get(visitor.socketId);
            if (visitorSocket) {
              const poolId = poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
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
    // CALL RECONNECTION (Visitor page navigation or server restart)
    // -------------------------------------------------------------------------

    socket.on(SOCKET_EVENTS.CALL_RECONNECT, async (data: CallReconnectPayload) => {
      console.log(`[Socket] 🔄 CALL_RECONNECT request from ${data.role}:`, data.reconnectToken.slice(0, 8) + "...");

      // Look up the call by reconnect token
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
        // Visitor is reconnecting after page navigation
        const agent = poolManager.getAgent(callInfo.agent_id);
        
        if (!agent) {
          console.log("[Socket] ❌ Agent no longer online for reconnection");
          socket.emit(SOCKET_EVENTS.CALL_RECONNECT_FAILED, {
            callId: callInfo.id,
            reason: "other_party_disconnected",
            message: "Agent is no longer available",
          });
          // Mark call as ended in database
          await markCallReconnectFailed(callInfo.id);
          return;
        }

        // Check if agent is still in a call (should be with this visitor)
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

        // Register visitor with their old visitorId
        const visitorSession = poolManager.registerVisitor(
          socket.id,
          callInfo.visitor_id,
          callInfo.organization_id,
          callInfo.page_url,
          null
        );

        // Generate a new callId for the reconnected call
        const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // Re-establish the call in pool manager
        poolManager.reconnectVisitorToCall(
          visitorSession.visitorId,
          agent.agentId,
          newCallId
        );

        // Mark call as reconnected in database and get new token
        const newToken = await markCallReconnected(callInfo.id, newCallId) ?? data.reconnectToken;

        console.log(`[Socket] ✅ Visitor ${callInfo.visitor_id} reconnected to call with agent ${agent.agentId}`);

        // Notify visitor of successful reconnection (include agent profile for WebRTC)
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

        // Notify agent that visitor reconnected (they need to re-initiate WebRTC)
        const agentSocket = io.sockets.sockets.get(agent.socketId);
        agentSocket?.emit(SOCKET_EVENTS.CALL_RECONNECTED, {
          callId: newCallId,
          reconnectToken: newToken,
          peerId: visitorSession.visitorId,
        });
      }
      // TODO: Handle agent reconnection after server restart (data.role === "agent")
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
                  // No other agent available - send proper event with widget settings
                  const visitorSocket = io.sockets.sockets.get(visitor.socketId);
                  if (visitorSocket) {
                    const poolId = poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
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

  setInterval(async () => {
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
        await notifyReassignments(io, poolManager, reassignments, "agent_away", agent.profile.displayName);
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

  const timeout = setTimeout(async () => {
    console.log(`[RNA] ⏰ Timeout reached for request ${requestId}`);
    
    // RACE CONDITION FIX: Add a small grace period to let any pending CALL_ACCEPT
    // handlers complete. This handles the edge case where the agent clicks Accept
    // at the exact moment the timeout fires - the agent should always win.
    // Without this delay, if both callbacks are queued in the same event loop tick,
    // the RNA callback might run first and mark the agent as away before CALL_ACCEPT
    // can process the acceptance.
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms grace period
    
    // Get the request (it may have been handled already during grace period)
    const request = poolManager.getCallRequest(requestId);
    if (!request) {
      console.log(`[RNA] Request ${requestId} no longer exists (likely accepted during grace period), skipping`);
      rnaTimeouts.delete(requestId);
      return;
    }

    // Double-check if call was accepted during grace period
    // This handles the case where agent clicks Accept at the exact moment timeout fires
    const activeCall = poolManager.getActiveCallByVisitorId(visitorId);
    if (activeCall) {
      console.log(`[RNA] Call already active for visitor ${visitorId}, agent won the race - skipping timeout`);
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
        // No other agents available - hide widget with "got pulled away" message
        console.log(`[RNA] No other agents available for visitor ${visitorId} - hiding widget`);
        
        // Mark visitor as unassigned
        visitor.assignedAgentId = null;
        poolManager.updateVisitorState(visitorId, "browsing");
        
        // Send AGENT_UNAVAILABLE with agent name so widget can show "got pulled away" message
        const visitorSocket = io.sockets.sockets.get(visitor.socketId);
        if (visitorSocket) {
          const poolId = poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
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
async function notifyReassignments(
  io: AppServer,
  poolManager: PoolManager,
  result: { reassigned: Map<string, string>; unassigned: string[] },
  reason: "agent_busy" | "agent_offline" | "agent_away",
  previousAgentName?: string // Name of agent who became unavailable (for "got pulled away" message)
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
  // Send proper AGENT_UNAVAILABLE event with agent name for "got pulled away" message
  for (const visitorId of result.unassigned) {
    const visitor = poolManager.getVisitor(visitorId);
    if (visitor) {
      const visitorSocket = io.sockets.sockets.get(visitor.socketId);
      if (visitorSocket && visitorSocket.connected) {
        const poolId = poolManager.matchPathToPool(visitor.orgId, visitor.pageUrl);
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
        console.log(`[Socket] ⚠️ Visitor ${visitorId} socket not connected (socketId: ${visitor.socketId}, exists: ${!!visitorSocket}, connected: ${visitorSocket?.connected})`);
      }
    } else {
      console.log(`[Socket] ⚠️ Visitor ${visitorId} not found in pool manager`);
    }
  }
}

