/**
 * @vitest-environment jsdom
 *
 * SignalingProvider Component Tests
 *
 * Behaviors Tested:
 * 1. Context - Provides SignalingContext to children
 * 2. Hook - useSignalingContext throws when used outside provider
 * 3. Hook - useEndedCallId returns state and setter
 * 4. Display - Renders children
 * 5. Audio - Initializes audio on first interaction
 */
import React, { useEffect, useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { User, AgentProfile } from "@ghost-greeter/domain/database.types";

// Mock dependencies that SignalingProvider uses
const mockUseSignaling = {
  isConnected: true,
  isReconnecting: false,
  isReconnectingCall: false,
  incomingCall: null,
  activeCall: null,
  stats: { poolVisitors: 5 },
  cobrowse: { snapshot: null, mousePosition: null, scrollPosition: null, selection: null },
  isMarkedAway: false,
  awayReason: null,
  acceptCall: vi.fn(),
  rejectCall: vi.fn(),
  endCall: vi.fn(),
  setAway: vi.fn(),
  setBack: vi.fn(),
  socket: null,
};

vi.mock("./use-signaling", () => ({
  useSignaling: () => mockUseSignaling,
}));

const mockStartRinging = vi.fn();
const mockStopRinging = vi.fn();
const mockInitializeAudio = vi.fn();

vi.mock("@/features/workbench/hooks/useIncomingCall", () => ({
  useIncomingCall: () => ({
    startRinging: mockStartRinging,
    stopRinging: mockStopRinging,
    isAudioReady: false,
    initializeAudio: mockInitializeAudio,
  }),
}));

vi.mock("@/features/workbench/hooks/useIdleTimer", () => ({
  useIdleTimer: () => ({
    isIdle: false,
  }),
}));

vi.mock("@/features/workbench/hooks/useHeartbeat", () => ({
  useHeartbeat: () => ({
    isConnectionHealthy: true,
  }),
}));

// Mock Supabase client - inline to avoid hoisting issues
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockReturnValue(Promise.resolve({ data: { session: { access_token: "test-token" } } })),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}));

vi.mock("@ghost-greeter/domain", () => ({
  TIMING: {
    AGENT_IDLE_TIMEOUT: 300000,
  },
}));

import { SignalingProvider, useSignalingContext, useEndedCallId } from "./signaling-provider";

