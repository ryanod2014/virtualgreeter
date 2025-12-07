/**
 * @vitest-environment jsdom
 *
 * AgentSidebar Component Tests
 *
 * Behaviors Tested:
 * 1. Display - Organization logo/name, visitor count, user info, navigation links
 * 2. Status Indicators - Connected, disconnected, reconnecting, on call, away states
 * 3. Status Dropdown - Live/Away toggle with callbacks
 * 4. Actions - Sign out, navigation, status changes
 * 5. Edge Cases - Optional props, admin mode
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { User, Organization, AgentProfile, ActiveCall } from "@ghost-greeter/domain/database.types";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => "/dashboard",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Video: () => <div data-testid="video-icon" />,
  Film: () => <div data-testid="film-icon" />,
  LogOut: () => <div data-testid="logout-icon" />,
  LayoutDashboard: () => <div data-testid="layout-dashboard-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Users: () => <div data-testid="users-icon" />,
}));

// Mock Logo component
vi.mock("@/lib/components/logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

// Mock Supabase client
const mockSignOut = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

import { AgentSidebar } from "./agent-sidebar";

describe("AgentSidebar", () => {
  // Mock data
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

  const mockActiveCall: ActiveCall = {
    callId: "call_123",
    visitorId: "visitor_456",
    agentId: "agent_123",
    startedAt: Date.now(),
    endedAt: null,
    orgId: "org_123",
    pageUrl: "/test",
  };

  const defaultProps = {
    user: mockUser,
    organization: mockOrganization,
    agentProfile: mockAgentProfile,
    isAdmin: false,
    isConnected: true,
    isReconnecting: false,
    isMarkedAway: false,
    activeCall: null,
    poolVisitors: 0,
    onSetAway: vi.fn(),
    onSetBack: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - ORGANIZATION
  // ---------------------------------------------------------------------------

  describe("Display - Organization", () => {
    it("shows organization name", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    it("shows default logo when organization has no logo_url", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("shows organization logo when logo_url is provided", () => {
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: "https://example.com/logo.png",
      };
      render(<AgentSidebar {...defaultProps} organization={orgWithLogo} />);
      
      const logo = screen.getByAltText("Test Organization");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - VISITOR COUNT
  // ---------------------------------------------------------------------------

  describe("Display - Visitor Count", () => {
    it("shows visitor count with gray styling when zero visitors", () => {
      render(<AgentSidebar {...defaultProps} poolVisitors={0} />);
      
      const badge = screen.getByTitle("0 visitors on your sites");
      expect(badge).toHaveClass("bg-zinc-500/10", "text-zinc-500");
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("visitors")).toBeInTheDocument();
    });

    it("shows visitor count with green styling when visitors present", () => {
      render(<AgentSidebar {...defaultProps} poolVisitors={5} />);
      
      const badge = screen.getByTitle("5 visitors on your sites");
      expect(badge).toHaveClass("bg-emerald-500/10", "text-emerald-500");
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("visitors")).toBeInTheDocument();
    });

    it("shows singular 'visitor' when count is 1", () => {
      render(<AgentSidebar {...defaultProps} poolVisitors={1} />);
      
      expect(screen.getByTitle("1 visitor on your sites")).toBeInTheDocument();
      expect(screen.getByText("visitor")).toBeInTheDocument();
    });

    it("shows pulsing indicator when visitors present", () => {
      const { container } = render(<AgentSidebar {...defaultProps} poolVisitors={3} />);
      
      const pulsingIndicator = container.querySelector(".animate-ping");
      expect(pulsingIndicator).toBeInTheDocument();
    });

    it("does not show pulsing indicator when zero visitors", () => {
      const { container } = render(<AgentSidebar {...defaultProps} poolVisitors={0} />);
      
      // The ping animation is only rendered when poolVisitors > 0
      const pulsingIndicator = container.querySelector(".animate-ping");
      expect(pulsingIndicator).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - USER INFO
  // ---------------------------------------------------------------------------

  describe("Display - User Info", () => {
    it("shows user initials in avatar", () => {
      render(<AgentSidebar {...defaultProps} />);
      // "John Doe" -> "JD"
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("shows agent display name when available", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByText("Agent John")).toBeInTheDocument();
    });

    it("shows user full name when no agent profile display name", () => {
      const noDisplayName = { ...mockAgentProfile, display_name: null };
      render(<AgentSidebar {...defaultProps} agentProfile={noDisplayName} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("shows user email", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // STATUS INDICATORS
  // ---------------------------------------------------------------------------

  describe("Status Indicators", () => {
    it("shows 'Live on site' when connected and active agent not away", () => {
      render(<AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={false} />);
      expect(screen.getByText("Live on site")).toBeInTheDocument();
    });

    it("shows 'Away' when isMarkedAway is true", () => {
      render(<AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={true} />);
      expect(screen.getByText("Away")).toBeInTheDocument();
    });

    it("shows 'On Call' when activeCall is present", () => {
      render(<AgentSidebar {...defaultProps} activeCall={mockActiveCall} />);
      expect(screen.getByText("On Call")).toBeInTheDocument();
    });

    it("shows 'Reconnecting...' when isReconnecting is true", () => {
      render(<AgentSidebar {...defaultProps} isConnected={false} isReconnecting={true} />);
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("shows 'Connecting...' when not connected and not reconnecting", () => {
      render(<AgentSidebar {...defaultProps} isConnected={false} isReconnecting={false} />);
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });

    it("does not show status dropdown when agent is not active", () => {
      const inactiveAgent = { ...mockAgentProfile, is_active: false };
      render(<AgentSidebar {...defaultProps} agentProfile={inactiveAgent} />);
      expect(screen.queryByText("Live on site")).not.toBeInTheDocument();
    });

    it("does not show status dropdown during active call", () => {
      render(<AgentSidebar {...defaultProps} activeCall={mockActiveCall} />);
      // Should show "On Call" instead of dropdown
      expect(screen.getByText("On Call")).toBeInTheDocument();
      // Click the on-call badge should not open dropdown
      expect(screen.queryByRole("button", { name: /live on site/i })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // STATUS DROPDOWN ACTIONS
  // ---------------------------------------------------------------------------

  describe("Status Dropdown Actions", () => {
    it("opens dropdown when status button clicked", () => {
      render(<AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={false} />);
      
      const statusButton = screen.getByRole("button", { name: /live on site/i });
      fireEvent.click(statusButton);
      
      // Dropdown should show both options
      const allLiveOnSite = screen.getAllByText("Live on site");
      expect(allLiveOnSite.length).toBe(2); // One in button, one in dropdown
    });

    it("calls onSetAway when Away option clicked while Live", () => {
      const onSetAway = vi.fn();
      render(<AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={false} onSetAway={onSetAway} />);
      
      // Open dropdown
      const statusButton = screen.getByRole("button", { name: /live on site/i });
      fireEvent.click(statusButton);
      
      // Click Away option
      const awayButton = screen.getByRole("button", { name: /away/i });
      fireEvent.click(awayButton);
      
      expect(onSetAway).toHaveBeenCalledTimes(1);
    });

    it("calls onSetBack when Live option clicked while Away", () => {
      const onSetBack = vi.fn();
      render(<AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={true} onSetBack={onSetBack} />);
      
      // Open dropdown
      const statusButton = screen.getByRole("button", { name: /away/i });
      fireEvent.click(statusButton);
      
      // Click Live on site option (find the one in dropdown, not the button itself)
      const dropdownOptions = screen.getAllByRole("button");
      const liveOption = dropdownOptions.find(btn => 
        btn.textContent?.includes("Live on site") && !btn.textContent?.includes("Away")
      );
      if (liveOption) fireEvent.click(liveOption);
      
      expect(onSetBack).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown when clicking outside", async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={false} />
        </div>
      );
      
      // Open dropdown
      const statusButton = screen.getByRole("button", { name: /live on site/i });
      fireEvent.click(statusButton);
      
      // Verify dropdown is open
      let allLiveOnSite = screen.getAllByText("Live on site");
      expect(allLiveOnSite.length).toBe(2);
      
      // Click outside
      fireEvent.mouseDown(screen.getByTestId("outside"));
      
      // Dropdown should close
      await waitFor(() => {
        allLiveOnSite = screen.getAllByText("Live on site");
        expect(allLiveOnSite.length).toBe(1);
      });
    });

    it("shows check icon next to current status", () => {
      render(<AgentSidebar {...defaultProps} isConnected={true} isMarkedAway={false} />);
      
      // Open dropdown
      const statusButton = screen.getByRole("button", { name: /live on site/i });
      fireEvent.click(statusButton);
      
      // Check icon should be present
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------------------

  describe("Navigation", () => {
    it("renders Bullpen link", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByRole("link", { name: /bullpen/i })).toHaveAttribute("href", "/dashboard");
    });

    it("renders Pre-recorded Intro link", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByRole("link", { name: /pre-recorded intro/i })).toHaveAttribute("href", "/dashboard/videos");
    });

    it("renders Calls link", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByRole("link", { name: /calls/i })).toHaveAttribute("href", "/dashboard/calls");
    });

    it("shows Admin Dashboard link when isAdmin is true", () => {
      render(<AgentSidebar {...defaultProps} isAdmin={true} />);
      expect(screen.getByRole("link", { name: /admin dashboard/i })).toHaveAttribute("href", "/admin");
      expect(screen.getByText("Admin Mode")).toBeInTheDocument();
    });

    it("does not show Admin Dashboard link when isAdmin is false", () => {
      render(<AgentSidebar {...defaultProps} isAdmin={false} />);
      expect(screen.queryByRole("link", { name: /admin dashboard/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Admin Mode")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SIGN OUT
  // ---------------------------------------------------------------------------

  describe("Sign Out", () => {
    it("renders Sign Out button", () => {
      render(<AgentSidebar {...defaultProps} />);
      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    });

    it("calls supabase signOut when Sign Out clicked", async () => {
      render(<AgentSidebar {...defaultProps} />);
      
      const signOutButton = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutButton);
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it("redirects to login page after sign out", async () => {
      render(<AgentSidebar {...defaultProps} />);
      
      const signOutButton = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/login");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles null agentProfile gracefully", () => {
      render(<AgentSidebar {...defaultProps} agentProfile={null} />);
      // Should show full name since no agent profile
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("does not show status dropdown without onSetAway and onSetBack", () => {
      render(<AgentSidebar {...defaultProps} onSetAway={undefined} onSetBack={undefined} />);
      // Status dropdown should not be present
      expect(screen.queryByRole("button", { name: /live on site/i })).not.toBeInTheDocument();
    });

    it("handles single-name users for initials", () => {
      const singleNameUser = { ...mockUser, full_name: "Madonna" };
      render(<AgentSidebar {...defaultProps} user={singleNameUser} />);
      // Should show "M" for single name
      expect(screen.getByText("M")).toBeInTheDocument();
    });

    it("uses default values for optional boolean props", () => {
      // Render with only required props
      const { container } = render(
        <AgentSidebar
          user={mockUser}
          organization={mockOrganization}
          agentProfile={mockAgentProfile}
          isAdmin={false}
        />
      );
      
      // Should render without errors
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});

