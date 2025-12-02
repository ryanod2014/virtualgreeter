import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  storeWidgetState,
  getStoredWidgetState,
  clearStoredWidgetState,
  shouldSkipIntroForAgent,
} from "./useSignaling";

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

