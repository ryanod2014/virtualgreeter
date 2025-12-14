/**
 * @vitest-environment jsdom
 *
 * AdminSidebar Tests
 *
 * Behaviors Tested:
 * 1. Display - Organization logo/name, visitor count
 * 2. Navigation - All nav items render, active states
 * 3. Status dropdown - Live/Away toggle for agents
 * 4. Connection states - On Call, Reconnecting, Connecting
 * 5. User info display - Name, email, initials
 * 6. Sign out button behavior
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  Rocket: () => <div data-testid="rocket-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Video: () => <div data-testid="video-icon" />,
  LogOut: () => <div data-testid="logout-icon" />,
  Code: () => <div data-testid="code-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevron-down-icon" className={className} />
  ),
  Check: () => <div data-testid="check-icon" />,
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin"),
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid={`nav-link-${href}`}>
      {children}
    </a>
  ),
}));

// Mock supabase client
const mockSignOut = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}));

// Mock Logo component
vi.mock("@/lib/components/logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

import { AdminSidebar } from "./admin-sidebar";
import { usePathname } from "next/navigation";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

describe("AdminSidebar", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    full_name: "John Doe",
    role: "admin",
    organization_id: "org-123",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  const mockOrganization: Organization = {
    id: "org-123",
    name: "Test Organization",
    logo_url: null,
    stripe_customer_id: null,
    subscription_status: "active",
    created_at: "2024-01-01T00:00:00Z",
    subscription_id: null,
    plan: "pro",
    seat_count: 5,
    stripe_subscription_item_id: null,
    subscription_period_end: null,
    widget_config: null,
  };

  const mockAgentProfile: AgentProfile = {
    id: "agent-123",
    user_id: "user-123",
    is_active: true,
    is_online: true,
    pool_id: null,
    display_name: "John",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    total_calls: 0,
    last_call_at: null,
    last_available_at: null,
    status: "available",
    max_concurrent_calls: 1,
    organization_id: "org-123",
  };

  const defaultProps = {
    user: mockUser,
    organization: mockOrganization,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/admin");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - Organization Info
  // ---------------------------------------------------------------------------
  describe("Display - Organization Info", () => {
    it("shows organization name", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    it("shows Logo component when organization has no logo_url", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByTestId("logo")).toBeInTheDocument();
    });

    it("shows organization logo image when logo_url is provided", () => {
      const orgWithLogo = {
        ...mockOrganization,
        logo_url: "https://example.com/logo.png",
      };
      render(<AdminSidebar {...defaultProps} organization={orgWithLogo} />);
      
      const logoImg = screen.getByAltText("Test Organization");
      expect(logoImg).toBeInTheDocument();
      expect(logoImg).toHaveAttribute("src", "https://example.com/logo.png");
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - Visitor Count
  // ---------------------------------------------------------------------------
  describe("Display - Visitor Count", () => {
    it("shows visitor count of 0 with 'visitors' (plural)", () => {
      render(<AdminSidebar {...defaultProps} poolVisitors={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("visitors")).toBeInTheDocument();
    });

    it("shows visitor count of 1 with 'visitor' (singular)", () => {
      render(<AdminSidebar {...defaultProps} poolVisitors={1} />);
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("visitor")).toBeInTheDocument();
    });

    it("shows visitor count > 1 with 'visitors' (plural)", () => {
      render(<AdminSidebar {...defaultProps} poolVisitors={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("visitors")).toBeInTheDocument();
    });

    it("shows pulsing indicator when visitors > 0", () => {
      const { container } = render(<AdminSidebar {...defaultProps} poolVisitors={3} />);
      // Should have animate-ping class for the ping effect
      const pingElement = container.querySelector(".animate-ping");
      expect(pingElement).toBeInTheDocument();
    });

    it("does not show pulsing indicator when visitors is 0", () => {
      const { container } = render(<AdminSidebar {...defaultProps} poolVisitors={0} />);
      // Ping effect should not be visible (it's conditional on poolVisitors > 0)
      const pingElement = container.querySelector(".animate-ping.bg-emerald-400");
      expect(pingElement).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // NAVIGATION - Nav Items
  // ---------------------------------------------------------------------------
  describe("Navigation - Nav Items", () => {
    it("renders Quick Setup nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Quick Setup")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin")).toBeInTheDocument();
    });

    it("renders Embed Code nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Embed Code")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin/sites")).toBeInTheDocument();
    });

    it("renders Agents nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Agents")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin/agents")).toBeInTheDocument();
    });

    it("renders Pools nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Pools")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin/pools")).toBeInTheDocument();
    });

    it("renders Dispositions nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Dispositions")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin/settings/dispositions")).toBeInTheDocument();
    });

    it("renders Calls nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Calls")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin/calls")).toBeInTheDocument();
    });

    it("renders Agent Mode section header", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Agent Mode")).toBeInTheDocument();
    });

    it("renders Agent Dashboard nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Agent Dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/dashboard")).toBeInTheDocument();
    });

    it("renders Settings nav link", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByTestId("nav-link-/admin/settings")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // NAVIGATION - Active States
  // ---------------------------------------------------------------------------
  describe("Navigation - Active States", () => {
    it("highlights Quick Setup when pathname is exactly /admin", () => {
      (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/admin");
      render(<AdminSidebar {...defaultProps} />);
      
      const quickSetupLink = screen.getByTestId("nav-link-/admin");
      expect(quickSetupLink).toHaveClass("bg-primary/10");
    });

    it("does not highlight Quick Setup for /admin/pools (uses exact match)", () => {
      (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/admin/pools");
      render(<AdminSidebar {...defaultProps} />);
      
      const quickSetupLink = screen.getByTestId("nav-link-/admin");
      expect(quickSetupLink).not.toHaveClass("bg-primary/10");
    });

    it("highlights Pools when pathname starts with /admin/pools", () => {
      (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/admin/pools");
      render(<AdminSidebar {...defaultProps} />);
      
      const poolsLink = screen.getByTestId("nav-link-/admin/pools");
      expect(poolsLink).toHaveClass("bg-primary/10");
    });

    it("highlights Pools for nested route /admin/pools/123/edit", () => {
      (usePathname as ReturnType<typeof vi.fn>).mockReturnValue("/admin/pools/123/edit");
      render(<AdminSidebar {...defaultProps} />);
      
      const poolsLink = screen.getByTestId("nav-link-/admin/pools");
      expect(poolsLink).toHaveClass("bg-primary/10");
    });
  });

  // ---------------------------------------------------------------------------
  // STATUS DROPDOWN - Agent Status
  // ---------------------------------------------------------------------------
  describe("Status Dropdown - Agent Status", () => {
    const agentProps = {
      ...defaultProps,
      agentProfile: mockAgentProfile,
      isConnected: true,
      isMarkedAway: false,
      onSetAway: vi.fn(),
      onSetBack: vi.fn(),
    };

    it("shows Live status button when agent is active and connected", () => {
      render(<AdminSidebar {...agentProps} />);
      expect(screen.getByText("Live on site")).toBeInTheDocument();
    });

    it("shows Away status when isMarkedAway is true", () => {
      render(<AdminSidebar {...agentProps} isMarkedAway={true} />);
      expect(screen.getByText("Away")).toBeInTheDocument();
    });

    it("opens status dropdown when status button is clicked", () => {
      render(<AdminSidebar {...agentProps} />);
      
      // Click the status button
      fireEvent.click(screen.getByText("Live on site"));
      
      // Dropdown should now show both options
      const liveOptions = screen.getAllByText("Live on site");
      expect(liveOptions.length).toBe(2); // Button + dropdown option
    });

    it("calls onSetAway when switching from Live to Away", () => {
      const onSetAway = vi.fn();
      render(<AdminSidebar {...agentProps} onSetAway={onSetAway} />);
      
      // Open dropdown
      fireEvent.click(screen.getByText("Live on site"));
      
      // Click Away option (second instance)
      const awayButtons = screen.getAllByText("Away");
      fireEvent.click(awayButtons[awayButtons.length - 1]);
      
      expect(onSetAway).toHaveBeenCalledTimes(1);
    });

    it("calls onSetBack when switching from Away to Live", () => {
      const onSetBack = vi.fn();
      render(<AdminSidebar {...agentProps} isMarkedAway={true} onSetBack={onSetBack} />);
      
      // Open dropdown
      fireEvent.click(screen.getByText("Away"));
      
      // Click Live option
      const liveOptions = screen.getAllByText("Live on site");
      fireEvent.click(liveOptions[liveOptions.length - 1]);
      
      expect(onSetBack).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown when clicking outside", () => {
      render(<AdminSidebar {...agentProps} />);
      
      // Open dropdown
      fireEvent.click(screen.getByText("Live on site"));
      
      // Verify dropdown is open
      let liveOptions = screen.getAllByText("Live on site");
      expect(liveOptions.length).toBe(2);
      
      // Click outside (simulate mousedown)
      fireEvent.mouseDown(document.body);
      
      // Dropdown should close - only button should remain
      liveOptions = screen.getAllByText("Live on site");
      expect(liveOptions.length).toBe(1);
    });

    it("does not show status dropdown when not connected", () => {
      render(<AdminSidebar {...agentProps} isConnected={false} />);
      // Status button should not be present when not connected
      expect(screen.queryByText("Live on site")).not.toBeInTheDocument();
    });

    it("does not show status dropdown when agent is not active", () => {
      const inactiveAgent = { ...mockAgentProfile, is_active: false };
      render(<AdminSidebar {...agentProps} agentProfile={inactiveAgent} />);
      expect(screen.queryByText("Live on site")).not.toBeInTheDocument();
    });

    it("does not show status dropdown during active call", () => {
      const activeCall = { 
        callId: "call-123",
        visitorId: "visitor-123",
        agentId: "agent-123",
        orgId: "org-123",
        startedAt: Date.now(),
      };
      render(<AdminSidebar {...agentProps} activeCall={activeCall} />);
      expect(screen.queryByText("Live on site")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CONNECTION STATES
  // ---------------------------------------------------------------------------
  describe("Connection States", () => {
    const agentProps = {
      ...defaultProps,
      agentProfile: mockAgentProfile,
      onSetAway: vi.fn(),
      onSetBack: vi.fn(),
    };

    it("shows 'On Call' indicator when activeCall is present", () => {
      const activeCall = { 
        callId: "call-123",
        visitorId: "visitor-123",
        agentId: "agent-123",
        orgId: "org-123",
        startedAt: Date.now(),
      };
      render(<AdminSidebar {...agentProps} activeCall={activeCall} />);
      expect(screen.getByText("On Call")).toBeInTheDocument();
    });

    it("shows 'Reconnecting...' indicator when isReconnecting is true", () => {
      render(<AdminSidebar {...agentProps} isReconnecting={true} />);
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("shows 'Connecting...' when not connected and not reconnecting", () => {
      render(<AdminSidebar {...agentProps} isConnected={false} isReconnecting={false} />);
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // USER INFO
  // ---------------------------------------------------------------------------
  describe("User Info", () => {
    it("shows user full name", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("shows user email", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("shows user initials from full name", () => {
      render(<AdminSidebar {...defaultProps} />);
      // "John Doe" -> "JD"
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("handles single word name for initials", () => {
      const userWithSingleName = { ...mockUser, full_name: "John" };
      render(<AdminSidebar {...defaultProps} user={userWithSingleName} />);
      expect(screen.getByText("J")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SIGN OUT
  // ---------------------------------------------------------------------------
  describe("Sign Out", () => {
    it("renders Sign Out button", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    it("shows LogOut icon in Sign Out button", () => {
      render(<AdminSidebar {...defaultProps} />);
      expect(screen.getByTestId("logout-icon")).toBeInTheDocument();
    });

    it("calls supabase signOut and navigates to /login when clicked", async () => {
      render(<AdminSidebar {...defaultProps} />);
      
      const signOutButton = screen.getByText("Sign Out");
      fireEvent.click(signOutButton);
      
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
      
      expect(mockPush).toHaveBeenCalledWith("/login");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // ICONS
  // ---------------------------------------------------------------------------
  describe("Icons", () => {
    it("renders all navigation icons", () => {
      render(<AdminSidebar {...defaultProps} />);
      
      expect(screen.getByTestId("rocket-icon")).toBeInTheDocument(); // Quick Setup
      expect(screen.getByTestId("code-icon")).toBeInTheDocument(); // Embed Code
      expect(screen.getAllByTestId("users-icon").length).toBeGreaterThan(0); // Agents + visitor count
      expect(screen.getByTestId("layers-icon")).toBeInTheDocument(); // Pools
      expect(screen.getByTestId("palette-icon")).toBeInTheDocument(); // Dispositions
      expect(screen.getByTestId("bar-chart-icon")).toBeInTheDocument(); // Calls
      expect(screen.getByTestId("video-icon")).toBeInTheDocument(); // Agent Dashboard
      expect(screen.getByTestId("settings-icon")).toBeInTheDocument(); // Settings
    });
  });
});