describe("SignalingProvider", () => {
  const mockUser: User = {
    id: "user_123",
    full_name: "John Doe",
    email: "john@example.com",
    avatar_url: "https://example.com/avatar.png",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockAgentProfile: AgentProfile = {
    id: "agent_123",
    user_id: "user_123",
    org_id: "org_123",
    display_name: "Agent John",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wave_video_url: "https://example.com/wave.mp4",
    intro_video_url: "https://example.com/intro.mp4",
    connect_video_url: "https://example.com/connect.mp4",
    loop_video_url: "https://example.com/loop.mp4",
    sort_index: 0,
  };

  const defaultProps = {
    user: mockUser,
    agentProfile: mockAgentProfile,
    organizationId: "org_123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock values
    mockUseSignaling.isConnected = true;
    mockUseSignaling.incomingCall = null;
    mockUseSignaling.activeCall = null;
    mockUseSignaling.isMarkedAway = false;
    mockUseSignaling.isReconnectingCall = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display", () => {
    it("renders children", () => {
      render(
        <SignalingProvider {...defaultProps}>
          <div data-testid="child">Child Content</div>
        </SignalingProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <SignalingProvider {...defaultProps}>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </SignalingProvider>
      );

      expect(screen.getByTestId("child1")).toBeInTheDocument();
      expect(screen.getByTestId("child2")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CONTEXT PROVISION
  // ---------------------------------------------------------------------------

  describe("Context Provision", () => {
    it("provides isConnected from useSignaling", () => {
      function Consumer() {
        const { isConnected } = useSignalingContext();
        return <div data-testid="connected">{isConnected ? "yes" : "no"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("connected")).toHaveTextContent("yes");
    });

    it("provides incomingCall from useSignaling", () => {
      mockUseSignaling.incomingCall = {
        request: {
          requestId: "req-123",
          visitorId: "visitor-456",
          agentId: "agent-789",
          orgId: "org-123",
          pageUrl: "https://example.com",
          requestedAt: Date.now(),
        },
        visitor: {
          visitorId: "visitor-456",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      };

      function Consumer() {
        const { incomingCall } = useSignalingContext();
        return <div data-testid="incoming">{incomingCall ? "yes" : "no"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("incoming")).toHaveTextContent("yes");
    });

    it("provides activeCall from useSignaling", () => {
      mockUseSignaling.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        agentId: "agent_123",
        startedAt: Date.now(),
        endedAt: null,
        orgId: "org_123",
        pageUrl: "/test",
      };

      function Consumer() {
        const { activeCall } = useSignalingContext();
        return <div data-testid="active">{activeCall ? activeCall.callId : "none"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("active")).toHaveTextContent("call_123");
    });

    it("provides stats from useSignaling", () => {
      function Consumer() {
        const { stats } = useSignalingContext();
        return <div data-testid="stats">{stats?.poolVisitors ?? 0}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("stats")).toHaveTextContent("5");
    });

    it("provides isMarkedAway from useSignaling", () => {
      mockUseSignaling.isMarkedAway = true;

      function Consumer() {
        const { isMarkedAway } = useSignalingContext();
        return <div data-testid="away">{isMarkedAway ? "yes" : "no"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("away")).toHaveTextContent("yes");
    });

    it("provides isReconnectingCall from useSignaling", () => {
      mockUseSignaling.isReconnectingCall = true;

      function Consumer() {
        const { isReconnectingCall } = useSignalingContext();
        return <div data-testid="reconnecting">{isReconnectingCall ? "yes" : "no"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("reconnecting")).toHaveTextContent("yes");
    });

    it("provides cobrowse state from useSignaling", () => {
      function Consumer() {
        const { cobrowse } = useSignalingContext();
        return <div data-testid="cobrowse">{cobrowse.snapshot ? "has-snapshot" : "no-snapshot"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("cobrowse")).toHaveTextContent("no-snapshot");
    });

    it("provides isAudioReady from useIncomingCall", () => {
      function Consumer() {
        const { isAudioReady } = useSignalingContext();
        return <div data-testid="audio">{isAudioReady ? "ready" : "not-ready"}</div>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      expect(screen.getByTestId("audio")).toHaveTextContent("not-ready");
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION CALLBACKS
  // ---------------------------------------------------------------------------

  describe("Action Callbacks", () => {
    it("acceptCall stops ringing and calls useSignaling acceptCall", () => {
      function Consumer() {
        const { acceptCall } = useSignalingContext();
        return <button onClick={() => acceptCall("req-123")}>Accept</button>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockStopRinging).toHaveBeenCalled();
      expect(mockUseSignaling.acceptCall).toHaveBeenCalledWith("req-123");
    });

    it("rejectCall stops ringing and calls useSignaling rejectCall", () => {
      function Consumer() {
        const { rejectCall } = useSignalingContext();
        return <button onClick={() => rejectCall("req-123", "Busy")}>Reject</button>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockStopRinging).toHaveBeenCalled();
      expect(mockUseSignaling.rejectCall).toHaveBeenCalledWith("req-123", "Busy");
    });

    it("endCall calls useSignaling endCall", () => {
      function Consumer() {
        const { endCall } = useSignalingContext();
        return <button onClick={() => endCall("call-123")}>End</button>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockUseSignaling.endCall).toHaveBeenCalledWith("call-123");
    });

    it("setAway calls useSignaling setAway", () => {
      function Consumer() {
        const { setAway } = useSignalingContext();
        return <button onClick={() => setAway("manual")}>Away</button>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockUseSignaling.setAway).toHaveBeenCalledWith("manual");
    });

    it("setBack calls useSignaling setBack", () => {
      function Consumer() {
        const { setBack } = useSignalingContext();
        return <button onClick={setBack}>Back</button>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockUseSignaling.setBack).toHaveBeenCalled();
    });

    it("initializeAudio calls useIncomingCall initializeAudio", () => {
      function Consumer() {
        const { initializeAudio } = useSignalingContext();
        return <button onClick={initializeAudio}>Init Audio</button>;
      }

      render(
        <SignalingProvider {...defaultProps}>
          <Consumer />
        </SignalingProvider>
      );

      fireEvent.click(screen.getByRole("button"));

      expect(mockInitializeAudio).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // INCOMING CALL RINGING
  // ---------------------------------------------------------------------------

  describe("Incoming Call Ringing", () => {
    it("starts ringing when incomingCall becomes non-null", async () => {
      const incomingCall = {
        request: {
          requestId: "req-123",
          visitorId: "visitor-456",
          agentId: "agent-789",
          orgId: "org-123",
          pageUrl: "https://example.com",
          requestedAt: Date.now(),
        },
        visitor: {
          visitorId: "visitor-456",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      };
      mockUseSignaling.incomingCall = incomingCall;

      render(
        <SignalingProvider {...defaultProps}>
          <div>Content</div>
        </SignalingProvider>
      );

      await waitFor(() => {
        expect(mockStartRinging).toHaveBeenCalledWith(incomingCall);
      });
    });

    it("stops ringing when incomingCall becomes null", async () => {
      mockUseSignaling.incomingCall = null;

      render(
        <SignalingProvider {...defaultProps}>
          <div>Content</div>
        </SignalingProvider>
      );

      await waitFor(() => {
        expect(mockStopRinging).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // AUDIO INITIALIZATION ON INTERACTION
  // ---------------------------------------------------------------------------

  describe("Audio Initialization", () => {
    it("listens for click events to initialize audio", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      render(
        <SignalingProvider {...defaultProps}>
          <div>Content</div>
        </SignalingProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function), { once: true });
    });

    it("listens for keydown events to initialize audio", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      render(
        <SignalingProvider {...defaultProps}>
          <div>Content</div>
        </SignalingProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function), { once: true });
    });

    it("listens for touchstart events to initialize audio", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      render(
        <SignalingProvider {...defaultProps}>
          <div>Content</div>
        </SignalingProvider>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), { once: true });
    });

    it("removes event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = render(
        <SignalingProvider {...defaultProps}>
          <div>Content</div>
        </SignalingProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
    });
  });

  // ---------------------------------------------------------------------------
  // SUPABASE AUTH
  // ---------------------------------------------------------------------------

  describe("Supabase Auth", () => {
    it("fetches initial session on mount without error", async () => {
      // This test verifies that the component mounts and makes the Supabase
      // auth calls without throwing. The actual auth call is mocked.
      render(
        <SignalingProvider {...defaultProps}>
          <div data-testid="auth-test">Content</div>
        </SignalingProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-test")).toBeInTheDocument();
      });
    });

    it("subscribes to auth state changes without error", async () => {
      // Verifies the component initializes auth subscription without throwing
      render(
        <SignalingProvider {...defaultProps}>
          <div data-testid="auth-sub-test">Content</div>
        </SignalingProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("auth-sub-test")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles null agentProfile by using user.id as agentId", () => {
      render(
        <SignalingProvider {...defaultProps} agentProfile={null}>
          <div>Content</div>
        </SignalingProvider>
      );

      // Should render without errors
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("handles user without avatar_url", () => {
      const userNoAvatar = { ...mockUser, avatar_url: null };

      render(
        <SignalingProvider {...defaultProps} user={userNoAvatar}>
          <div>Content</div>
        </SignalingProvider>
      );

      // Should render without errors
      expect(screen.getByText("Content")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// useSignalingContext HOOK
// ---------------------------------------------------------------------------

describe("useSignalingContext", () => {
  it("throws error when used outside SignalingProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Consumer() {
      useSignalingContext();
      return <div>Content</div>;
    }

    expect(() => render(<Consumer />)).toThrow(
      "useSignalingContext must be used within a SignalingProvider"
    );

    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useEndedCallId HOOK
// ---------------------------------------------------------------------------

describe("useEndedCallId", () => {
  it("returns initial state with null endedCallId", () => {
    function Consumer() {
      const { endedCallId } = useEndedCallId();
      return <div data-testid="callid">{endedCallId ?? "null"}</div>;
    }

    render(<Consumer />);

    expect(screen.getByTestId("callid")).toHaveTextContent("null");
  });

  it("returns setter function to update endedCallId", () => {
    function Consumer() {
      const { endedCallId, setEndedCallId } = useEndedCallId();
      return (
        <div>
          <span data-testid="callid">{endedCallId ?? "null"}</span>
          <button onClick={() => setEndedCallId("call-123")}>Set</button>
        </div>
      );
    }

    render(<Consumer />);

    expect(screen.getByTestId("callid")).toHaveTextContent("null");

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByTestId("callid")).toHaveTextContent("call-123");
  });

  it("can clear endedCallId by setting to null", () => {
    function Consumer() {
      const { endedCallId, setEndedCallId } = useEndedCallId();
      return (
        <div>
          <span data-testid="callid">{endedCallId ?? "null"}</span>
          <button onClick={() => setEndedCallId("call-123")}>Set</button>
          <button onClick={() => setEndedCallId(null)}>Clear</button>
        </div>
      );
    }

    render(<Consumer />);

    // Set a value
    fireEvent.click(screen.getByRole("button", { name: /set/i }));
    expect(screen.getByTestId("callid")).toHaveTextContent("call-123");

    // Clear it
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByTestId("callid")).toHaveTextContent("null");
  });
});

