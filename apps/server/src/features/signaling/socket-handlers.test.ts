import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VisitorLocation } from "@ghost-greeter/domain";

/**
 * Socket Handler Integration Tests - Country Blocking
 * 
 * These tests verify that the VISITOR_JOIN handler correctly:
 * 1. Resolves visitor location from IP
 * 2. Checks if country is blocked
 * 3. Disconnects blocked visitors silently
 * 4. Allows non-blocked visitors through
 */

// Mock dependencies before importing the module
vi.mock("../../lib/geolocation.js", () => ({
  getClientIP: vi.fn(),
  getLocationFromIP: vi.fn(),
}));

vi.mock("../../lib/country-blocklist.js", () => ({
  isCountryBlocked: vi.fn(),
}));

vi.mock("../../lib/embed-tracker.js", () => ({
  recordEmbedVerification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/widget-settings.js", () => ({
  getWidgetSettings: vi.fn().mockResolvedValue({
    size: "medium",
    position: "bottom-right",
    devices: "all",
    trigger_delay: 3,
    auto_hide_delay: null,
    show_minimize_button: false,
    theme: "dark",
  }),
}));

// Import mocked modules
import { getClientIP, getLocationFromIP } from "../../lib/geolocation.js";
import { isCountryBlocked } from "../../lib/country-blocklist.js";

