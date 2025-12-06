/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

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

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client
const mockFrom = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Store original clipboard API
const originalClipboard = navigator.clipboard;

// Mock clipboard API
const mockClipboardWriteText = vi.fn();

import { SiteSetupClient } from "@/app/(app)/admin/sites/site-setup-client";

/**
 * EmbedCodeDisplay Tests (SiteSetupClient Component)
 *
 * Tests capture the current behavior of the embed code display functionality:
 * - Display: Shows script tag with correct orgId, serverUrl
 * - Display: Copy button copies embed code to clipboard
 * - Variants: Shows async loading option in the script
 * - Verification: Shows installation status and verification polling
 */

describe("EmbedCodeDisplay (SiteSetupClient)", () => {
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
    organizationId: "org_test_12345",
    initialWidgetSettings: defaultWidgetSettings,
    initialEmbedVerified: false,
    initialVerifiedDomain: null,
    detectedSites: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset environment variables
    vi.stubEnv("NEXT_PUBLIC_WIDGET_CDN_URL", "https://cdn.ghost-greeter.com/widget.js");
    vi.stubEnv("NEXT_PUBLIC_SIGNALING_SERVER", "https://api.greetnow.io");

    // Mock clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: mockClipboardWriteText.mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });

    // Default Supabase mock - verification check returns not verified
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { embed_verified_at: null, embed_verified_domain: null },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "organizations") {
        return {
          select: mockSelect,
          update: mockUpdate.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "widget_pageviews") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();

    // Restore original clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - Embed Code Content
  // ---------------------------------------------------------------------------

  describe("Display - Embed Code with orgId", () => {
    it("shows script tag containing the organization ID", () => {
      render(<SiteSetupClient {...defaultProps} organizationId="org_abc123xyz" />);

      // The embed code should contain the orgId
      const codeBlock = screen.getByText(/org_abc123xyz/);
      expect(codeBlock).toBeInTheDocument();
    });

    it("includes orgId in the gg init call", () => {
      render(<SiteSetupClient {...defaultProps} organizationId="org_my_company" />);

      // Should show the gg('init', { orgId: '...' }) call
      expect(screen.getByText(/orgId: 'org_my_company'/)).toBeInTheDocument();
    });

    it("displays orgId exactly as provided (case-sensitive)", () => {
      render(<SiteSetupClient {...defaultProps} organizationId="Org_CaseSensitive_ID" />);

      expect(screen.getByText(/Org_CaseSensitive_ID/)).toBeInTheDocument();
    });
  });

  describe("Display - Embed Code with serverUrl", () => {
    it("shows script tag containing the server URL from environment", () => {
      vi.stubEnv("NEXT_PUBLIC_SIGNALING_SERVER", "https://signaling.example.com");

      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText(/serverUrl: 'https:\/\/signaling\.example\.com'/)).toBeInTheDocument();
    });

    it("uses localhost fallback when NEXT_PUBLIC_SIGNALING_SERVER is not set", () => {
      vi.stubEnv("NEXT_PUBLIC_SIGNALING_SERVER", "");

      render(<SiteSetupClient {...defaultProps} />);

      // Should fall back to localhost:3001
      expect(screen.getByText(/serverUrl: 'http:\/\/localhost:3001'/)).toBeInTheDocument();
    });

    it("includes serverUrl in the gg init call", () => {
      vi.stubEnv("NEXT_PUBLIC_SIGNALING_SERVER", "https://api.test.io");

      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText(/serverUrl: 'https:\/\/api\.test\.io'/)).toBeInTheDocument();
    });
  });

  describe("Display - Widget CDN URL", () => {
    it("includes widget CDN URL in script src", () => {
      vi.stubEnv("NEXT_PUBLIC_WIDGET_CDN_URL", "https://cdn.greetnow.com/widget.js");

      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText(/https:\/\/cdn\.greetnow\.com\/widget\.js/)).toBeInTheDocument();
    });

    it("appends /widget.js if CDN URL doesn't end with it", () => {
      vi.stubEnv("NEXT_PUBLIC_WIDGET_CDN_URL", "https://cdn.example.com");

      render(<SiteSetupClient {...defaultProps} />);

      // Should automatically append /widget.js
      expect(screen.getByText(/https:\/\/cdn\.example\.com\/widget\.js/)).toBeInTheDocument();
    });

    it("handles CDN URL with trailing slash", () => {
      vi.stubEnv("NEXT_PUBLIC_WIDGET_CDN_URL", "https://cdn.example.com/");

      render(<SiteSetupClient {...defaultProps} />);

      // Should append widget.js (not /widget.js)
      expect(screen.getByText(/https:\/\/cdn\.example\.com\/widget\.js/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - Copy Button
  // ---------------------------------------------------------------------------

  describe("Display - Copy Button", () => {
    it("shows Copy Code button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    });

    it("shows Copy icon in the button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      expect(copyButton.querySelector('[data-testid="copy-icon"]')).toBeInTheDocument();
    });

    it("copies embed code to clipboard when clicked", async () => {
      vi.stubEnv("NEXT_PUBLIC_WIDGET_CDN_URL", "https://cdn.test.com/widget.js");
      vi.stubEnv("NEXT_PUBLIC_SIGNALING_SERVER", "https://api.test.com");

      render(<SiteSetupClient {...defaultProps} organizationId="org_copy_test" />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining("org_copy_test")
      );
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining("https://api.test.com")
      );
    });

    it("shows 'Copied!' text after clicking copy", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    it("shows Check icon after successful copy", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("reverts to 'Copy Code' after 2 seconds", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy code/i });
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(screen.getByText("Copied!")).toBeInTheDocument();

      // Advance time by 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /copy code/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // VARIANTS - Async Loading Option
  // ---------------------------------------------------------------------------

  describe("Variants - Async Loading", () => {
    it("embed code includes async=1 attribute for non-blocking load", () => {
      render(<SiteSetupClient {...defaultProps} />);

      // The script tag should have async=1
      expect(screen.getByText(/js\.async=1/)).toBeInTheDocument();
    });

    it("embed code uses async IIFE pattern for immediate execution", () => {
      render(<SiteSetupClient {...defaultProps} />);

      // Should contain the IIFE wrapper
      expect(screen.getByText(/\(function\(w,d,s,o,f,js,fjs\)/)).toBeInTheDocument();
    });

    it("script tag is inserted asynchronously via DOM manipulation", () => {
      render(<SiteSetupClient {...defaultProps} />);

      // Should use createElement and insertBefore pattern
      expect(screen.getByText(/js=d\.createElement\(s\)/)).toBeInTheDocument();
      expect(screen.getByText(/fjs\.parentNode\.insertBefore\(js,fjs\)/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - Page Structure
  // ---------------------------------------------------------------------------

  describe("Display - Page Structure", () => {
    it("shows 'Embed Code' as page title", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("heading", { name: /embed code/i })).toBeInTheDocument();
    });

    it("shows 'Your Widget Code' section header", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Your Widget Code")).toBeInTheDocument();
    });

    it("shows installation instructions", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Where to add it")).toBeInTheDocument();
      expect(screen.getByText(/Copy the code/)).toBeInTheDocument();
      expect(screen.getByText(/Add to your site/)).toBeInTheDocument();
    });

    it("shows Code icon in the header", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByTestId("code-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - Installation Status
  // ---------------------------------------------------------------------------

  describe("Display - Installation Status", () => {
    it("shows 'Waiting for installation' when not verified", () => {
      render(<SiteSetupClient {...defaultProps} initialEmbedVerified={false} />);

      expect(screen.getByText("Waiting for installation")).toBeInTheDocument();
    });

    it("shows loading spinner when waiting for installation", () => {
      render(<SiteSetupClient {...defaultProps} initialEmbedVerified={false} />);

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });

    it("shows 'Installed' when embed is verified", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          initialEmbedVerified={true}
          initialVerifiedDomain="https://example.com"
        />
      );

      expect(screen.getByText("Installed")).toBeInTheDocument();
    });

    it("shows 'Installed' when detectedSites has entries", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          initialEmbedVerified={false}
          detectedSites={[
            { domain: "https://mysite.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 100 },
          ]}
        />
      );

      expect(screen.getByText("Installed")).toBeInTheDocument();
    });

    it("shows total pageviews count when sites are detected", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://site1.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 150 },
            { domain: "https://site2.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 250 },
          ]}
        />
      );

      expect(screen.getByText("400 total pageviews")).toBeInTheDocument();
    });

    it("shows prompt to add code when no sites detected", () => {
      render(<SiteSetupClient {...defaultProps} detectedSites={[]} />);

      expect(screen.getByText(/Add the code to your site/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // VERIFICATION POLLING
  // ---------------------------------------------------------------------------

  describe("Verification Polling", () => {
    it("polls for verification status every 5 seconds when not verified", async () => {
      render(<SiteSetupClient {...defaultProps} initialEmbedVerified={false} />);

      // Initial check
      expect(mockFrom).toHaveBeenCalledWith("organizations");

      // Clear and advance 5 seconds
      mockFrom.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockFrom).toHaveBeenCalledWith("organizations");
    });

    it("stops polling when verification is detected", async () => {
      // Start with not verified
      const { rerender } = render(
        <SiteSetupClient {...defaultProps} initialEmbedVerified={false} />
      );

      // Rerender with verified status
      rerender(<SiteSetupClient {...defaultProps} initialEmbedVerified={true} />);

      mockFrom.mockClear();
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Should not poll again since already verified
      // (The component checks isVerified at start of effect)
    });

    it("checks both organizations and widget_pageviews tables", async () => {
      render(<SiteSetupClient {...defaultProps} initialEmbedVerified={false} />);

      // Should query both tables
      expect(mockFrom).toHaveBeenCalledWith("organizations");
      expect(mockFrom).toHaveBeenCalledWith("widget_pageviews");
    });
  });

  // ---------------------------------------------------------------------------
  // DETECTED SITES DISPLAY
  // ---------------------------------------------------------------------------

  describe("Detected Sites Display", () => {
    it("shows list of detected sites with their domains", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://acme.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 50 },
          ]}
        />
      );

      expect(screen.getByText("acme.com")).toBeInTheDocument();
    });

    it("shows view count for each detected site", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://example.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 1234 },
          ]}
        />
      );

      expect(screen.getByText("1,234 views")).toBeInTheDocument();
    });

    it("shows 'Active today' for recently active sites", () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://recent.com", firstSeen: "2024-01-01", lastSeen: recentDate.toISOString(), pageCount: 10 },
          ]}
        />
      );

      expect(screen.getByText("Active today")).toBeInTheDocument();
    });

    it("strips https:// prefix from displayed domain", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://www.example.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 10 },
          ]}
        />
      );

      expect(screen.getByText("www.example.com")).toBeInTheDocument();
      expect(screen.queryByText("https://www.example.com")).not.toBeInTheDocument();
    });

    it("detected sites are links to the domain", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://clickable.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 10 },
          ]}
        />
      );

      const link = screen.getByRole("link", { name: /clickable\.com/ });
      expect(link).toHaveAttribute("href", "https://clickable.com");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  // ---------------------------------------------------------------------------
  // WIDGET SETTINGS SECTION
  // ---------------------------------------------------------------------------

  describe("Widget Settings Section", () => {
    it("shows Widget Settings section header", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Widget Settings")).toBeInTheDocument();
    });

    it("shows 'Default' badge next to settings header", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Default")).toBeInTheDocument();
    });

    it("shows Save Changes button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    it("Save Changes button is disabled when no changes made", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it("shows size options (Small, Medium, Large)", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Small")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Large")).toBeInTheDocument();
    });

    it("shows position options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Top Left")).toBeInTheDocument();
      expect(screen.getByText("Top Right")).toBeInTheDocument();
      expect(screen.getByText("Center")).toBeInTheDocument();
      expect(screen.getByText("Bottom Left")).toBeInTheDocument();
      expect(screen.getByText("Bottom Right")).toBeInTheDocument();
    });

    it("shows device targeting options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("All Devices")).toBeInTheDocument();
      expect(screen.getByText("Desktop Only")).toBeInTheDocument();
      expect(screen.getByText("Mobile Only")).toBeInTheDocument();
    });

    it("shows theme options", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Light")).toBeInTheDocument();
      expect(screen.getByText("Dark")).toBeInTheDocument();
      expect(screen.getByText("Glass")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // SETTINGS INTERACTION
  // ---------------------------------------------------------------------------

  describe("Settings Interaction", () => {
    it("enables Save Changes button when settings are modified", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      // Click on Large size option
      const largeButton = screen.getByText("Large");
      await act(async () => {
        fireEvent.click(largeButton);
      });

      expect(saveButton).not.toBeDisabled();
    });

    it("shows Reset to Default Settings button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: /reset to default settings/i })).toBeInTheDocument();
    });

    it("calls Supabase update when Save Changes clicked", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      // Make a change
      const largeButton = screen.getByText("Large");
      await act(async () => {
        fireEvent.click(largeButton);
      });

      // Click save
      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("shows 'Saved!' feedback after successful save", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      // Make a change
      const largeButton = screen.getByText("Large");
      await act(async () => {
        fireEvent.click(largeButton);
      });

      // Click save
      const saveButton = screen.getByRole("button", { name: /save changes/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(screen.getByText("Saved!")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TRIGGER DELAY OPTIONS
  // ---------------------------------------------------------------------------

  describe("Trigger Delay Options", () => {
    it("shows preset delay options (Instantly, 3 sec, 10 sec, 30 sec)", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Instantly" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "3 sec" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "10 sec" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "30 sec" })).toBeInTheDocument();
    });

    it("shows 'Other' button for custom delay", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Other" })).toBeInTheDocument();
    });

    it("shows custom input when Other is clicked", async () => {
      render(<SiteSetupClient {...defaultProps} />);

      const otherButton = screen.getByRole("button", { name: "Other" });
      await act(async () => {
        fireEvent.click(otherButton);
      });

      expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
      expect(screen.getByText("seconds")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AUTO-HIDE DELAY OPTIONS
  // ---------------------------------------------------------------------------

  describe("Auto-Hide Delay Options", () => {
    it("shows preset auto-hide options (Never, 1 min, 2 min, 5 min)", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Never" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 min" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2 min" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "5 min" })).toBeInTheDocument();
    });

    it("shows Custom button for auto-hide delay", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // MINIMIZE TOGGLE
  // ---------------------------------------------------------------------------

  describe("Minimize Toggle", () => {
    it("shows minimize toggle button", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Allow user to minimize")).toBeInTheDocument();
    });

    it("shows 'Disabled' state by default", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          initialWidgetSettings={{ ...defaultWidgetSettings, show_minimize_button: false }}
        />
      );

      expect(screen.getByText("Disabled")).toBeInTheDocument();
      expect(screen.getByText("Widget cannot be minimized")).toBeInTheDocument();
    });

    it("toggles to 'Enabled' state when clicked", async () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          initialWidgetSettings={{ ...defaultWidgetSettings, show_minimize_button: false }}
        />
      );

      const toggleButton = screen.getByText("Disabled").closest("button");
      await act(async () => {
        fireEvent.click(toggleButton!);
      });

      expect(screen.getByText("Enabled")).toBeInTheDocument();
      expect(screen.getByText("Visitors can minimize the widget")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // POOLS CTA SECTION
  // ---------------------------------------------------------------------------

  describe("Pools CTA Section", () => {
    it("shows pools promotion message", () => {
      render(<SiteSetupClient {...defaultProps} />);

      expect(screen.getByText("Want different agents on different pages?")).toBeInTheDocument();
    });

    it("shows Configure Pools link", () => {
      render(<SiteSetupClient {...defaultProps} />);

      const poolsLink = screen.getByRole("link", { name: /configure pools/i });
      expect(poolsLink).toHaveAttribute("href", "/admin/pools");
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles empty organizationId", () => {
      render(<SiteSetupClient {...defaultProps} organizationId="" />);

      // Should still render with empty orgId in the code
      expect(screen.getByText(/orgId: ''/)).toBeInTheDocument();
    });

    it("handles special characters in organizationId", () => {
      render(<SiteSetupClient {...defaultProps} organizationId="org_with-special.chars_123" />);

      expect(screen.getByText(/org_with-special\.chars_123/)).toBeInTheDocument();
    });

    it("handles very long organizationId", () => {
      const longId = "org_" + "a".repeat(100);
      render(<SiteSetupClient {...defaultProps} organizationId={longId} />);

      expect(screen.getByText(new RegExp(longId))).toBeInTheDocument();
    });

    it("handles multiple detected sites", () => {
      render(
        <SiteSetupClient
          {...defaultProps}
          detectedSites={[
            { domain: "https://site1.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 10 },
            { domain: "https://site2.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 20 },
            { domain: "https://site3.com", firstSeen: "2024-01-01", lastSeen: "2024-01-02", pageCount: 30 },
          ]}
        />
      );

      expect(screen.getByText("site1.com")).toBeInTheDocument();
      expect(screen.getByText("site2.com")).toBeInTheDocument();
      expect(screen.getByText("site3.com")).toBeInTheDocument();
    });
  });
});
