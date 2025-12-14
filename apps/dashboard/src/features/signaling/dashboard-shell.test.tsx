/**
 * @vitest-environment jsdom
 *
 * DashboardShell Component Tests
 *
 * Behaviors Tested:
 * 1. Display - Wraps children with SignalingProvider, renders main content
 * 2. Modals - Shows IncomingCallModal, Away modal, PostCallDispositionModal
 * 3. Sidebar - Passes correct props to AgentSidebar
 * 4. State - Tracks call state for disposition modal
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

// Create mock context value
const mockContextValue = {
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
  isAudioReady: false,
  initializeAudio: vi.fn(),
};

// Mock SignalingProvider to avoid socket.io dependency
vi.mock("./signaling-provider", () => ({
  SignalingProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="signaling-provider">{children}</div>,
  useSignalingContext: () => mockContextValue,
}));

// Mock child components
vi.mock("@/features/workbench/incoming-call-modal", () => ({
  IncomingCallModal: ({ incomingCall, onAccept, onReject }: { incomingCall: unknown; onAccept: (id: string) => void; onReject: (id: string) => void }) => (
    <div data-testid="incoming-call-modal">
      {incomingCall ? (
        <div>
          <span>Incoming Call Modal</span>
          <button onClick={() => onAccept("req-123")}>Accept</button>
          <button onClick={() => onReject("req-123")}>Reject</button>
        </div>
      ) : null}
    </div>
  ),
}));

vi.mock("@/features/workbench/post-call-disposition-modal", () => ({
  PostCallDispositionModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="post-call-modal">
        <span>Post Call Disposition Modal</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock("@/features/workbench/agent-sidebar", () => ({
  AgentSidebar: ({
    isConnected,
    isMarkedAway,
    activeCall,
    poolVisitors,
    onSetAway,
    onSetBack,
  }: {
    isConnected: boolean;
    isMarkedAway: boolean;
    activeCall: unknown;
    poolVisitors: number;
    onSetAway: () => void;
    onSetBack: () => void;
  }) => (
    <div data-testid="agent-sidebar">
      <span data-testid="sidebar-connected">{isConnected ? "connected" : "disconnected"}</span>
      <span data-testid="sidebar-away">{isMarkedAway ? "away" : "available"}</span>
      <span data-testid="sidebar-call">{activeCall ? "on-call" : "no-call"}</span>
      <span data-testid="sidebar-visitors">{poolVisitors}</span>
      <button onClick={onSetAway}>Set Away</button>
      <button onClick={onSetBack}>Set Back</button>
    </div>
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Coffee: () => <div data-testid="coffee-icon" />,
}));

import { DashboardShell } from "./dashboard-shell";

describe("DashboardShell", () => {
  const mockUser: User = {
    id: "user_123",
    full_name: "John Doe",
    email: "john@example.com",
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOrganization: Organization = {
    id: "org_123",
    name: "Test Organization",
    logo_url: null,
    owner_id: "user_123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    subscription_seats: null,
  };

  const mockAgentProfile: AgentProfile = {
    id: "agent_123",
    user_id: "user_123",
    org_id: "org_123",
    display_name: "Agent John",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wave_video_url: null,
    intro_video_url: null,
    connect_video_url: null,
    loop_video_url: null,
    sort_index: 0,
  };

  const defaultProps = {
    user: mockUser,
    organization: mockOrganization,
    agentProfile: mockAgentProfile,
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context to defaults
    mockContextValue.isConnected = true;
    mockContextValue.isReconnecting = false;
    mockContextValue.incomingCall = null;
    mockContextValue.activeCall = null;
    mockContextValue.stats = { poolVisitors: 5 };
    mockContextValue.isMarkedAway = false;
    mockContextValue.awayReason = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display", () => {
    it("wraps children with SignalingProvider", () => {
      render(
        <DashboardShell {...defaultProps}>
          <div>Child Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("signaling-provider")).toBeInTheDocument();
    });

    it("renders children in main content area", () => {
      render(
        <DashboardShell {...defaultProps}>
          <div data-testid="child-content">Child Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("renders AgentSidebar", () => {
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("agent-sidebar")).toBeInTheDocument();
    });

    it("renders IncomingCallModal component", () => {
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("incoming-call-modal")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SIDEBAR PROPS
  // ---------------------------------------------------------------------------

  describe("Sidebar Props", () => {
    it("passes isConnected from context to sidebar", () => {
      mockContextValue.isConnected = true;
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("sidebar-connected")).toHaveTextContent("connected");
    });

    it("passes isMarkedAway from context to sidebar", () => {
      mockContextValue.isMarkedAway = true;
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("sidebar-away")).toHaveTextContent("away");
    });

    it("passes activeCall from context to sidebar", () => {
      mockContextValue.activeCall = {
        callId: "call_123",
        visitorId: "visitor_456",
        agentId: "agent_789",
        startedAt: Date.now(),
        endedAt: null,
        orgId: "org_123",
        pageUrl: "/test",
      };
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("sidebar-call")).toHaveTextContent("on-call");
    });

    it("passes poolVisitors from stats to sidebar with default 0", () => {
      mockContextValue.stats = null;
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("sidebar-visitors")).toHaveTextContent("0");
    });

    it("passes poolVisitors from stats when available", () => {
      mockContextValue.stats = { poolVisitors: 10 };
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("sidebar-visitors")).toHaveTextContent("10");
    });
  });

  // ---------------------------------------------------------------------------
  // SIDEBAR ACTIONS
  // ---------------------------------------------------------------------------

  describe("Sidebar Actions", () => {
    it("calls setAway with 'manual' when onSetAway triggered", () => {
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      fireEvent.click(screen.getByRole("button", { name: /set away/i }));
      expect(mockContextValue.setAway).toHaveBeenCalledWith("manual");
    });

    it("calls setBack when onSetBack triggered", () => {
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      fireEvent.click(screen.getByRole("button", { name: /set back/i }));
      expect(mockContextValue.setBack).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AWAY MODAL
  // ---------------------------------------------------------------------------

  describe("Away Modal", () => {
    it("shows away modal when marked away with non-manual reason", () => {
      mockContextValue.isMarkedAway = true;
      mockContextValue.awayReason = "You were marked away due to inactivity";
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByText("You've Been Marked Away")).toBeInTheDocument();
      expect(screen.getByText("You were marked away due to inactivity")).toBeInTheDocument();
    });

    it("does not show away modal for manual away (contains 'set yourself')", () => {
      mockContextValue.isMarkedAway = true;
      mockContextValue.awayReason = "You set yourself as away";
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.queryByText("You've Been Marked Away")).not.toBeInTheDocument();
    });

    it("does not show away modal when not marked away", () => {
      mockContextValue.isMarkedAway = false;
      mockContextValue.awayReason = null;
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.queryByText("You've Been Marked Away")).not.toBeInTheDocument();
    });

    it("shows I'm Back button in away modal", () => {
      mockContextValue.isMarkedAway = true;
      mockContextValue.awayReason = "You were marked away due to inactivity";
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByRole("button", { name: /i'm back/i })).toBeInTheDocument();
    });

    it("calls setBack when I'm Back button clicked", () => {
      mockContextValue.isMarkedAway = true;
      mockContextValue.awayReason = "You were marked away due to inactivity";
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      fireEvent.click(screen.getByRole("button", { name: /i'm back/i }));
      expect(mockContextValue.setBack).toHaveBeenCalled();
    });

    it("shows coffee icon in away modal", () => {
      mockContextValue.isMarkedAway = true;
      mockContextValue.awayReason = "You were marked away due to inactivity";
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByTestId("coffee-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // INCOMING CALL MODAL
  // ---------------------------------------------------------------------------

  describe("Incoming Call Modal", () => {
    it("passes incomingCall to modal", () => {
      mockContextValue.incomingCall = {
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
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      expect(screen.getByText("Incoming Call Modal")).toBeInTheDocument();
    });

    it("passes acceptCall callback to modal", () => {
      mockContextValue.incomingCall = {
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
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      fireEvent.click(screen.getByRole("button", { name: /accept/i }));
      expect(mockContextValue.acceptCall).toHaveBeenCalledWith("req-123");
    });

    it("passes rejectCall callback to modal", () => {
      mockContextValue.incomingCall = {
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
      
      render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      fireEvent.click(screen.getByRole("button", { name: /reject/i }));
      expect(mockContextValue.rejectCall).toHaveBeenCalledWith("req-123");
    });
  });

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------

  describe("Layout", () => {
    it("has min-h-screen on container", () => {
      const { container } = render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      const mainContainer = container.querySelector(".min-h-screen");
      expect(mainContainer).toBeInTheDocument();
    });

    it("main content area has ml-64 for sidebar offset", () => {
      const { container } = render(
        <DashboardShell {...defaultProps}>
          <div>Content</div>
        </DashboardShell>
      );

      const mainArea = container.querySelector("main.ml-64");
      expect(mainArea).toBeInTheDocument();
    });
  });
});