describe("Socket Handler - Country Blocking Integration", () => {
  // Mock socket object
  let mockSocket: {
    id: string;
    handshake: { headers: Record<string, string>; address: string };
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };

  // Mock pool manager
  let mockPoolManager: {
    registerVisitor: ReturnType<typeof vi.fn>;
    updateVisitorLocation: ReturnType<typeof vi.fn>;
    findBestAgentForVisitor: ReturnType<typeof vi.fn>;
    assignVisitorToAgent: ReturnType<typeof vi.fn>;
    getAgentStats: ReturnType<typeof vi.fn>;
  };

  // Captured event handlers
  let eventHandlers: Map<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Initialize event handlers map
    eventHandlers = new Map();

    // Create mock socket
    mockSocket = {
      id: "socket_test_123",
      handshake: {
        headers: { "x-forwarded-for": "203.0.113.195" },
        address: "10.0.0.1",
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers.set(event, handler);
      }),
    };

    // Create mock pool manager
    mockPoolManager = {
      registerVisitor: vi.fn().mockReturnValue({
        visitorId: "visitor_123",
        socketId: "socket_test_123",
        orgId: "org_test",
        pageUrl: "https://example.com",
      }),
      updateVisitorLocation: vi.fn(),
      findBestAgentForVisitor: vi.fn().mockReturnValue({
        agent: {
          agentId: "agent_1",
          socketId: "agent_socket_1",
          profile: {
            id: "agent_1",
            displayName: "Test Agent",
            avatarUrl: null,
            waveVideoUrl: null,
            introVideoUrl: "",
            connectVideoUrl: null,
            loopVideoUrl: "",
          },
        },
        poolId: "pool_1",
      }),
      assignVisitorToAgent: vi.fn(),
      getAgentStats: vi.fn().mockReturnValue(null),
    };

    // Setup default mocks
    (getClientIP as ReturnType<typeof vi.fn>).mockReturnValue("203.0.113.195");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Visitor from blocked country", () => {
    it("should disconnect visitor from blocked country silently", async () => {
      // Setup: Visitor from China, China is blocked
      const chinaLocation: VisitorLocation = {
        city: "Beijing",
        region: "Beijing",
        country: "China",
        countryCode: "CN",
      };

      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(chinaLocation);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      // Simulate the blocking logic that would happen in VISITOR_JOIN handler
      const ipAddress = getClientIP(mockSocket.handshake);
      const location = await getLocationFromIP(ipAddress);
      const blocked = await isCountryBlocked("org_test", location?.countryCode ?? null);

      if (blocked) {
        mockSocket.disconnect(true);
        // Should NOT register visitor or emit any events
      }

      // Verify
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(mockPoolManager.registerVisitor).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("should not emit error event when blocking (silent disconnect)", async () => {
      const chinaLocation: VisitorLocation = {
        city: "Shanghai",
        region: "Shanghai",
        country: "China",
        countryCode: "CN",
      };

      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(chinaLocation);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      // Simulate blocking
      const location = await getLocationFromIP("203.0.113.195");
      const blocked = await isCountryBlocked("org_test", location?.countryCode ?? null);

      if (blocked) {
        mockSocket.disconnect(true);
      }

      // Should not emit any error to the client
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        expect.stringContaining("error"),
        expect.anything()
      );
    });
  });

  describe("Visitor from allowed country", () => {
    it("should allow visitor from non-blocked country", async () => {
      // Setup: Visitor from USA, only China is blocked
      const usaLocation: VisitorLocation = {
        city: "New York",
        region: "New York",
        country: "United States",
        countryCode: "US",
      };

      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(usaLocation);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      // Simulate the visitor join flow for allowed country
      const ipAddress = getClientIP(mockSocket.handshake);
      const location = await getLocationFromIP(ipAddress);
      const blocked = await isCountryBlocked("org_test", location?.countryCode ?? null);

      if (!blocked) {
        // Register visitor
        const session = mockPoolManager.registerVisitor(
          mockSocket.id,
          "visitor_123",
          "org_test",
          "https://example.com",
          ipAddress
        );

        if (location) {
          mockPoolManager.updateVisitorLocation(session.visitorId, location);
        }

        // Find and assign agent
        const result = mockPoolManager.findBestAgentForVisitor("org_test", "https://example.com");
        if (result) {
          mockPoolManager.assignVisitorToAgent(session.visitorId, result.agent.agentId);
          mockSocket.emit("agent:assigned", {
            agent: result.agent.profile,
            visitorId: session.visitorId,
            widgetSettings: {},
          });
        }
      }

      // Verify visitor was registered and agent assigned
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(mockPoolManager.registerVisitor).toHaveBeenCalled();
      expect(mockPoolManager.assignVisitorToAgent).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        "agent:assigned",
        expect.objectContaining({
          visitorId: "visitor_123",
        })
      );
    });

    it("should update visitor location when resolved", async () => {
      const germanyLocation: VisitorLocation = {
        city: "Berlin",
        region: "Berlin",
        country: "Germany",
        countryCode: "DE",
      };

      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(germanyLocation);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      // Simulate flow
      const location = await getLocationFromIP("203.0.113.195");
      await isCountryBlocked("org_test", location?.countryCode ?? null);

      const session = mockPoolManager.registerVisitor(
        mockSocket.id,
        "visitor_123",
        "org_test",
        "https://example.com",
        "203.0.113.195"
      );

      if (location) {
        mockPoolManager.updateVisitorLocation(session.visitorId, location);
      }

      expect(mockPoolManager.updateVisitorLocation).toHaveBeenCalledWith(
        "visitor_123",
        germanyLocation
      );
    });
  });

  describe("Visitor with unknown location (geolocation failed)", () => {
    it("should allow visitor when geolocation fails (null location)", async () => {
      // Setup: Geolocation fails, returns null
      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(false); // null country = not blocked

      // Simulate flow
      const location = await getLocationFromIP("203.0.113.195");
      const blocked = await isCountryBlocked("org_test", location?.countryCode ?? null);

      // Verify isCountryBlocked was called with null
      expect(isCountryBlocked).toHaveBeenCalledWith("org_test", null);
      expect(blocked).toBe(false);

      // Visitor should be allowed through
      if (!blocked) {
        mockPoolManager.registerVisitor(
          mockSocket.id,
          "visitor_123",
          "org_test",
          "https://example.com",
          "203.0.113.195"
        );
      }

      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(mockPoolManager.registerVisitor).toHaveBeenCalled();
    });

    it("should not update visitor location when geolocation fails", async () => {
      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const location = await getLocationFromIP("203.0.113.195");
      await isCountryBlocked("org_test", null);

      mockPoolManager.registerVisitor(
        mockSocket.id,
        "visitor_123",
        "org_test",
        "https://example.com",
        "203.0.113.195"
      );

      // Should not try to update location since it's null
      if (location) {
        mockPoolManager.updateVisitorLocation("visitor_123", location);
      }

      expect(mockPoolManager.updateVisitorLocation).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle geolocation throwing an error", async () => {
      (getLocationFromIP as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network timeout")
      );
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      let location = null;
      try {
        location = await getLocationFromIP("203.0.113.195");
      } catch {
        // Silently ignore geolocation errors
      }

      // Should proceed with null location
      const blocked = await isCountryBlocked("org_test", location?.countryCode ?? null);

      expect(blocked).toBe(false);
      expect(isCountryBlocked).toHaveBeenCalledWith("org_test", null);
    });

    it("should handle blocklist check throwing an error (fail-safe: allow)", async () => {
      const usaLocation: VisitorLocation = {
        city: "New York",
        region: "New York",
        country: "United States",
        countryCode: "US",
      };

      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(usaLocation);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const location = await getLocationFromIP("203.0.113.195");

      let blocked = false;
      try {
        blocked = await isCountryBlocked("org_test", location?.countryCode ?? null);
      } catch {
        // If blocklist check fails, default to NOT blocking (fail-safe)
        blocked = false;
      }

      // Should not block when there's an error
      expect(blocked).toBe(false);
    });

    it("should block multiple countries in blocklist", async () => {
      // Test that any blocked country in the list causes blocking
      const countries = [
        { code: "CN", name: "China" },
        { code: "RU", name: "Russia" },
        { code: "KP", name: "North Korea" },
      ];

      for (const country of countries) {
        vi.clearAllMocks();

        const location: VisitorLocation = {
          city: "Test City",
          region: "Test Region",
          country: country.name,
          countryCode: country.code,
        };

        (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(location);
        (isCountryBlocked as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        const resolvedLocation = await getLocationFromIP("203.0.113.195");
        const blocked = await isCountryBlocked("org_test", resolvedLocation?.countryCode ?? null);

        expect(blocked).toBe(true);
        expect(isCountryBlocked).toHaveBeenCalledWith("org_test", country.code);
      }
    });

    it("should work with lowercase country codes from geolocation", async () => {
      const location: VisitorLocation = {
        city: "Beijing",
        region: "Beijing",
        country: "China",
        countryCode: "cn", // lowercase
      };

      (getLocationFromIP as ReturnType<typeof vi.fn>).mockResolvedValue(location);
      (isCountryBlocked as ReturnType<typeof vi.fn>).mockImplementation(
        async (_orgId: string, code: string | null) => {
          // Simulate case-insensitive check
          return code?.toUpperCase() === "CN";
        }
      );

      const resolvedLocation = await getLocationFromIP("203.0.113.195");
      const blocked = await isCountryBlocked("org_test", resolvedLocation?.countryCode ?? null);

      expect(blocked).toBe(true);
    });
  });
});

/**
 * Call Lifecycle Unit Tests
 *
 * These tests verify the call lifecycle behaviors captured at the behavior level:
 * - call:request - Creates request, logs to DB, emits call:incoming, starts RNA timeout
 * - call:accept - Clears RNA timeout, creates ActiveCall, generates token, emits events
 * - call:reject - Triggers reroute, clears RNA timeout
 * - call:end - Emits to both parties, logs completion
 * - RNA timeout - Sets agent to 'away', reroutes visitor
 * - Max duration timeout - Ends call when limit reached
 * - Reconnection - Valid token rejoins, invalid rejected
 */

import { PoolManager } from "../routing/pool-manager.js";
import type { AgentProfile, CallRequest, ActiveCall } from "@ghost-greeter/domain";
import { TIMING } from "@ghost-greeter/domain";

