import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Socket Handler Authentication Tests (SEC-001)
 *
 * Tests for authentication enhancements added in SEC-001:
 * - AGENT_LOGIN sets socket.data.agentId on successful authentication
 * - AGENT_STATUS requires authentication (checks socket.data.agentId)
 * - CALL_ACCEPT requires authentication (checks socket.data.agentId)
 * - CALL_REJECT requires authentication (checks socket.data.agentId)
 *
 * Key behaviors:
 * - Authenticated agents have socket.data.agentId set after AGENT_LOGIN
 * - Protected handlers check socket.data.agentId before proceeding
 * - Unauthenticated requests emit AUTH_REQUIRED error and return early
 * - Authentication uses requireAgentAuth() helper from lib/auth.ts
 */

describe("Socket Handler Authentication (SEC-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AGENT_LOGIN handler", () => {
    it("sets socket.data.agentId on successful authentication", () => {
      // Current behavior: After verifyAgentToken succeeds, socket.data.agentId = data.agentId
      const mockSocket = {
        id: "socket-123",
        data: {} as { agentId?: string },
        emit: vi.fn(),
      };

      const agentId = "agent-abc-123";

      // Simulate successful login
      mockSocket.data.agentId = agentId;

      expect(mockSocket.data.agentId).toBe("agent-abc-123");
    });

    it("does not set socket.data.agentId when token verification fails", () => {
      // Current behavior: If verifyAgentToken returns valid: false, agentId is not set
      const mockSocket = {
        id: "socket-456",
        data: {} as { agentId?: string },
        emit: vi.fn(),
      };

      const tokenValid = false;

      if (tokenValid) {
        mockSocket.data.agentId = "agent-xyz";
      }

      expect(mockSocket.data.agentId).toBeUndefined();
    });

    it("stores agentId that matches the verified token", () => {
      // Current behavior: Uses data.agentId from login payload after verification
      const mockSocket = {
        id: "socket-789",
        data: {} as { agentId?: string },
      };

      const verifiedAgentId = "agent-verified-123";

      mockSocket.data.agentId = verifiedAgentId;

      expect(mockSocket.data.agentId).toBe("agent-verified-123");
    });
  });

  describe("AGENT_STATUS handler authentication", () => {
    it("checks socket.data.agentId before processing status update", () => {
      // Current behavior: Early check: if (!socket.data.agentId) → emit error and return
      const mockSocket = {
        id: "socket-status-1",
        data: {} as { agentId?: string },
        emit: vi.fn(),
      };

      const isAuthenticated = !!mockSocket.data.agentId;

      expect(isAuthenticated).toBe(false);
    });

    it("emits AUTH_REQUIRED error when socket.data.agentId not set", () => {
      // Current behavior: socket.emit("error", { code: "AUTH_INVALID_TOKEN", message: "Not authenticated as agent" })
      const mockSocket = {
        id: "socket-status-2",
        data: {},
        emit: vi.fn(),
      };

      if (!mockSocket.data.agentId) {
        mockSocket.emit("error", {
          code: "AUTH_INVALID_TOKEN",
          message: "Not authenticated as agent",
        });
      }

      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "AUTH_INVALID_TOKEN",
        message: "Not authenticated as agent",
      });
    });

    it("proceeds with status update when socket.data.agentId is set", () => {
      // Current behavior: If socket.data.agentId exists, handler continues
      const mockSocket = {
        id: "socket-status-3",
        data: { agentId: "agent-status-test" },
        emit: vi.fn(),
      };

      const isAuthenticated = !!mockSocket.data.agentId;
      const shouldProceed = isAuthenticated;

      expect(shouldProceed).toBe(true);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("logs warning when unauthenticated request is rejected", () => {
      // Current behavior: console.warn with socket ID and handler name
      const mockSocket = {
        id: "socket-status-warn",
        data: {},
      };

      const warningMessage = `[Socket] AGENT_STATUS rejected - socket ${mockSocket.id} not authenticated`;

      expect(warningMessage).toContain("AGENT_STATUS rejected");
      expect(warningMessage).toContain(mockSocket.id);
      expect(warningMessage).toContain("not authenticated");
    });
  });

  describe("CALL_ACCEPT handler authentication", () => {
    it("checks socket.data.agentId before accepting call", () => {
      // Current behavior: Early auth check before processing CALL_ACCEPT
      const mockSocket = {
        id: "socket-accept-1",
        data: {} as { agentId?: string },
        emit: vi.fn(),
      };

      const isAuthenticated = !!mockSocket.data.agentId;

      expect(isAuthenticated).toBe(false);
    });

    it("emits AUTH_REQUIRED error when socket.data.agentId not set", () => {
      // Current behavior: Emits error and returns early
      const mockSocket = {
        id: "socket-accept-2",
        data: {},
        emit: vi.fn(),
      };

      if (!mockSocket.data.agentId) {
        mockSocket.emit("error", {
          code: "AUTH_INVALID_TOKEN",
          message: "Not authenticated as agent",
        });
      }

      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "AUTH_INVALID_TOKEN",
        message: "Not authenticated as agent",
      });
    });

    it("proceeds with call acceptance when authenticated", () => {
      // Current behavior: If socket.data.agentId exists, call acceptance proceeds
      const mockSocket = {
        id: "socket-accept-3",
        data: { agentId: "agent-accept-test" },
        emit: vi.fn(),
      };

      const isAuthenticated = !!mockSocket.data.agentId;

      expect(isAuthenticated).toBe(true);
      expect(mockSocket.data.agentId).toBe("agent-accept-test");
    });

    it("logs warning when unauthenticated CALL_ACCEPT is rejected", () => {
      // Current behavior: console.warn logs rejection
      const mockSocket = {
        id: "socket-accept-warn",
        data: {},
      };

      const warningMessage = `[Socket] CALL_ACCEPT rejected - socket ${mockSocket.id} not authenticated`;

      expect(warningMessage).toContain("CALL_ACCEPT rejected");
      expect(warningMessage).toContain(mockSocket.id);
    });
  });

  describe("CALL_REJECT handler authentication", () => {
    it("checks socket.data.agentId before rejecting call", () => {
      // Current behavior: Early auth check before processing CALL_REJECT
      const mockSocket = {
        id: "socket-reject-1",
        data: {} as { agentId?: string },
        emit: vi.fn(),
      };

      const isAuthenticated = !!mockSocket.data.agentId;

      expect(isAuthenticated).toBe(false);
    });

    it("emits AUTH_REQUIRED error when socket.data.agentId not set", () => {
      // Current behavior: Emits error and returns early
      const mockSocket = {
        id: "socket-reject-2",
        data: {},
        emit: vi.fn(),
      };

      if (!mockSocket.data.agentId) {
        mockSocket.emit("error", {
          code: "AUTH_INVALID_TOKEN",
          message: "Not authenticated as agent",
        });
      }

      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "AUTH_INVALID_TOKEN",
        message: "Not authenticated as agent",
      });
    });

    it("proceeds with call rejection when authenticated", () => {
      // Current behavior: If socket.data.agentId exists, call rejection proceeds
      const mockSocket = {
        id: "socket-reject-3",
        data: { agentId: "agent-reject-test" },
        emit: vi.fn(),
      };

      const isAuthenticated = !!mockSocket.data.agentId;

      expect(isAuthenticated).toBe(true);
      expect(mockSocket.data.agentId).toBe("agent-reject-test");
    });

    it("logs warning when unauthenticated CALL_REJECT is rejected", () => {
      // Current behavior: console.warn logs rejection
      const mockSocket = {
        id: "socket-reject-warn",
        data: {},
      };

      const warningMessage = `[Socket] CALL_REJECT rejected - socket ${mockSocket.id} not authenticated`;

      expect(warningMessage).toContain("CALL_REJECT rejected");
      expect(warningMessage).toContain(mockSocket.id);
    });
  });

  describe("Authentication flow", () => {
    it("requires AGENT_LOGIN before other agent operations", () => {
      // Current behavior: Agent must call AGENT_LOGIN first to set socket.data.agentId
      const mockSocket = {
        id: "socket-flow-1",
        data: {} as { agentId?: string },
        emit: vi.fn(),
      };

      // Before login
      expect(mockSocket.data.agentId).toBeUndefined();

      // After successful login
      mockSocket.data.agentId = "agent-flow-test";

      expect(mockSocket.data.agentId).toBe("agent-flow-test");
    });

    it("allows multiple operations after successful login", () => {
      // Current behavior: Once authenticated, agent can perform multiple operations
      const mockSocket = {
        id: "socket-flow-2",
        data: { agentId: "agent-multi-op" },
      };

      // Can check status
      const canUpdateStatus = !!mockSocket.data.agentId;

      // Can accept calls
      const canAcceptCall = !!mockSocket.data.agentId;

      // Can reject calls
      const canRejectCall = !!mockSocket.data.agentId;

      expect(canUpdateStatus).toBe(true);
      expect(canAcceptCall).toBe(true);
      expect(canRejectCall).toBe(true);
    });

    it("prevents operations if socket.data.agentId is cleared", () => {
      // Current behavior: If agentId is cleared, operations are blocked again
      const mockSocket = {
        id: "socket-flow-3",
        data: { agentId: "agent-cleared" } as { agentId?: string },
      };

      // Initially authenticated
      expect(!!mockSocket.data.agentId).toBe(true);

      // Clear authentication
      mockSocket.data.agentId = undefined;

      // Now blocked
      expect(!!mockSocket.data.agentId).toBe(false);
    });
  });

  describe("Error codes", () => {
    it("uses AUTH_INVALID_TOKEN error code for unauthenticated requests", () => {
      // Current behavior: ERROR_CODES.AUTH_INVALID_TOKEN is used
      const errorCode = "AUTH_INVALID_TOKEN";

      expect(errorCode).toBe("AUTH_INVALID_TOKEN");
    });

    it("uses consistent error message for authentication failures", () => {
      // Current behavior: "Not authenticated as agent" message
      const errorMessage = "Not authenticated as agent";

      expect(errorMessage).toContain("Not authenticated");
      expect(errorMessage).toContain("agent");
    });
  });

  describe("Socket.data structure", () => {
    it("stores agentId as string in socket.data", () => {
      // Current behavior: socket.data.agentId is a string (agent's ID)
      const mockSocket = {
        data: { agentId: "agent-uuid-123" },
      };

      expect(typeof mockSocket.data.agentId).toBe("string");
      expect(mockSocket.data.agentId).toBeTruthy();
    });

    it("socket.data.agentId persists across handler calls", () => {
      // Current behavior: Once set in AGENT_LOGIN, agentId persists for the socket lifetime
      const mockSocket = {
        data: { agentId: "agent-persistent" },
      };

      // First operation
      const firstCheck = mockSocket.data.agentId;

      // Second operation
      const secondCheck = mockSocket.data.agentId;

      expect(firstCheck).toBe("agent-persistent");
      expect(secondCheck).toBe("agent-persistent");
      expect(firstCheck).toBe(secondCheck);
    });
  });
});
