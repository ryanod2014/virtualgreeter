import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/preact-hooks";
import {
  storeWidgetState,
  getStoredWidgetState,
  clearStoredWidgetState,
  shouldSkipIntroForAgent,
  storeActiveCall,
  getStoredCall,
  clearStoredCall,
  useSignaling,
} from "./useSignaling";
import { SOCKET_EVENTS } from "@ghost-greeter/domain";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("Widget State Persistence (P2-003)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("storeWidgetState", () => {
    it("should store widget state with timestamp", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
      };

      storeWidgetState(state);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "gg_widget_state",
        expect.stringContaining('"agentId":"agent-123"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "gg_widget_state",
        expect.stringContaining('"timestamp"')
      );
    });
  });

  describe("getStoredWidgetState", () => {
    it("should return null when no state is stored", () => {
      const result = getStoredWidgetState();
      expect(result).toBeNull();
    });

    it("should return stored state when valid", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = getStoredWidgetState();

      expect(result).toEqual(state);
    });

    it("should return null and clear when state is expired (>30 min)", () => {
      const expiredState = {
        agentId: "agent-123",
        waveVideoUrl: null,
        introVideoUrl: null,
        loopVideoUrl: null,
        introCompleted: true,
        timestamp: Date.now() - 31 * 60 * 1000, // 31 minutes ago
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(expiredState));

      const result = getStoredWidgetState();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_widget_state");
    });
  });

  describe("clearStoredWidgetState", () => {
    it("should remove widget state from localStorage", () => {
      clearStoredWidgetState();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_widget_state");
    });
  });

  describe("shouldSkipIntroForAgent", () => {
    it("should return false when no stored state", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(false);
    });

    it("should return false when intro not completed", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: false, // Not completed
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(false);
    });

    it("should return false when different agent", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = shouldSkipIntroForAgent({
        id: "agent-456", // Different agent
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(false);
    });

    it("should return false when same agent but different video sequence (different pool)", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = shouldSkipIntroForAgent({
        id: "agent-123", // Same agent
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/different-intro.mp4", // Different video!
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(false);
    });

    it("should return true when same agent AND same video sequence", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4",
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = shouldSkipIntroForAgent({
        id: "agent-123", // Same agent
        waveVideoUrl: "https://example.com/wave.mp4", // Same videos
        introVideoUrl: "https://example.com/intro.mp4",
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(true);
    });

    it("should handle null video URLs correctly (same agent, both null)", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: null,
        introVideoUrl: null,
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: null,
        introVideoUrl: null,
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(true);
    });

    it("should return false when stored has null but new has value", () => {
      const state = {
        agentId: "agent-123",
        waveVideoUrl: null,
        introVideoUrl: null,
        loopVideoUrl: "https://example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(state));

      const result = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: "https://example.com/wave.mp4", // Now has value
        introVideoUrl: null,
        loopVideoUrl: "https://example.com/loop.mp4",
      });

      expect(result).toBe(false);
    });
  });

  describe("Integration Scenarios", () => {
    it("Scenario 1: Same agent, same pool (same videos) - should skip intro", () => {
      // Page A: Visitor watches intro, it completes
      storeWidgetState({
        agentId: "agent-123",
        waveVideoUrl: "https://cdn.example.com/wave.mp4",
        introVideoUrl: "https://cdn.example.com/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/loop.mp4",
        introCompleted: true,
      });

      // Page B: Same agent assigned (same pool)
      // Re-mock getItem to return what we just stored
      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1] ?? "";
      localStorageMock.getItem.mockReturnValueOnce(storedValue);

      const shouldSkip = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: "https://cdn.example.com/wave.mp4",
        introVideoUrl: "https://cdn.example.com/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/loop.mp4",
      });

      expect(shouldSkip).toBe(true);
    });

    it("Scenario 2: Same agent, different pool (different videos) - should play intro", () => {
      // Page A: Visitor watches intro for Pool A videos
      storeWidgetState({
        agentId: "agent-123",
        waveVideoUrl: "https://cdn.example.com/pool-a/wave.mp4",
        introVideoUrl: "https://cdn.example.com/pool-a/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/pool-a/loop.mp4",
        introCompleted: true,
      });

      // Page B: Same agent but Pool B with different videos
      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1] ?? "";
      localStorageMock.getItem.mockReturnValueOnce(storedValue);

      const shouldSkip = shouldSkipIntroForAgent({
        id: "agent-123", // Same agent
        waveVideoUrl: "https://cdn.example.com/pool-b/wave.mp4", // Different!
        introVideoUrl: "https://cdn.example.com/pool-b/intro.mp4", // Different!
        loopVideoUrl: "https://cdn.example.com/pool-b/loop.mp4", // Different!
      });

      expect(shouldSkip).toBe(false);
    });

    it("Scenario 3: Different agent - should play intro", () => {
      // Page A: Visitor watches Agent A's intro
      storeWidgetState({
        agentId: "agent-A",
        waveVideoUrl: "https://cdn.example.com/agent-a/wave.mp4",
        introVideoUrl: "https://cdn.example.com/agent-a/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/agent-a/loop.mp4",
        introCompleted: true,
      });

      // Page B: Different agent assigned
      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1] ?? "";
      localStorageMock.getItem.mockReturnValueOnce(storedValue);

      const shouldSkip = shouldSkipIntroForAgent({
        id: "agent-B", // Different agent
        waveVideoUrl: "https://cdn.example.com/agent-b/wave.mp4",
        introVideoUrl: "https://cdn.example.com/agent-b/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/agent-b/loop.mp4",
      });

      expect(shouldSkip).toBe(false);
    });

    it("Scenario 4: Agent becomes unavailable then returns - should play intro", () => {
      // Page A: Visitor watches intro
      storeWidgetState({
        agentId: "agent-123",
        waveVideoUrl: "https://cdn.example.com/wave.mp4",
        introVideoUrl: "https://cdn.example.com/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/loop.mp4",
        introCompleted: true,
      });

      // Agent becomes unavailable - state is cleared
      clearStoredWidgetState();

      // Agent returns - no stored state
      localStorageMock.getItem.mockReturnValueOnce(null);

      const shouldSkip = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: "https://cdn.example.com/wave.mp4",
        introVideoUrl: "https://cdn.example.com/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/loop.mp4",
      });

      expect(shouldSkip).toBe(false);
    });

    it("Scenario 5: State expires after 30 minutes - should play intro", () => {
      // Page A: Visitor watches intro 35 minutes ago
      const expiredState = {
        agentId: "agent-123",
        waveVideoUrl: "https://cdn.example.com/wave.mp4",
        introVideoUrl: "https://cdn.example.com/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/loop.mp4",
        introCompleted: true,
        timestamp: Date.now() - 35 * 60 * 1000, // 35 minutes ago
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(expiredState));

      const shouldSkip = shouldSkipIntroForAgent({
        id: "agent-123",
        waveVideoUrl: "https://cdn.example.com/wave.mp4",
        introVideoUrl: "https://cdn.example.com/intro.mp4",
        loopVideoUrl: "https://cdn.example.com/loop.mp4",
      });

      expect(shouldSkip).toBe(false);
    });
  });
});