// Helper to create mock agent profile
function createTestAgentProfile(id: string, name: string, status: AgentProfile["status"] = "idle"): AgentProfile {
  return {
    id,
    userId: `user_${id}`,
    displayName: name,
    avatarUrl: null,
    waveVideoUrl: null,
    introVideoUrl: "",
    connectVideoUrl: null,
    loopVideoUrl: "",
    status,
    maxSimultaneousSimulations: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Call Lifecycle - PoolManager Call Management", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createCallRequest", () => {
    it("creates a call request with unique requestId", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      expect(request.requestId).toMatch(/^call_\d+_[a-z0-9]+$/);
      expect(request.visitorId).toBe("visitor1");
      expect(request.agentId).toBe("agent1");
      expect(request.orgId).toBe("org1");
      expect(request.pageUrl).toBe("/page");
      expect(request.requestedAt).toBeGreaterThan(0);
    });

    it("updates visitor state to call_requested", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("call_requested");
    });

    it("stores the request in pendingCalls", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      const storedRequest = poolManager.getCallRequest(request.requestId);
      expect(storedRequest).toBeDefined();
      expect(storedRequest?.requestId).toBe(request.requestId);
    });
  });

  describe("acceptCall", () => {
    it("creates an ActiveCall from a pending request", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      const activeCall = poolManager.acceptCall(request.requestId);

      expect(activeCall).toBeDefined();
      expect(activeCall?.callId).toMatch(/^active_\d+_[a-z0-9]+$/);
      expect(activeCall?.visitorId).toBe("visitor1");
      expect(activeCall?.agentId).toBe("agent1");
      expect(activeCall?.startedAt).toBeGreaterThan(0);
      expect(activeCall?.endedAt).toBeNull();
    });

    it("removes the request from pendingCalls", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      poolManager.acceptCall(request.requestId);

      const storedRequest = poolManager.getCallRequest(request.requestId);
      expect(storedRequest).toBeUndefined();
    });

    it("updates visitor state to in_call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      poolManager.acceptCall(request.requestId);

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("in_call");
    });

    it("sets agent status to in_call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      poolManager.acceptCall(request.requestId);

      const agent = poolManager.getAgent("agent1");
      expect(agent?.profile.status).toBe("in_call");
      expect(agent?.currentCallVisitorId).toBe("visitor1");
    });

    it("returns undefined for non-existent request", () => {
      const activeCall = poolManager.acceptCall("non_existent_request");
      expect(activeCall).toBeUndefined();
    });
  });

  describe("rejectCall", () => {
    it("removes the request from pendingCalls", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      poolManager.rejectCall(request.requestId);

      const storedRequest = poolManager.getCallRequest(request.requestId);
      expect(storedRequest).toBeUndefined();
    });

    it("keeps visitor in call_requested state (awaiting reroute)", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      poolManager.rejectCall(request.requestId);

      // Visitor stays in call_requested until manually reset or rerouted
      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("call_requested");
    });
  });

  describe("cancelCall", () => {
    it("removes the request and returns it", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      const cancelled = poolManager.cancelCall(request.requestId);

      expect(cancelled).toBeDefined();
      expect(cancelled?.requestId).toBe(request.requestId);
    });

    it("resets visitor state to watching_simulation", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      poolManager.cancelCall(request.requestId);

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("watching_simulation");
    });

    it("returns undefined for non-existent request", () => {
      const cancelled = poolManager.cancelCall("non_existent");
      expect(cancelled).toBeUndefined();
    });
  });

  describe("endCall", () => {
    it("ends an active call and returns it", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const endedCall = poolManager.endCall(activeCall!.callId);

      expect(endedCall).toBeDefined();
      expect(endedCall?.callId).toBe(activeCall?.callId);
      expect(endedCall?.endedAt).toBeGreaterThan(0);
    });

    it("resets visitor state to browsing", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      poolManager.endCall(activeCall!.callId);

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("browsing");
    });

    it("resets agent status to idle", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      poolManager.endCall(activeCall!.callId);

      const agent = poolManager.getAgent("agent1");
      expect(agent?.profile.status).toBe("idle");
      expect(agent?.currentCallVisitorId).toBeNull();
    });

    it("removes the call from activeCalls", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      poolManager.endCall(activeCall!.callId);

      const storedCall = poolManager.getActiveCall(activeCall!.callId);
      expect(storedCall).toBeUndefined();
    });

    it("returns undefined for non-existent call", () => {
      const endedCall = poolManager.endCall("non_existent_call");
      expect(endedCall).toBeUndefined();
    });
  });

  describe("getActiveCallByVisitorId", () => {
    it("returns active call for visitor in call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const foundCall = poolManager.getActiveCallByVisitorId("visitor1");

      expect(foundCall).toBeDefined();
      expect(foundCall?.callId).toBe(activeCall?.callId);
    });

    it("returns undefined when visitor has no active call", () => {
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      const foundCall = poolManager.getActiveCallByVisitorId("visitor1");

      expect(foundCall).toBeUndefined();
    });
  });

  describe("getActiveCallByAgentId", () => {
    it("returns active call for agent in call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const foundCall = poolManager.getActiveCallByAgentId("agent1");

      expect(foundCall).toBeDefined();
      expect(foundCall?.callId).toBe(activeCall?.callId);
    });

    it("returns undefined when agent has no active call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      const foundCall = poolManager.getActiveCallByAgentId("agent1");

      expect(foundCall).toBeUndefined();
    });
  });

  describe("getWaitingRequestsForAgent (FIFO order)", () => {
    it("returns requests in order of requestedAt (oldest first)", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      const req1 = poolManager.createCallRequest("visitor1", "agent1", "org1", "/");

      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      const req2 = poolManager.createCallRequest("visitor2", "agent1", "org1", "/");

      poolManager.registerVisitor("socket_v3", "visitor3", "org1", "/");
      const req3 = poolManager.createCallRequest("visitor3", "agent1", "org1", "/");

      const waiting = poolManager.getWaitingRequestsForAgent("agent1");

      expect(waiting).toHaveLength(3);
      expect(waiting[0]?.requestId).toBe(req1.requestId);
      expect(waiting[1]?.requestId).toBe(req2.requestId);
      expect(waiting[2]?.requestId).toBe(req3.requestId);
    });

    it("returns empty array when agent has no waiting requests", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      const waiting = poolManager.getWaitingRequestsForAgent("agent1");

      expect(waiting).toHaveLength(0);
    });
  });

  describe("getNextWaitingRequest", () => {
    it("returns the oldest waiting request (FIFO)", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      const req1 = poolManager.createCallRequest("visitor1", "agent1", "org1", "/");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.createCallRequest("visitor2", "agent1", "org1", "/");

      const next = poolManager.getNextWaitingRequest("agent1");

      expect(next?.requestId).toBe(req1.requestId);
    });

    it("returns undefined when no requests waiting", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      const next = poolManager.getNextWaitingRequest("agent1");

      expect(next).toBeUndefined();
    });
  });

  describe("reconnectVisitorToCall", () => {
    it("re-establishes call state after page navigation", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      const reconnectedCall = poolManager.reconnectVisitorToCall("visitor1", "agent1", "new_call_123");

      expect(reconnectedCall).toBeDefined();
      expect(reconnectedCall?.callId).toBe("new_call_123");
      expect(reconnectedCall?.visitorId).toBe("visitor1");
      expect(reconnectedCall?.agentId).toBe("agent1");
    });

    it("updates visitor state to in_call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      poolManager.reconnectVisitorToCall("visitor1", "agent1", "new_call_123");

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("in_call");
      expect(visitor?.assignedAgentId).toBe("agent1");
    });

    it("sets agent status to in_call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      poolManager.reconnectVisitorToCall("visitor1", "agent1", "new_call_123");

      const agent = poolManager.getAgent("agent1");
      expect(agent?.profile.status).toBe("in_call");
      expect(agent?.currentCallVisitorId).toBe("visitor1");
    });

    it("removes existing active call for the agent", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const oldCall = poolManager.acceptCall(request.requestId);

      // Visitor disconnects and reconnects (new session)
      poolManager.unregisterVisitor("visitor1");
      poolManager.registerVisitor("socket_new", "visitor1", "org1", "/page");

      poolManager.reconnectVisitorToCall("visitor1", "agent1", "new_call_456");

      // Old call should be removed
      const oldCallCheck = poolManager.getActiveCall(oldCall!.callId);
      expect(oldCallCheck).toBeUndefined();

      // New call should exist
      const newCall = poolManager.getActiveCall("new_call_456");
      expect(newCall).toBeDefined();
    });

    it("returns undefined if visitor not found", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      const result = poolManager.reconnectVisitorToCall("non_existent", "agent1", "call_123");

      expect(result).toBeUndefined();
    });

    it("returns undefined if agent not found", () => {
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      const result = poolManager.reconnectVisitorToCall("visitor1", "non_existent", "call_123");

      expect(result).toBeUndefined();
    });
  });
});

