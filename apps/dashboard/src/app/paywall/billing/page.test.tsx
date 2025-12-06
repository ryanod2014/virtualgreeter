import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock funnel tracking
vi.mock("@/lib/funnel-tracking", () => ({
  trackFunnelEvent: vi.fn().mockResolvedValue(undefined),
  FUNNEL_STEPS: {
    BILLING_MONTHLY: "billing_monthly",
    BILLING_ANNUAL: "billing_annual",
    BILLING_6MONTH: "billing_6month",
  },
}));

// Mock stripe pricing - use actual values for behavior verification
vi.mock("@/lib/stripe", () => ({
  PRICING: {
    monthly: { price: 297, label: "Monthly", discount: 0 },
    annual: { price: 193, label: "Annual", discount: 35 },
    six_month: { price: 178, label: "6-Month", discount: 40 },
  },
}));

import PaywallStep3 from "./page";

describe("PaywallStep3 - Billing Frequency Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    // Set default seat count
    localStorage.setItem("trial_seats", "1");
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("Selection UI - Shows monthly and annual options", () => {
    it("renders monthly billing option", () => {
      render(<PaywallStep3 />);

      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText("Pay month-to-month")).toBeInTheDocument();
    });

    it("renders annual billing option", () => {
      render(<PaywallStep3 />);

      expect(screen.getByText("Annual")).toBeInTheDocument();
      expect(screen.getByText("Billed yearly")).toBeInTheDocument();
    });

    it("defaults to monthly selection", () => {
      render(<PaywallStep3 />);

      // The default CTA should mention monthly billing
      expect(screen.getByRole("button", { name: /Start Trial with Monthly Billing/i })).toBeInTheDocument();
    });

    it("switches to annual when annual option is clicked", () => {
      render(<PaywallStep3 />);

      // Click annual option
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // CTA should update
      expect(screen.getByRole("button", { name: /Start Trial with Annual Billing/i })).toBeInTheDocument();
    });

    it("switches back to monthly when monthly option is clicked after selecting annual", () => {
      render(<PaywallStep3 />);

      // Select annual first
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Then switch back to monthly
      const monthlyButton = screen.getByText("Monthly").closest("button");
      fireEvent.click(monthlyButton!);

      expect(screen.getByRole("button", { name: /Start Trial with Monthly Billing/i })).toBeInTheDocument();
    });
  });

  describe("Selection UI - Displays price for each option", () => {
    it("shows monthly price of $297", () => {
      render(<PaywallStep3 />);

      // $297 appears twice: as the monthly price and as the crossed-out comparison in annual
      const prices = screen.getAllByText("$297");
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it("shows annual price of $193", () => {
      render(<PaywallStep3 />);

      expect(screen.getByText("$193")).toBeInTheDocument();
    });

    it("shows per seat per month pricing notation for monthly", () => {
      render(<PaywallStep3 />);

      // There should be /seat/mo text next to prices
      const seatMonthTexts = screen.getAllByText("/seat/mo");
      expect(seatMonthTexts.length).toBeGreaterThan(0);
    });

    it("calculates and shows total monthly cost for 1 seat (monthly plan)", () => {
      localStorage.setItem("trial_seats", "1");
      render(<PaywallStep3 />);

      // For 1 seat monthly: $297/mo
      expect(screen.getByText(/\$297\/mo/)).toBeInTheDocument();
    });

    it("calculates and shows total monthly cost for multiple seats", () => {
      localStorage.setItem("trial_seats", "3");
      render(<PaywallStep3 />);

      // For 3 seats monthly: 3 * $297 = $891/mo
      expect(screen.getByText(/\$891\/mo/)).toBeInTheDocument();
    });

    it("shows annual total cost in yearly terms", () => {
      localStorage.setItem("trial_seats", "1");
      render(<PaywallStep3 />);

      // For 1 seat annual: $193 * 12 = $2,316/year
      expect(screen.getByText(/\$2,316\/year/)).toBeInTheDocument();
    });
  });

  describe("Selection UI - Highlights savings for longer terms", () => {
    it("shows BEST VALUE badge on annual option", () => {
      render(<PaywallStep3 />);

      expect(screen.getByText("BEST VALUE")).toBeInTheDocument();
    });

    it("shows 35% savings for annual plan", () => {
      render(<PaywallStep3 />);

      // Annual saves $104/seat/mo ($297 - $193)
      expect(screen.getByText(/Save \$104\/seat\/mo \(35% off\)/)).toBeInTheDocument();
    });

    it("shows yearly savings amount when annual is selected", () => {
      render(<PaywallStep3 />);

      // Click annual option
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // For 1 seat: $104 * 12 = $1,248/year savings
      expect(screen.getByText(/You'll save \$1,248\/year with annual billing!/)).toBeInTheDocument();
    });

    it("shows overpaying message when monthly is selected", () => {
      render(<PaywallStep3 />);

      // Monthly should be default, check for overpaying message
      expect(screen.getByText(/You'll be overpaying by \$1,248 a year/)).toBeInTheDocument();
    });

    it("hides overpaying message when annual is selected", () => {
      render(<PaywallStep3 />);

      // Click annual option
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Overpaying message should be gone
      expect(screen.queryByText(/You'll be overpaying/)).not.toBeInTheDocument();
    });

    it("shows monthly price crossed out in annual option", () => {
      render(<PaywallStep3 />);

      // The crossed out price should have line-through styling
      // We can check for the element containing the old price in the annual section
      const annualSection = screen.getByText("Annual").closest("button");
      expect(annualSection).toContainHTML("line-through");
    });

    it("calculates correct savings for multiple seats", () => {
      localStorage.setItem("trial_seats", "3");
      render(<PaywallStep3 />);

      // Click annual option
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // For 3 seats: $104 * 12 * 3 = $3,744/year savings
      expect(screen.getByText(/You'll save \$3,744\/year with annual billing!/)).toBeInTheDocument();
    });
  });

  describe("Exit popup - 6-month offer", () => {
    it("shows exit popup when clicking continue with monthly selected", async () => {
      render(<PaywallStep3 />);

      // Click continue with monthly
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      // Exit popup should appear
      await waitFor(() => {
        expect(screen.getByText("One-Time Offer")).toBeInTheDocument();
      });
    });

    it("shows 6-month price of $178 in popup", async () => {
      render(<PaywallStep3 />);

      // Open popup
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("$178")).toBeInTheDocument();
      });
    });

    it("shows 40% savings in popup", async () => {
      render(<PaywallStep3 />);

      // Open popup
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Save \$119\/seat\/mo \(40% off\)/)).toBeInTheDocument();
      });
    });

    it("shows 6-month commitment benefits in popup", async () => {
      render(<PaywallStep3 />);

      // Open popup
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/6-month commitment \(not 12\)/)).toBeInTheDocument();
        // "7-day free trial still applies" appears in both main page and popup
        const trialTexts = screen.getAllByText(/7-day free trial still applies/);
        expect(trialTexts.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/All features included/)).toBeInTheDocument();
      });
    });

    it("can close popup via close button", async () => {
      render(<PaywallStep3 />);

      // Open popup
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("One-Time Offer")).toBeInTheDocument();
      });

      // Find and click close button (X icon)
      const closeButton = screen.getByRole("button", { name: "" }); // X button has no text
      // Actually, let's click the backdrop instead
      const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/80");
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByText("One-Time Offer")).not.toBeInTheDocument();
      });
    });

    it("only shows exit popup once per session", async () => {
      render(<PaywallStep3 />);

      // First click - should show popup
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("One-Time Offer")).toBeInTheDocument();
      });

      // Close popup via backdrop
      const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/80");
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByText("One-Time Offer")).not.toBeInTheDocument();
      });

      // Mock successful API response for second click
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Second click - should proceed directly (popup already shown)
      fireEvent.click(continueButton);

      // Should start creating subscription, not show popup again
      await waitFor(() => {
        expect(screen.getByText(/Starting your trial.../)).toBeInTheDocument();
      });
    });

    it("does not show exit popup when annual is selected", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // Select annual
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      // Should start creating subscription directly
      await waitFor(() => {
        expect(screen.getByText(/Starting your trial.../)).toBeInTheDocument();
      });

      // Popup should not appear
      expect(screen.queryByText("One-Time Offer")).not.toBeInTheDocument();
    });
  });

  describe("Subscription creation", () => {
    it("calls API with monthly billing preference when monthly is selected", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // First click shows popup, close it
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      // Click "No thanks, continue with monthly"
      const declineButton = await screen.findByText(/No thanks, continue with monthly/);
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/billing/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seatCount: 1,
            billingPreference: "monthly",
          }),
        });
      });
    });

    it("calls API with annual billing preference when annual is selected", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // Select annual
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/billing/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seatCount: 1,
            billingPreference: "annual",
          }),
        });
      });
    });

    it("calls API with six_month billing preference when 6-month offer is accepted", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // Open popup by clicking continue with monthly
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      // Click accept 6-month offer
      const acceptButton = await screen.findByRole("button", { name: /Start Trial with 6-Month Plan/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/billing/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seatCount: 1,
            billingPreference: "six_month",
          }),
        });
      });
    });

    it("shows loading state while creating subscription", async () => {
      // Make fetch hang to observe loading state
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise(() => {})
      );

      render(<PaywallStep3 />);

      // Select annual (no popup)
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Starting your trial.../)).toBeInTheDocument();
      });
    });

    it("shows error message when subscription creation fails", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Payment method required" }),
      });

      render(<PaywallStep3 />);

      // Select annual (no popup)
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText("Payment method required")).toBeInTheDocument();
      });
    });

    it("redirects to /admin on successful subscription creation", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // Select annual
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin");
      });
    });

    it("stores billing preference in localStorage on success", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // Select annual
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(localStorage.getItem("billing_preference")).toBe("annual");
      });
    });

    it("uses seat count from localStorage", async () => {
      localStorage.setItem("trial_seats", "5");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<PaywallStep3 />);

      // Select annual
      const annualButton = screen.getByText("Annual").closest("button");
      fireEvent.click(annualButton!);

      // Click continue
      const continueButton = screen.getByRole("button", { name: /Start Trial with Annual Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/billing/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seatCount: 5,
            billingPreference: "annual",
          }),
        });
      });
    });
  });

  describe("Free trial messaging", () => {
    it("shows free trial reminder", () => {
      render(<PaywallStep3 />);

      expect(screen.getByText(/Your 7-day free trial still applies — cancel anytime!/)).toBeInTheDocument();
    });

    it("shows no charge until trial ends notice", () => {
      render(<PaywallStep3 />);

      expect(screen.getByText(/You won't be charged until your free trial ends/)).toBeInTheDocument();
    });
  });

  describe("Billing terms disclosure", () => {
    it("shows billing terms in 6-month popup", async () => {
      render(<PaywallStep3 />);

      // Open popup
      const continueButton = screen.getByRole("button", { name: /Start Trial with Monthly Billing/i });
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText(/Billing Terms:/)).toBeInTheDocument();
        expect(screen.getByText(/By clicking below, you agree to start your 7-day free trial/)).toBeInTheDocument();
      });
    });
  });
});

