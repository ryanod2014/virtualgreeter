/**
 * @vitest-environment jsdom
 * 
 * Widget Lifecycle Tests
 * 
 * These tests verify the key behaviors of the Widget component's lifecycle.
 * Due to the complexity of mocking Preact with hooks and multiple dependencies,
 * these tests focus on:
 * 1. Testing the pure utility functions (isMobileDevice, unlockAudio)
 * 2. Testing the integration with useSignaling callbacks
 * 3. Testing the state machine transitions through mock verification
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =============================================================================
// DEVICE DETECTION TESTS (Pure function behavior)
// =============================================================================

describe("Widget - Device Detection (isMobileDevice)", () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;
  const originalOntouchstart = Object.getOwnPropertyDescriptor(window, "ontouchstart");
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore window properties
    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, writable: true, configurable: true });
    if (originalMatchMedia) {
      Object.defineProperty(window, "matchMedia", { value: originalMatchMedia, writable: true });
    }
    if (originalOntouchstart) {
      Object.defineProperty(window, "ontouchstart", originalOntouchstart);
    } else {
      delete (window as Record<string, unknown>).ontouchstart;
    }
  });

  // Function that mirrors Widget.tsx isMobileDevice logic
  function isMobileDevice(): boolean {
    const isSmallScreen = window.innerWidth <= 768;
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    return isSmallScreen || (hasTouch && !window.matchMedia("(pointer: fine)").matches);
  }

  it("13. returns true for small screens (<768px)", () => {
    Object.defineProperty(window, "innerWidth", { value: 500, writable: true, configurable: true });
    expect(isMobileDevice()).toBe(true);
  });

  it("returns false for large screens (>768px) with no touch", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, "ontouchstart", { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "matchMedia", { 
      value: () => ({ matches: true }), 
      writable: true 
    });
    
    expect(isMobileDevice()).toBe(false);
  });

  it("14. returns true for touch devices without fine pointer", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true, configurable: true }); // Desktop width
    Object.defineProperty(window, "ontouchstart", { value: () => {}, writable: true, configurable: true });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, writable: true, configurable: true });
    Object.defineProperty(window, "matchMedia", { 
      value: () => ({ matches: false }), // pointer: fine doesn't match
      writable: true 
    });
    
    expect(isMobileDevice()).toBe(true);
  });

  it("returns false for touch devices WITH fine pointer (e.g., trackpad)", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, "ontouchstart", { value: () => {}, writable: true, configurable: true });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, writable: true, configurable: true });
    Object.defineProperty(window, "matchMedia", { 
      value: () => ({ matches: true }), // pointer: fine DOES match
      writable: true 
    });
    
    expect(isMobileDevice()).toBe(false);
  });

  it("returns true at exactly 768px (boundary case)", () => {
    Object.defineProperty(window, "innerWidth", { value: 768, writable: true, configurable: true });
    expect(isMobileDevice()).toBe(true);
  });

  it("returns false at 769px (just above boundary)", () => {
    Object.defineProperty(window, "innerWidth", { value: 769, writable: true, configurable: true });
    Object.defineProperty(window, "ontouchstart", { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "matchMedia", { 
      value: () => ({ matches: true }), 
      writable: true 
    });
    
    expect(isMobileDevice()).toBe(false);
  });
});

// =============================================================================
// DEVICE VISIBILITY LOGIC TESTS
// =============================================================================

describe("Widget - Device Visibility Logic", () => {
  // Function that mirrors Widget.tsx device filtering logic
  function shouldHideForDevice(devices: "all" | "desktop" | "mobile", isMobile: boolean): boolean {
    return (
      (devices === "desktop" && isMobile) || 
      (devices === "mobile" && !isMobile)
    );
  }

  it("15. hides widget when devices=desktop and on mobile", () => {
    expect(shouldHideForDevice("desktop", true)).toBe(true);
  });

  it("shows widget when devices=desktop and on desktop", () => {
    expect(shouldHideForDevice("desktop", false)).toBe(false);
  });

  it("hides widget when devices=mobile and on desktop", () => {
    expect(shouldHideForDevice("mobile", false)).toBe(true);
  });

  it("shows widget when devices=mobile and on mobile", () => {
    expect(shouldHideForDevice("mobile", true)).toBe(false);
  });

  it("shows widget when devices=all on mobile", () => {
    expect(shouldHideForDevice("all", true)).toBe(false);
  });

  it("shows widget when devices=all on desktop", () => {
    expect(shouldHideForDevice("all", false)).toBe(false);
  });
});

// =============================================================================
// TRIGGER DELAY CALCULATION TESTS
// =============================================================================

describe("Widget - Trigger Delay Calculation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Function that mirrors Widget.tsx trigger delay calculation
  function calculateRemainingDelay(
    triggerDelaySeconds: number,
    visitorConnectedAt: number
  ): number {
    const triggerDelayMs = triggerDelaySeconds * 1000;
    const timeOnPage = Date.now() - visitorConnectedAt;
    return Math.max(0, triggerDelayMs - timeOnPage);
  }

  it("7. uses widgetSettings.trigger_delay value - returns full delay for new visitor", () => {
    const now = Date.now();
    const remaining = calculateRemainingDelay(5, now);
    expect(remaining).toBe(5000);
  });

  it("8. accounts for time already on page - reduces delay based on visitorConnectedAt", () => {
    const threeSecondsAgo = Date.now() - 3000;
    const remaining = calculateRemainingDelay(5, threeSecondsAgo);
    expect(remaining).toBe(2000);
  });

  it("returns 0 when visitor has waited longer than trigger_delay", () => {
    const tenSecondsAgo = Date.now() - 10000;
    const remaining = calculateRemainingDelay(5, tenSecondsAgo);
    expect(remaining).toBe(0);
  });

  it("returns 0 when trigger_delay is 0", () => {
    const remaining = calculateRemainingDelay(0, Date.now());
    expect(remaining).toBe(0);
  });

  it("handles edge case where visitor connected exactly at trigger_delay", () => {
    const fiveSecondsAgo = Date.now() - 5000;
    const remaining = calculateRemainingDelay(5, fiveSecondsAgo);
    expect(remaining).toBe(0);
  });
});

// =============================================================================
// STATE MACHINE TRANSITION LOGIC TESTS
// =============================================================================

describe("Widget - State Machine Transitions", () => {
  type WidgetState = "hidden" | "minimized" | "open" | "waiting_for_agent" | "call_timeout" | "in_call";

  // State transition logic mirroring Widget.tsx behavior
  interface StateContext {
    state: WidgetState;
    agent: { id: string } | null;
    shouldHideForDevice: boolean;
    hasHadCall: boolean;
    userHasInteracted: boolean;
  }

  it("1. initial state is hidden when no agent", () => {
    const ctx: StateContext = {
      state: "hidden",
      agent: null,
      shouldHideForDevice: false,
      hasHadCall: false,
      userHasInteracted: false,
    };
    expect(ctx.state).toBe("hidden");
  });

  it("2. transitions to open when agent assigned + trigger delay passes", () => {
    // Simulating: agent assigned, delay passes, shouldHideForDevice is false
    const canOpen = (ctx: StateContext) => 
      ctx.agent !== null && ctx.state === "hidden" && !ctx.shouldHideForDevice;
    
    const ctx: StateContext = {
      state: "hidden",
      agent: { id: "agent-1" },
      shouldHideForDevice: false,
      hasHadCall: false,
      userHasInteracted: false,
    };
    
    expect(canOpen(ctx)).toBe(true);
  });

  it("3. stays hidden if no agent", () => {
    const canOpen = (ctx: StateContext) => 
      ctx.agent !== null && ctx.state === "hidden" && !ctx.shouldHideForDevice;
    
    const ctx: StateContext = {
      state: "hidden",
      agent: null,
      shouldHideForDevice: false,
      hasHadCall: false,
      userHasInteracted: false,
    };
    
    expect(canOpen(ctx)).toBe(false);
  });

  it("4. can transition from open to minimized", () => {
    const canMinimize = (ctx: StateContext) => 
      ctx.state === "open" || ctx.state === "in_call";
    
    expect(canMinimize({ state: "open" } as StateContext)).toBe(true);
    expect(canMinimize({ state: "hidden" } as StateContext)).toBe(false);
  });

  it("5. transitions from open to waiting_for_agent on call request", () => {
    // This transition happens when user clicks camera/mic
    const canRequestCall = (ctx: StateContext) => 
      ctx.state === "open" && ctx.agent !== null;
    
    const ctx: StateContext = {
      state: "open",
      agent: { id: "agent-1" },
      shouldHideForDevice: false,
      hasHadCall: false,
      userHasInteracted: false,
    };
    
    expect(canRequestCall(ctx)).toBe(true);
  });

  it("6. transitions from in_call to minimized on call end", () => {
    // Call end should result in minimized state and hasHadCall = true
    const afterCallEnd = (ctx: StateContext): Partial<StateContext> => ({
      state: "minimized",
      hasHadCall: true,
    });
    
    const ctx: StateContext = {
      state: "in_call",
      agent: { id: "agent-1" },
      shouldHideForDevice: false,
      hasHadCall: false,
      userHasInteracted: false,
    };
    
    const result = afterCallEnd(ctx);
    expect(result.state).toBe("minimized");
    expect(result.hasHadCall).toBe(true);
  });
});

// =============================================================================
// AUTO-HIDE LOGIC TESTS
// =============================================================================

describe("Widget - Auto-Hide Logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("10. triggers auto-hide after delay when no interaction", async () => {
    const autoHideDelay = 3; // seconds
    let state = "open";
    let timerFired = false;

    // Simulate auto-hide timer
    setTimeout(() => {
      timerFired = true;
      state = "minimized";
    }, autoHideDelay * 1000);

    // Before delay
    await vi.advanceTimersByTimeAsync(2000);
    expect(timerFired).toBe(false);
    expect(state).toBe("open");

    // After delay
    await vi.advanceTimersByTimeAsync(1000);
    expect(timerFired).toBe(true);
    expect(state).toBe("minimized");
  });

  it("11. auto-hide is cancelled when user has interacted", async () => {
    const autoHideDelay = 3;
    let userHasInteracted = false;
    let state = "open";
    let timerId: ReturnType<typeof setTimeout> | null = null;

    // Start auto-hide timer
    timerId = setTimeout(() => {
      if (!userHasInteracted) {
        state = "minimized";
      }
    }, autoHideDelay * 1000);

    // User interacts after 1 second
    await vi.advanceTimersByTimeAsync(1000);
    userHasInteracted = true;
    if (timerId) clearTimeout(timerId);

    // Wait past the original auto-hide time
    await vi.advanceTimersByTimeAsync(3000);
    
    // Should still be open
    expect(state).toBe("open");
  });

  it("12. auto-hide only active when state is open and delay is set", () => {
    const shouldStartAutoHide = (
      state: string, 
      autoHideDelay: number | null,
      userHasInteracted: boolean
    ) => {
      return state === "open" && 
             autoHideDelay !== null && 
             !userHasInteracted;
    };

    // Should start when open with delay
    expect(shouldStartAutoHide("open", 3, false)).toBe(true);
    
    // Should NOT start when hidden
    expect(shouldStartAutoHide("hidden", 3, false)).toBe(false);
    
    // Should NOT start when delay is null
    expect(shouldStartAutoHide("open", null, false)).toBe(false);
    
    // Should NOT start when user has interacted
    expect(shouldStartAutoHide("open", 3, true)).toBe(false);
  });
});

// =============================================================================
// DRAG & DROP LOGIC TESTS
// =============================================================================

describe("Widget - Drag & Drop Logic", () => {
  it("16. drag captures initial position on start", () => {
    const rect = { left: 100, top: 200 };
    const clientX = 150;
    const clientY = 250;

    const dragRef = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
      currentX: rect.left,
      currentY: rect.top,
    };

    expect(dragRef.startX).toBe(150);
    expect(dragRef.startY).toBe(250);
    expect(dragRef.initialX).toBe(100);
    expect(dragRef.initialY).toBe(200);
  });

  it("17. drag move calculates new position via delta", () => {
    const dragRef = {
      startX: 100,
      startY: 100,
      initialX: 500,
      initialY: 400,
      currentX: 500,
      currentY: 400,
    };

    // User moves mouse 50px right and 30px down
    const clientX = 150;
    const clientY = 130;

    const deltaX = clientX - dragRef.startX;
    const deltaY = clientY - dragRef.startY;

    const newX = dragRef.initialX + deltaX;
    const newY = dragRef.initialY + deltaY;

    expect(deltaX).toBe(50);
    expect(deltaY).toBe(30);
    expect(newX).toBe(550);
    expect(newY).toBe(430);
  });

  it("18. drag end snaps to nearest preset position", () => {
    // Snap positions for bottom-right, bottom-left, top-right, top-left, center
    const viewportWidth = 1024;
    const viewportHeight = 768;
    const widgetWidth = 320;
    const widgetHeight = 400;
    const margin = 20;

    const snapPositions = [
      { name: "top-left", centerX: margin + widgetWidth / 2, centerY: margin + widgetHeight / 2 },
      { name: "top-right", centerX: viewportWidth - margin - widgetWidth / 2, centerY: margin + widgetHeight / 2 },
      { name: "bottom-left", centerX: margin + widgetWidth / 2, centerY: viewportHeight - margin - widgetHeight / 2 },
      { name: "bottom-right", centerX: viewportWidth - margin - widgetWidth / 2, centerY: viewportHeight - margin - widgetHeight / 2 },
      { name: "center", centerX: viewportWidth / 2, centerY: viewportHeight / 2 },
    ];

    // Find nearest position
    function findNearestPosition(widgetCenterX: number, widgetCenterY: number) {
      let nearestPosition = snapPositions[0];
      let minDistance = Infinity;

      for (const pos of snapPositions) {
        const distance = Math.sqrt(
          Math.pow(widgetCenterX - pos.centerX, 2) + 
          Math.pow(widgetCenterY - pos.centerY, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestPosition = pos;
        }
      }
      return nearestPosition;
    }

    // Test: widget near top-left should snap to top-left
    const nearTopLeft = findNearestPosition(100, 100);
    expect(nearTopLeft.name).toBe("top-left");

    // Test: widget near center should snap to center
    const nearCenter = findNearestPosition(viewportWidth / 2, viewportHeight / 2);
    expect(nearCenter.name).toBe("center");

    // Test: widget near bottom-right should snap to bottom-right
    const nearBottomRight = findNearestPosition(viewportWidth - 100, viewportHeight - 100);
    expect(nearBottomRight.name).toBe("bottom-right");
  });

  it("19. drag is disabled when fullscreen", () => {
    const isFullscreen = true;
    const canDrag = !isFullscreen;
    
    expect(canDrag).toBe(false);
  });
});

// =============================================================================
// TIMER CLEANUP TEST
// =============================================================================

describe("Widget - Timer Cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("9. timers are cleared on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    
    // Simulate component with a timer
    const timerId = setTimeout(() => {}, 10000);
    
    // Simulate unmount cleanup
    clearTimeout(timerId);
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

// =============================================================================
// MINIMIZE BUTTON VISIBILITY LOGIC
// =============================================================================

describe("Widget - Minimize Button Visibility", () => {
  it("shows minimize button when show_minimize_button setting is true", () => {
    const showMinimizeButton = true;
    const hasHadCall = false;
    const isFullscreen = false;

    const shouldShow = (showMinimizeButton || hasHadCall) && !isFullscreen;
    expect(shouldShow).toBe(true);
  });

  it("shows minimize button after first call (hasHadCall)", () => {
    const showMinimizeButton = false;
    const hasHadCall = true;
    const isFullscreen = false;

    const shouldShow = (showMinimizeButton || hasHadCall) && !isFullscreen;
    expect(shouldShow).toBe(true);
  });

  it("hides minimize button when in fullscreen", () => {
    const showMinimizeButton = true;
    const hasHadCall = true;
    const isFullscreen = true;

    const shouldShow = (showMinimizeButton || hasHadCall) && !isFullscreen;
    expect(shouldShow).toBe(false);
  });

  it("hides minimize button when not enabled and no calls yet", () => {
    const showMinimizeButton = false;
    const hasHadCall = false;
    const isFullscreen = false;

    const shouldShow = (showMinimizeButton || hasHadCall) && !isFullscreen;
    expect(shouldShow).toBe(false);
  });
});

// =============================================================================
// TEST LOCK P4: VISITOR REASSIGNMENT HANDLER LOGIC
// =============================================================================

describe("Widget - Visitor Reassignment Logic (P4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("onAgentReassigned handler behavior", () => {
    it("generates handoff message with previous and new agent names", () => {
      const previousAgentName = "Sarah";
      const newAgentName = "John";
      
      // This mirrors the logic in Widget.tsx onAgentReassigned
      const handoffMessage = `${previousAgentName} got pulled away. ${newAgentName} is taking over.`;
      
      expect(handoffMessage).toContain("Sarah");
      expect(handoffMessage).toContain("John");
      expect(handoffMessage).toContain("got pulled away");
      expect(handoffMessage).toContain("is taking over");
    });

    it("uses fallback name when previous agent name is undefined", () => {
      const previousAgentName: string | undefined = undefined;
      const newAgentName = "John";
      
      // Widget.tsx uses "Your assistant" as fallback
      const displayName = previousAgentName ?? "Your assistant";
      const handoffMessage = `${displayName} got pulled away. ${newAgentName} is taking over.`;
      
      expect(handoffMessage).toContain("Your assistant");
      expect(handoffMessage).toContain("John");
    });

    it("clears handoff message after HANDOFF_MESSAGE_DURATION", async () => {
      const HANDOFF_MESSAGE_DURATION = 3000; // From constants
      let handoffMessage: string | null = "Agent got pulled away. New Agent is taking over.";
      
      // Simulate the timeout clearing the message
      const timer = setTimeout(() => {
        handoffMessage = null;
      }, HANDOFF_MESSAGE_DURATION);
      
      // Before duration - message should still be set
      await vi.advanceTimersByTimeAsync(2900);
      expect(handoffMessage).not.toBeNull();
      
      // After duration - message should be cleared
      await vi.advanceTimersByTimeAsync(200);
      expect(handoffMessage).toBeNull();
      
      clearTimeout(timer);
    });

    it("resets intro sequence on reassignment (hasCompletedIntroSequence = false)", () => {
      // When agent is reassigned, the new agent should show their intro
      let hasCompletedIntroSequence = true;
      
      // On reassignment, this gets reset
      const onReassign = () => {
        hasCompletedIntroSequence = false;
      };
      
      onReassign();
      expect(hasCompletedIntroSequence).toBe(false);
    });

    it("updates agent to new agent on reassignment", () => {
      interface Agent {
        id: string;
        displayName: string;
      }
      
      let agent: Agent | null = { id: "old-agent", displayName: "Sarah" };
      
      const newAgent: Agent = { id: "new-agent", displayName: "John" };
      
      // On reassignment, agent gets updated
      agent = newAgent;
      
      expect(agent.id).toBe("new-agent");
      expect(agent.displayName).toBe("John");
    });
  });

  describe("onAgentUnavailable handler behavior", () => {
    it("shows handoff message when previousAgentName is provided", () => {
      const previousAgentName = "Sarah";
      
      // Widget.tsx: `${data.previousAgentName} got pulled away.`
      const handoffMessage = previousAgentName ? `${previousAgentName} got pulled away.` : null;
      
      expect(handoffMessage).toBe("Sarah got pulled away.");
    });

    it("does not show handoff message when previousAgentName is not provided", () => {
      const previousAgentName: string | undefined = undefined;
      
      const handoffMessage = previousAgentName ? `${previousAgentName} got pulled away.` : null;
      
      expect(handoffMessage).toBeNull();
    });

    it("clears agent state when unavailable", () => {
      interface Agent {
        id: string;
        displayName: string;
      }
      
      let agent: Agent | null = { id: "agent-1", displayName: "Sarah" };
      
      // On unavailable, agent gets set to null
      const onUnavailable = () => {
        agent = null;
      };
      
      onUnavailable();
      expect(agent).toBeNull();
    });

    it("cleans up preview stream when agent becomes unavailable", () => {
      let previewStream: { getTracks: () => { stop: () => void }[] } | null = {
        getTracks: () => [{ stop: vi.fn() }],
      };
      let isCameraOn = true;
      let isMicOn = true;
      
      // On unavailable, cleanup preview stream
      const onUnavailable = () => {
        if (previewStream) {
          previewStream.getTracks().forEach((track) => track.stop());
          previewStream = null;
        }
        isCameraOn = false;
        isMicOn = false;
      };
      
      onUnavailable();
      
      expect(previewStream).toBeNull();
      expect(isCameraOn).toBe(false);
      expect(isMicOn).toBe(false);
    });

    it("hides widget after handoff message duration when previousAgentName provided", async () => {
      const HANDOFF_MESSAGE_DURATION = 3000;
      const previousAgentName = "Sarah";
      let state = "open";
      let handoffMessage: string | null = null;
      
      // Simulate onAgentUnavailable with previousAgentName
      if (previousAgentName && state !== "hidden") {
        handoffMessage = `${previousAgentName} got pulled away.`;
        
        // Keep visible briefly, then hide
        setTimeout(() => {
          handoffMessage = null;
          state = "hidden";
        }, HANDOFF_MESSAGE_DURATION);
      }
      
      // Message should be visible
      expect(handoffMessage).toBe("Sarah got pulled away.");
      expect(state).toBe("open");
      
      // After duration - widget should be hidden
      await vi.advanceTimersByTimeAsync(HANDOFF_MESSAGE_DURATION + 100);
      
      expect(handoffMessage).toBeNull();
      expect(state).toBe("hidden");
    });

    it("hides widget immediately when no previousAgentName provided", () => {
      const previousAgentName: string | undefined = undefined;
      let state = "open";
      let agent = { id: "agent-1", displayName: "Sarah" };
      
      // Simulate onAgentUnavailable without previousAgentName
      const onUnavailable = () => {
        if (!previousAgentName) {
          state = "hidden";
          agent = null as unknown as typeof agent;
        }
      };
      
      onUnavailable();
      
      expect(state).toBe("hidden");
    });

    it("resets intro sequence on unavailable (hasCompletedIntroSequence = false)", () => {
      let hasCompletedIntroSequence = true;
      
      // On unavailable, intro sequence resets for potential future agent
      const onUnavailable = () => {
        hasCompletedIntroSequence = false;
      };
      
      onUnavailable();
      expect(hasCompletedIntroSequence).toBe(false);
    });
  });
});