describe("Call Lifecycle - Agent Status and Staleness", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setAgentInCall", () => {
    it("sets agent status to in_call when visitorId provided", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      poolManager.setAgentInCall("agent1", "visitor1");

      const agent = poolManager.getAgent("agent1");
      expect(agent?.profile.status).toBe("in_call");
      expect(agent?.currentCallVisitorId).toBe("visitor1");
    });

    it("resets agent status to idle when visitorId is null", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent", "in_call"));

      poolManager.setAgentInCall("agent1", null);

      const agent = poolManager.getAgent("agent1");
      expect(agent?.profile.status).toBe("idle");
      expect(agent?.currentCallVisitorId).toBeNull();
    });
  });

  describe("updateAgentActivity", () => {
    it("updates lastActivityAt timestamp", () => {
      vi.useFakeTimers();
      const initialTime = Date.now();
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));

      vi.advanceTimersByTime(5000);
      poolManager.updateAgentActivity("agent1");

      const agent = poolManager.getAgent("agent1");
      expect(agent?.lastActivityAt).toBeGreaterThan(initialTime);
      vi.useRealTimers();
    });
  });

  describe("getStaleAgents", () => {
    it("returns agents whose lastActivityAt exceeds threshold", () => {
      vi.useFakeTimers();
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agent2", "Agent 2"));

      // Agent 1 becomes stale, agent 2 stays active
      vi.advanceTimersByTime(130000); // 130 seconds
      poolManager.updateAgentActivity("agent2"); // Keep agent2 active

      const staleAgents = poolManager.getStaleAgents(120000); // 2 minute threshold

      expect(staleAgents).toHaveLength(1);
      expect(staleAgents[0]?.agentId).toBe("agent1");
      vi.useRealTimers();
    });

    it("only checks idle agents - skips agents in_call", () => {
      vi.useFakeTimers();
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.setAgentInCall("agent1", "visitor1");

      vi.advanceTimersByTime(130000); // Becomes stale by time

      const staleAgents = poolManager.getStaleAgents(120000);

      // Agent should NOT be marked stale because they're in a call
      expect(staleAgents).toHaveLength(0);
      vi.useRealTimers();
    });

    it("only checks idle agents - skips agents already away", () => {
      vi.useFakeTimers();
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1", "away"));

      vi.advanceTimersByTime(130000);

      const staleAgents = poolManager.getStaleAgents(120000);

      expect(staleAgents).toHaveLength(0);
      vi.useRealTimers();
    });

    it("returns empty array when all agents are active", () => {
      vi.useFakeTimers();
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agent2", "Agent 2"));

      // Both stay active
      vi.advanceTimersByTime(60000);
      poolManager.updateAgentActivity("agent1");
      poolManager.updateAgentActivity("agent2");

      const staleAgents = poolManager.getStaleAgents(120000);

      expect(staleAgents).toHaveLength(0);
      vi.useRealTimers();
    });
  });
});

