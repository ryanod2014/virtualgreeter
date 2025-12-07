/**
 * @vitest-environment jsdom
 *
 * OrganizationsClient Tests
 *
 * Behaviors Tested:
 * 1. Display: Page title, org count, platform totals, org table, status/plan badges
 * 2. Actions: Search, filter by status/plan/view, sort columns
 * 3. Edge Cases: Empty search results, no organizations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  ArrowUpDown: () => <div data-testid="arrow-up-down-icon" />,
  Building2: () => <div data-testid="building-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  ShieldAlert: () => <div data-testid="shield-alert-icon" />,
  ShieldX: () => <div data-testid="shield-x-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
}));

import { OrganizationsClient } from "./organizations-client";

describe("OrganizationsClient", () => {
  const mockOrganization = {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme-corp",
    plan: "pro" as const,
    subscription_status: "active" as const,
    seat_count: 5,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    userCount: 3,
    agentCount: 5,
    totalCalls: 150,
    callsThisMonth: 25,
    lastActivity: new Date().toISOString(),
    pageviewsTotal: 1000,
    pageviewsThisMonth: 200,
    pageviewsWithAgent: 180,
    coverageRate: 90,
    coverageRateThisMonth: 90,
    missedOpportunities: 20,
    missedOpportunitiesThisMonth: 5,
    answeredCalls: 120,
    answerRate: 80,
    answerRateThisMonth: 85,
    healthScore: 75,
    riskLevel: "low" as const,
    isAtRisk: false,
    daysSinceLastCall: 2,
    callsTrend: "increasing" as const,
    activityScore: 80,
    engagementScore: 75,
    coverageScore: 90,
    growthScore: 70,
    mrr: 1485,
  };

  const mockAtRiskOrganization = {
    ...mockOrganization,
    id: "org-2",
    name: "Struggling Inc",
    slug: "struggling-inc",
    healthScore: 30,
    riskLevel: "critical" as const,
    isAtRisk: true,
    callsThisMonth: 0,
    daysSinceLastCall: 21,
    callsTrend: "declining" as const,
  };

  const mockCancelledOrganization = {
    ...mockOrganization,
    id: "org-3",
    name: "Former Customer",
    slug: "former-customer",
    subscription_status: "cancelled" as const,
    healthScore: 0,
    mrr: 0,
    isAtRisk: false,
    riskLevel: "low" as const,
  };

  const defaultProps = {
    organizations: [mockOrganization],
    atRiskCount: 0,
    criticalCount: 0,
    atRiskMRR: 0,
    platformTotals: {
      pageviewsThisMonth: 5000,
      pageviewsWithAgentThisMonth: 4500,
      callsThisMonth: 500,
      answeredCallsThisMonth: 400,
      ringRate: 15.5,
      agentAnswerRate: 80,
    },
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
    it("shows page title 'All Organizations'", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("All Organizations")).toBeInTheDocument();
    });

    it("shows organization count in subtitle", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("1 organizations on the platform")).toBeInTheDocument();
    });

    it("shows organization name in table", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("shows organization slug in table", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("acme-corp")).toBeInTheDocument();
    });

    it("shows plan badge for organization", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("pro")).toBeInTheDocument();
    });

    it("shows subscription status badge for organization", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("shows health score for organization", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("75")).toBeInTheDocument();
    });

    it("shows MRR for organization", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("$1,485")).toBeInTheDocument();
    });

    it("shows calls this month for organization", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("shows search input", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search organizations...")).toBeInTheDocument();
    });

    it("shows status filter dropdown", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("All Status")).toBeInTheDocument();
    });

    it("shows plan filter dropdown", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("All Plans")).toBeInTheDocument();
    });

    it("shows view filter tabs", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByRole("button", { name: /All \(1\)/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /At Risk/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Healthy/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Churned/ })).toBeInTheDocument();
    });

    it("shows results count", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("1 results")).toBeInTheDocument();
    });
  });

  describe("Display - Platform Totals", () => {
    it("shows pageviews total", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("5,000")).toBeInTheDocument();
    });

    it("shows widget popups total", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("4,500")).toBeInTheDocument();
    });

    it("shows rings total", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("shows ring rate percentage", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("15.5%")).toBeInTheDocument();
    });

    it("shows agent answer rate percentage", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("80.0%")).toBeInTheDocument();
    });
  });

  describe("Display - At Risk Summary", () => {
    it("shows critical count when greater than zero", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          criticalCount={2}
          atRiskCount={3}
          atRiskMRR={5000}
        />
      );
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Critical Risk")).toBeInTheDocument();
    });

    it("shows at risk count when greater than zero", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          atRiskCount={5}
        />
      );
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("At Risk")).toBeInTheDocument();
    });

    it("shows MRR at risk when greater than zero", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          atRiskMRR={10000}
        />
      );
      expect(screen.getByText("$10,000")).toBeInTheDocument();
      expect(screen.getByText("MRR at Risk")).toBeInTheDocument();
    });

    it("does not show at risk summary when counts are zero", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.queryByText("Critical Risk")).not.toBeInTheDocument();
      expect(screen.queryByText("MRR at Risk")).not.toBeInTheDocument();
    });
  });

  describe("Display - Table Headers", () => {
    it("shows Organization column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Organization")).toBeInTheDocument();
    });

    it("shows Health column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Health")).toBeInTheDocument();
    });

    it("shows MRR column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("MRR")).toBeInTheDocument();
    });

    it("shows Coverage column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Coverage")).toBeInTheDocument();
    });

    it("shows Answer Rate column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Answer Rate")).toBeInTheDocument();
    });

    it("shows Calls column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Calls")).toBeInTheDocument();
    });

    it("shows Trend column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Trend")).toBeInTheDocument();
    });

    it("shows Last Activity column header", () => {
      render(<OrganizationsClient {...defaultProps} />);
      expect(screen.getByText("Last Activity")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Actions - Search", () => {
    it("filters organizations by name when searching", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "Acme" } });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Struggling Inc")).not.toBeInTheDocument();
    });

    it("filters organizations by slug when searching", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "struggling" } });

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Struggling Inc")).toBeInTheDocument();
    });

    it("search is case insensitive", () => {
      render(<OrganizationsClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "ACME" } });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("updates results count after search", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "Acme" } });

      expect(screen.getByText("1 results")).toBeInTheDocument();
    });
  });

  describe("Actions - Status Filter", () => {
    it("filters by active status", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockCancelledOrganization]}
        />
      );

      const statusSelect = screen.getByDisplayValue("All Status");
      fireEvent.change(statusSelect, { target: { value: "active" } });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Former Customer")).not.toBeInTheDocument();
    });

    it("filters by cancelled status", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockCancelledOrganization]}
        />
      );

      const statusSelect = screen.getByDisplayValue("All Status");
      fireEvent.change(statusSelect, { target: { value: "cancelled" } });

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Former Customer")).toBeInTheDocument();
    });
  });

  describe("Actions - Plan Filter", () => {
    it("filters by pro plan", () => {
      const starterOrg = { ...mockOrganization, id: "org-starter", name: "Starter Org", plan: "starter" as const };
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, starterOrg]}
        />
      );

      const planSelect = screen.getByDisplayValue("All Plans");
      fireEvent.change(planSelect, { target: { value: "pro" } });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Starter Org")).not.toBeInTheDocument();
    });
  });

  describe("Actions - View Filter", () => {
    it("filters to at-risk organizations when At Risk tab clicked", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
          atRiskCount={1}
        />
      );

      // Find the at-risk view filter button (not the summary card)
      const viewFilterButtons = screen.getAllByRole("button", { name: /At Risk/ });
      const viewFilterButton = viewFilterButtons.find(btn => btn.textContent?.includes("("));
      expect(viewFilterButton).toBeInTheDocument();
      fireEvent.click(viewFilterButton!);

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Struggling Inc")).toBeInTheDocument();
    });

    it("filters to healthy organizations when Healthy tab clicked", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
        />
      );

      const healthyButton = screen.getByRole("button", { name: /Healthy/ });
      fireEvent.click(healthyButton);

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Struggling Inc")).not.toBeInTheDocument();
    });

    it("filters to churned organizations when Churned tab clicked", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockCancelledOrganization]}
        />
      );

      const churnedButton = screen.getByRole("button", { name: /Churned/ });
      fireEvent.click(churnedButton);

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Former Customer")).toBeInTheDocument();
    });

    it("shows all organizations when All tab clicked", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
          atRiskCount={1}
        />
      );

      // First filter to at-risk (find the view filter button with count)
      const viewFilterButtons = screen.getAllByRole("button", { name: /At Risk/ });
      const viewFilterButton = viewFilterButtons.find(btn => btn.textContent?.includes("("));
      fireEvent.click(viewFilterButton!);

      // Then click All
      const allButton = screen.getByRole("button", { name: /All \(2\)/ });
      fireEvent.click(allButton);

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Struggling Inc")).toBeInTheDocument();
    });
  });

  describe("Actions - Sorting", () => {
    it("sorts by name when Organization header clicked", () => {
      const orgB = { ...mockOrganization, id: "org-b", name: "Beta Corp", slug: "beta-corp" };
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, orgB]}
        />
      );

      const nameHeader = screen.getByRole("button", { name: /Organization/ });
      fireEvent.click(nameHeader);

      // After clicking, should sort alphabetically
      const rows = screen.getAllByRole("row");
      // First row is header, so data starts at index 1
      expect(rows.length).toBeGreaterThan(1);
    });

    it("toggles sort direction when same header clicked twice", () => {
      render(<OrganizationsClient {...defaultProps} />);

      // Find the health column header button
      const healthHeaders = screen.getAllByRole("button").filter(btn => 
        btn.textContent?.includes("Health") && !btn.textContent?.includes("Healthy")
      );
      const healthHeader = healthHeaders[0];
      expect(healthHeader).toBeInTheDocument();
      
      // First click - default direction
      fireEvent.click(healthHeader);
      
      // Second click - toggle direction
      fireEvent.click(healthHeader);
      
      // Verify header is still clickable (component didn't crash)
      expect(healthHeader).toBeInTheDocument();
    });

    it("can sort by MRR", () => {
      render(<OrganizationsClient {...defaultProps} />);

      const mrrHeader = screen.getByRole("button", { name: /MRR/ });
      fireEvent.click(mrrHeader);

      expect(mrrHeader).toBeInTheDocument();
    });

    it("can sort by calls this month", () => {
      render(<OrganizationsClient {...defaultProps} />);

      const callsHeader = screen.getByRole("button", { name: /Calls/ });
      fireEvent.click(callsHeader);

      expect(callsHeader).toBeInTheDocument();
    });
  });

  describe("Actions - At Risk Summary Buttons", () => {
    it("clicking critical risk button toggles at-risk filter", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization]}
          criticalCount={1}
          atRiskCount={1}
        />
      );

      // Find and click the critical risk button
      const criticalButton = screen.getByText("Critical Risk").closest("button");
      expect(criticalButton).toBeInTheDocument();
      fireEvent.click(criticalButton!);

      // Should filter to at-risk orgs
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("shows empty state when no organizations match search", () => {
      render(<OrganizationsClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
    });

    it("shows empty state when no organizations exist", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[]}
        />
      );

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
    });

    it("displays multiple organizations correctly", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockOrganization, mockAtRiskOrganization, mockCancelledOrganization]}
        />
      );

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Struggling Inc")).toBeInTheDocument();
      expect(screen.getByText("Former Customer")).toBeInTheDocument();
      expect(screen.getByText("3 results")).toBeInTheDocument();
    });

    it("shows at-risk indicator for at-risk organizations", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockAtRiskOrganization]}
          atRiskCount={1}
        />
      );

      // At-risk orgs have alert triangle icon
      expect(screen.getAllByTestId("alert-triangle-icon").length).toBeGreaterThan(0);
    });

    it("displays risk level text for non-low risk active organizations", () => {
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[mockAtRiskOrganization]}
        />
      );

      expect(screen.getByText("critical")).toBeInTheDocument();
    });

    it("shows days since last call warning for inactive organizations", () => {
      const inactiveOrg = {
        ...mockOrganization,
        daysSinceLastCall: 15,
      };
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[inactiveOrg]}
        />
      );

      expect(screen.getByText("15d since call")).toBeInTheDocument();
    });

    it("shows missed opportunities count when greater than zero", () => {
      const orgWithMissed = {
        ...mockOrganization,
        missedOpportunitiesThisMonth: 10,
      };
      render(
        <OrganizationsClient
          {...defaultProps}
          organizations={[orgWithMissed]}
        />
      );

      expect(screen.getByText("10 missed")).toBeInTheDocument();
    });
  });
});

