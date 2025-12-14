/**
 * @vitest-environment jsdom
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { CallIncomingPayload } from "@ghost-greeter/domain";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Phone: () => <div data-testid="phone-icon" />,
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  User: () => <div data-testid="user-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
}));

// Mock the country flag utility
vi.mock("@/lib/utils/country-flag", () => ({
  formatLocationWithFlag: vi.fn(
    (city?: string, region?: string, countryCode?: string) => {
      if (!city && !region && !countryCode) {
        return { flag: "🌐", text: "Unknown location" };
      }
      const flag = countryCode === "US" ? "🇺🇸" : "🌐";
      const parts = [city, region].filter(Boolean);
      return { flag, text: parts.join(", ") || "Unknown" };
    }
  ),
}));

import { IncomingCallModal } from "./incoming-call-modal";

/**
 * IncomingCallModal Component Tests
 *
 * Tests capture the current behavior of the IncomingCallModal component:
 * - Display: Shows visitor ID (truncated), page URL, location with flag, countdown timer
 * - Actions: Accept button calls onAccept, Reject button calls onReject
 */

// Sample incoming call payload for tests
const createSamplePayload = (
  overrides?: Partial<CallIncomingPayload>
): CallIncomingPayload => ({
  request: {
    requestId: "call_12345678",
    visitorId: "visitor_987654321",
    agentId: "agent_111",
    orgId: "org_test",
    pageUrl: "https://example.com/pricing",
    requestedAt: Date.now(),
  },
  visitor: {
    visitorId: "visitor_987654321_abcdef",
    pageUrl: "https://example.com/pricing?utm=source",
    connectedAt: Date.now() - 120000, // Connected 2 minutes ago
    location: {
      city: "San Francisco",
      region: "California",
      country: "United States",
      countryCode: "US",
    },
  },
  ...overrides,
});

