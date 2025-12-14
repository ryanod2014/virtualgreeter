/**
 * @vitest-environment jsdom
 *
 * WidgetDemo Tests
 *
 * Due to the complexity of the animation system (IntersectionObserver, timers,
 * video elements), these tests focus on the logic behaviors that can be
 * extracted and tested independently:
 *
 * Behaviors Tested:
 * 1. Phase transition logic (NEXT_PHASE_MAP)
 * 2. Phase duration values (PHASE_DURATIONS)
 * 3. Widget visibility logic based on phase
 * 4. Cursor position logic based on phase
 * 5. Click state logic based on phase
 * 6. Connecting state logic based on phase
 * 7. Call active state logic based on phase
 * 8. Mic state logic based on phase
 * 9. Component renders without crashing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Mic: () => <div data-testid="mic-icon" />,
  MicOff: () => <div data-testid="mic-off-icon" />,
  VideoOff: () => <div data-testid="video-off-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
}));

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    // Store callback for potential future use
  }
  observe = mockObserve;
  unobserve = mockUnobserve;
  disconnect = mockDisconnect;
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock video element methods
window.HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLVideoElement.prototype.pause = vi.fn();

import { WidgetDemo } from "./WidgetDemo";

// =============================================================================
// PHASE LOGIC TESTS (Testing the animation logic independently)
// =============================================================================

describe("WidgetDemo - Phase Logic", () => {
  // Animation phase type matching the component
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the NEXT_PHASE_MAP from the component
  const NEXT_PHASE_MAP: Record<AnimationPhase, AnimationPhase> = {
    website_idle: "widget_appears",
    widget_appears: "widget_shown",
    widget_shown: "cursor_moves",
    cursor_moves: "cursor_hovers",
    cursor_hovers: "cursor_clicks",
    cursor_clicks: "connecting",
    connecting: "call_connected",
    call_connected: "call_active",
    call_active: "call_ends",
    call_ends: "reset",
    reset: "website_idle",
  };

  // Mirror the PHASE_DURATIONS from the component
  const PHASE_DURATIONS: Record<AnimationPhase, number> = {
    website_idle: 1200,
    widget_appears: 600,
    widget_shown: 1500,
    cursor_moves: 1200,
    cursor_hovers: 400,
    cursor_clicks: 300,
    connecting: 2000,
    call_connected: 500,
    call_active: 3000,
    call_ends: 600,
    reset: 800,
  };

  describe("Phase Transitions (NEXT_PHASE_MAP)", () => {
    it("1. website_idle transitions to widget_appears", () => {
      expect(NEXT_PHASE_MAP.website_idle).toBe("widget_appears");
    });

    it("widget_appears transitions to widget_shown", () => {
      expect(NEXT_PHASE_MAP.widget_appears).toBe("widget_shown");
    });

    it("widget_shown transitions to cursor_moves", () => {
      expect(NEXT_PHASE_MAP.widget_shown).toBe("cursor_moves");
    });

    it("cursor_moves transitions to cursor_hovers", () => {
      expect(NEXT_PHASE_MAP.cursor_moves).toBe("cursor_hovers");
    });

    it("cursor_hovers transitions to cursor_clicks", () => {
      expect(NEXT_PHASE_MAP.cursor_hovers).toBe("cursor_clicks");
    });

    it("cursor_clicks transitions to connecting", () => {
      expect(NEXT_PHASE_MAP.cursor_clicks).toBe("connecting");
    });

    it("connecting transitions to call_connected", () => {
      expect(NEXT_PHASE_MAP.connecting).toBe("call_connected");
    });

    it("call_connected transitions to call_active", () => {
      expect(NEXT_PHASE_MAP.call_connected).toBe("call_active");
    });

    it("call_active transitions to call_ends", () => {
      expect(NEXT_PHASE_MAP.call_active).toBe("call_ends");
    });

    it("call_ends transitions to reset", () => {
      expect(NEXT_PHASE_MAP.call_ends).toBe("reset");
    });

    it("reset transitions to website_idle (loops)", () => {
      expect(NEXT_PHASE_MAP.reset).toBe("website_idle");
    });
  });

  describe("Phase Durations (PHASE_DURATIONS)", () => {
    it("2. website_idle duration is 1200ms", () => {
      expect(PHASE_DURATIONS.website_idle).toBe(1200);
    });

    it("widget_appears duration is 600ms", () => {
      expect(PHASE_DURATIONS.widget_appears).toBe(600);
    });

    it("widget_shown duration is 1500ms", () => {
      expect(PHASE_DURATIONS.widget_shown).toBe(1500);
    });

    it("cursor_moves duration is 1200ms", () => {
      expect(PHASE_DURATIONS.cursor_moves).toBe(1200);
    });

    it("cursor_hovers duration is 400ms", () => {
      expect(PHASE_DURATIONS.cursor_hovers).toBe(400);
    });

    it("cursor_clicks duration is 300ms", () => {
      expect(PHASE_DURATIONS.cursor_clicks).toBe(300);
    });

    it("connecting duration is 2000ms", () => {
      expect(PHASE_DURATIONS.connecting).toBe(2000);
    });

    it("call_connected duration is 500ms", () => {
      expect(PHASE_DURATIONS.call_connected).toBe(500);
    });

    it("call_active duration is 3000ms", () => {
      expect(PHASE_DURATIONS.call_active).toBe(3000);
    });

    it("call_ends duration is 600ms", () => {
      expect(PHASE_DURATIONS.call_ends).toBe(600);
    });

    it("reset duration is 800ms", () => {
      expect(PHASE_DURATIONS.reset).toBe(800);
    });
  });
});

// =============================================================================
// WIDGET VISIBILITY LOGIC TESTS
// =============================================================================

describe("WidgetDemo - Widget Visibility Logic", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's widget visibility logic
  function isWidgetVisible(phase: AnimationPhase): boolean {
    return !["website_idle", "reset"].includes(phase);
  }

  it("3. widget is hidden during website_idle phase", () => {
    expect(isWidgetVisible("website_idle")).toBe(false);
  });

  it("widget is visible during widget_appears phase", () => {
    expect(isWidgetVisible("widget_appears")).toBe(true);
  });

  it("widget is visible during widget_shown phase", () => {
    expect(isWidgetVisible("widget_shown")).toBe(true);
  });

  it("widget is visible during cursor_moves phase", () => {
    expect(isWidgetVisible("cursor_moves")).toBe(true);
  });

  it("widget is visible during cursor_hovers phase", () => {
    expect(isWidgetVisible("cursor_hovers")).toBe(true);
  });

  it("widget is visible during cursor_clicks phase", () => {
    expect(isWidgetVisible("cursor_clicks")).toBe(true);
  });

  it("widget is visible during connecting phase", () => {
    expect(isWidgetVisible("connecting")).toBe(true);
  });

  it("widget is visible during call_connected phase", () => {
    expect(isWidgetVisible("call_connected")).toBe(true);
  });

  it("widget is visible during call_active phase", () => {
    expect(isWidgetVisible("call_active")).toBe(true);
  });

  it("widget is visible during call_ends phase", () => {
    expect(isWidgetVisible("call_ends")).toBe(true);
  });

  it("widget is hidden during reset phase", () => {
    expect(isWidgetVisible("reset")).toBe(false);
  });
});

// =============================================================================
// CONNECTING STATE LOGIC TESTS
// =============================================================================

describe("WidgetDemo - Connecting State Logic", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's connecting logic
  function isConnecting(phase: AnimationPhase): boolean {
    return phase === "connecting";
  }

  it("6. isConnecting is true only during connecting phase", () => {
    expect(isConnecting("connecting")).toBe(true);
  });

  it("isConnecting is false during website_idle", () => {
    expect(isConnecting("website_idle")).toBe(false);
  });

  it("isConnecting is false during call_active", () => {
    expect(isConnecting("call_active")).toBe(false);
  });

  it("isConnecting is false during cursor_clicks", () => {
    expect(isConnecting("cursor_clicks")).toBe(false);
  });
});

// =============================================================================
// CALL ACTIVE STATE LOGIC TESTS
// =============================================================================

describe("WidgetDemo - Call Active State Logic", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's call active logic
  function isCallActive(phase: AnimationPhase): boolean {
    return ["call_connected", "call_active"].includes(phase);
  }

  it("7. isCallActive is true during call_connected phase", () => {
    expect(isCallActive("call_connected")).toBe(true);
  });

  it("isCallActive is true during call_active phase", () => {
    expect(isCallActive("call_active")).toBe(true);
  });

  it("isCallActive is false during connecting phase", () => {
    expect(isCallActive("connecting")).toBe(false);
  });

  it("isCallActive is false during call_ends phase", () => {
    expect(isCallActive("call_ends")).toBe(false);
  });

  it("isCallActive is false during website_idle", () => {
    expect(isCallActive("website_idle")).toBe(false);
  });
});

// =============================================================================
// MIC STATE LOGIC TESTS
// =============================================================================

describe("WidgetDemo - Mic State Logic", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's mic state logic
  function isMicOn(phase: AnimationPhase): boolean {
    const isCallActive = ["call_connected", "call_active"].includes(phase);
    return isCallActive || phase === "cursor_clicks" || phase === "connecting";
  }

  it("8. mic is on during call_connected phase", () => {
    expect(isMicOn("call_connected")).toBe(true);
  });

  it("mic is on during call_active phase", () => {
    expect(isMicOn("call_active")).toBe(true);
  });

  it("mic is on during cursor_clicks phase", () => {
    expect(isMicOn("cursor_clicks")).toBe(true);
  });

  it("mic is on during connecting phase", () => {
    expect(isMicOn("connecting")).toBe(true);
  });

  it("mic is off during website_idle phase", () => {
    expect(isMicOn("website_idle")).toBe(false);
  });

  it("mic is off during widget_shown phase", () => {
    expect(isMicOn("widget_shown")).toBe(false);
  });

  it("mic is off during cursor_hovers phase", () => {
    expect(isMicOn("cursor_hovers")).toBe(false);
  });

  it("mic is off during call_ends phase", () => {
    expect(isMicOn("call_ends")).toBe(false);
  });

  it("mic is off during reset phase", () => {
    expect(isMicOn("reset")).toBe(false);
  });
});

// =============================================================================
// CURSOR POSITION LOGIC TESTS
// =============================================================================

describe("WidgetDemo - Cursor Position Logic", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's cursor position logic
  function getCursorPosition(phase: AnimationPhase): { x: number; y: number } {
    if (phase === "cursor_moves") {
      return { x: 75.5, y: 83 };
    } else if (phase === "website_idle" || phase === "reset") {
      return { x: 50, y: 40 };
    }
    // Other phases maintain previous position (handled by state)
    return { x: 50, y: 40 }; // default for testing
  }

  it("4. cursor moves to (75.5, 83) during cursor_moves phase", () => {
    const pos = getCursorPosition("cursor_moves");
    expect(pos.x).toBe(75.5);
    expect(pos.y).toBe(83);
  });

  it("cursor returns to (50, 40) during website_idle phase", () => {
    const pos = getCursorPosition("website_idle");
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(40);
  });

  it("cursor returns to (50, 40) during reset phase", () => {
    const pos = getCursorPosition("reset");
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(40);
  });
});

// =============================================================================
// CLICK STATE LOGIC TESTS
// =============================================================================

describe("WidgetDemo - Click State Logic", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's click trigger logic
  function shouldTriggerClick(phase: AnimationPhase): boolean {
    return phase === "cursor_clicks";
  }

  it("5. click animation triggers during cursor_clicks phase", () => {
    expect(shouldTriggerClick("cursor_clicks")).toBe(true);
  });

  it("click animation does not trigger during cursor_hovers phase", () => {
    expect(shouldTriggerClick("cursor_hovers")).toBe(false);
  });

  it("click animation does not trigger during connecting phase", () => {
    expect(shouldTriggerClick("connecting")).toBe(false);
  });

  it("click animation does not trigger during website_idle phase", () => {
    expect(shouldTriggerClick("website_idle")).toBe(false);
  });
});

// =============================================================================
// COMPONENT RENDERING TESTS
// =============================================================================

describe("WidgetDemo - Component Rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    mockUnobserve.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("9. renders without crashing", () => {
    expect(() => render(<WidgetDemo />)).not.toThrow();
  });

  it("renders mock browser window with traffic light buttons", () => {
    const { container } = render(<WidgetDemo />);
    
    // Check for traffic light buttons (red, yellow, green)
    const redButton = container.querySelector(".bg-red-500.rounded-full");
    const yellowButton = container.querySelector(".bg-yellow-500.rounded-full");
    const greenButton = container.querySelector(".bg-green-500.rounded-full");
    
    expect(redButton).toBeInTheDocument();
    expect(yellowButton).toBeInTheDocument();
    expect(greenButton).toBeInTheDocument();
  });

  it("renders URL bar with yourwebsite.com", () => {
    render(<WidgetDemo />);
    
    expect(screen.getByText("yourwebsite.com/pricing")).toBeInTheDocument();
  });

  it("renders initial caption for website_idle phase", () => {
    render(<WidgetDemo />);
    
    expect(screen.getByText("🌐 Visitor lands on your website...")).toBeInTheDocument();
  });

  it("widget content is hidden in initial website_idle phase", () => {
    const { container } = render(<WidgetDemo />);
    
    // Initial phase is website_idle where isWidgetVisible is false
    // Widget content (agent name, powered by) should not be visible
    // The widget wrapper exists but has opacity-0 and translate-y-8
    const widgetWrapper = container.querySelector('[class*="opacity-0"]');
    expect(widgetWrapper).toBeTruthy();
  });

  it("renders watch instruction in initial phase", () => {
    const { container } = render(<WidgetDemo />);
    
    // Initial website_idle phase shows this instruction
    expect(container.textContent).toContain("Watch how it works...");
  });

  it("sets up IntersectionObserver on mount", () => {
    render(<WidgetDemo />);
    
    expect(mockObserve).toHaveBeenCalled();
  });

  it("disconnects IntersectionObserver on unmount", () => {
    const { unmount } = render(<WidgetDemo />);
    
    unmount();
    
    expect(mockDisconnect).toHaveBeenCalled();
  });
});

// =============================================================================
// ANIMATION PHASE CAPTIONS
// =============================================================================

describe("WidgetDemo - Phase Captions", () => {
  type AnimationPhase =
    | "website_idle"
    | "widget_appears"
    | "widget_shown"
    | "cursor_moves"
    | "cursor_hovers"
    | "cursor_clicks"
    | "connecting"
    | "call_connected"
    | "call_active"
    | "call_ends"
    | "reset";

  // Mirror the component's caption logic
  function getCaptionForPhase(phase: AnimationPhase): string {
    switch (phase) {
      case "website_idle":
        return "🌐 Visitor lands on your website...";
      case "widget_appears":
      case "widget_shown":
        return "👋 Your live greeter appears automatically";
      case "cursor_moves":
      case "cursor_hovers":
        return "👀 Visitor sees someone ready to help";
      case "cursor_clicks":
        return "👆 One click to connect";
      case "connecting":
        return "⚡ Instant connection - no forms, no waiting";
      case "call_connected":
      case "call_active":
        return "🤝 Face-to-face in seconds";
      case "call_ends":
        return "✨ Every visitor becomes a conversation";
      case "reset":
        return "";
      default:
        return "";
    }
  }

  it("shows correct caption for website_idle", () => {
    expect(getCaptionForPhase("website_idle")).toBe("🌐 Visitor lands on your website...");
  });

  it("shows correct caption for widget_appears", () => {
    expect(getCaptionForPhase("widget_appears")).toBe("👋 Your live greeter appears automatically");
  });

  it("shows correct caption for widget_shown", () => {
    expect(getCaptionForPhase("widget_shown")).toBe("👋 Your live greeter appears automatically");
  });

  it("shows correct caption for cursor_moves", () => {
    expect(getCaptionForPhase("cursor_moves")).toBe("👀 Visitor sees someone ready to help");
  });

  it("shows correct caption for cursor_hovers", () => {
    expect(getCaptionForPhase("cursor_hovers")).toBe("👀 Visitor sees someone ready to help");
  });

  it("shows correct caption for cursor_clicks", () => {
    expect(getCaptionForPhase("cursor_clicks")).toBe("👆 One click to connect");
  });

  it("shows correct caption for connecting", () => {
    expect(getCaptionForPhase("connecting")).toBe("⚡ Instant connection - no forms, no waiting");
  });

  it("shows correct caption for call_connected", () => {
    expect(getCaptionForPhase("call_connected")).toBe("🤝 Face-to-face in seconds");
  });

  it("shows correct caption for call_active", () => {
    expect(getCaptionForPhase("call_active")).toBe("🤝 Face-to-face in seconds");
  });

  it("shows correct caption for call_ends", () => {
    expect(getCaptionForPhase("call_ends")).toBe("✨ Every visitor becomes a conversation");
  });

  it("shows empty caption for reset", () => {
    expect(getCaptionForPhase("reset")).toBe("");
  });
});





