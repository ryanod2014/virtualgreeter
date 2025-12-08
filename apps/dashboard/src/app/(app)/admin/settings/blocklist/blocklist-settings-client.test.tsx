/**
 * @vitest-environment jsdom
 *
 * BlocklistSettingsClient Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows page title and header
 * 2. Display - Shows mode selection (blocklist/allowlist)
 * 3. Display - Shows country dropdown selector
 * 4. Display - Shows empty state when no countries selected
 * 5. Display - Shows selected countries as chips
 * 6. Display - Shows success/error alerts
 * 7. Actions - Toggle between blocklist and allowlist modes
 * 8. Actions - Open country dropdown
 * 9. Actions - Add country to list
 * 10. Actions - Remove country from list
 * 11. Actions - Clear all countries
 * 12. Actions - Save button disabled when no changes
 * 13. Actions - Save button enabled when changes made
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Ban: () => <div data-testid="ban-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock react-dom createPortal - render children directly
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

// Mock Supabase client
const mockFrom = vi.fn();
const mockSupabase = {
  from: mockFrom,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

// Mock country utilities
vi.mock("@/lib/utils/countries", () => ({
  COUNTRIES: [
    { code: "US", name: "United States", flag: "🇺🇸", region: "americas" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "europe" },
    { code: "CA", name: "Canada", flag: "🇨🇦", region: "americas" },
    { code: "DE", name: "Germany", flag: "🇩🇪", region: "europe" },
    { code: "JP", name: "Japan", flag: "🇯🇵", region: "asia_pacific" },
  ],
  REGIONS: {
    americas: { name: "Americas", icon: "🌎" },
    europe: { name: "Europe", icon: "🌍" },
    asia_pacific: { name: "Asia Pacific", icon: "🌏" },
    middle_east_africa: { name: "Middle East & Africa", icon: "🌍" },
  },
  SPECIAL_GROUPS: {
    developing: { name: "Developing Countries", icon: "🌱" },
  },
  getCountryCodesByRegion: (region: string) => {
    const regionCountries: Record<string, string[]> = {
      americas: ["US", "CA"],
      europe: ["GB", "DE"],
      asia_pacific: ["JP"],
      middle_east_africa: [],
    };
    return regionCountries[region] || [];
  },
  getCountryCodesBySpecialGroup: () => [],
  searchCountries: (query: string) => {
    const countries = [
      { code: "US", name: "United States", flag: "🇺🇸", region: "americas" },
      { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "europe" },
      { code: "CA", name: "Canada", flag: "🇨🇦", region: "americas" },
      { code: "DE", name: "Germany", flag: "🇩🇪", region: "europe" },
      { code: "JP", name: "Japan", flag: "🇯🇵", region: "asia_pacific" },
    ];
    if (!query) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
    );
  },
  getAllRegions: () => ["americas", "europe", "asia_pacific", "middle_east_africa"],
  getAllSpecialGroups: () => [],
}));

import { BlocklistSettingsClient } from "./blocklist-settings-client";

describe("BlocklistSettingsClient", () => {
  const defaultProps = {
    orgId: "org-123",
    initialBlockedCountries: [],
    initialMode: "blocklist" as const,
    initialGeoFailureHandling: "allow" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
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

  describe("Display - Header", () => {
    it("shows page title 'Country Restrictions'", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText("Country Restrictions")).toBeInTheDocument();
    });

    it("shows back link to settings page", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const backLink = screen.getByText("Back to Settings");
      expect(backLink.closest("a")).toHaveAttribute("href", "/admin/settings");
    });

    it("shows subtitle about controlling widget visibility", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Control which countries can see the widget/)).toBeInTheDocument();
    });
  });

  describe("Display - Mode Selection", () => {
    it("shows 'Restriction Mode' section", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText("Restriction Mode")).toBeInTheDocument();
    });

    it("shows Blocklist option", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText("Blocklist")).toBeInTheDocument();
      expect(screen.getByText(/Block specific countries/)).toBeInTheDocument();
    });

    it("shows Allowlist option", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText("Allowlist")).toBeInTheDocument();
      expect(screen.getByText(/Only allow specific countries/)).toBeInTheDocument();
    });

    it("highlights Blocklist option when in blocklist mode", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const blocklistButton = screen.getByText("Blocklist").closest("button");
      expect(blocklistButton).toHaveClass("border-destructive");
    });

    it("highlights Allowlist option when in allowlist mode", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialMode="allowlist"
        />
      );

      const allowlistButton = screen.getByText("Allowlist").closest("button");
      expect(allowlistButton).toHaveClass("border-green-500");
    });
  });

  describe("Display - Country Selection Section", () => {
    it("shows 'Blocked Countries' heading in blocklist mode", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText("Blocked Countries")).toBeInTheDocument();
    });

    it("shows 'Allowed Countries' heading in allowlist mode", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialMode="allowlist"
        />
      );

      expect(screen.getByText("Allowed Countries")).toBeInTheDocument();
    });

    it("shows description for blocklist mode", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Visitors from these countries will not see the widget/)).toBeInTheDocument();
    });

    it("shows description for allowlist mode", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialMode="allowlist"
        />
      );

      expect(screen.getByText(/Only visitors from these countries will see the widget/)).toBeInTheDocument();
    });

    it("shows country selector dropdown button", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Select countries to block/)).toBeInTheDocument();
    });
  });

  describe("Display - Empty State", () => {
    it("shows empty state message when no countries selected in blocklist mode", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/No countries blocked - widget visible worldwide/)).toBeInTheDocument();
    });

    it("shows empty state message when no countries selected in allowlist mode", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialMode="allowlist"
        />
      );

      expect(screen.getByText(/No countries allowed - add countries to show widget/)).toBeInTheDocument();
    });
  });

  describe("Display - Selected Countries", () => {
    it("shows selected countries as chips", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US", "GB"]}
        />
      );

      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    });

    it("shows country flags", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US"]}
        />
      );

      expect(screen.getByText("🇺🇸")).toBeInTheDocument();
    });

    it("shows '+N more' when more than 2 countries selected", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US", "GB", "CA", "DE"]}
        />
      );

      expect(screen.getByText("+3 more")).toBeInTheDocument();
    });
  });

  describe("Display - Info Box", () => {
    it("shows info box about how blocking works", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/How Country Blocking Works/)).toBeInTheDocument();
    });

    it("shows VPN bypass warning", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/VPN users may bypass this restriction/)).toBeInTheDocument();
    });

    it("shows IP-based location info", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/Visitor location is determined by IP address/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // MODE TOGGLE ACTIONS
  // ---------------------------------------------------------------------------

  describe("Mode Toggle Actions", () => {
    it("switches to allowlist mode when Allowlist clicked", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      expect(allowlistButton).toHaveClass("border-green-500");
    });

    it("switches to blocklist mode when Blocklist clicked", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialMode="allowlist"
        />
      );

      const blocklistButton = screen.getByText("Blocklist").closest("button");
      fireEvent.click(blocklistButton!);

      expect(blocklistButton).toHaveClass("border-destructive");
    });

    it("clears selected countries when mode is changed", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US", "GB"]}
        />
      );

      // Verify countries are shown
      expect(screen.getByText("United States")).toBeInTheDocument();

      // Switch mode
      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      // Countries should be cleared
      expect(screen.queryByText("United States")).not.toBeInTheDocument();
    });

    it("updates info box title when mode changes", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/How Country Blocking Works/)).toBeInTheDocument();

      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      expect(screen.getByText(/How Country Allowlisting Works/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DROPDOWN ACTIONS
  // ---------------------------------------------------------------------------

  describe("Dropdown Actions", () => {
    it("opens dropdown when selector button clicked", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const selectorButton = screen.getByText(/Select countries to block/).closest("button");
      fireEvent.click(selectorButton!);

      // Should show search input
      expect(screen.getByPlaceholderText(/Search countries to block/)).toBeInTheDocument();
    });

    it("shows search input in dropdown", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const selectorButton = screen.getByText(/Select countries to block/).closest("button");
      fireEvent.click(selectorButton!);

      expect(screen.getByPlaceholderText(/Search countries to block/)).toBeInTheDocument();
    });

    it("shows region quick buttons in dropdown", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const selectorButton = screen.getByText(/Select countries to block/).closest("button");
      fireEvent.click(selectorButton!);

      expect(screen.getByText("Americas")).toBeInTheDocument();
      expect(screen.getByText("Europe")).toBeInTheDocument();
      expect(screen.getByText("Asia Pacific")).toBeInTheDocument();
    });

    it("shows country list in dropdown", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const selectorButton = screen.getByText(/Select countries to block/).closest("button");
      fireEvent.click(selectorButton!);

      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
      expect(screen.getByText("Canada")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // COUNTRY SELECTION ACTIONS
  // ---------------------------------------------------------------------------

  describe("Country Selection", () => {
    it("adds country to list when clicked", async () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      // Open dropdown
      const selectorButton = screen.getByText(/Select countries to block/).closest("button");
      fireEvent.click(selectorButton!);

      // Click on a country
      const usButton = screen.getByText("United States").closest("button");
      fireEvent.click(usButton!);

      // Country should be selected (checkbox marked)
      await waitFor(() => {
        expect(screen.getAllByTestId("check-icon").length).toBeGreaterThan(0);
      });
    });

    it("removes country from list when clicked again", async () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US"]}
        />
      );

      // Open dropdown
      const selectorButton = screen.getByText("United States").closest("button");
      fireEvent.click(selectorButton!);

      // Click on the selected country to deselect
      const usButtons = screen.getAllByText("United States");
      const countryButton = usButtons.find((el) => el.closest("button")?.className.includes("hover:bg-muted"));
      fireEvent.click(countryButton!.closest("button")!);

      // Verify save button enabled (means change detected)
      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // CLEAR ALL ACTIONS
  // ---------------------------------------------------------------------------

  describe("Clear All", () => {
    it("shows X button to clear all when countries selected", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US", "GB"]}
        />
      );

      const xIcons = screen.getAllByTestId("x-icon");
      expect(xIcons.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SAVE BUTTON BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Save Button", () => {
    it("Save button is disabled when no changes made", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
    });

    it("Save button is enabled when countries changed", async () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      // Open dropdown and select a country
      const selectorButton = screen.getByText(/Select countries to block/).closest("button");
      fireEvent.click(selectorButton!);

      const usButton = screen.getByText("United States").closest("button");
      fireEvent.click(usButton!);

      await waitFor(() => {
        const saveButton = screen.getByRole("button", { name: /Save Changes/i });
        expect(saveButton).not.toBeDisabled();
      });
    });

    it("Save button is enabled when mode changed", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("shows loading state during save", async () => {
      let resolveUpdate: () => void;
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => new Promise((resolve) => {
            resolveUpdate = () => resolve({ error: null });
          })),
        }),
      });

      render(<BlocklistSettingsClient {...defaultProps} />);

      // Make a change
      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });

      resolveUpdate!();
    });

    it("shows success message after save", async () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      // Make a change
      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Changes saved successfully")).toBeInTheDocument();
      });
    });

    it("shows error message when save fails", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "Failed" } }),
        }),
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<BlocklistSettingsClient {...defaultProps} />);

      // Make a change
      const allowlistButton = screen.getByText("Allowlist").closest("button");
      fireEvent.click(allowlistButton!);

      const saveButton = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save changes/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles pre-selected countries from initial props", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialBlockedCountries={["US", "GB", "CA"]}
        />
      );

      // Should show first country and "+2 more"
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });

    it("handles empty initial blocked countries", () => {
      render(<BlocklistSettingsClient {...defaultProps} />);

      expect(screen.getByText(/No countries blocked/)).toBeInTheDocument();
    });

    it("handles initial allowlist mode", () => {
      render(
        <BlocklistSettingsClient
          {...defaultProps}
          initialMode="allowlist"
          initialBlockedCountries={["US"]}
        />
      );

      expect(screen.getByText("Allowed Countries")).toBeInTheDocument();
      expect(screen.getByText("United States")).toBeInTheDocument();
    });
  });
});

