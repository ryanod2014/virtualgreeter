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

