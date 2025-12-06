/**
 * @vitest-environment jsdom
 *
 * AdminLayoutClient Component Tests
 *
 * Behaviors Tested:
 * 1. Display: Background effects, sidebar, main content area, feedback buttons
 * 2. Context Integration: Uses signaling context for connection state
 * 3. Edge Cases: With/without agent profile, different connection states
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock signaling context
const mockSignalingContext = {
  isConnected: true,
  isReconnecting: false,
  activeCall: null,
  isMarkedAway: false,
  setAway: vi.fn(),
  setBack: vi.fn(),
  stats: { poolVisitors: 5 },
};

vi.mock("@/features/signaling/signaling-provider", () => ({
  useSignalingContext: () => mockSignalingContext,
}));

// Mock AdminSidebar component
vi.mock("@/features/admin/components/admin-sidebar", () => ({
  AdminSidebar: ({
    user,
    organization,
    agentProfile,
    isConnected,
    isReconnecting,
    isMarkedAway,
    activeCall,
    poolVisitors,
    onSetAway,
    onSetBack,
  }: {
    user: { id: string };
    organization: { id: string; name: string };
    agentProfile: { id: string } | null;
    isConnected: boolean;
    isReconnecting: boolean;
    isMarkedAway: boolean;
    activeCall: unknown;
    poolVisitors: number;
    onSetAway: () => void;
    onSetBack: () => void;
  }) => (
    <div data-testid="admin-sidebar">
      <span data-testid="sidebar-user-id">{user.id}</span>
      <span data-testid="sidebar-org-name">{organization.name}</span>
      <span data-testid="sidebar-agent-id">{agentProfile?.id ?? "no-agent"}</span>
      <span data-testid="sidebar-connected">{isConnected ? "connected" : "disconnected"}</span>
      <span data-testid="sidebar-reconnecting">{isReconnecting ? "reconnecting" : "not-reconnecting"}</span>
      <span data-testid="sidebar-away">{isMarkedAway ? "away" : "active"}</span>
      <span data-testid="sidebar-visitors">{poolVisitors}</span>
      <button data-testid="sidebar-set-away" onClick={onSetAway}>Set Away</button>
      <button data-testid="sidebar-set-back" onClick={onSetBack}>Set Back</button>
    </div>
  ),
}));

// Mock FeedbackButtons component
vi.mock("@/features/feedback", () => ({
  FeedbackButtons: ({ organizationId, userId }: { organizationId: string; userId: string }) => (
    <div data-testid="feedback-buttons">
      <span data-testid="feedback-org-id">{organizationId}</span>
      <span data-testid="feedback-user-id">{userId}</span>
    </div>
  ),
}));

import { AdminLayoutClient } from "./admin-layout-client";

describe("AdminLayoutClient", () => {
  const defaultUser = {
    id: "user-123",
    email: "user@example.com",
    full_name: "Test User",
    created_at: "2024-01-01T00:00:00Z",
  };

  const defaultOrganization = {
    id: "org-123",
    name: "Test Organization",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    seat_count: 5,
    created_at: "2024-01-01T00:00:00Z",
    default_widget_settings: null,
    embed_verified_at: null,
    embed_verified_domain: null,
  };

  const defaultAgentProfile = {
    id: "agent-123",
    user_id: "user-123",
    organization_id: "org-123",
    display_name: "Test Agent",
    status: "idle",
    wave_video_url: null,
    intro_video_url: null,
    loop_video_url: null,
    max_simultaneous_simulations: 25,
    created_at: "2024-01-01T00:00:00Z",
  };

  const defaultProps = {
    children: <div data-testid="child-content">Main Content</div>,
    user: defaultUser,
    organization: defaultOrganization,
    agentProfile: defaultAgentProfile,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context values
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
  // LAYOUT STRUCTURE
  // ---------------------------------------------------------------------------
  describe("Layout Structure", () => {
    it("renders main container with min-h-screen", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("min-h-screen");
    });

    it("renders background with dark class", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("dark");
    });

    it("renders background effects container", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const backgroundEffects = container.querySelector(".fixed.inset-0.pointer-events-none");
      expect(backgroundEffects).toBeInTheDocument();
    });

    it("renders grid pattern overlay", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const gridPattern = container.querySelector(".grid-pattern");
      expect(gridPattern).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SIDEBAR INTEGRATION
  // ---------------------------------------------------------------------------
  describe("Sidebar Integration", () => {
    it("renders AdminSidebar component", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("admin-sidebar")).toBeInTheDocument();
    });

    it("passes user to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-user-id")).toHaveTextContent("user-123");
    });

    it("passes organization to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-org-name")).toHaveTextContent("Test Organization");
    });

    it("passes agentProfile to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-agent-id")).toHaveTextContent("agent-123");
    });

    it("passes isConnected from context to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-connected")).toHaveTextContent("connected");
    });

    it("passes isReconnecting from context to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-reconnecting")).toHaveTextContent("not-reconnecting");
    });

    it("passes isMarkedAway from context to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-away")).toHaveTextContent("active");
    });

    it("passes poolVisitors from context stats to AdminSidebar", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-visitors")).toHaveTextContent("5");
    });

    it("defaults poolVisitors to 0 when stats is null", () => {
      mockSignalingContext.stats = null as unknown as { poolVisitors: number };
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-visitors")).toHaveTextContent("0");
    });
  });

  // ---------------------------------------------------------------------------
  // MAIN CONTENT AREA
  // ---------------------------------------------------------------------------
  describe("Main Content Area", () => {
    it("renders children in main element", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("renders main content with ml-64 margin for sidebar", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const mainElement = container.querySelector("main");
      expect(mainElement).toHaveClass("ml-64");
    });

    it("renders main content with min-h-screen", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const mainElement = container.querySelector("main");
      expect(mainElement).toHaveClass("min-h-screen");
    });

    it("passes through custom children content", () => {
      render(
        <AdminLayoutClient {...defaultProps}>
          <div data-testid="custom-child">Custom Content Here</div>
        </AdminLayoutClient>
      );

      expect(screen.getByTestId("custom-child")).toBeInTheDocument();
      expect(screen.getByText("Custom Content Here")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FEEDBACK BUTTONS INTEGRATION
  // ---------------------------------------------------------------------------
  describe("Feedback Buttons Integration", () => {
    it("renders FeedbackButtons component", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("feedback-buttons")).toBeInTheDocument();
    });

    it("passes organizationId to FeedbackButtons", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("feedback-org-id")).toHaveTextContent("org-123");
    });

    it("passes userId to FeedbackButtons", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("feedback-user-id")).toHaveTextContent("user-123");
    });
  });

  // ---------------------------------------------------------------------------
  // CONTEXT CALLBACK HANDLING
  // ---------------------------------------------------------------------------
  describe("Context Callback Handling", () => {
    it("passes onSetAway callback that calls setAway with manual", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      const setAwayButton = screen.getByTestId("sidebar-set-away");
      setAwayButton.click();

      expect(mockSignalingContext.setAway).toHaveBeenCalledWith("manual");
    });

    it("passes onSetBack callback that calls setBack", () => {
      render(<AdminLayoutClient {...defaultProps} />);

      const setBackButton = screen.getByTestId("sidebar-set-back");
      setBackButton.click();

      expect(mockSignalingContext.setBack).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles null agentProfile", () => {
      render(<AdminLayoutClient {...defaultProps} agentProfile={null} />);

      expect(screen.getByTestId("sidebar-agent-id")).toHaveTextContent("no-agent");
    });

    it("handles disconnected state", () => {
      mockSignalingContext.isConnected = false;
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-connected")).toHaveTextContent("disconnected");
    });

    it("handles reconnecting state", () => {
      mockSignalingContext.isReconnecting = true;
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-reconnecting")).toHaveTextContent("reconnecting");
    });

    it("handles away state", () => {
      mockSignalingContext.isMarkedAway = true;
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-away")).toHaveTextContent("away");
    });

    it("handles zero pool visitors", () => {
      mockSignalingContext.stats = { poolVisitors: 0 };
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-visitors")).toHaveTextContent("0");
    });

    it("handles high pool visitors count", () => {
      mockSignalingContext.stats = { poolVisitors: 9999 };
      render(<AdminLayoutClient {...defaultProps} />);

      expect(screen.getByTestId("sidebar-visitors")).toHaveTextContent("9999");
    });

    it("handles active call state", () => {
      mockSignalingContext.activeCall = { id: "call-123", visitorId: "visitor-456" };
      render(<AdminLayoutClient {...defaultProps} />);

      // Component should render without error
      expect(screen.getByTestId("admin-sidebar")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // GLOW ORBS (BACKGROUND EFFECTS)
  // ---------------------------------------------------------------------------
  describe("Background Glow Effects", () => {
    it("renders multiple glow orb elements", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const glowOrbs = container.querySelectorAll(".glow-orb");
      expect(glowOrbs.length).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Z-INDEX LAYERING
  // ---------------------------------------------------------------------------
  describe("Z-Index Layering", () => {
    it("renders content wrapper with z-10", () => {
      const { container } = render(<AdminLayoutClient {...defaultProps} />);

      const contentWrapper = container.querySelector(".z-10");
      expect(contentWrapper).toBeInTheDocument();
    });
  });
});