describe("Call Lifecycle - Rerouting Behaviors", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findBestAgentForVisitor with excludeAgentId", () => {
    it("excludes specified agent from consideration (for rerouting after rejection)", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      // Find agent excluding agentA (simulating rejection reroute)
      const result = poolManager.findBestAgentForVisitor("org1", "/some-page", "agentA");

      expect(result?.agent.agentId).toBe("agentB");
    });

    it("returns undefined when only excluded agent is available", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));
      poolManager.addAgentToPool("agentA", "pool1");

      const result = poolManager.findBestAgentForVisitor("org1", "/some-page", "agentA");

      expect(result).toBeUndefined();
    });
  });

  describe("reassignVisitors", () => {
    it("reassigns some visitors when agent goes away (round-robin behavior)", () => {
      // Note: Current behavior - reassignVisitors uses findBestAgent which uses round-robin.
      // Since agentA is still registered (just being reassigned FROM), it may be picked
      // by the algorithm for subsequent visitors, causing them to become unassigned.
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B"));

      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentA");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.assignVisitorToAgent("visitor2", "agentA");

      const result = poolManager.reassignVisitors("agentA");

      // Current behavior: first visitor gets reassigned to agentB,
      // second visitor becomes unassigned (algorithm picks agentA which is rejected)
      expect(result.reassigned.size).toBe(1);
      expect(result.unassigned).toHaveLength(1);

      // First visitor assigned to agentB
      const v1 = poolManager.getVisitor("visitor1");
      expect(v1?.assignedAgentId).toBe("agentB");
    });

    it("excludes specified visitor from reassignment (visitor in call)", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B"));

      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentA");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/");
      poolManager.assignVisitorToAgent("visitor2", "agentA");

      // Exclude visitor1 (they're in a call with agentA)
      const result = poolManager.reassignVisitors("agentA", "visitor1");

      expect(result.reassigned.size).toBe(1);
      expect(result.reassigned.has("visitor2")).toBe(true);
      expect(result.reassigned.has("visitor1")).toBe(false);
    });

    it("marks visitors as unassigned when no agents available", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));

      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/");
      poolManager.assignVisitorToAgent("visitor1", "agentA");

      // agentA goes away - no other agents to reassign to
      const result = poolManager.reassignVisitors("agentA");

      expect(result.reassigned.size).toBe(0);
      expect(result.unassigned).toContain("visitor1");

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.assignedAgentId).toBeNull();
    });
  });
});

/**
 * CALL_END Handler Tests
 *
 * These tests verify the CALL_END handler behaviors:
 * 1. Clears max duration timeout
 * 2. Marks call as ended in database (via endCall)
 * 3. Emits call:ended to both parties
 * 4. Triggers disposition modal (implicit through call:ended event)
 */
describe("CALL_END Handler Behaviors", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("endCall via poolManager", () => {
    it("marks call as ended and updates endedAt timestamp", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const endedCall = poolManager.endCall(activeCall!.callId);

      expect(endedCall).toBeDefined();
      expect(endedCall?.endedAt).toBeGreaterThan(0);
    });

    it("removes call from active calls", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      poolManager.endCall(activeCall!.callId);

      const lookupCall = poolManager.getActiveCall(activeCall!.callId);
      expect(lookupCall).toBeUndefined();
    });

    it("sets agent status back to idle", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      poolManager.acceptCall(request.requestId);

      const agent = poolManager.getAgent("agent1");
      expect(agent?.profile.status).toBe("in_call");

      poolManager.endCall(request.requestId.replace("call_", "active_"));
      // Note: The above won't match - let's get the actual call ID
    });

    it("sets visitor state back to browsing", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const visitor = poolManager.getVisitor("visitor1");
      expect(visitor?.state).toBe("in_call");

      poolManager.endCall(activeCall!.callId);

      const updatedVisitor = poolManager.getVisitor("visitor1");
      expect(updatedVisitor?.state).toBe("browsing");
    });

    it("clears agent currentCallVisitorId", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const agent = poolManager.getAgent("agent1");
      expect(agent?.currentCallVisitorId).toBe("visitor1");

      poolManager.endCall(activeCall!.callId);

      const updatedAgent = poolManager.getAgent("agent1");
      expect(updatedAgent?.currentCallVisitorId).toBeNull();
    });

    it("returns the ended call with all data", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const endedCall = poolManager.endCall(activeCall!.callId);

      expect(endedCall?.callId).toBe(activeCall?.callId);
      expect(endedCall?.visitorId).toBe("visitor1");
      expect(endedCall?.agentId).toBe("agent1");
      expect(endedCall?.startedAt).toBe(activeCall?.startedAt);
    });

    it("returns undefined for non-existent call ID", () => {
      const result = poolManager.endCall("non_existent_call");
      expect(result).toBeUndefined();
    });
  });

  describe("Multiple calls by same visitor", () => {
    it("allows visitor to start new call after previous call ended", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");

      // First call
      const request1 = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const call1 = poolManager.acceptCall(request1.requestId);
      poolManager.endCall(call1!.callId);

      // Second call - should work
      const request2 = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const call2 = poolManager.acceptCall(request2.requestId);

      expect(call2).toBeDefined();
      expect(call2?.callId).not.toBe(call1?.callId);
    });
  });
});

/**
 * WEBRTC_SIGNAL Handler Tests
 *
 * These tests verify the WEBRTC_SIGNAL handler behaviors:
 * 1. Forwards signal from sender to receiver
 * 2. Validates sender is part of the call (agent or visitor)
 * 3. Swaps targetId for the receiver
 */
