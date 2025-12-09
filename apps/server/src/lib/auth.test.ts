import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Socket } from "socket.io";

/**
 * Auth Tests
 *
 * Tests for authentication functions added in SEC-001:
 * - requireAgentAuth: Checks if socket is authenticated as an agent
 *
 * Key behaviors:
 * - Returns agentId when socket.data.agentId is set
 * - Returns null when socket.data.agentId is not set
 * - Emits error event to socket when authentication fails
 * - Logs warning when authentication fails
 */

// Mock Supabase before importing the module
vi.mock("./supabase.js", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

// Import after mocks
import { requireAgentAuth } from "./auth.js";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requireAgentAuth", () => {
    it("returns agentId when socket.data.agentId is set", () => {
      const mockSocket = {
        id: "socket-123",
        data: {
          agentId: "agent-abc",
        },
        emit: vi.fn(),
      } as unknown as Socket;

      const result = requireAgentAuth(mockSocket, "TEST_HANDLER");

      expect(result).toBe("agent-abc");
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("returns null when socket.data.agentId is not set", () => {
      const mockSocket = {
        id: "socket-456",
        data: {},
        emit: vi.fn(),
      } as unknown as Socket;

      const result = requireAgentAuth(mockSocket, "TEST_HANDLER");

      expect(result).toBeNull();
    });

    it("emits error event when socket.data.agentId is not set", () => {
      const mockSocket = {
        id: "socket-789",
        data: {},
        emit: vi.fn(),
      } as unknown as Socket;

      requireAgentAuth(mockSocket, "CALL_ACCEPT");

      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "AUTH_REQUIRED",
        message: "Not authenticated as agent. Please login first.",
      });
    });

    it("returns null when socket.data is undefined", () => {
      const mockSocket = {
        id: "socket-undefined",
        emit: vi.fn(),
      } as unknown as Socket;

      const result = requireAgentAuth(mockSocket, "TEST_HANDLER");

      expect(result).toBeNull();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "AUTH_REQUIRED",
        message: "Not authenticated as agent. Please login first.",
      });
    });

    it("logs warning with handler name when authentication fails", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const mockSocket = {
        id: "socket-999",
        data: {},
        emit: vi.fn(),
      } as unknown as Socket;

      requireAgentAuth(mockSocket, "AGENT_STATUS");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[Auth] AGENT_STATUS rejected - socket socket-999 not authenticated as agent"
      );

      consoleWarnSpy.mockRestore();
    });

    it("logs warning with different handler name", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const mockSocket = {
        id: "socket-xyz",
        data: {},
        emit: vi.fn(),
      } as unknown as Socket;

      requireAgentAuth(mockSocket, "CALL_REJECT");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[Auth] CALL_REJECT rejected - socket socket-xyz not authenticated as agent"
      );

      consoleWarnSpy.mockRestore();
    });

    it("returns correct agentId for different agents", () => {
      const mockSocket1 = {
        id: "socket-1",
        data: { agentId: "agent-123" },
        emit: vi.fn(),
      } as unknown as Socket;

      const mockSocket2 = {
        id: "socket-2",
        data: { agentId: "agent-456" },
        emit: vi.fn(),
      } as unknown as Socket;

      const result1 = requireAgentAuth(mockSocket1, "TEST_HANDLER");
      const result2 = requireAgentAuth(mockSocket2, "TEST_HANDLER");

      expect(result1).toBe("agent-123");
      expect(result2).toBe("agent-456");
      expect(mockSocket1.emit).not.toHaveBeenCalled();
      expect(mockSocket2.emit).not.toHaveBeenCalled();
    });

    it("handles empty string agentId as falsy", () => {
      const mockSocket = {
        id: "socket-empty",
        data: { agentId: "" },
        emit: vi.fn(),
      } as unknown as Socket;

      const result = requireAgentAuth(mockSocket, "TEST_HANDLER");

      expect(result).toBeNull();
      expect(mockSocket.emit).toHaveBeenCalledWith("error", {
        code: "AUTH_REQUIRED",
        message: "Not authenticated as agent. Please login first.",
      });
    });

    it("returns agentId when socket.data.agentId is UUID format", () => {
      const mockSocket = {
        id: "socket-uuid",
        data: { agentId: "550e8400-e29b-41d4-a716-446655440000" },
        emit: vi.fn(),
      } as unknown as Socket;

      const result = requireAgentAuth(mockSocket, "TEST_HANDLER");

      expect(result).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});
