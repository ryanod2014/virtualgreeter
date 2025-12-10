/**
 * @vitest-environment jsdom
 *
 * DashboardLayoutClient Component Tests
 *
 * Tests capture the current behavior of the dashboard layout:
 * - Display: Background effects, sidebar, main content area
 * - Actions: Status toggle (away/back) via context
 * - Edge Cases: Proper prop passing to AgentSidebar
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock the signaling context
const mockSetAway = vi.fn();
const mockSetBack = vi.fn();
const mockSignalingContext = {
  isConnected: true,
  isReconnecting: false,
  activeCall: null,
  isMarkedAway: false,
  setAway: mockSetAway,
  setBack: mockSetBack,
  stats: { poolVisitors: 5 },
};

vi.mock("@/features/signaling/signaling-provider", () => ({
  useSignalingContext: () => mockSignalingContext,
}));

// Mock AgentSidebar
vi.mock("@/features/workbench/agent-sidebar", () => ({
  AgentSidebar: ({
    user,
    organization,
    agentProfile,
    isAdmin,
    isConnected,
    isReconnecting,
    isMarkedAway,
    activeCall,
    poolVisitors,
    onSetAway,
    onSetBack,
  }: {
    user: { id: string; full_name: string };
    organization: { id: string; name: string };
    agentProfile: { display_name: string } | null;
    isAdmin: boolean;
    isConnected: boolean;
    isReconnecting: boolean;
    isMarkedAway: boolean;
    activeCall: unknown | null;
    poolVisitors: number;
    onSetAway: () => void;
    onSetBack: () => void;
  }) => (
    <div data-testid="agent-sidebar">
      <span data-testid="user-name">{user.full_name}</span>
      <span data-testid="org-name">{organization.name}</span>
      <span data-testid="is-admin">{isAdmin.toString()}</span>
      <span data-testid="is-connected">{isConnected.toString()}</span>
      <span data-testid="is-reconnecting">{isReconnecting.toString()}</span>
      <span data-testid="is-away">{isMarkedAway.toString()}</span>
      <span data-testid="pool-visitors">{poolVisitors}</span>
      <span data-testid="has-active-call">{(!!activeCall).toString()}</span>
      <span data-testid="agent-profile">{agentProfile?.display_name ?? "none"}</span>
      <button data-testid="set-away-btn" onClick={onSetAway}>
        Set Away
      </button>
      <button data-testid="set-back-btn" onClick={onSetBack}>
        Set Back
      </button>
    </div>
  ),
}));

// Mock FeedbackButtons
vi.mock("@/features/feedback", () => ({
  FeedbackButtons: ({ organizationId, userId }: { organizationId: string; userId: string }) => (
    <div data-testid="feedback-buttons">
      <span data-testid="feedback-org-id">{organizationId}</span>
      <span data-testid="feedback-user-id">{userId}</span>
    </div>
  ),
}));

import { DashboardLayoutClient } from "./dashboard-layout-client";

describe("DashboardLayoutClient", () => {
  const mockUser = {
    id: "user_123",
    full_name: "Test User",
    email: "test@example.com",
    avatar_url: null,
    organization_id: "org_123",
    role: "agent" as const,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockOrganization = {
    id: "org_123",
    name: "Test Org",
    slug: "test-org",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: "active" as const,
    plan: "pro" as const,
    current_period_end: "2024-12-31T00:00:00Z",
    seat_count: 5,
    widget_settings: {},
    recording_settings: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockAgentProfile = {
    id: "profile_123",
    user_id: "user_123",
    display_name: "Agent Test",
    is_active: true,
    intro_video_url: "https://example.com/intro.mp4",
    loop_video_url: "https://example.com/loop.mp4",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    user: mockUser,
    organization: mockOrganization,
    agentProfile: mockAgentProfile,
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset context to default
    mockSignalingContext.isConnected = true;
    mockSignalingContext.isReconnecting = false;
    mockSignalingContext.activeCall = null;
    mockSignalingContext.isMarkedAway = false;
    mockSignalingContext.stats = { poolVisitors: 5 };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display - Layout Structure", () => {
    it("renders the main layout container with dark background", () => {
      const { container } = render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      const mainContainer = container.querySelector(".min-h-screen.bg-background.dark");
      expect(mainContainer).toBeInTheDocument();
    });

    it("renders background glow orbs for visual effect", () => {
      const { container } = render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      const glowOrbs = container.querySelectorAll(".glow-orb");
      expect(glowOrbs.length).toBeGreaterThan(0);
    });

    it("renders grid pattern overlay", () => {
      const { container } = render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      const gridPattern = container.querySelector(".grid-pattern");
      expect(gridPattern).toBeInTheDocument();
    });

    it("renders AgentSidebar component", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("agent-sidebar")).toBeInTheDocument();
    });

    it("renders main content area with left margin for sidebar", () => {
      const { container } = render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      const mainArea = container.querySelector("main.ml-64");
      expect(mainArea).toBeInTheDocument();
    });

    it("renders children in main content area", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div data-testid="child-content">Child Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("renders FeedbackButtons component", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("feedback-buttons")).toBeInTheDocument();
    });
  });

  describe("Display - Sidebar Props", () => {
    it("passes user data to AgentSidebar", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");
    });

    it("passes organization data to AgentSidebar", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("org-name")).toHaveTextContent("Test Org");
    });

    it("passes agent profile to AgentSidebar", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("agent-profile")).toHaveTextContent("Agent Test");
    });

    it("passes isAdmin prop to AgentSidebar", () => {
      render(
        <DashboardLayoutClient {...defaultProps} isAdmin={true}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    it("passes connection status from context to AgentSidebar", () => {
      mockSignalingContext.isConnected = true;
      mockSignalingContext.isReconnecting = false;

      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
      expect(screen.getByTestId("is-reconnecting")).toHaveTextContent("false");
    });

    it("passes away status from context to AgentSidebar", () => {
      mockSignalingContext.isMarkedAway = true;

      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("is-away")).toHaveTextContent("true");
    });

    it("passes poolVisitors count from stats to AgentSidebar", () => {
      mockSignalingContext.stats = { poolVisitors: 10 };

      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("pool-visitors")).toHaveTextContent("10");
    });

    it("passes activeCall status to AgentSidebar", () => {
      mockSignalingContext.activeCall = { callId: "call_123" };

      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("has-active-call")).toHaveTextContent("true");
    });
  });

  describe("Display - FeedbackButtons Props", () => {
    it("passes organization ID to FeedbackButtons", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("feedback-org-id")).toHaveTextContent("org_123");
    });

    it("passes user ID to FeedbackButtons", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("feedback-user-id")).toHaveTextContent("user_123");
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Status Toggle", () => {
    it("calls setAway with 'manual' when onSetAway is triggered", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );

      fireEvent.click(screen.getByTestId("set-away-btn"));
      expect(mockSetAway).toHaveBeenCalledWith("manual");
      expect(mockSetAway).toHaveBeenCalledTimes(1);
    });

    it("calls setBack when onSetBack is triggered", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );

      fireEvent.click(screen.getByTestId("set-back-btn"));
      expect(mockSetBack).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles null agentProfile", () => {
      render(
        <DashboardLayoutClient {...defaultProps} agentProfile={null}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("agent-profile")).toHaveTextContent("none");
    });

    it("handles null stats from context", () => {
      mockSignalingContext.stats = null as unknown as { poolVisitors: number };

      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      // Should default to 0 pool visitors when stats is null
      expect(screen.getByTestId("pool-visitors")).toHaveTextContent("0");
    });

    it("handles disconnected state", () => {
      mockSignalingContext.isConnected = false;
      mockSignalingContext.isReconnecting = true;

      render(
        <DashboardLayoutClient {...defaultProps}>
          <div>Main Content</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("is-connected")).toHaveTextContent("false");
      expect(screen.getByTestId("is-reconnecting")).toHaveTextContent("true");
    });

    it("renders multiple children correctly", () => {
      render(
        <DashboardLayoutClient {...defaultProps}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </DashboardLayoutClient>
      );
      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });
  });
});


