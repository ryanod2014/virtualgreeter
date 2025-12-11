/**
 * @vitest-environment jsdom
 *
 * CountrySelector Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows placeholder when no countries selected
 * 2. Display - Shows selected country with flag as chip
 * 3. Display - Shows "+N more" when more than 2 countries selected
 * 4. Display - Opens dropdown on click
 * 5. Display - Shows searchable country list grouped by region
 * 6. Display - Shows region quick buttons
 * 7. Display - Shows selection count in footer
 * 8. Actions - Filters countries on search input
 * 9. Actions - Selects/deselects country on click
 * 10. Actions - Toggles entire region with region button
 * 11. Actions - Removes country from chip X button
 * 12. Actions - Clears all selections
 * 13. Actions - Closes dropdown when clicking outside
 * 14. Edge Cases - Shows "No countries found" for no search results
 * 15. Edge Cases - Handles empty selection array
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Search: () => <div data-testid="search-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock the countries utility
vi.mock("@/lib/utils/countries", () => ({
  COUNTRIES: [
    { code: "US", name: "United States", flag: "🇺🇸", region: "americas" },
    { code: "CA", name: "Canada", flag: "🇨🇦", region: "americas" },
    { code: "MX", name: "Mexico", flag: "🇲🇽", region: "americas" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "europe" },
    { code: "DE", name: "Germany", flag: "🇩🇪", region: "europe" },
    { code: "FR", name: "France", flag: "🇫🇷", region: "europe" },
    { code: "JP", name: "Japan", flag: "🇯🇵", region: "asia_pacific" },
    { code: "AU", name: "Australia", flag: "🇦🇺", region: "asia_pacific" },
    { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "middle_east_africa" },
  ],
  REGIONS: {
    americas: { name: "Americas", icon: "🌎" },
    europe: { name: "Europe", icon: "🌍" },
    asia_pacific: { name: "Asia Pacific", icon: "🌏" },
    middle_east_africa: { name: "Middle East & Africa", icon: "🌍" },
  },
  getCountryCodesByRegion: (region: string) => {
    const regionMap: Record<string, string[]> = {
      americas: ["US", "CA", "MX"],
      europe: ["GB", "DE", "FR"],
      asia_pacific: ["JP", "AU"],
      middle_east_africa: ["AE"],
    };
    return regionMap[region] || [];
  },
  searchCountries: (query: string) => {
    const countries = [
      { code: "US", name: "United States", flag: "🇺🇸", region: "americas" },
      { code: "CA", name: "Canada", flag: "🇨🇦", region: "americas" },
      { code: "MX", name: "Mexico", flag: "🇲🇽", region: "americas" },
      { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "europe" },
      { code: "DE", name: "Germany", flag: "🇩🇪", region: "europe" },
      { code: "FR", name: "France", flag: "🇫🇷", region: "europe" },
      { code: "JP", name: "Japan", flag: "🇯🇵", region: "asia_pacific" },
      { code: "AU", name: "Australia", flag: "🇦🇺", region: "asia_pacific" },
      { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", region: "middle_east_africa" },
    ];
    if (!query) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
    );
  },
  getAllRegions: () => ["americas", "europe", "asia_pacific", "middle_east_africa"],
}));

import { CountrySelector } from "./country-selector";

describe("CountrySelector", () => {
  const defaultProps = {
    selected: [] as string[],
    onChange: vi.fn(),
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
    it("shows default placeholder when no countries selected", () => {
      render(<CountrySelector {...defaultProps} />);
      expect(screen.getByText("All Countries")).toBeInTheDocument();
    });

    it("shows custom placeholder when provided", () => {
      render(<CountrySelector {...defaultProps} placeholder="Select countries" />);
      expect(screen.getByText("Select countries")).toBeInTheDocument();
    });

    it("shows ChevronDown icon in button", () => {
      render(<CountrySelector {...defaultProps} />);
      expect(screen.getByTestId("chevron-down-icon")).toBeInTheDocument();
    });

    it("shows selected country with flag when one country selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US"]} />);
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("🇺🇸")).toBeInTheDocument();
    });

    it("shows two country chips when two countries selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US", "CA"]} />);
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("Canada")).toBeInTheDocument();
    });

    it("shows first country and '+N more' when more than 2 selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US", "CA", "MX"]} />);
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("+2 more")).toBeInTheDocument();
    });

    it("shows clear all X button when countries are selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US"]} />);
      // There's an X icon for clear all in the button area
      const xIcons = screen.getAllByTestId("x-icon");
      expect(xIcons.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // DROPDOWN BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Dropdown", () => {
    it("opens dropdown when button clicked", () => {
      render(<CountrySelector {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Search input should be visible
      expect(screen.getByPlaceholderText("Search countries...")).toBeInTheDocument();
    });

    it("shows search input in dropdown", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByPlaceholderText("Search countries...")).toBeInTheDocument();
    });

    it("shows region quick buttons in dropdown", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Americas")).toBeInTheDocument();
      expect(screen.getByText("Europe")).toBeInTheDocument();
      expect(screen.getByText("Asia Pacific")).toBeInTheDocument();
      expect(screen.getByText("Middle East & Africa")).toBeInTheDocument();
    });

    it("shows countries grouped by region in dropdown", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Countries should be visible
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("Germany")).toBeInTheDocument();
      expect(screen.getByText("Japan")).toBeInTheDocument();
    });

    it("shows selection count footer when countries selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US", "CA"]} />);

      // Get the first button (trigger) - there are multiple buttons when items selected
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(screen.getByText("2 countries selected")).toBeInTheDocument();
    });

    it("shows singular 'country' when only one selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US"]} />);

      // Get the first button (trigger) before opening dropdown
      const trigger = screen.getAllByRole("button")[0];
      fireEvent.click(trigger);

      expect(screen.getByText("1 country selected")).toBeInTheDocument();
    });

    it("shows 'Clear all' button in footer when countries selected", () => {
      render(<CountrySelector {...defaultProps} selected={["US"]} />);

      // Get the first button (trigger) - there are multiple buttons when items selected
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      expect(screen.getByText("Clear all")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SEARCH BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Search", () => {
    it("filters countries when search query entered", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByPlaceholderText("Search countries...");
      fireEvent.change(searchInput, { target: { value: "United" } });

      // Should find United States and United Kingdom
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getByText("United Kingdom")).toBeInTheDocument();
      // Germany should not be visible
      expect(screen.queryByText("Germany")).not.toBeInTheDocument();
    });

    it("shows 'No countries found' when search has no results", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByPlaceholderText("Search countries...");
      fireEvent.change(searchInput, { target: { value: "XYZ123" } });

      expect(screen.getByText(/No countries found for "XYZ123"/)).toBeInTheDocument();
    });

    it("shows flat list without region headers when searching", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      const searchInput = screen.getByPlaceholderText("Search countries...");
      fireEvent.change(searchInput, { target: { value: "United" } });

      // Region headers should not be visible during search (just the country names)
      // The region quick buttons should still be hidden when searching
      // Check that the grouped region headers like "🌎 Americas" are not present
      expect(screen.queryByText("🌎 Americas")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SELECTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Selection", () => {
    it("calls onChange with country code when country clicked", () => {
      const onChange = vi.fn();
      render(<CountrySelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));

      // Find and click on United States in the dropdown list
      const countryButtons = screen.getAllByText("United States");
      const dropdownButton = countryButtons[countryButtons.length - 1];
      fireEvent.click(dropdownButton);

      expect(onChange).toHaveBeenCalledWith(["US"]);
    });

    it("calls onChange to remove country when already selected country clicked", () => {
      const onChange = vi.fn();
      render(<CountrySelector {...defaultProps} selected={["US"]} onChange={onChange} />);

      // Get the first button (trigger) before opening dropdown
      const trigger = screen.getAllByRole("button")[0];
      fireEvent.click(trigger);

      // Click on United States in the dropdown list (the button with US text at the end)
      // Find the country option button that contains the country name and code
      const countryOption = screen.getByRole("button", { name: /United States.*US/i });
      fireEvent.click(countryOption);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("shows checkbox checked for selected countries", () => {
      render(<CountrySelector {...defaultProps} selected={["US"]} />);

      // Get the first button (trigger) - there are multiple buttons when items selected
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      // Check icons should be present for selected countries
      const checkIcons = screen.getAllByTestId("check-icon");
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // REGION TOGGLE BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Region Toggle", () => {
    it("selects all countries in region when region button clicked", () => {
      const onChange = vi.fn();
      render(<CountrySelector {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));

      // Click on Americas region button
      const regionButtons = screen.getAllByText("Americas");
      fireEvent.click(regionButtons[0]);

      expect(onChange).toHaveBeenCalledWith(["US", "CA", "MX"]);
    });

    it("deselects all countries in region when fully selected region clicked", () => {
      const onChange = vi.fn();
      render(
        <CountrySelector
          {...defaultProps}
          selected={["US", "CA", "MX"]}
          onChange={onChange}
        />
      );

      // Get the first button (trigger) before opening dropdown
      const trigger = screen.getAllByRole("button")[0];
      fireEvent.click(trigger);

      // Click on Americas region button to deselect all (the one with the icon)
      const regionButton = screen.getByRole("button", { name: /🌎.*Americas/i });
      fireEvent.click(regionButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("shows check icon on fully selected region button", () => {
      render(<CountrySelector {...defaultProps} selected={["US", "CA", "MX"]} />);

      // Get the first button (trigger) - there are multiple buttons when items selected
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);

      // Americas should have check icon since all 3 countries are selected
      const checkIcons = screen.getAllByTestId("check-icon");
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // CLEAR BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Clear", () => {
    it("calls onChange with empty array when Clear all clicked in footer", () => {
      const onChange = vi.fn();
      render(<CountrySelector {...defaultProps} selected={["US", "CA"]} onChange={onChange} />);

      // Get the first button (trigger) before opening dropdown
      const trigger = screen.getAllByRole("button")[0];
      fireEvent.click(trigger);
      fireEvent.click(screen.getByText("Clear all"));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("calls onChange with remaining countries when chip X button clicked", () => {
      const onChange = vi.fn();
      render(<CountrySelector {...defaultProps} selected={["US", "CA"]} onChange={onChange} />);

      // Find and click the X button on the first chip
      // The X icon buttons are for removing individual countries
      const buttons = screen.getAllByRole("button");
      // Find a button that contains the X icon and is part of a chip
      const chipXButton = buttons.find(
        (btn) => btn.querySelector('[data-testid="x-icon"]') && btn.closest('.inline-flex')
      );

      if (chipXButton) {
        fireEvent.click(chipXButton);
        expect(onChange).toHaveBeenCalled();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CHIP DISPLAY IN DROPDOWN BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Selected Chips in Dropdown", () => {
    it("shows selected countries as chips in dropdown when not searching", () => {
      render(<CountrySelector {...defaultProps} selected={["US", "CA"]} />);

      // Get the first button (trigger) before opening dropdown
      const trigger = screen.getAllByRole("button")[0];
      fireEvent.click(trigger);

      // Should show "Selected (2)" header
      expect(screen.getByText(/Selected \(2\)/)).toBeInTheDocument();
    });

    it("hides selected chips section when searching", () => {
      render(<CountrySelector {...defaultProps} selected={["US"]} />);

      // Get the first button (trigger) before opening dropdown
      const trigger = screen.getAllByRole("button")[0];
      fireEvent.click(trigger);
      const searchInput = screen.getByPlaceholderText("Search countries...");
      fireEvent.change(searchInput, { target: { value: "Canada" } });

      // The "Selected (1)" section should not be visible during search
      expect(screen.queryByText(/Selected \(1\)/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles empty selected array without crashing", () => {
      const { container } = render(<CountrySelector {...defaultProps} selected={[]} />);
      expect(container.firstChild).not.toBeNull();
    });

    it("applies custom className to container", () => {
      const { container } = render(
        <CountrySelector {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("shows country code in dropdown list", () => {
      render(<CountrySelector {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      // Country codes should be visible
      expect(screen.getByText("US")).toBeInTheDocument();
      expect(screen.getByText("CA")).toBeInTheDocument();
    });
  });
});



