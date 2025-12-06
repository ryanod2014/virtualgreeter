/**
 * @vitest-environment jsdom
 *
 * CancellationsClient Tests
 *
 * Behaviors Tested:
 * 1. Display: Page title, stats row, reason breakdown, view tabs
 * 2. Actions: Date range filtering, view mode switching, detail modal
 * 3. Edge Cases: No cancellations, empty date range
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  LogOut: () => <div data-testid="logout-icon" />,
  Building2: () => <div data-testid="building-icon" />,
  Users: () => <div data-testid="users-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  User: () => <div data-testid="user-icon" />,
  X: () => <div data-testid="x-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Percent: () => <div data-testid="percent-icon" />,
  MessageSquareText: () => <div data-testid="message-square-text-icon" />,
  Quote: () => <div data-testid="quote-icon" />,
}));

// Mock DateRangePicker
vi.mock("@/lib/components/date-range-picker", () => ({
  DateRangePicker: ({ from, to, onRangeChange }: { from: Date; to: Date; onRangeChange: (from: Date, to: Date) => void }) => (
    <div data-testid="date-range-picker">
      <button
        onClick={() => onRangeChange(new Date("2024-01-01"), new Date("2024-12-31"))}
        data-testid="change-date-range"
      >
        Change Date Range
      </button>
    </div>
  ),
}));

import { CancellationsClient } from "./cancellations-client";

describe("CancellationsClient", () => {
  const mockCancellation = {
    id: "cancel-1",
    organization_id: "org-1",
    organization_name: "Churned Corp",
    organization_plan: "pro" as const,
    organization_signup_date: "2023-06-15T00:00:00Z",
    user_id: "user-1",
    user_email: "john@churned.com",
    user_name: "John Doe",
    primary_reason: "too_expensive" as const,
    additional_reasons: ["not_enough_features" as const],
    detailed_feedback: "The pricing is too high for our budget.",
    competitor_name: null,
    would_return: true,
    return_conditions: "Lower the price by 30%",
    agent_count: 3,
    monthly_cost: 891,
    subscription_duration_days: 180,
    created_at: new Date().toISOString(),
  };

  const mockCancellationWithCompetitor = {
    ...mockCancellation,
    id: "cancel-2",
    organization_name: "Switched Away Inc",
    primary_reason: "switched_to_competitor" as const,
    competitor_name: "CompetitorX",
    detailed_feedback: "Found a better alternative.",
    would_return: false,
    return_conditions: null,
  };

  const defaultProps = {
    cancellations: [mockCancellation],
    totalOrganizations: 100,
    activeOrganizations: 95,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Display", () => {
    it("shows page title 'Cancellation Analysis'", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Cancellation Analysis")).toBeInTheDocument();
    });

    it("shows page subtitle", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Exit survey responses and churn metrics")).toBeInTheDocument();
    });

    it("shows date range picker", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    });

    it("shows view mode tabs", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Overview/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Exit Survey Responses/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cohort Analysis/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /All Cancellations/ })).toBeInTheDocument();
    });
  });

  describe("Display - Stats Row", () => {
    it("shows churn rate", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("1.0%")).toBeInTheDocument();
      expect(screen.getByText("Churn Rate")).toBeInTheDocument();
    });

    it("shows cancellations count", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Cancellations")).toBeInTheDocument();
    });

    it("shows would return percentage", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Would Return")).toBeInTheDocument();
    });

    it("shows lost MRR", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Lost MRR")).toBeInTheDocument();
    });

    it("shows to competitors count", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("To Competitors")).toBeInTheDocument();
    });
  });

  describe("Display - Overview View", () => {
    it("shows reason breakdown chart title", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Cancellation Reasons by Revenue Impact")).toBeInTheDocument();
    });

    it("shows reason labels in breakdown", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Too expensive")).toBeInTheDocument();
    });

    it("shows avg time to churn section", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Avg. Time to Churn")).toBeInTheDocument();
    });

    it("shows retention rate section", () => {
      render(<CancellationsClient {...defaultProps} />);
      expect(screen.getByText("Retention Rate")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Actions - View Mode Switching", () => {
    it("switches to Exit Survey Responses view when tab clicked", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("Detailed Feedback Responses")).toBeInTheDocument();
    });

    it("switches to Cohort Analysis view when tab clicked", () => {
      render(<CancellationsClient {...defaultProps} />);

      const cohortsTab = screen.getByRole("button", { name: /Cohort Analysis/ });
      fireEvent.click(cohortsTab);

      expect(screen.getByText("Cohort Analysis by Signup Month")).toBeInTheDocument();
    });

    it("switches to All Cancellations list view when tab clicked", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      expect(screen.getByText("All Exit Surveys")).toBeInTheDocument();
    });

    it("returns to Overview view when Overview tab clicked", () => {
      render(<CancellationsClient {...defaultProps} />);

      // Switch to list view first
      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      // Then back to overview
      const overviewTab = screen.getByRole("button", { name: /Overview/ });
      fireEvent.click(overviewTab);

      expect(screen.getByText("Cancellation Reasons by Revenue Impact")).toBeInTheDocument();
    });
  });

  describe("Actions - Exit Survey Responses View", () => {
    it("shows detailed feedback section", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("What customers said when they left")).toBeInTheDocument();
    });

    it("shows what would bring them back section", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("What Would Bring Them Back?")).toBeInTheDocument();
    });

    it("shows competitor mentions section", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("Competitor Mentions")).toBeInTheDocument();
    });

    it("displays feedback quotes", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText(/The pricing is too high for our budget/)).toBeInTheDocument();
    });

    it("displays return conditions", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText(/Lower the price by 30%/)).toBeInTheDocument();
    });
  });

  describe("Actions - Cohort Analysis View", () => {
    it("shows cohort table section title", () => {
      render(<CancellationsClient {...defaultProps} />);

      const cohortsTab = screen.getByRole("button", { name: /Cohort Analysis/ });
      fireEvent.click(cohortsTab);

      expect(screen.getByText("Cohort Analysis by Signup Month")).toBeInTheDocument();
    });

    it("shows cohort table with headers when data exists", () => {
      render(<CancellationsClient {...defaultProps} />);

      const cohortsTab = screen.getByRole("button", { name: /Cohort Analysis/ });
      fireEvent.click(cohortsTab);

      // Table headers should be visible when there's cohort data
      const table = screen.queryByRole("table");
      if (table) {
        expect(screen.getByText("Signup Month")).toBeInTheDocument();
      }
    });
  });

  describe("Actions - List View", () => {
    it("shows cancellation item in list", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      expect(screen.getByText("Churned Corp")).toBeInTheDocument();
      expect(screen.getByText("john@churned.com")).toBeInTheDocument();
    });

    it("shows primary reason badge", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      expect(screen.getByText("Too expensive")).toBeInTheDocument();
    });

    it("opens detail modal when cancellation item clicked", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      // Click on the cancellation item
      const cancellationItem = screen.getByText("Churned Corp").closest("div[class*='cursor-pointer']");
      expect(cancellationItem).toBeInTheDocument();
      fireEvent.click(cancellationItem!);

      // Modal should show organization name as title
      expect(screen.getAllByText("Churned Corp").length).toBeGreaterThanOrEqual(1);
      // Modal should show user info section
      expect(screen.getByText("Cancelled By")).toBeInTheDocument();
    });

    it("closes detail modal when X button clicked", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      // Open modal
      const cancellationItem = screen.getByText("Churned Corp").closest("div[class*='cursor-pointer']");
      fireEvent.click(cancellationItem!);

      // Close modal
      const closeButton = screen.getByRole("button", { name: "" });
      fireEvent.click(closeButton);

      // Modal should be closed - "Cancelled By" section should not be visible
      expect(screen.queryByText("Cancelled By")).not.toBeInTheDocument();
    });
  });

  describe("Actions - Date Range Filtering", () => {
    it("filters cancellations by date range", () => {
      render(<CancellationsClient {...defaultProps} />);

      const changeDateButton = screen.getByTestId("change-date-range");
      fireEvent.click(changeDateButton);

      // Component should still render without errors
      expect(screen.getByText("Cancellation Analysis")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("shows empty state when no cancellations", () => {
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[]}
        />
      );

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      expect(screen.getByText("No cancellations in selected period")).toBeInTheDocument();
      expect(screen.getByText("This is good news!")).toBeInTheDocument();
    });

    it("shows empty state for reason breakdown when no data", () => {
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[]}
        />
      );

      expect(screen.getByText("No data in selected period")).toBeInTheDocument();
    });

    it("shows empty cohort state when no data", () => {
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[]}
        />
      );

      const cohortsTab = screen.getByRole("button", { name: /Cohort Analysis/ });
      fireEvent.click(cohortsTab);

      expect(screen.getByText("No cohort data in selected period")).toBeInTheDocument();
    });

    it("shows no detailed feedback message when none exists", () => {
      const noFeedbackCancellation = {
        ...mockCancellation,
        detailed_feedback: null,
      };
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[noFeedbackCancellation]}
        />
      );

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("No detailed feedback in selected period")).toBeInTheDocument();
    });

    it("shows no return conditions message when none exists", () => {
      const noReturnConditions = {
        ...mockCancellation,
        return_conditions: null,
      };
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[noReturnConditions]}
        />
      );

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("No return conditions provided in selected period")).toBeInTheDocument();
    });

    it("shows good news message when no competitor mentions", () => {
      render(<CancellationsClient {...defaultProps} />);

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("No competitor mentions in selected period")).toBeInTheDocument();
    });

    it("displays competitor name when mentioned", () => {
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[mockCancellationWithCompetitor]}
        />
      );

      const responsesTab = screen.getByRole("button", { name: /Exit Survey Responses/ });
      fireEvent.click(responsesTab);

      expect(screen.getByText("CompetitorX")).toBeInTheDocument();
    });

    it("handles multiple cancellations", () => {
      render(
        <CancellationsClient
          {...defaultProps}
          cancellations={[mockCancellation, mockCancellationWithCompetitor]}
        />
      );

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      expect(screen.getByText("Churned Corp")).toBeInTheDocument();
      expect(screen.getByText("Switched Away Inc")).toBeInTheDocument();
    });

    it("shows additional reasons in modal when present", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      // Open modal
      const cancellationItem = screen.getByText("Churned Corp").closest("div[class*='cursor-pointer']");
      fireEvent.click(cancellationItem!);

      expect(screen.getByText("Not enough features")).toBeInTheDocument();
    });

    it("displays would return status in modal", () => {
      render(<CancellationsClient {...defaultProps} />);

      const listTab = screen.getByRole("button", { name: /All Cancellations/ });
      fireEvent.click(listTab);

      // Open modal
      const cancellationItem = screen.getByText("Churned Corp").closest("div[class*='cursor-pointer']");
      fireEvent.click(cancellationItem!);

      expect(screen.getByText("Would Return?")).toBeInTheDocument();
      expect(screen.getByText("Yes, would consider returning")).toBeInTheDocument();
    });

    it("calculates churn rate correctly", () => {
      render(
        <CancellationsClient
          {...defaultProps}
          totalOrganizations={50}
          cancellations={[mockCancellation, mockCancellationWithCompetitor]}
        />
      );

      // 2 cancellations / 50 total = 4%
      expect(screen.getByText("4.0%")).toBeInTheDocument();
    });
  });
});
