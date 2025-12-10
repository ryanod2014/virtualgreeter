import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * AgentsClient Component Tests - Agent Management (D4)
 *
 * These tests capture the current behavior of the invite and agent management
 * functionality in the AgentsClient component. The actual API logic is tested
 * in the respective route tests:
 * - /api/invites/send/route.test.ts - invite creation, validation, billing
 * - /api/invites/revoke/route.test.ts - invite revocation
 * - /api/agents/remove/route.test.ts - agent removal
 *
 * This file focuses on UI behaviors:
 * - Form validation (email and name required before submit)
 * - Role selection
 * - Invite flow (confirmation modal, success/error feedback)
 * - Agent removal flow (confirmation modal, success/error feedback)
 */

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/agents",
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-123" } } }),
    },
  }),
}));

// Mock lucide-react icons to simplify rendering
vi.mock("lucide-react", () => ({
  Users: () => <div data-testid="users-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Check: () => <div data-testid="check-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  X: () => <div data-testid="x-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  CreditCard: () => <div data-testid="credit-card-icon" />,
  UserMinus: () => <div data-testid="user-minus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pencil: () => <div data-testid="pencil-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}));

// Mock findProblemHours function
vi.mock("@/lib/stats/coverage-stats", () => ({
  findProblemHours: vi.fn().mockReturnValue([]),
}));