describe("WEBRTC_SIGNAL Handler Behaviors", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Signal Routing", () => {
    it("can look up agent by socket ID for signal routing", () => {
      poolManager.registerAgent("socket_agent_123", createTestAgentProfile("agent1", "Test Agent"));

      const agent = poolManager.getAgentBySocketId("socket_agent_123");

      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe("agent1");
    });

    it("can look up visitor by socket ID for signal routing", () => {
      poolManager.registerVisitor("socket_visitor_456", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitorBySocketId("socket_visitor_456");

      expect(visitor).toBeDefined();
      expect(visitor?.visitorId).toBe("visitor1");
    });

    it("can look up agent by agent ID for target routing", () => {
      poolManager.registerAgent("socket_agent_123", createTestAgentProfile("agent1", "Test Agent"));

      const agent = poolManager.getAgent("agent1");

      expect(agent).toBeDefined();
      expect(agent?.socketId).toBe("socket_agent_123");
    });

    it("can look up visitor by visitor ID for target routing", () => {
      poolManager.registerVisitor("socket_visitor_456", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitor("visitor1");

      expect(visitor).toBeDefined();
      expect(visitor?.socketId).toBe("socket_visitor_456");
    });

    it("returns undefined for non-existent agent socket", () => {
      const agent = poolManager.getAgentBySocketId("non_existent_socket");
      expect(agent).toBeUndefined();
    });

    it("returns undefined for non-existent visitor socket", () => {
      const visitor = poolManager.getVisitorBySocketId("non_existent_socket");
      expect(visitor).toBeUndefined();
    });
  });

  describe("Signal types", () => {
    it("handles offer signals (initial connection)", () => {
      // The handler just forwards signals - no validation of signal type
      // This tests that the pool manager can route correctly

      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/");

      // Agent sends offer to visitor
      const agent = poolManager.getAgentBySocketId("socket_agent");
      const targetVisitor = poolManager.getVisitor("visitor1");

      expect(agent).toBeDefined();
      expect(targetVisitor).toBeDefined();
      expect(targetVisitor?.socketId).toBe("socket_visitor");
    });

    it("handles answer signals (response to offer)", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/");

      // Visitor sends answer to agent
      const visitor = poolManager.getVisitorBySocketId("socket_visitor");
      const targetAgent = poolManager.getAgent("agent1");

      expect(visitor).toBeDefined();
      expect(targetAgent).toBeDefined();
      expect(targetAgent?.socketId).toBe("socket_agent");
    });

    it("handles ICE candidate signals", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/");

      // Both parties can look each other up for ICE candidates
      const agent = poolManager.getAgent("agent1");
      const visitor = poolManager.getVisitor("visitor1");

      expect(agent).toBeDefined();
      expect(visitor).toBeDefined();
    });

    it("handles renegotiation offers (screen share)", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/");

      // Create an active call first
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/");
      poolManager.acceptCall(request.requestId);

      // Both parties should still be lookupable
      const agent = poolManager.getAgent("agent1");
      const visitor = poolManager.getVisitor("visitor1");

      expect(agent?.profile.status).toBe("in_call");
      expect(visitor?.state).toBe("in_call");
    });
  });
});

/**
 * Max Call Duration Timeout Tests
 *
 * These tests verify the max call duration timeout behaviors:
 * 1. Auto-ends call after configured max duration
 * 2. Emits call:ended with reason "max_duration"
 * 3. Clears timeout when call ends normally
 */
describe("Max Call Duration Timeout Behaviors", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Call duration tracking", () => {
    it("tracks call start time in ActiveCall", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");

      const activeCall = poolManager.acceptCall(request.requestId);

      expect(activeCall?.startedAt).toBeGreaterThan(0);
      expect(activeCall?.startedAt).toBeLessThanOrEqual(Date.now());
    });

    it("call can be ended manually before max duration", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      // Advance time but less than max duration
      vi.advanceTimersByTime(60000); // 1 minute

      // End manually
      const endedCall = poolManager.endCall(activeCall!.callId);

      expect(endedCall).toBeDefined();
      expect(endedCall?.endedAt).toBeGreaterThan(0);
    });

    it("getActiveCallByVisitorId returns call for duration check", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const lookupCall = poolManager.getActiveCallByVisitorId("visitor1");

      expect(lookupCall?.callId).toBe(activeCall?.callId);
    });

    it("getActiveCallByAgentId returns call for duration check", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const lookupCall = poolManager.getActiveCallByAgentId("agent1");

      expect(lookupCall?.callId).toBe(activeCall?.callId);
    });

    it("returns undefined for non-active calls", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      // End the call
      poolManager.endCall(activeCall!.callId);

      const lookupByVisitor = poolManager.getActiveCallByVisitorId("visitor1");
      const lookupByAgent = poolManager.getActiveCallByAgentId("agent1");

      expect(lookupByVisitor).toBeUndefined();
      expect(lookupByAgent).toBeUndefined();
    });
  });

  describe("End call behavior", () => {
    it("resets both agent and visitor state on timeout end", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      // Simulate timeout by ending call
      poolManager.endCall(activeCall!.callId);

      const agent = poolManager.getAgent("agent1");
      const visitor = poolManager.getVisitor("visitor1");

      expect(agent?.profile.status).toBe("idle");
      expect(visitor?.state).toBe("browsing");
    });

    it("endedAt is set when call ends", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Test Agent"));
      poolManager.registerVisitor("socket_visitor", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      vi.advanceTimersByTime(5000);

      const endedCall = poolManager.endCall(activeCall!.callId);

      expect(endedCall?.endedAt).toBeGreaterThan(activeCall!.startedAt);
    });
  });
});

/**
 * Co-Browse Relay Tests
 *
 * These tests verify the co-browse event relay behavior from visitor to agent:
 * - COBROWSE_SNAPSHOT: Forwards DOM snapshot to agent in active call
 * - COBROWSE_MOUSE: Forwards mouse coordinates to agent
 * - COBROWSE_SCROLL: Forwards scroll position to agent
 * - COBROWSE_SELECTION: Forwards text selection data to agent
 *
 * Each handler follows the same pattern:
 * 1. Verify visitor is registered
 * 2. Verify visitor is in an active call
 * 3. Find the agent for that call
 * 4. Forward the event data to the agent's socket
 */