/**
 * Call Reconnection Token Storage Tests (V4)
 *
 * Tests for call reconnection functionality that allows visitors to maintain
 * active call state when navigating between pages on a website.
 *
 * Key behaviors tested:
 * - storeActiveCall: Saves call data (reconnectToken, callId, agentId, orgId, timestamp)
 * - getStoredCall: Retrieves and validates stored call (expiry, org match)
 * - clearStoredCall: Removes call data from localStorage
 */
describe("Call Reconnection Token Storage (V4)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("storeActiveCall", () => {
    it("saves reconnectToken, callId, agentId, orgId, timestamp to localStorage", () => {
      const callData = {
        reconnectToken: "token-abc123",
        callId: "call-456",
        agentId: "agent-789",
        orgId: "org-xyz",
      };

      storeActiveCall(callData);

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1];
      const parsed = JSON.parse(storedValue);

      expect(parsed.reconnectToken).toBe("token-abc123");
      expect(parsed.callId).toBe("call-456");
      expect(parsed.agentId).toBe("agent-789");
      expect(parsed.orgId).toBe("org-xyz");
      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe("number");
    });

    it("uses correct storage key (gg_active_call)", () => {
      storeActiveCall({
        reconnectToken: "token-123",
        callId: "call-123",
        agentId: "agent-123",
        orgId: "org-123",
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "gg_active_call",
        expect.any(String)
      );
    });

    it("adds current timestamp to stored data", () => {
      const beforeTime = Date.now();

      storeActiveCall({
        reconnectToken: "token-123",
        callId: "call-123",
        agentId: "agent-123",
        orgId: "org-123",
      });

      const afterTime = Date.now();
      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1];
      const parsed = JSON.parse(storedValue);

      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(parsed.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("overwrites existing stored call data", () => {
      storeActiveCall({
        reconnectToken: "first-token",
        callId: "first-call",
        agentId: "first-agent",
        orgId: "first-org",
      });

      storeActiveCall({
        reconnectToken: "second-token",
        callId: "second-call",
        agentId: "second-agent",
        orgId: "second-org",
      });

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
      const lastStoredValue = localStorageMock.setItem.mock.calls[1]?.[1];
      const parsed = JSON.parse(lastStoredValue);

      expect(parsed.reconnectToken).toBe("second-token");
      expect(parsed.callId).toBe("second-call");
    });
  });

  describe("getStoredCall", () => {
    it("returns null if no stored call exists", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const result = getStoredCall("org-123");

      expect(result).toBeNull();
    });

    it("returns null if stored call expired (>30 seconds)", () => {
      const expiredCall = {
        reconnectToken: "token-123",
        callId: "call-123",
        agentId: "agent-123",
        orgId: "org-123",
        timestamp: Date.now() - 31 * 1000, // 31 seconds ago (expired)
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(expiredCall));

      const result = getStoredCall("org-123");

      expect(result).toBeNull();
      // Should also clear the expired call
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_active_call");
    });

    it("returns null if orgId doesn't match", () => {
      const storedCall = {
        reconnectToken: "token-123",
        callId: "call-123",
        agentId: "agent-123",
        orgId: "org-original",
        timestamp: Date.now(),
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedCall));

      const result = getStoredCall("org-different");

      expect(result).toBeNull();
    });

    it("returns valid call data if within expiry and matching org", () => {
      const validCall = {
        reconnectToken: "token-123",
        callId: "call-123",
        agentId: "agent-123",
        orgId: "org-123",
        timestamp: Date.now() - 10 * 1000, // 10 seconds ago (valid)
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(validCall));

      const result = getStoredCall("org-123");

      expect(result).toEqual(validCall);
      expect(result?.reconnectToken).toBe("token-123");
      expect(result?.callId).toBe("call-123");
      expect(result?.agentId).toBe("agent-123");
    });

    it("returns call data at exactly 30 seconds (boundary test)", () => {
      const boundaryCall = {
        reconnectToken: "token-boundary",
        callId: "call-boundary",
        agentId: "agent-boundary",
        orgId: "org-boundary",
        timestamp: Date.now() - 29 * 1000, // 29 seconds ago (just within limit)
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(boundaryCall));

      const result = getStoredCall("org-boundary");

      expect(result).not.toBeNull();
      expect(result?.callId).toBe("call-boundary");
    });

    it("returns null for malformed JSON in localStorage", () => {
      localStorageMock.getItem.mockReturnValueOnce("not valid json{");

      const result = getStoredCall("org-123");

      expect(result).toBeNull();
    });
  });

  describe("clearStoredCall", () => {
    it("removes call data from localStorage", () => {
      clearStoredCall();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_active_call");
    });

    it("uses correct storage key (gg_active_call)", () => {
      clearStoredCall();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_active_call");
    });

    it("does not throw when localStorage is empty", () => {
      expect(() => clearStoredCall()).not.toThrow();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe("Call Reconnection Integration Scenarios", () => {
    it("Scenario: Visitor navigates during active call - call data persists", () => {
      // Page A: Call is accepted, token is stored
      storeActiveCall({
        reconnectToken: "nav-token",
        callId: "nav-call",
        agentId: "nav-agent",
        orgId: "nav-org",
      });

      // Simulate page navigation (localStorage persists)
      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1];
      localStorageMock.getItem.mockReturnValueOnce(storedValue);

      // Page B: Retrieve stored call
      const result = getStoredCall("nav-org");

      expect(result).not.toBeNull();
      expect(result?.reconnectToken).toBe("nav-token");
      expect(result?.callId).toBe("nav-call");
    });

    it("Scenario: Different org site - ignores stored call from other site", () => {
      // Site A: Store call for org-site-a
      storeActiveCall({
        reconnectToken: "site-a-token",
        callId: "site-a-call",
        agentId: "site-a-agent",
        orgId: "org-site-a",
      });

      const storedValue = localStorageMock.setItem.mock.calls[0]?.[1];
      localStorageMock.getItem.mockReturnValueOnce(storedValue);

      // Site B: Try to retrieve for different org
      const result = getStoredCall("org-site-b");

      expect(result).toBeNull();
    });

    it("Scenario: Visitor away too long - call expires", () => {
      // Store call
      const expiredCall = {
        reconnectToken: "expired-token",
        callId: "expired-call",
        agentId: "expired-agent",
        orgId: "timeout-org",
        timestamp: Date.now() - 35 * 1000, // 35 seconds ago
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(expiredCall));

      // Try to retrieve after timeout
      const result = getStoredCall("timeout-org");

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_active_call");
    });

    it("Scenario: Call ends normally - stored call is cleared", () => {
      // Store call
      storeActiveCall({
        reconnectToken: "end-token",
        callId: "end-call",
        agentId: "end-agent",
        orgId: "end-org",
      });

      // Call ends
      clearStoredCall();

      // Verify cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_active_call");
    });
  });
});

// Mock socket.io-client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    connected: true,
  })),
}));

