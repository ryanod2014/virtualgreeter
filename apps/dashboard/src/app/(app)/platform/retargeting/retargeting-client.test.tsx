/**
 * @vitest-environment jsdom
 *
 * RetargetingClient Tests
 *
 * Behaviors Tested:
 * 1. Display: Page title, summary cards, pixel config form, organizations table
 * 2. Actions: Toggle pixel, save settings, toggle org retargeting, search, filter
 * 3. Edge Cases: No organizations, pixel not configured warning
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Target: () => <div data-testid="target-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Building2: () => <div data-testid="building-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
}));

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

import { RetargetingClient } from "./retargeting-client";

describe("RetargetingClient", () => {
  const mockPixelSettings = {
    enabled: false,
    pixel_id: null as string | null,
    access_token: null as string | null,
    test_event_code: null as string | null,
  };

  const mockActivePixelSettings = {
    enabled: true,
    pixel_id: "123456789012345",
    access_token: "EAAxxxxxxxxxxxxx",
    test_event_code: null as string | null,
  };

  const mockOrganization = {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme-corp",
    plan: "pro" as const,
    subscription_status: "active" as const,
    greetnow_retargeting_enabled: false,
    created_at: "2024-01-15T00:00:00Z",
    totalCalls: 100,
    completedCalls: 80,
    pageviews: 5000,
  };

  const mockEnabledOrganization = {
    ...mockOrganization,
    id: "org-2",
    name: "Enabled Inc",
    slug: "enabled-inc",
    greetnow_retargeting_enabled: true,
  };

  const defaultProps = {
    pixelSettings: mockPixelSettings,
    organizations: [mockOrganization],
    enabledCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for upsert
    mockSupabase.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Display", () => {
    it("shows page title 'B2B Retargeting Pixel'", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("B2B Retargeting Pixel")).toBeInTheDocument();
    });

    it("shows page subtitle", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText(/Configure GreetNow's Facebook pixel to retarget/)).toBeInTheDocument();
    });
  });

  describe("Display - Summary Cards", () => {
    it("shows 'Not Configured' when pixel not configured", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Not Configured")).toBeInTheDocument();
    });

    it("shows 'Active' when pixel is configured and enabled", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
        />
      );
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows orgs with retargeting count", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, mockEnabledOrganization]}
          enabledCount={1}
        />
      );
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    it("shows events tracked info", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("WidgetView, CallStarted")).toBeInTheDocument();
    });

    it("shows Pixel Status label", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Pixel Status")).toBeInTheDocument();
    });

    it("shows Orgs with Retargeting label", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Orgs with Retargeting")).toBeInTheDocument();
    });

    it("shows Events Tracked label", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Events Tracked")).toBeInTheDocument();
    });
  });

  describe("Display - Pixel Configuration Form", () => {
    it("shows Facebook Pixel Configuration section title", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Facebook Pixel Configuration")).toBeInTheDocument();
    });

    it("shows how it works info box", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText(/How it works:/)).toBeInTheDocument();
    });

    it("shows link to Facebook Events Manager", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Open Facebook Events Manager")).toBeInTheDocument();
    });

    it("shows Enable Retargeting Pixel toggle", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Enable Retargeting Pixel")).toBeInTheDocument();
    });

    it("shows Pixel ID input", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("123456789012345")).toBeInTheDocument();
    });

    it("shows Access Token input", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("••••••••••••••••")).toBeInTheDocument();
    });

    it("shows Test Event Code input", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("TEST12345")).toBeInTheDocument();
    });

    it("shows Save Pixel Settings button", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Save Pixel Settings")).toBeInTheDocument();
    });

    it("disables save button when no changes", () => {
      render(<RetargetingClient {...defaultProps} />);
      const saveButton = screen.getByText("Save Pixel Settings");
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Display - Organizations Table", () => {
    it("shows Organizations section title", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Organizations")).toBeInTheDocument();
    });

    it("shows search input for organizations", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search organizations...")).toBeInTheDocument();
    });

    it("shows 'Show only enabled' checkbox", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Show only enabled")).toBeInTheDocument();
    });

    it("shows organization name in table", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("shows organization slug in table", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("acme-corp")).toBeInTheDocument();
    });

    it("shows subscription status badge", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("shows pageviews count", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("5,000")).toBeInTheDocument();
    });

    it("shows completed calls count", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("80")).toBeInTheDocument();
    });

    it("shows retargeting toggle for each org", () => {
      render(<RetargetingClient {...defaultProps} />);
      // There's the enable toggle plus one per org - at least 2 switches
      const toggles = screen.getAllByRole("switch");
      expect(toggles.length).toBeGreaterThanOrEqual(2);
    });

    it("shows table headers", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Pageviews")).toBeInTheDocument();
      expect(screen.getByText("Calls")).toBeInTheDocument();
      expect(screen.getByText("Retargeting")).toBeInTheDocument();
    });
  });

  describe("Display - Warning States", () => {
    it("shows pixel not configured warning when pixel not set up", () => {
      render(<RetargetingClient {...defaultProps} />);
      expect(screen.getByText("Pixel not configured")).toBeInTheDocument();
      expect(screen.getByText("Configure the Facebook pixel above before enabling retargeting for organizations.")).toBeInTheDocument();
    });

    it("does not show warning when pixel is configured", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
        />
      );
      expect(screen.queryByText("Pixel not configured")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Actions - Pixel Configuration", () => {
    it("enables save button when pixel toggle changed", () => {
      render(<RetargetingClient {...defaultProps} />);

      // Click the first switch (the enable toggle)
      const toggles = screen.getAllByRole("switch");
      const enableToggle = toggles[0]; // First switch is the enable retargeting toggle
      fireEvent.click(enableToggle);

      const saveButton = screen.getByText("Save Pixel Settings");
      expect(saveButton).not.toBeDisabled();
    });

    it("enables save button when pixel ID entered", () => {
      render(<RetargetingClient {...defaultProps} />);

      const pixelIdInput = screen.getByPlaceholderText("123456789012345");
      fireEvent.change(pixelIdInput, { target: { value: "123456789" } });

      const saveButton = screen.getByText("Save Pixel Settings");
      expect(saveButton).not.toBeDisabled();
    });

    it("enables save button when access token entered", () => {
      render(<RetargetingClient {...defaultProps} />);

      const tokenInput = screen.getByPlaceholderText("••••••••••••••••");
      fireEvent.change(tokenInput, { target: { value: "EAAxxxxxx" } });

      const saveButton = screen.getByText("Save Pixel Settings");
      expect(saveButton).not.toBeDisabled();
    });

    it("calls supabase upsert when save clicked", async () => {
      render(<RetargetingClient {...defaultProps} />);

      const pixelIdInput = screen.getByPlaceholderText("123456789012345");
      fireEvent.change(pixelIdInput, { target: { value: "123456789" } });

      const saveButton = screen.getByText("Save Pixel Settings");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith("platform_settings");
      });
    });

    it("shows success message after successful save", async () => {
      render(<RetargetingClient {...defaultProps} />);

      const pixelIdInput = screen.getByPlaceholderText("123456789012345");
      fireEvent.change(pixelIdInput, { target: { value: "123456789" } });

      const saveButton = screen.getByText("Save Pixel Settings");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
      });
    });

    it("shows error message when save fails", async () => {
      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
      });

      render(<RetargetingClient {...defaultProps} />);

      const pixelIdInput = screen.getByPlaceholderText("123456789012345");
      fireEvent.change(pixelIdInput, { target: { value: "123456789" } });

      const saveButton = screen.getByText("Save Pixel Settings");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to save settings. Please try again.")).toBeInTheDocument();
      });
    });
  });

  describe("Actions - Organization Toggle", () => {
    it("disables org toggle when pixel not configured", () => {
      render(<RetargetingClient {...defaultProps} />);

      // Get all switches - first is enable toggle, second is org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      expect(orgToggle).toHaveClass("opacity-50");
    });

    it("enables org toggle when pixel is configured", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
        />
      );

      // Get all switches - first is enable toggle, second is org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      expect(orgToggle).not.toHaveClass("opacity-50");
    });

    it("calls supabase update when org toggle clicked", async () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
        />
      );

      // Get all switches - first is enable toggle, second is org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      fireEvent.click(orgToggle);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith("organizations");
      });
    });

    it("updates enabled count when org toggled on", async () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
        />
      );

      // Initially 0 / 1
      expect(screen.getByText("0 / 1")).toBeInTheDocument();

      // Get all switches - first is enable toggle, second is org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      fireEvent.click(orgToggle);

      await waitFor(() => {
        expect(screen.getByText("1 / 1")).toBeInTheDocument();
      });
    });
  });

  describe("Actions - Search", () => {
    it("filters organizations by name", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, mockEnabledOrganization]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "Acme" } });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.queryByText("Enabled Inc")).not.toBeInTheDocument();
    });

    it("filters organizations by slug", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, mockEnabledOrganization]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "enabled" } });

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Enabled Inc")).toBeInTheDocument();
    });

    it("search is case insensitive", () => {
      render(<RetargetingClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "ACME" } });

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  describe("Actions - Show Only Enabled Filter", () => {
    it("filters to show only enabled orgs when checkbox checked", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, mockEnabledOrganization]}
          enabledCount={1}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.getByText("Enabled Inc")).toBeInTheDocument();
    });

    it("shows all orgs when checkbox unchecked", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, mockEnabledOrganization]}
          enabledCount={1}
        />
      );

      // Check then uncheck
      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Enabled Inc")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("shows empty state when no organizations found", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[]}
        />
      );

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
    });

    it("shows empty state when search has no matches", () => {
      render(<RetargetingClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search organizations...");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(screen.getByText("No organizations found")).toBeInTheDocument();
    });

    it("handles multiple organizations", () => {
      const org3 = { ...mockOrganization, id: "org-3", name: "Third Corp", slug: "third-corp" };
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, mockEnabledOrganization, org3]}
          enabledCount={1}
        />
      );

      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
      expect(screen.getByText("Enabled Inc")).toBeInTheDocument();
      expect(screen.getByText("Third Corp")).toBeInTheDocument();
      expect(screen.getByText("1 / 3")).toBeInTheDocument();
    });

    it("displays different subscription statuses correctly", () => {
      const cancelledOrg = {
        ...mockOrganization,
        id: "org-cancelled",
        name: "Cancelled Corp",
        subscription_status: "cancelled" as const,
      };
      render(
        <RetargetingClient
          {...defaultProps}
          organizations={[mockOrganization, cancelledOrg]}
        />
      );

      expect(screen.getByText("active")).toBeInTheDocument();
      expect(screen.getByText("cancelled")).toBeInTheDocument();
    });

    it("shows toggle title when pixel not configured", () => {
      render(<RetargetingClient {...defaultProps} />);

      // Second switch is the org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      expect(orgToggle).toHaveAttribute("title", "Configure pixel settings first");
    });

    it("shows correct toggle title when retargeting enabled", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
          organizations={[mockEnabledOrganization]}
        />
      );

      // Second switch is the org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      expect(orgToggle).toHaveAttribute("title", "Disable retargeting");
    });

    it("shows correct toggle title when retargeting disabled", () => {
      render(
        <RetargetingClient
          {...defaultProps}
          pixelSettings={mockActivePixelSettings}
        />
      );

      // Second switch is the org toggle
      const toggles = screen.getAllByRole("switch");
      const orgToggle = toggles[1];
      expect(orgToggle).toHaveAttribute("title", "Enable retargeting");
    });

    it("handles test event code input", () => {
      render(<RetargetingClient {...defaultProps} />);

      const testCodeInput = screen.getByPlaceholderText("TEST12345");
      fireEvent.change(testCodeInput, { target: { value: "TEST99999" } });

      const saveButton = screen.getByText("Save Pixel Settings");
      expect(saveButton).not.toBeDisabled();
    });
  });
});