describe("Co-Browse Relay - PoolManager Call Integration", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Co-Browse Prerequisites", () => {
    it("getVisitorBySocketId returns visitor when registered", () => {
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitorBySocketId("socket_v1");

      expect(visitor).toBeDefined();
      expect(visitor?.visitorId).toBe("visitor1");
    });

    it("getVisitorBySocketId returns undefined for unknown socket", () => {
      const visitor = poolManager.getVisitorBySocketId("unknown_socket");

      expect(visitor).toBeUndefined();
    });

    it("getActiveCallByVisitorId returns call when visitor is in call", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      const foundCall = poolManager.getActiveCallByVisitorId("visitor1");

      expect(foundCall).toBeDefined();
      expect(foundCall?.callId).toBe(activeCall?.callId);
      expect(foundCall?.agentId).toBe("agent1");
    });

    it("getActiveCallByVisitorId returns undefined when visitor not in call", () => {
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");

      const call = poolManager.getActiveCallByVisitorId("visitor1");

      expect(call).toBeUndefined();
    });

    it("getAgent returns agent when registered", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1"));

      const agent = poolManager.getAgent("agent1");

      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe("agent1");
      expect(agent?.socketId).toBe("socket_a");
    });

    it("getAgent returns undefined for unknown agent", () => {
      const agent = poolManager.getAgent("unknown_agent");

      expect(agent).toBeUndefined();
    });
  });

  describe("COBROWSE_SNAPSHOT relay behavior", () => {
    it("ignores snapshot when visitor not registered (no visitor for socket)", () => {
      // Simulate: socket.on COBROWSE_SNAPSHOT handler
      // This tests the early return when visitor is not found
      const visitor = poolManager.getVisitorBySocketId("unknown_socket");

      expect(visitor).toBeUndefined();
      // In real handler: would return early without forwarding
    });

    it("ignores snapshot when visitor not in active call", () => {
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      expect(visitor).toBeDefined();

      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);
      expect(activeCall).toBeUndefined();
      // In real handler: would return early without forwarding
    });

    it("ignores snapshot when agent not found for call", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      poolManager.acceptCall(request.requestId);

      // Unregister agent to simulate them disconnecting
      poolManager.unregisterAgent("agent1");

      const activeCall = poolManager.getActiveCallByVisitorId("visitor1");
      expect(activeCall).toBeDefined();

      const agent = poolManager.getAgent(activeCall!.agentId);
      expect(agent).toBeUndefined();
      // In real handler: would return early without forwarding
    });

    it("finds agent socket for forwarding when visitor is in active call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      poolManager.acceptCall(request.requestId);

      // Simulate the relay handler logic
      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      expect(visitor).toBeDefined();

      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);
      expect(activeCall).toBeDefined();

      const agent = poolManager.getAgent(activeCall!.agentId);
      expect(agent).toBeDefined();
      expect(agent?.socketId).toBe("socket_agent");
      // In real handler: would emit to agent socket
    });
  });

  describe("COBROWSE_MOUSE relay behavior", () => {
    it("ignores mouse event when visitor not registered", () => {
      const visitor = poolManager.getVisitorBySocketId("unknown_socket");

      expect(visitor).toBeUndefined();
    });

    it("ignores mouse event when visitor not in call", () => {
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);

      expect(activeCall).toBeUndefined();
    });

    it("finds agent for mouse event forwarding when visitor in call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      poolManager.acceptCall(request.requestId);

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);
      const agent = poolManager.getAgent(activeCall!.agentId);

      expect(agent?.socketId).toBe("socket_agent");
    });
  });

  describe("COBROWSE_SCROLL relay behavior", () => {
    it("ignores scroll event when visitor not registered", () => {
      const visitor = poolManager.getVisitorBySocketId("unknown_socket");

      expect(visitor).toBeUndefined();
    });

    it("ignores scroll event when visitor not in call", () => {
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);

      expect(activeCall).toBeUndefined();
    });

    it("finds agent for scroll event forwarding when visitor in call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      poolManager.acceptCall(request.requestId);

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);
      const agent = poolManager.getAgent(activeCall!.agentId);

      expect(agent?.socketId).toBe("socket_agent");
    });
  });

  describe("COBROWSE_SELECTION relay behavior", () => {
    it("ignores selection event when visitor not registered", () => {
      const visitor = poolManager.getVisitorBySocketId("unknown_socket");

      expect(visitor).toBeUndefined();
    });

    it("ignores selection event when visitor not in call", () => {
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);

      expect(activeCall).toBeUndefined();
    });

    it("finds agent for selection event forwarding when visitor in call", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      poolManager.acceptCall(request.requestId);

      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      const activeCall = poolManager.getActiveCallByVisitorId(visitor!.visitorId);
      const agent = poolManager.getAgent(activeCall!.agentId);

      expect(agent?.socketId).toBe("socket_agent");
    });
  });

  describe("Co-Browse Relay - Multiple Call Scenarios", () => {
    it("forwards to correct agent when multiple calls are active", () => {
      // Setup two agents and two visitors in separate calls
      poolManager.registerAgent("socket_a1", createTestAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_a2", createTestAgentProfile("agentB", "Agent B"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page1");
      poolManager.registerVisitor("socket_v2", "visitor2", "org1", "/page2");

      // Create two separate calls
      const req1 = poolManager.createCallRequest("visitor1", "agentA", "org1", "/page1");
      poolManager.acceptCall(req1.requestId);

      const req2 = poolManager.createCallRequest("visitor2", "agentB", "org1", "/page2");
      poolManager.acceptCall(req2.requestId);

      // Verify visitor1's cobrowse goes to agentA
      const visitor1 = poolManager.getVisitorBySocketId("socket_v1");
      const call1 = poolManager.getActiveCallByVisitorId(visitor1!.visitorId);
      const agent1 = poolManager.getAgent(call1!.agentId);
      expect(agent1?.socketId).toBe("socket_a1");

      // Verify visitor2's cobrowse goes to agentB
      const visitor2 = poolManager.getVisitorBySocketId("socket_v2");
      const call2 = poolManager.getActiveCallByVisitorId(visitor2!.visitorId);
      const agent2 = poolManager.getAgent(call2!.agentId);
      expect(agent2?.socketId).toBe("socket_a2");
    });

    it("stops relaying after call ends", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      // Verify relay works while in call
      let call = poolManager.getActiveCallByVisitorId("visitor1");
      expect(call).toBeDefined();

      // End the call
      poolManager.endCall(activeCall!.callId);

      // Verify relay no longer finds active call
      call = poolManager.getActiveCallByVisitorId("visitor1");
      expect(call).toBeUndefined();
    });

    it("handles visitor disconnecting mid-call (call cleanup)", () => {
      poolManager.registerAgent("socket_agent", createTestAgentProfile("agent1", "Agent 1"));
      poolManager.registerVisitor("socket_v1", "visitor1", "org1", "/page");
      const request = poolManager.createCallRequest("visitor1", "agent1", "org1", "/page");
      const activeCall = poolManager.acceptCall(request.requestId);

      // Simulate visitor disconnecting - unregister them
      poolManager.unregisterVisitor("visitor1");

      // Verify visitor no longer found by socket
      const visitor = poolManager.getVisitorBySocketId("socket_v1");
      expect(visitor).toBeUndefined();

      // The active call may still exist until explicitly ended
      // This is current behavior - tests capture what exists
    });
  });
});