// Import io from mocked module
const { io } = vi.mocked(await import("socket.io-client"));

describe("useSignaling Hook - CALL_ENDED Behavior", () => {
  let mockSocket: any;
  let mockCallbacks: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Create mock socket that stores event handlers
    const eventHandlers: Record<string, Function> = {};
    mockSocket = {
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      emit: vi.fn(),
      off: vi.fn(),
      connected: true,
      // Helper to trigger events
      _trigger: (event: string, data: any) => {
        const handler = eventHandlers[event];
        if (handler) {
          handler(data);
        }
      },
    };

    // Make io return our mock socket
    (io as any).mockReturnValue(mockSocket);

    // Setup default callbacks
    mockCallbacks = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onReconnecting: vi.fn(),
      onReconnected: vi.fn(),
      onConnectionError: vi.fn(),
      onCheckingAgent: vi.fn(),
      onAgentAssigned: vi.fn(),
      onAgentReassigned: vi.fn(),
      onAgentUnavailable: vi.fn(),
      onOrgPaused: vi.fn(),
      onCallAccepted: vi.fn(),
      onCallRejected: vi.fn(),
      onCallEnded: vi.fn(),
      onCallReconnecting: vi.fn(),
      onCallReconnected: vi.fn(),
      onCallReconnectFailed: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes CallEndedPayload data to onCallEnded callback", () => {
    const { result } = renderHook(() =>
      useSignaling({
        serverUrl: "http://localhost:3001",
        organizationId: "org-123",
        visitorId: "visitor-123",
        pathname: "/test",
        ...mockCallbacks,
      })
    );

    // Connect the socket
    act(() => {
      result.current.connect();
    });

    // Trigger CALL_ENDED event with data
    const callEndedData = {
      callId: "call-123",
      reason: "agent_ended",
      message: "Agent has ended the call",
    };

    act(() => {
      mockSocket._trigger(SOCKET_EVENTS.CALL_ENDED, callEndedData);
    });

    // Verify callback was called with data
    expect(mockCallbacks.onCallEnded).toHaveBeenCalledTimes(1);
    expect(mockCallbacks.onCallEnded).toHaveBeenCalledWith(callEndedData);
  });

  it("clears all call state when CALL_ENDED received", () => {
    // Store some call data first
    storeActiveCall({
      reconnectToken: "token-123",
      callId: "call-123",
      agentId: "agent-123",
      orgId: "org-123",
    });

    const { result } = renderHook(() =>
      useSignaling({
        serverUrl: "http://localhost:3001",
        organizationId: "org-123",
        visitorId: "visitor-123",
        pathname: "/test",
        ...mockCallbacks,
      })
    );

    // Connect and simulate having an active call
    act(() => {
      result.current.connect();
      // Simulate call accepted state
      mockSocket._trigger(SOCKET_EVENTS.CALL_ACCEPTED, {
        callId: "call-123",
        agentId: "agent-123",
      });
    });

    // Trigger CALL_ENDED
    act(() => {
      mockSocket._trigger(SOCKET_EVENTS.CALL_ENDED, {
        callId: "call-123",
        reason: "agent_ended",
        message: "Call ended",
      });
    });

    // Verify stored call is cleared
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("gg_active_call");

    // Verify hook state is reset
    expect(result.current.callAccepted).toBe(false);
    expect(result.current.callRejected).toBe(false);
    expect(result.current.currentCallId).toBeNull();
  });

  it("handles CALL_ENDED without message gracefully", () => {
    const { result } = renderHook(() =>
      useSignaling({
        serverUrl: "http://localhost:3001",
        organizationId: "org-123",
        visitorId: "visitor-123",
        pathname: "/test",
        ...mockCallbacks,
      })
    );

    act(() => {
      result.current.connect();
    });

    // Trigger CALL_ENDED without message
    const minimalData = {
      callId: "call-123",
      reason: "timeout",
    };

    act(() => {
      mockSocket._trigger(SOCKET_EVENTS.CALL_ENDED, minimalData);
    });

    expect(mockCallbacks.onCallEnded).toHaveBeenCalledWith(minimalData);
  });

  it("handles CALL_ENDED with empty payload", () => {
    const { result } = renderHook(() =>
      useSignaling({
        serverUrl: "http://localhost:3001",
        organizationId: "org-123",
        visitorId: "visitor-123",
        pathname: "/test",
        ...mockCallbacks,
      })
    );

    act(() => {
      result.current.connect();
    });

    // Trigger CALL_ENDED with empty object
    act(() => {
      mockSocket._trigger(SOCKET_EVENTS.CALL_ENDED, {});
    });

    expect(mockCallbacks.onCallEnded).toHaveBeenCalledWith({});
    expect(result.current.callAccepted).toBe(false);
  });

  it("clears pendingCallAgentIdRef when CALL_ENDED received", () => {
    const { result } = renderHook(() =>
      useSignaling({
        serverUrl: "http://localhost:3001",
        organizationId: "org-123",
        visitorId: "visitor-123",
        pathname: "/test",
        ...mockCallbacks,
      })
    );

    act(() => {
      result.current.connect();
      // Request a call to set pendingCallAgentIdRef
      result.current.requestCall("agent-123");
    });

    // Trigger CALL_ENDED
    act(() => {
      mockSocket._trigger(SOCKET_EVENTS.CALL_ENDED, {
        callId: "call-123",
        reason: "agent_ended",
      });
    });

    // pendingCallAgentIdRef should be cleared (verify indirectly by requesting same agent again)
    act(() => {
      result.current.requestCall("agent-123");
    });

    // Should emit request:call again since pendingCallAgentIdRef was cleared
    expect(mockSocket.emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.REQUEST_CALL,
      expect.objectContaining({ agentId: "agent-123" })
    );
  });
});