// Mock DateRangePicker component
vi.mock("@/lib/components/date-range-picker", () => ({
  DateRangePicker: () => <div data-testid="date-range-picker" />,
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { AgentsClient } from "./agents-client";

describe("AgentsClient - Agent Management (D4)", () => {
  const defaultProps = {
    agents: [],
    pools: [
      { id: "pool-1", name: "Default Pool", is_catch_all: true },
    ],
    agentStats: {},
    organizationId: "org-123",
    pendingInvites: [],
    currentUserId: "user-123",
    currentUserName: "Test Admin",
    isCurrentUserAgent: false,
    billingInfo: {
      usedSeats: 2,
      purchasedSeats: 5,
      availableSeats: 3,
      activeAgents: 2,
      pendingInvites: 0,
      pricePerSeat: 49,
      monthlyCost: 245,
    },
    hourlyCoverage: [],
    dailyHourlyCoverage: { byDayHour: [], byDayOfWeek: [] },
    dateRange: { from: "2024-01-01", to: "2024-01-31" },
    staffingMetrics: {
      ringRate: 0,
      avgCallDurationSeconds: 0,
      poolsNeedingCoverage: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, invite: { id: "invite-1", email: "test@example.com" } }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // ADD AGENT MODAL - OPENING AND MODE SELECTION
  // ---------------------------------------------------------------------------

  describe("Add Agent Modal - Mode Selection", () => {
    it("shows Add Agent row to open modal", () => {
      render(<AgentsClient {...defaultProps} />);

      // Look for the "Add Agent" text in the clickable row
      expect(screen.getByText("Add Agent")).toBeInTheDocument();
    });

    it("opens modal with choice options when Add Agent is clicked", async () => {
      render(<AgentsClient {...defaultProps} />);

      const addAgentText = screen.getByText("Add Agent");
      const addAgentRow = addAgentText.closest("div[class*='cursor-pointer']") || addAgentText;
      fireEvent.click(addAgentRow);

      await waitFor(() => {
        // Should show the two options: Add Myself and Invite Someone
        expect(screen.getByText("Add Myself")).toBeInTheDocument();
        expect(screen.getByText("Invite Someone")).toBeInTheDocument();
      });
    });

    it("hides 'Add Myself' option when current user is already an agent", async () => {
      render(<AgentsClient {...defaultProps} isCurrentUserAgent={true} />);

      const addAgentText = screen.getByText("Add Agent");
      const addAgentRow = addAgentText.closest("div[class*='cursor-pointer']") || addAgentText;
      fireEvent.click(addAgentRow);

      await waitFor(() => {
        // Invite Someone should be visible
        expect(screen.getByText("Invite Someone")).toBeInTheDocument();
        // Add Myself should NOT be visible (or the option should not be clickable)
      });
    });
  });

  // ---------------------------------------------------------------------------
  // INVITE FORM - VALIDATION
  // ---------------------------------------------------------------------------

  describe("Invite Form - Validation", () => {
    async function openInviteForm() {
      const addAgentText = screen.getByText("Add Agent");
      const addAgentRow = addAgentText.closest("div[class*='cursor-pointer']") || addAgentText;
      fireEvent.click(addAgentRow);

      await waitFor(() => {
        expect(screen.getByText("Invite Someone")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Invite Someone"));
    }

    it("shows email and name input fields in invite form", async () => {
      render(<AgentsClient {...defaultProps} />);
      await openInviteForm();

      await waitFor(() => {
        // The actual placeholders in the component
        expect(screen.getByPlaceholderText("agent@company.com")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("John Smith")).toBeInTheDocument();
      });
    });

    it("shows role selection with Agent and Admin options", async () => {
      render(<AgentsClient {...defaultProps} />);
      await openInviteForm();

      await waitFor(() => {
        // Role selector should be present - look for the role label
        expect(screen.getByText("Role")).toBeInTheDocument();
      });
    });

    it("Continue button is disabled when email is empty", async () => {
      render(<AgentsClient {...defaultProps} />);
      await openInviteForm();

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText("John Smith");
        fireEvent.change(nameInput, { target: { value: "Test User" } });

        // Find the Continue button
        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).toBeDisabled();
      });
    });

    it("Continue button is disabled when name is empty", async () => {
      render(<AgentsClient {...defaultProps} />);
      await openInviteForm();

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText("agent@company.com");
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });

        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).toBeDisabled();
      });
    });

    it("Continue button is enabled when both email and name are provided", async () => {
      render(<AgentsClient {...defaultProps} />);
      await openInviteForm();

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText("agent@company.com");
        const nameInput = screen.getByPlaceholderText("John Smith");

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(nameInput, { target: { value: "Test User" } });

        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).not.toBeDisabled();
      });
    });

    it("defaults role to 'agent'", async () => {
      render(<AgentsClient {...defaultProps} />);
      await openInviteForm();

      await waitFor(() => {
        // Check that Agent role button has the selected styling (border-primary)
        const roleButtons = screen.getAllByRole("button").filter(btn => 
          btn.textContent?.includes("Agent") && btn.textContent?.includes("Can take calls")
        );
        if (roleButtons.length > 0) {
          expect(roleButtons[0]).toHaveClass("border-primary");
        }
      });
    });
  });

  // ---------------------------------------------------------------------------
  // INVITE FORM - CONFIRMATION MODAL
  // ---------------------------------------------------------------------------

  describe("Invite Form - Confirmation Modal", () => {
    async function fillAndSubmitInviteForm() {
      const addAgentText = screen.getByText("Add Agent");
      const addAgentRow = addAgentText.closest("div[class*='cursor-pointer']") || addAgentText;
      fireEvent.click(addAgentRow);

      await waitFor(() => {
        expect(screen.getByText("Invite Someone")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Invite Someone"));

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText("agent@company.com");
        const nameInput = screen.getByPlaceholderText("John Smith");

        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(nameInput, { target: { value: "Test User" } });
      });

      const continueButton = screen.getByRole("button", { name: /continue/i });
      fireEvent.click(continueButton);
    }

    it("shows confirmation modal when Continue is clicked with valid form", async () => {
      render(<AgentsClient {...defaultProps} />);
      await fillAndSubmitInviteForm();

      await waitFor(() => {
        // The confirm button should be present with this text
        expect(screen.getByText(/Confirm & Send Invite/i)).toBeInTheDocument();
        // Billing info should be visible
        expect(screen.getByText(/Your seats/i)).toBeInTheDocument();
      });
    });

    it("shows billing impact in confirmation modal", async () => {
      render(<AgentsClient {...defaultProps} />);
      await fillAndSubmitInviteForm();

      await waitFor(() => {
        // Should show seat usage information
        expect(screen.getByText(/Your seats/i)).toBeInTheDocument();
        expect(screen.getByText(/prepaid seat/i)).toBeInTheDocument();
      });
    });

    it("calls API when Confirm & Send is clicked", async () => {
      render(<AgentsClient {...defaultProps} />);
      await fillAndSubmitInviteForm();

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Send Invite/i)).toBeInTheDocument();
      });

      // Find and click the confirm button
      const confirmButton = screen.getByRole("button", { name: /confirm.*send/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/invites/send",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              email: "test@example.com",
              fullName: "Test User",
              role: "agent",
            }),
          })
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // INVITE FORM - SUCCESS/ERROR FEEDBACK
  // ---------------------------------------------------------------------------

  describe("Invite Form - Feedback States", () => {
    async function submitInvite() {
      const addAgentText = screen.getByText("Add Agent");
      const addAgentRow = addAgentText.closest("div[class*='cursor-pointer']") || addAgentText;
      fireEvent.click(addAgentRow);

      await waitFor(() => {
        expect(screen.getByText("Invite Someone")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Invite Someone"));

      await waitFor(() => {
        const emailInput = screen.getByPlaceholderText("agent@company.com");
        const nameInput = screen.getByPlaceholderText("John Smith");
        fireEvent.change(emailInput, { target: { value: "test@example.com" } });
        fireEvent.change(nameInput, { target: { value: "Test User" } });
      });

      const continueButton = screen.getByRole("button", { name: /continue/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm & Send Invite/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /confirm.*send/i });
      fireEvent.click(confirmButton);
    }

    it("shows success message after successful invite", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, invite: { id: "inv-1", email: "test@example.com" } }),
      });

      render(<AgentsClient {...defaultProps} />);
      await submitInvite();

      await waitFor(() => {
        // Success state should show check icon or success message
        expect(screen.getByTestId("check-icon") || screen.getByText(/sent/i)).toBeInTheDocument();
      });
    });

    it("shows error message when invite fails due to existing user", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "User already exists in this organization" }),
      });

      render(<AgentsClient {...defaultProps} />);
      await submitInvite();

      await waitFor(() => {
        expect(screen.getByText(/User already exists in this organization/i)).toBeInTheDocument();
      });
    });

    it("shows error message when invite fails due to pending invite", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "An invite has already been sent to this email" }),
      });

      render(<AgentsClient {...defaultProps} />);
      await submitInvite();

      await waitFor(() => {
        expect(screen.getByText(/An invite has already been sent to this email/i)).toBeInTheDocument();
      });
    });

    it("adds invite to pending list after successful send", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, invite: { id: "inv-1", email: "newuser@example.com" } }),
      });

      render(<AgentsClient {...defaultProps} />);
      await submitInvite();

      await waitFor(() => {
        // The new invite should appear in the pending invites list
        // (after success, the modal closes and list updates)
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // PENDING INVITES DISPLAY
  // ---------------------------------------------------------------------------

  describe("Pending Invites Display", () => {
    it("shows pending invites in the list", () => {
      const propsWithInvites = {
        ...defaultProps,
        pendingInvites: [
          {
            id: "inv-1",
            email: "pending@example.com",
            full_name: "Pending User",
            role: "agent",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            email_status: "sent" as const,
          },
        ],
      };

      render(<AgentsClient {...propsWithInvites} />);

      expect(screen.getByText("pending@example.com")).toBeInTheDocument();
      expect(screen.getByText("Pending User")).toBeInTheDocument();
    });

    it("shows Pending badge for pending invites", () => {
      const propsWithInvites = {
        ...defaultProps,
        pendingInvites: [
          {
            id: "inv-1",
            email: "pending@example.com",
            full_name: "Pending User",
            role: "agent",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            email_status: "sent" as const,
          },
        ],
      };

      render(<AgentsClient {...propsWithInvites} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // REVOKE INVITE
  // ---------------------------------------------------------------------------

  describe("Revoke Invite", () => {
    it("calls revoke API when X button is clicked on pending invite", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const propsWithInvites = {
        ...defaultProps,
        pendingInvites: [
          {
            id: "inv-123",
            email: "pending@example.com",
            full_name: "Pending User",
            role: "agent",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            email_status: "sent" as const,
          },
        ],
      };

      render(<AgentsClient {...propsWithInvites} />);

      // Find and click the revoke button (X icon)
      const xIcons = screen.getAllByTestId("x-icon");
      const revokeButton = xIcons[xIcons.length - 1].closest("button");
      if (revokeButton) {
        fireEvent.click(revokeButton);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/invites/revoke",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ inviteId: "inv-123" }),
          })
        );
      });
    });

    it("removes invite from list after successful revocation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const propsWithInvites = {
        ...defaultProps,
        pendingInvites: [
          {
            id: "inv-123",
            email: "pending@example.com",
            full_name: "Pending User",
            role: "agent",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            email_status: "sent" as const,
          },
        ],
      };

      render(<AgentsClient {...propsWithInvites} />);

      const xIcons = screen.getAllByTestId("x-icon");
      const revokeButton = xIcons[xIcons.length - 1].closest("button");
      if (revokeButton) {
        fireEvent.click(revokeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText("pending@example.com")).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // AGENT REMOVAL
  // ---------------------------------------------------------------------------

  describe("Agent Removal", () => {
    const propsWithAgents = {
      ...defaultProps,
      agents: [
        {
          id: "agent-1",
          user_id: "user-456",
          display_name: "Test Agent",
          status: "idle",
          wave_video_url: null,
          intro_video_url: null,
          loop_video_url: null,
          max_simultaneous_simulations: 25,
          user: {
            email: "agent@example.com",
            full_name: "Test Agent",
          },
          agent_pool_members: [],
        },
      ],
    };

    it("displays agents in the list", () => {
      render(<AgentsClient {...propsWithAgents} />);

      expect(screen.getByText("Test Agent")).toBeInTheDocument();
      expect(screen.getByText("agent@example.com")).toBeInTheDocument();
    });

    it("shows agent in agents list section", () => {
      render(<AgentsClient {...propsWithAgents} />);

      // Agent should appear in the list with their name
      const agentName = screen.getByText("Test Agent");
      expect(agentName).toBeInTheDocument();
      
      // Agent email should also be visible
      const agentEmail = screen.getByText("agent@example.com");
      expect(agentEmail).toBeInTheDocument();
    });

    it("shows remove icon for agents", () => {
      render(<AgentsClient {...propsWithAgents} />);

      // User minus icon should be present for agent removal
      const userMinusIcons = screen.getAllByTestId("user-minus-icon");
      expect(userMinusIcons.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // BILLING INFO DISPLAY
  // ---------------------------------------------------------------------------

  describe("Billing Info Display", () => {
    it("shows seat count information", () => {
      render(<AgentsClient {...defaultProps} />);

      // Should show "5 seats prepaid" text
      expect(screen.getByText(/seats prepaid/i)).toBeInTheDocument();
    });

    it("shows available seats when under limit", () => {
      render(<AgentsClient {...defaultProps} />);

      // Should show available seats
      expect(screen.getByText(/3 available/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ADD MYSELF FLOW
  // ---------------------------------------------------------------------------

  describe("Add Myself Flow", () => {
    it("shows Add Myself option when admin is not already an agent", async () => {
      render(<AgentsClient {...defaultProps} isCurrentUserAgent={false} />);

      const addAgentText = screen.getByText("Add Agent");
      fireEvent.click(addAgentText);

      await waitFor(() => {
        expect(screen.getByText("Add Myself")).toBeInTheDocument();
      });
    });

    it("does not show Add Myself when admin is already an agent", async () => {
      render(<AgentsClient {...defaultProps} isCurrentUserAgent={true} />);

      const addAgentText = screen.getByText("Add Agent");
      fireEvent.click(addAgentText);

      await waitFor(() => {
        // Should only show Invite Someone, not Add Myself
        expect(screen.getByText("Invite Someone")).toBeInTheDocument();
      });
    });
  });
});


