/**
 * @vitest-environment jsdom
 *
 * SiteSetupClient Component Tests
 *
 * Behaviors Tested:
 * 1. Display: Header, embed code block, instructions, widget settings, detected sites
 * 2. Actions: Copy embed code, change settings, save settings, reset to defaults
 * 3. Edge Cases: No detected sites, unverified embed, various widget settings
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client
const mockSupabaseUpdate = vi.fn();
const mockSupabaseFrom = vi.fn(() => ({
  update: vi.fn(() => ({
    eq: mockSupabaseUpdate,
  })),
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Copy: () => <div data-testid="copy-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Code: () => <div data-testid="code-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  Smartphone: () => <div data-testid="smartphone-icon" />,
  Layout: () => <div data-testid="layout-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Info: () => <div data-testid="info-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  TimerOff: () => <div data-testid="timer-off-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
  Droplets: () => <div data-testid="droplets-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

import { SiteSetupClient } from "./site-setup-client";

describe("SiteSetupClient", () => {
  const defaultWidgetSettings = {
    size: "medium" as const,
    position: "bottom-right" as const,
    devices: "all" as const,
    trigger_delay: 3,
    auto_hide_delay: null,
    show_minimize_button: false,
    theme: "dark" as const,
  };

  const defaultProps = {
    organizationId: "org-123",
    initialWidgetSettings: defaultWidgetSettings,
    initialEmbedVerified: false,
    initialVerifiedDomain: null,
    detectedSites: [],
  };

  const mockDetectedSite = {
    domain: "https://example.com",
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: new Date().toISOString(), // Today = active
    pageCount: 150,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // HEADER & PAGE DISPLAY
  // ---------------------------------------------------------------------------
  describe("Header Display", () => {
    it("renders page title", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Embed Code")).toBeInTheDocument();
    });

    it("renders page description", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Configure your widget appearance and add it to your website")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EMBED CODE SECTION
  // ---------------------------------------------------------------------------
  describe("Embed Code Section", () => {
    it("renders Your Widget Code heading", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Your Widget Code")).toBeInTheDocument();
    });

    it("renders Works on any website subtext", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Works on any website")).toBeInTheDocument();
    });

    it("renders Copy Code button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Copy Code")).toBeInTheDocument();
    });

    it("renders embed code containing organization ID", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const codeBlock = screen.getByText(/GreetNow Widget/);
      expect(codeBlock).toBeInTheDocument();
    });

    it("renders instruction steps", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Where to add it")).toBeInTheDocument();
      expect(screen.getByText("Copy the code")).toBeInTheDocument();
      expect(screen.getByText("Add to your site's header")).toBeInTheDocument();
      expect(screen.getByText("That's it!")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // COPY EMBED CODE ACTION
  // ---------------------------------------------------------------------------
  describe("Copy Embed Code Action", () => {
    it("copies embed code to clipboard when Copy Code clicked", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByText("Copy Code");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
        expect(mockClipboard.writeText.mock.calls[0][0]).toContain("org-123");
      });
    });

    it("shows Copied! text after copying", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByText("Copy Code");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });

    it("reverts to Copy Code after 2 seconds", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByText("Copy Code");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.getByText("Copy Code")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // INSTALLATION STATUS
  // ---------------------------------------------------------------------------
  describe("Installation Status", () => {
    it("shows Waiting for installation when not verified", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Waiting for installation")).toBeInTheDocument();
    });

    it("shows Installed when verified", () => {
      render(<SiteSetupClient {...defaultProps} initialEmbedVerified={true} />);

      expect(screen.getByText("Installed")).toBeInTheDocument();
    });

    it("shows Installed when detected sites exist", () => {
      render(<SiteSetupClient {...defaultProps} detectedSites={[mockDetectedSite]} />);

      expect(screen.getByText("Installed")).toBeInTheDocument();
    });

    it("shows placeholder message when no detected sites", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Add the code to your site and visit a page to see it here")).toBeInTheDocument();
    });

    it("shows detected site domain", () => {
      render(<SiteSetupClient {...defaultProps} detectedSites={[mockDetectedSite]} />);

      expect(screen.getByText("example.com")).toBeInTheDocument();
    });

    it("shows detected site pageview count", () => {
      render(<SiteSetupClient {...defaultProps} detectedSites={[mockDetectedSite]} />);

      expect(screen.getByText("150 views")).toBeInTheDocument();
    });

    it("shows Active today for recently seen sites", () => {
      render(<SiteSetupClient {...defaultProps} detectedSites={[mockDetectedSite]} />);

      expect(screen.getByText("Active today")).toBeInTheDocument();
    });

    it("shows total pageviews count", () => {
      const sites = [
        { ...mockDetectedSite, domain: "https://site1.com", pageCount: 100 },
        { ...mockDetectedSite, domain: "https://site2.com", pageCount: 200 },
      ];
      render(<SiteSetupClient {...defaultProps} detectedSites={sites} />);

      expect(screen.getByText("300 total pageviews")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // WIDGET SETTINGS SECTION
  // ---------------------------------------------------------------------------
  describe("Widget Settings Section", () => {
    it("renders Widget Settings heading", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Widget Settings")).toBeInTheDocument();
    });

    it("renders Default badge", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Default")).toBeInTheDocument();
    });

    it("renders settings description", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("These settings apply to all pages on your site")).toBeInTheDocument();
    });

    it("renders Save Changes button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("Save Changes button is disabled when no changes", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const saveButton = screen.getByText("Save Changes");
      expect(saveButton).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // SIZE SETTINGS
  // ---------------------------------------------------------------------------
  describe("Size Settings", () => {
    it("renders Size label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Size")).toBeInTheDocument();
    });

    it("renders Small, Medium, Large options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Small")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Large")).toBeInTheDocument();
    });

    it("Medium is selected by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const mediumButton = screen.getByText("Medium").closest("button");
      expect(mediumButton).toHaveClass("border-primary");
    });

    it("enables Save Changes when size is changed", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const smallButton = screen.getByText("Small").closest("button");
      fireEvent.click(smallButton!);

      const saveButton = screen.getByText("Save Changes");
      expect(saveButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // POSITION SETTINGS
  // ---------------------------------------------------------------------------
  describe("Position Settings", () => {
    it("renders Position label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Position")).toBeInTheDocument();
    });

    it("renders all position options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Top Left")).toBeInTheDocument();
      expect(screen.getByText("Top Right")).toBeInTheDocument();
      expect(screen.getByText("Center")).toBeInTheDocument();
      expect(screen.getByText("Bottom Left")).toBeInTheDocument();
      expect(screen.getByText("Bottom Right")).toBeInTheDocument();
    });

    it("Bottom Right is selected by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const bottomRightButton = screen.getByText("Bottom Right").closest("button");
      expect(bottomRightButton).toHaveClass("border-primary");
    });
  });

  // ---------------------------------------------------------------------------
  // DEVICE SETTINGS
  // ---------------------------------------------------------------------------
  describe("Device Settings", () => {
    it("renders Show On label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Show On")).toBeInTheDocument();
    });

    it("renders all device options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("All Devices")).toBeInTheDocument();
      expect(screen.getByText("Desktop Only")).toBeInTheDocument();
      expect(screen.getByText("Mobile Only")).toBeInTheDocument();
    });

    it("All Devices is selected by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const allDevicesButton = screen.getByText("All Devices").closest("button");
      expect(allDevicesButton).toHaveClass("border-primary");
    });
  });

  // ---------------------------------------------------------------------------
  // THEME SETTINGS
  // ---------------------------------------------------------------------------
  describe("Theme Settings", () => {
    it("renders Theme label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Theme")).toBeInTheDocument();
    });

    it("renders all theme options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
      expect(screen.getByText("Glass")).toBeInTheDocument();
    });

    it("Dark is selected by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const darkButton = screen.getByText("Dark").closest("button");
      expect(darkButton).toHaveClass("border-primary");
    });
  });

  // ---------------------------------------------------------------------------
  // TRIGGER DELAY SETTINGS
  // ---------------------------------------------------------------------------
  describe("Trigger Delay Settings", () => {
    it("renders Show After label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Show After")).toBeInTheDocument();
    });

    it("renders preset delay options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Instantly")).toBeInTheDocument();
      expect(screen.getByText("3 sec")).toBeInTheDocument();
      expect(screen.getByText("10 sec")).toBeInTheDocument();
      expect(screen.getByText("30 sec")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
    });

    it("3 sec is selected by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const threeSecButton = screen.getByText("3 sec");
      expect(threeSecButton).toHaveClass("bg-primary");
    });

    it("shows helper text for current delay", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Widget appears 3 seconds after page loads")).toBeInTheDocument();
    });

    it("shows Instantly helper text when delay is 0", () => {
      const settingsInstant = { ...defaultWidgetSettings, trigger_delay: 0 };
      render(<SiteSetupClient {...defaultProps} initialWidgetSettings={settingsInstant} />);

      expect(screen.getByText("Widget appears immediately when page loads")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AUTO-HIDE DELAY SETTINGS
  // ---------------------------------------------------------------------------
  describe("Auto-Hide Delay Settings", () => {
    it("renders Disappear After label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Disappear After")).toBeInTheDocument();
    });

    it("renders preset hide delay options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Never")).toBeInTheDocument();
      expect(screen.getByText("1 min")).toBeInTheDocument();
      expect(screen.getByText("2 min")).toBeInTheDocument();
      expect(screen.getByText("5 min")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("Never is selected by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const neverButton = screen.getByText("Never");
      expect(neverButton).toHaveClass("bg-primary");
    });

    it("shows helper text for never hide", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Widget stays visible until visitor interacts or leaves")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // MINIMIZE BUTTON SETTINGS
  // ---------------------------------------------------------------------------
  describe("Minimize Button Settings", () => {
    it("renders Allow user to minimize label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Allow user to minimize")).toBeInTheDocument();
    });

    it("shows Disabled by default", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Disabled")).toBeInTheDocument();
      expect(screen.getByText("Widget cannot be minimized")).toBeInTheDocument();
    });

    it("toggles to Enabled when clicked", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const toggleButton = screen.getByText("Disabled").closest("button");
      fireEvent.click(toggleButton!);

      await waitFor(() => {
        expect(screen.getByText("Enabled")).toBeInTheDocument();
        expect(screen.getByText("Visitors can minimize the widget")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // RESET TO DEFAULTS
  // ---------------------------------------------------------------------------
  describe("Reset to Defaults", () => {
    it("renders Reset to Default Settings button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Reset to Default Settings")).toBeInTheDocument();
    });

    it("Reset button is disabled when settings match defaults", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const resetButton = screen.getByText("Reset to Default Settings").closest("button");
      expect(resetButton).toBeDisabled();
    });

    it("Reset button is enabled when settings differ from defaults", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      // Change a setting
      const smallButton = screen.getByText("Small").closest("button");
      fireEvent.click(smallButton!);

      await waitFor(() => {
        const resetButton = screen.getByText("Reset to Default Settings").closest("button");
        expect(resetButton).not.toBeDisabled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // SAVE SETTINGS ACTION
  // ---------------------------------------------------------------------------
  describe("Save Settings Action", () => {
    it("calls Supabase update when Save Changes clicked", async () => {
      mockSupabaseUpdate.mockResolvedValue({ error: null });

      render(<SiteSetupClient {...defaultProps} />);

      // Change a setting to enable save
      const smallButton = screen.getByText("Small").closest("button");
      fireEvent.click(smallButton!);

      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith("organizations");
      });
    });

    it("shows Saved! text after successful save", async () => {
      mockSupabaseUpdate.mockResolvedValue({ error: null });

      render(<SiteSetupClient {...defaultProps} />);

      // Change a setting
      const smallButton = screen.getByText("Small").closest("button");
      fireEvent.click(smallButton!);

      const saveButton = screen.getByText("Save Changes");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Saved!")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // PREVIEW SECTION
  // ---------------------------------------------------------------------------
  describe("Preview Section", () => {
    it("renders Preview label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("renders Desktop & Mobile preview label", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Desktop & Mobile")).toBeInTheDocument();
    });

    it("renders Desktop preview", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Desktop")).toBeInTheDocument();
    });

    it("renders Mobile preview", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Mobile")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ROUTING CTA SECTION
  // ---------------------------------------------------------------------------
  describe("Routing CTA Section", () => {
    it("renders pool routing CTA", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Want different agents on different pages?")).toBeInTheDocument();
    });

    it("renders Configure Pools link", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const poolsLink = screen.getByText("Configure Pools");
      expect(poolsLink.closest("a")).toHaveAttribute("href", "/admin/pools");
    });
  });

  // ---------------------------------------------------------------------------
  // INFO CALLOUT
  // ---------------------------------------------------------------------------
  describe("Info Callout", () => {
    it("renders info callout about default settings", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("These are your default settings.")).toBeInTheDocument();
    });

    it("renders link to Pools page in info callout", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const poolsLink = screen.getByText("Pools → Widget Appearance");
      expect(poolsLink.closest("a")).toHaveAttribute("href", "/admin/pools");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles multiple detected sites", () => {
      const sites = [
        { ...mockDetectedSite, domain: "https://site1.com" },
        { ...mockDetectedSite, domain: "https://site2.com" },
        { ...mockDetectedSite, domain: "https://site3.com" },
      ];
      render(<SiteSetupClient {...defaultProps} detectedSites={sites} />);

      expect(screen.getByText("site1.com")).toBeInTheDocument();
      expect(screen.getByText("site2.com")).toBeInTheDocument();
      expect(screen.getByText("site3.com")).toBeInTheDocument();
    });

    it("handles site not active today", () => {
      const oldSite = {
        ...mockDetectedSite,
        lastSeen: "2024-01-01T00:00:00Z", // Not today
      };
      render(<SiteSetupClient {...defaultProps} detectedSites={[oldSite]} />);

      expect(screen.queryByText("Active today")).not.toBeInTheDocument();
    });

    it("handles different initial widget settings", () => {
      const customSettings = {
        size: "large" as const,
        position: "top-left" as const,
        devices: "desktop" as const,
        trigger_delay: 10,
        auto_hide_delay: 120,
        show_minimize_button: true,
        theme: "light" as const,
      };
      render(<SiteSetupClient {...defaultProps} initialWidgetSettings={customSettings} />);

      // Large should be selected
      const largeButton = screen.getByText("Large").closest("button");
      expect(largeButton).toHaveClass("border-primary");

      // Top Left should be selected
      const topLeftButton = screen.getByText("Top Left").closest("button");
      expect(topLeftButton).toHaveClass("border-primary");

      // 10 sec should be selected
      const tenSecButton = screen.getByText("10 sec");
      expect(tenSecButton).toHaveClass("bg-primary");
    });
  });
});