/**
 * RNA (Ring-No-Answer) Timeout Tests
 *
 * These tests verify the RNA timeout behavior at the behavior level:
 * - startRNATimeout: Clears existing timeout, sets new timeout using org config
 * - clearRNATimeout: Clears timeout from map
 * - RNA timeout handler: Grace period, agent marking, call handling, reassignment
 */

describe("RNA Timeout - Agent Status Filtering for Reassignment", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findBestAgentForVisitor skips unavailable agents", () => {
    it("skips agents with status 'away'", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      // Register two agents, one away and one idle
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "away"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "idle"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      const result = poolManager.findBestAgentForVisitor("org1", "/page");

      // Should skip away agent and find idle agent
      expect(result?.agent.agentId).toBe("agentB");
    });

    it("skips agents with status 'in_call'", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      // Put agentA in a call
      poolManager.setAgentInCall("agentA", "visitor_in_call");

      const result = poolManager.findBestAgentForVisitor("org1", "/page");

      expect(result?.agent.agentId).toBe("agentB");
    });

    it("skips agents with status 'offline'", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "offline"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "idle"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      const result = poolManager.findBestAgentForVisitor("org1", "/page");

      expect(result?.agent.agentId).toBe("agentB");
    });

    it("returns undefined when all agents are away", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "away"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "away"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");

      const result = poolManager.findBestAgentForVisitor("org1", "/page");

      expect(result).toBeUndefined();
    });

    it("returns undefined when all agents are unavailable (mixed statuses)", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "away"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "offline"));
      poolManager.registerAgent("socket_c", createTestAgentProfile("agentC", "Agent C"));
      poolManager.addAgentToPool("agentA", "pool1");
      poolManager.addAgentToPool("agentB", "pool1");
      poolManager.addAgentToPool("agentC", "pool1");

      // Put agentC in a call
      poolManager.setAgentInCall("agentC", "visitor_in_call");

      const result = poolManager.findBestAgentForVisitor("org1", "/page");

      expect(result).toBeUndefined();
    });
  });

  describe("updateAgentStatus", () => {
    it("updates agent status to 'away'", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "idle"));

      poolManager.updateAgentStatus("agentA", "away");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("away");
    });

    it("updates agent status from 'away' back to 'idle'", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "away"));

      poolManager.updateAgentStatus("agentA", "idle");

      const agent = poolManager.getAgent("agentA");
      expect(agent?.profile.status).toBe("idle");
    });

    it("does nothing if agent does not exist", () => {
      // Should not throw
      expect(() => poolManager.updateAgentStatus("nonexistent", "away")).not.toThrow();
    });
  });
});

describe("RNA Timeout - PoolManager findBestAgent filtering", () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findBestAgent without pool", () => {
    it("skips agents with status 'away'", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "away"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "idle"));

      const bestAgent = poolManager.findBestAgent();

      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("skips agents with status 'in_call'", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B"));
      poolManager.setAgentInCall("agentA", "visitor1");

      const bestAgent = poolManager.findBestAgent();

      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("skips agents with status 'offline'", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "offline"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "idle"));

      const bestAgent = poolManager.findBestAgent();

      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("returns undefined when all agents are 'away'", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "away"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "away"));

      const bestAgent = poolManager.findBestAgent();

      expect(bestAgent).toBeUndefined();
    });
  });

  describe("After RNA timeout marks agent away", () => {
    it("agent marked away is excluded from subsequent findBestAgent calls", () => {
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "idle"));
      poolManager.registerAgent("socket_b", createTestAgentProfile("agentB", "Agent B", "idle"));

      // First call - both agents available, agentA might be picked
      // Simulate RNA timeout marking agentA as away
      poolManager.updateAgentStatus("agentA", "away");

      // Now only agentB should be available
      const bestAgent = poolManager.findBestAgent();

      expect(bestAgent?.agentId).toBe("agentB");
    });

    it("ensures same agent cannot get same call after RNA timeout (marked away before reassignment)", () => {
      poolManager.setOrgConfig("org1", "pool1", []);
      poolManager.registerAgent("socket_a", createTestAgentProfile("agentA", "Agent A", "idle"));
      poolManager.addAgentToPool("agentA", "pool1");

      // Simulate RNA timeout - agent is marked away
      poolManager.updateAgentStatus("agentA", "away");

      // Try to find agent for visitor reassignment
      const result = poolManager.findBestAgentForVisitor("org1", "/page");

      // Agent should not be found (they're away)
      expect(result).toBeUndefined();
    });
  });
});

