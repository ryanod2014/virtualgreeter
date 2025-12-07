/**
 * @vitest-environment jsdom
 *
 * BillingSettingsClient Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows page title and header
 * 2. Display - Shows current subscription info
 * 3. Display - Shows seat management section
 * 4. Display - Shows billing frequency options
 * 5. Display - Shows storage usage
 * 6. Display - Shows monthly total
 * 7. Display - Shows billing period info
 * 8. Display - Shows cancel subscription section
 * 9. Display - Shows paused account banner when paused
 * 10. Display - Shows pricing details section
 * 11. Actions - Change seat count (increment/decrement)
 * 12. Actions - Quick seat selection buttons
 * 13. Actions - Change billing frequency
 * 14. Actions - Open manage billing
 * 15. Actions - Open cancel subscription flow
 * 16. Actions - Resume paused account
 * 17. Edge Cases - Shows 6-month option when eligible
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  CreditCard: () => <div data-testid="credit-card-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Check: () => <div data-testid="check-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Receipt: () => <div data-testid="receipt-icon" />,
  HardDrive: () => <div data-testid="hard-drive-icon" />,
  Video: () => <div data-testid="video-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Snowflake: () => <div data-testid="snowflake-icon" />,
  PlayCircle: () => <div data-testid="play-circle-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock Stripe pricing
vi.mock("@/lib/stripe", () => ({
  PRICING: {
    monthly: { price: 49, label: "Monthly", discount: 0 },
    annual: { price: 32, label: "Annual", discount: 35 },
    six_month: { price: 29, label: "6-Month", discount: 40 },
  },
  STORAGE_PRICE_PER_GB: 0.10,
  FREE_STORAGE_GB: 5,
}));

// Mock actions
vi.mock("./actions", () => ({
  submitCancellationFeedback: vi.fn().mockResolvedValue(undefined),
  pauseAccount: vi.fn().mockResolvedValue(undefined),
  resumeAccount: vi.fn().mockResolvedValue(undefined),
}));

// Mock child modals
vi.mock("./cancel-subscription-modal", () => ({
  CancelSubscriptionModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? (
      <div data-testid="cancel-modal">
        <button onClick={onClose}>Close Cancel Modal</button>
      </div>
    ) : null,
}));

vi.mock("./pause-account-modal", () => ({
  PauseAccountModal: ({ isOpen, onClose, onContinueToCancel }: { isOpen: boolean; onClose: () => void; onContinueToCancel: () => void }) => 
    isOpen ? (
      <div data-testid="pause-modal">
        <button onClick={onClose}>Close Pause Modal</button>
        <button onClick={onContinueToCancel}>Continue to Cancel</button>
      </div>
    ) : null,
}));

import { BillingSettingsClient } from "./billing-settings-client";
import type { Organization } from "@ghost-greeter/domain/database.types";

describe("BillingSettingsClient", () => {
  const defaultOrganization: Organization = {
    id: "org-123",
    name: "Test Organization",
    logo_url: null,
    stripe_customer_id: "cus_123",
    stripe_subscription_id: "sub_123",
    subscription_status: "active",
    blocked_countries: [],
    country_list_mode: "blocklist",
    recording_settings: {
      enabled: false,
      retention_days: 30,
      transcription_enabled: false,
      ai_summary_enabled: false,
      ai_summary_prompt_format: null,
    },
    billing_frequency: "monthly",
    purchased_seats: 3,
    has_six_month_offer: false,
    pause_ends_at: null,
    facebook_settings: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const defaultProps = {
    organization: defaultOrganization,
    usedSeats: 2,
    purchasedSeats: 3,
    storageUsedGB: 2.5,
    userId: "user-123",
    subscriptionStartDate: new Date("2024-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display - Header", () => {
    it("shows page title 'Billing'", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Billing")).toBeInTheDocument();
    });

    it("shows back link to settings page", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const backLink = screen.getByText("Back to Settings");
      expect(backLink.closest("a")).toHaveAttribute("href", "/admin/settings");
    });

    it("shows subtitle about subscription management", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Manage your subscription and payment settings/)).toBeInTheDocument();
    });
  });

  describe("Display - Subscription Info", () => {
    it("shows 'Your Subscription' heading", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Your Subscription")).toBeInTheDocument();
    });

    it("shows seat count", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // Seat count appears in subtitle
      const seatText = screen.getAllByText(/3 seats/);
      expect(seatText.length).toBeGreaterThan(0);
    });

    it("shows billing frequency", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Monthly billing/)).toBeInTheDocument();
    });

    it("shows discount percentage for non-monthly plans", () => {
      const annualOrg = { ...defaultOrganization, billing_frequency: "annual" as const };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={annualOrg}
        />
      );

      expect(screen.getByText(/35% off/)).toBeInTheDocument();
    });
  });

  describe("Display - Seat Management Section", () => {
    it("shows 'Seats' label", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Seats")).toBeInTheDocument();
    });

    it("shows seats in use count", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/2 in use/)).toBeInTheDocument();
    });

    it("shows available seats count", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/1 available/)).toBeInTheDocument();
    });

    it("shows current seat count", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // Number 3 appears multiple times (seat counter, quick buttons, etc.)
      const threeElements = screen.getAllByText("3");
      expect(threeElements.length).toBeGreaterThan(0);
    });

    it("shows seat cost per month", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // 3 seats × $49 = $147/mo - may appear multiple times
      const costElements = screen.getAllByText(/\$147/);
      expect(costElements.length).toBeGreaterThan(0);
    });

    it("shows minus and plus buttons", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByTestId("minus-icon")).toBeInTheDocument();
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    });

    it("shows quick seat selection buttons", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    });

    it("shows proration note", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Adding seats:/)).toBeInTheDocument();
      expect(screen.getByText(/Reducing seats:/)).toBeInTheDocument();
    });
  });

  describe("Display - Billing Frequency Section", () => {
    it("shows 'Billing Frequency' heading", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Billing Frequency")).toBeInTheDocument();
    });

    it("shows Monthly option", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText(/Pay month-to-month/)).toBeInTheDocument();
    });

    it("shows Annual option with savings badge", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Annual")).toBeInTheDocument();
      expect(screen.getByText("Save 35%")).toBeInTheDocument();
    });

    it("shows 6-Month option when user has the offer", () => {
      const orgWithOffer = { ...defaultOrganization, has_six_month_offer: true };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={orgWithOffer}
        />
      );

      expect(screen.getByText("6-Month")).toBeInTheDocument();
      expect(screen.getByText("Save 40%")).toBeInTheDocument();
      expect(screen.getByText("Special Offer")).toBeInTheDocument();
    });

    it("does not show 6-Month option when user does not have the offer", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.queryByText("6-Month")).not.toBeInTheDocument();
    });

    it("shows pricing for each frequency", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("$49/seat")).toBeInTheDocument();
      expect(screen.getByText("$32/seat")).toBeInTheDocument();
    });

    it("shows explanation about how frequency changes work", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/How billing frequency changes work/)).toBeInTheDocument();
    });
  });

  describe("Display - Storage Section", () => {
    it("shows 'Recording Storage' section", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // Recording Storage appears in both storage section and pricing details
      const storageHeaders = screen.getAllByText("Recording Storage");
      expect(storageHeaders.length).toBeGreaterThan(0);
    });

    it("shows storage used", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("2.5")).toBeInTheDocument();
      expect(screen.getByText("GB used")).toBeInTheDocument();
    });

    it("shows free storage included", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/5 GB free included/)).toBeInTheDocument();
    });

    it("shows 'Free' when under free limit", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Free")).toBeInTheDocument();
    });

    it("shows cost when over free limit", () => {
      render(
        <BillingSettingsClient
          {...defaultProps}
          storageUsedGB={7.5}
        />
      );

      // 7.5 - 5 = 2.5 GB billable × $0.10 = $0.25
      expect(screen.getByText(/\$0.25\/mo/)).toBeInTheDocument();
    });
  });

  describe("Display - Monthly Total Section", () => {
    it("shows 'Monthly Total' heading", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Monthly Total")).toBeInTheDocument();
    });

    it("shows total calculation label", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Agents \+ Storage \+ AI Usage/)).toBeInTheDocument();
    });
  });

  describe("Display - Billing Period", () => {
    it("shows 'Current Billing Period' label", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Current Billing Period")).toBeInTheDocument();
    });

    it("shows 'Next Invoice' label", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Next Invoice")).toBeInTheDocument();
    });
  });

  describe("Display - Pricing Details Section", () => {
    it("shows 'Pricing Details' heading", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Pricing Details")).toBeInTheDocument();
    });

    it("shows Team Seats pricing", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Team Seats")).toBeInTheDocument();
    });

    it("shows Recording Storage pricing", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // Appears in both storage usage and pricing details
      const storageHeaders = screen.getAllByText("Recording Storage");
      expect(storageHeaders.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Call Transcription pricing", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("Call Transcription")).toBeInTheDocument();
      expect(screen.getByText("$0.01")).toBeInTheDocument();
    });

    it("shows AI Call Summary pricing", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText("AI Call Summary")).toBeInTheDocument();
      expect(screen.getByText("$0.02")).toBeInTheDocument();
    });
  });

  describe("Display - Cancel Subscription Section", () => {
    it("shows 'Cancel Subscription' heading when not paused", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // Cancel Subscription appears as both heading and button
      const cancelElements = screen.getAllByText("Cancel Subscription");
      expect(cancelElements.length).toBeGreaterThan(0);
    });

    it("shows cancel button", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /Cancel Subscription/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it("shows feedback message", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByText(/we'd love to understand why/)).toBeInTheDocument();
    });
  });

  describe("Display - Paused Account", () => {
    it("shows paused banner when account is paused", () => {
      const pausedOrg = {
        ...defaultOrganization,
        subscription_status: "paused" as const,
        pause_ends_at: new Date("2024-06-01").toISOString(),
      };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={pausedOrg}
        />
      );

      expect(screen.getByText("Account Paused")).toBeInTheDocument();
    });

    it("shows resume date when paused", () => {
      const pausedOrg = {
        ...defaultOrganization,
        subscription_status: "paused" as const,
        pause_ends_at: new Date("2024-06-01").toISOString(),
      };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={pausedOrg}
        />
      );

      // The date is displayed somewhere in the paused banner
      // Just verify the banner text mentions automatic resume
      expect(screen.getByText(/automatically resume/)).toBeInTheDocument();
    });

    it("shows 'Resume Now' button when paused", () => {
      const pausedOrg = {
        ...defaultOrganization,
        subscription_status: "paused" as const,
        pause_ends_at: new Date("2024-06-01").toISOString(),
      };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={pausedOrg}
        />
      );

      expect(screen.getByRole("button", { name: /Resume Now/i })).toBeInTheDocument();
    });

    it("does not show cancel section when paused", () => {
      const pausedOrg = {
        ...defaultOrganization,
        subscription_status: "paused" as const,
        pause_ends_at: new Date("2024-06-01").toISOString(),
      };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={pausedOrg}
        />
      );

      // Cancel button should not be visible
      expect(screen.queryByRole("button", { name: /^Cancel Subscription$/i })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SEAT MANAGEMENT ACTIONS
  // ---------------------------------------------------------------------------

  describe("Seat Management Actions", () => {
    it("increments seat count when plus clicked", async () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const plusButton = screen.getByTestId("plus-icon").closest("button");
      fireEvent.click(plusButton!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/billing/update-settings",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ seatCount: 4 }),
          })
        );
      });
    });

    it("decrements seat count when minus clicked", async () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const minusButton = screen.getByTestId("minus-icon").closest("button");
      fireEvent.click(minusButton!);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/billing/update-settings",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ seatCount: 2 }),
          })
        );
      });
    });

    it("shows error when trying to reduce below used seats", async () => {
      render(<BillingSettingsClient {...defaultProps} />);

      // Click quick select button for 1 seat (but we have 2 in use)
      const button1 = screen.getByRole("button", { name: "1" });
      fireEvent.click(button1);

      // Should show error message about seats in use
      await waitFor(() => {
        expect(screen.getByText(/seats in use/)).toBeInTheDocument();
      });
    });

    it("selects seat count when quick button clicked", async () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const button5 = screen.getByRole("button", { name: "5" });
      fireEvent.click(button5);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/billing/update-settings",
          expect.objectContaining({
            body: JSON.stringify({ seatCount: 5 }),
          })
        );
      });
    });

    it("shows error when selecting quick button below used seats", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const button1 = screen.getByRole("button", { name: "1" });
      fireEvent.click(button1);

      expect(screen.getByText(/You have 2 seats in use/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // BILLING FREQUENCY ACTIONS
  // ---------------------------------------------------------------------------

  describe("Billing Frequency Actions", () => {
    it("selects Annual when clicked", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const annualLabel = screen.getByText("Annual").closest("label");
      fireEvent.click(annualLabel!);

      // Should show confirmation modal content
      expect(screen.getByText(/Switch to Annual Billing/)).toBeInTheDocument();
    });

    it("shows confirmation modal when changing frequency", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const annualLabel = screen.getByText("Annual").closest("label");
      fireEvent.click(annualLabel!);

      // Modal should appear with explanation
      expect(screen.getByText(/What will happen/)).toBeInTheDocument();
    });

    it("shows cancel button in frequency change modal", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const annualLabel = screen.getByText("Annual").closest("label");
      fireEvent.click(annualLabel!);

      // Multiple cancel buttons may exist - look for one in the modal
      const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    it("shows confirm button in frequency change modal", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const annualLabel = screen.getByText("Annual").closest("label");
      fireEvent.click(annualLabel!);

      expect(screen.getByRole("button", { name: /Confirm Change/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // MANAGE BILLING ACTION
  // ---------------------------------------------------------------------------

  describe("Manage Billing", () => {
    it("shows 'Manage Billing' button", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: /Manage Billing/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CANCEL/PAUSE ACTIONS
  // ---------------------------------------------------------------------------

  describe("Cancel/Pause Actions", () => {
    it("opens pause modal when Cancel Subscription clicked", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /Cancel Subscription/i });
      fireEvent.click(cancelButton);

      expect(screen.getByTestId("pause-modal")).toBeInTheDocument();
    });

    it("closes pause modal when close clicked", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /Cancel Subscription/i });
      fireEvent.click(cancelButton);

      const closeButton = screen.getByText("Close Pause Modal");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("pause-modal")).not.toBeInTheDocument();
    });

    it("opens cancel modal when continuing from pause modal", () => {
      render(<BillingSettingsClient {...defaultProps} />);

      const cancelButton = screen.getByRole("button", { name: /Cancel Subscription/i });
      fireEvent.click(cancelButton);

      const continueButton = screen.getByText("Continue to Cancel");
      fireEvent.click(continueButton);

      expect(screen.getByTestId("cancel-modal")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // RESUME ACCOUNT ACTIONS
  // ---------------------------------------------------------------------------

  describe("Resume Account", () => {
    it("calls resumeAccount when Resume Now clicked", async () => {
      const { resumeAccount } = await import("./actions");

      const pausedOrg = {
        ...defaultOrganization,
        subscription_status: "paused" as const,
        pause_ends_at: new Date("2024-06-01").toISOString(),
      };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={pausedOrg}
        />
      );

      const resumeButton = screen.getByRole("button", { name: /Resume Now/i });
      fireEvent.click(resumeButton);

      await waitFor(() => {
        expect(resumeAccount).toHaveBeenCalledWith({
          organizationId: "org-123",
          userId: "user-123",
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // AI USAGE DISPLAY
  // ---------------------------------------------------------------------------

  describe("AI Usage Display", () => {
    it("shows transcription usage when provided", () => {
      render(
        <BillingSettingsClient
          {...defaultProps}
          aiUsage={{
            transcriptionCost: 5.50,
            transcriptionMinutes: 550,
            summaryCost: 0,
            summaryMinutes: 0,
          }}
        />
      );

      expect(screen.getByText("550.0 min")).toBeInTheDocument();
      expect(screen.getByText("$5.50")).toBeInTheDocument();
    });

    it("shows AI summary usage when provided", () => {
      render(
        <BillingSettingsClient
          {...defaultProps}
          aiUsage={{
            transcriptionCost: 0,
            transcriptionMinutes: 0,
            summaryCost: 3.20,
            summaryMinutes: 160,
          }}
        />
      );

      expect(screen.getByText("160.0 min")).toBeInTheDocument();
      expect(screen.getByText("$3.20")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles organization with 1 seat", () => {
      render(
        <BillingSettingsClient
          {...defaultProps}
          usedSeats={1}
          purchasedSeats={1}
        />
      );

      // Should show "1 seat" (singular)
      expect(screen.getByText(/1 seat •/)).toBeInTheDocument();
    });

    it("handles organization with annual billing", () => {
      const annualOrg = { ...defaultOrganization, billing_frequency: "annual" as const };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={annualOrg}
        />
      );

      expect(screen.getByText(/Annual billing/)).toBeInTheDocument();
    });

    it("handles zero available seats", () => {
      render(
        <BillingSettingsClient
          {...defaultProps}
          usedSeats={3}
          purchasedSeats={3}
        />
      );

      expect(screen.getByText(/3 in use/)).toBeInTheDocument();
      // When all seats used, "available" message should not appear in the seat management area
      // Note: The word "available" might appear elsewhere in context
      const availableText = screen.queryByText(/\d+ available/);
      expect(availableText).toBeNull();
    });

    it("handles 6-month billing frequency display", () => {
      const sixMonthOrg = {
        ...defaultOrganization,
        billing_frequency: "six_month" as const,
        has_six_month_offer: true,
      };
      render(
        <BillingSettingsClient
          {...defaultProps}
          organization={sixMonthOrg}
        />
      );

      expect(screen.getByText(/6-Month billing/)).toBeInTheDocument();
    });
  });
});