describe("IncomingCallModal", () => {
  const defaultOnAccept = vi.fn();
  const defaultOnReject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Display - Visitor ID", () => {
    it("shows visitor ID truncated to 20 characters", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123456789012345678901234567890", // Long ID
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should show first 20 chars + "..."
      // visitorId.slice(0, 20) = "visitor_123456789012" (20 chars)
      expect(screen.getByText("visitor_123456789012...")).toBeInTheDocument();
    });

    it("shows full visitor ID when less than 20 characters followed by ellipsis", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_12345678901234567890_extra", // More than 20 chars
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Slice(0, 20) gives first 20 chars, always followed by "..."
      // visitorId.slice(0, 20) = "visitor_123456789012" (20 chars)
      const visitorIdElement = screen.getByText("visitor_123456789012...");
      expect(visitorIdElement).toBeInTheDocument();
    });

    it("displays 'Visitor ID' label above the visitor ID", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("Visitor ID")).toBeInTheDocument();
    });
  });

  describe("Display - Page URL", () => {
    it("shows page URL from visitor data", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com/pricing",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("https://example.com/pricing")).toBeInTheDocument();
    });

    it("displays 'Page URL' label above the URL", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("Page URL")).toBeInTheDocument();
    });

    it("truncates long page URLs with CSS ellipsis", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl:
            "https://example.com/very/long/path/to/page/with/many/segments?param=value&other=thing",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // The URL should be displayed (CSS handles truncation via max-w-[250px] truncate)
      const urlElement = screen.getByText(/https:\/\/example\.com/);
      expect(urlElement).toBeInTheDocument();
      expect(urlElement).toHaveClass("truncate");
    });
  });

  describe("Display - Location with Flag", () => {
    it("shows location with country flag when location data is available", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: {
            city: "San Francisco",
            region: "California",
            country: "United States",
            countryCode: "US",
          },
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should show flag emoji and location text
      expect(screen.getByText("🇺🇸")).toBeInTheDocument();
      expect(screen.getByText("San Francisco, California")).toBeInTheDocument();
    });

    it("shows 'Unknown location' when location is null", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("Unknown location")).toBeInTheDocument();
    });

    it("displays 'Location' label above the location", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("Location")).toBeInTheDocument();
    });
  });

  describe("Display - Countdown Timer", () => {
    it("shows countdown timer starting at 30 seconds", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Initial countdown should show 30s
      expect(screen.getByText("Request expires in 30s")).toBeInTheDocument();
    });

    it("decrements countdown every second", async () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Initial: 30s
      expect(screen.getByText("Request expires in 30s")).toBeInTheDocument();

      // Advance 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("Request expires in 29s")).toBeInTheDocument();

      // Advance 5 more seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByText("Request expires in 24s")).toBeInTheDocument();
    });

    it("shows progress bar that decreases over time", async () => {
      const payload = createSamplePayload();

      const { container } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Progress bar should be at 100% initially
      const progressBar = container.querySelector(".bg-success");
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: "100%" });

      // Advance 15 seconds (halfway)
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      // Progress bar should be at 50%
      expect(progressBar).toHaveStyle({ width: "50%" });
    });

    it("does not reset countdown when incomingCall changes to new call", async () => {
      // NOTE: Current behavior - timer continues when switching to a new call
      // The timer only resets when incomingCall becomes null
      const payload1 = createSamplePayload({ request: { ...createSamplePayload().request, requestId: "call_1" } });
      const payload2 = createSamplePayload({ request: { ...createSamplePayload().request, requestId: "call_2" } });

      const { rerender } = render(
        <IncomingCallModal
          incomingCall={payload1}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Advance 10 seconds
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText("Request expires in 20s")).toBeInTheDocument();

      // New call comes in - current behavior: timer continues from where it was
      rerender(
        <IncomingCallModal
          incomingCall={payload2}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Timer continues (does NOT reset) - this is current behavior
      // The timeElapsed state is only reset when incomingCall becomes null
      expect(screen.getByText("Request expires in 20s")).toBeInTheDocument();
    });
  });

  describe("Display - Time on Page", () => {
    it("shows time visitor has been on page", () => {
      const twoMinutesAgo = Date.now() - 120000;
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com",
          connectedAt: twoMinutesAgo,
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should show time in M:SS format
      expect(screen.getByText("2:00")).toBeInTheDocument();
    });

    it("displays 'Time on page' label", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("Time on page")).toBeInTheDocument();
    });

    it("formats time as M:SS with padded seconds", () => {
      const fiveSecondsAgo = Date.now() - 5000;
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com",
          connectedAt: fiveSecondsAgo,
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // 5 seconds should show as 0:05
      expect(screen.getByText("0:05")).toBeInTheDocument();
    });
  });

  describe("Display - Modal Visibility", () => {
    it("returns null when incomingCall is null", () => {
      const { container } = render(
        <IncomingCallModal
          incomingCall={null}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when incomingCall is provided", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("Incoming Request")).toBeInTheDocument();
    });

    it("shows 'A visitor wants to connect live' subtitle", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      expect(screen.getByText("A visitor wants to connect live")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Accept Button", () => {
    it("calls onAccept with requestId when Accept button clicked", () => {
      const onAccept = vi.fn();
      const payload = createSamplePayload({
        request: { ...createSamplePayload().request, requestId: "call_accept_test" },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={onAccept}
          onReject={defaultOnReject}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      fireEvent.click(acceptButton);

      expect(onAccept).toHaveBeenCalledWith("call_accept_test");
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it("Accept button has green success styling", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      const acceptButton = screen.getByRole("button", { name: /accept/i });
      expect(acceptButton).toHaveClass("bg-success");
    });

    it("Accept button shows Phone icon", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // The button should contain the Phone icon
      const acceptButton = screen.getByRole("button", { name: /accept/i });
      const phoneIcon = acceptButton.querySelector('[data-testid="phone-icon"]');
      expect(phoneIcon).toBeInTheDocument();
    });
  });

  describe("Actions - Reject Button", () => {
    it("calls onReject with requestId and 'Busy' reason when Decline button clicked", () => {
      const onReject = vi.fn();
      const payload = createSamplePayload({
        request: { ...createSamplePayload().request, requestId: "call_reject_test" },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={onReject}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      fireEvent.click(declineButton);

      expect(onReject).toHaveBeenCalledWith("call_reject_test", "Busy");
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it("Decline button has red destructive styling", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      const declineButton = screen.getByRole("button", { name: /decline/i });
      expect(declineButton).toHaveClass("bg-destructive/10", "text-destructive");
    });

    it("Decline button shows PhoneOff icon", () => {
      const payload = createSamplePayload();

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // The button should contain the PhoneOff icon
      const declineButton = screen.getByRole("button", { name: /decline/i });
      const phoneOffIcon = declineButton.querySelector('[data-testid="phone-off-icon"]');
      expect(phoneOffIcon).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles visitor with very short ID", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "v1",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Short ID should still show with "..." appended (current behavior)
      expect(screen.getByText("v1...")).toBeInTheDocument();
    });

    it("handles visitor connected just now (0 seconds)", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: null,
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should show 0:00
      expect(screen.getByText("0:00")).toBeInTheDocument();
    });

    it("handles location with only city", () => {
      const payload = createSamplePayload({
        visitor: {
          visitorId: "visitor_123",
          pageUrl: "https://example.com",
          connectedAt: Date.now(),
          location: {
            city: "Berlin",
            region: "",
            country: "Germany",
            countryCode: "DE",
          },
        },
      });

      render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should show city without region
      expect(screen.getByText("Berlin")).toBeInTheDocument();
    });

    it("clears timer interval when modal unmounts", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const payload = createSamplePayload();

      const { unmount } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("clears timer when incomingCall becomes null", () => {
      const payload = createSamplePayload();

      const { rerender } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Advance some time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Set incomingCall to null
      rerender(
        <IncomingCallModal
          incomingCall={null}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Modal should not render
      expect(screen.queryByText("Incoming Request")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // VISUAL ELEMENTS
  // ---------------------------------------------------------------------------

  describe("Visual Elements", () => {
    it("renders with full-screen backdrop", () => {
      const payload = createSamplePayload();

      const { container } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should have fixed inset-0 backdrop
      const backdrop = container.querySelector(".fixed.inset-0");
      expect(backdrop).toBeInTheDocument();
    });

    it("shows pulsing phone icon animation", () => {
      const payload = createSamplePayload();

      const { container } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should have animate-pulse class on the phone icon container
      const pulsingIcon = container.querySelector(".animate-pulse");
      expect(pulsingIcon).toBeInTheDocument();
    });

    it("shows animated ping ring around phone icon", () => {
      const payload = createSamplePayload();

      const { container } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should have animate-ping class for the ring effect
      const pingRing = container.querySelector(".animate-ping");
      expect(pingRing).toBeInTheDocument();
    });

    it("has glass morphism effect on modal", () => {
      const payload = createSamplePayload();

      const { container } = render(
        <IncomingCallModal
          incomingCall={payload}
          onAccept={defaultOnAccept}
          onReject={defaultOnReject}
        />
      );

      // Should have glass class for blur effect
      const modal = container.querySelector(".glass");
      expect(modal).toBeInTheDocument();
    });
  });
});





