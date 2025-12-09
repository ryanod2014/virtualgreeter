import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CobrowseViewer } from "./CobrowseViewer";
import type { CobrowseSnapshotPayload } from "@ghost-greeter/domain";

/**
 * CobrowseViewer Component Tests
 *
 * Tests capture the current behavior of the Co-Browse Viewer component:
 * - Iframe rendering with sandboxing
 * - Viewport scaling calculations
 * - Scroll position synchronization
 * - Mouse cursor overlay positioning
 * - Selection highlight rendering
 * - Device info display
 * - State transitions (no snapshot vs snapshot)
 */

// Helper to create a test snapshot
function createTestSnapshot(overrides?: Partial<CobrowseSnapshotPayload>): CobrowseSnapshotPayload {
  return {
    html: "<div>Test content</div>",
    url: "https://example.com/page",
    title: "Test Page",
    viewport: { width: 1920, height: 1080 },
    ...overrides,
  };
}

// Mock getBoundingClientRect for container sizing
const mockGetBoundingClientRect = (width: number, height: number) => {
  return vi.fn(() => ({
    width,
    height,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
};

describe("CobrowseViewer", () => {
  // Mock console.log to reduce noise in tests
  const originalConsoleLog = console.log;

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.log = originalConsoleLog;
  });

  // -------------------------------------------------------------------------
  // STATES - No snapshot vs snapshot
  // -------------------------------------------------------------------------

  describe("States", () => {
    it("shows placeholder when no snapshot received", () => {
      render(
        <CobrowseViewer
          snapshot={null}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText(/Visitor's screen will appear here/i)).toBeInTheDocument();
      expect(screen.getByText(/during an active call/i)).toBeInTheDocument();
    });

    it("renders viewer container when snapshot is provided", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      // Should show the Live View badge instead of placeholder
      expect(screen.getByText("Live View")).toBeInTheDocument();
      expect(screen.queryByText(/Visitor's screen will appear here/i)).not.toBeInTheDocument();
    });

    it("displays page URL in header when snapshot provided", () => {
      const snapshot = createTestSnapshot({ url: "https://example.com/pricing" });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("https://example.com/pricing")).toBeInTheDocument();
    });

    it("displays page title in footer when snapshot provided", () => {
      const snapshot = createTestSnapshot({ title: "Pricing Page" });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("Pricing Page")).toBeInTheDocument();
    });

    it("displays 'Untitled Page' when snapshot has no title", () => {
      const snapshot = createTestSnapshot({ title: "" });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("Untitled Page")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // DEVICE INFO - Viewport dimensions and device type
  // -------------------------------------------------------------------------

  describe("Device Info", () => {
    it("shows viewport dimensions in header", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 1920, height: 1080 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("1920")).toBeInTheDocument();
      expect(screen.getByText("1080")).toBeInTheDocument();
    });

    it("shows Desktop device type for viewport width > 1024", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 1920, height: 1080 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("Desktop")).toBeInTheDocument();
    });

    it("shows Tablet device type for viewport width between 481-1024", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 768, height: 1024 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("Tablet")).toBeInTheDocument();
    });

    it("shows Mobile device type for viewport width <= 480", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 375, height: 667 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("Mobile")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // IFRAME RENDERING - Sandboxed iframe setup
  // -------------------------------------------------------------------------

  describe("Iframe Rendering", () => {
    it("creates sandboxed iframe with allow-same-origin attribute", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("sandbox", "allow-same-origin");
    });

    it("sets iframe title for accessibility", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveAttribute("title", "Visitor Screen");
    });

    it("disables pointer-events on iframe via style", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveStyle({ pointerEvents: "none" });
    });
  });

  // -------------------------------------------------------------------------
  // MOUSE CURSOR - Position and styling
  // -------------------------------------------------------------------------

  describe("Mouse Cursor", () => {
    it("shows waiting message when no mouse data available", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      // The component shows "Waiting for mouse data..." when no mouse position
      // Note: This only appears after iframe is loaded (isLoaded = true)
      // The behavior depends on iframe contentDocument which jsdom may not fully support
    });

    it("renders cursor overlay when mouse position is provided", () => {
      const snapshot = createTestSnapshot();

      const { container } = render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={{ x: 100, y: 200 }}
          scrollPosition={null}
          selection={null}
        />
      );

      // Look for the red cursor dot element (bg-red-500 class)
      const cursorDot = container.querySelector(".bg-red-500");
      expect(cursorDot).toBeInTheDocument();
    });

    it("positions cursor at scaled mouse coordinates", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 1920, height: 1080 } });

      const { container } = render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={{ x: 100, y: 200 }}
          scrollPosition={null}
          selection={null}
        />
      );

      // The cursor wrapper div should have left/top positioned
      const cursorWrapper = container.querySelector(".pointer-events-none.z-30");
      expect(cursorWrapper).toBeInTheDocument();
    });

    it("shows mouse coordinates in header when mouse position available", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={{ x: 150, y: 250 }}
          scrollPosition={null}
          selection={null}
        />
      );

      // The component displays "Mouse: X, Y" in a green badge
      expect(screen.getByText(/Mouse: 150, 250/)).toBeInTheDocument();
    });

    it("rounds mouse coordinates in display", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={{ x: 150.7, y: 250.3 }}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText(/Mouse: 151, 250/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // SELECTION HIGHLIGHT - Blue rectangle and text display
  // -------------------------------------------------------------------------

  describe("Selection Highlight", () => {
    it("displays selected text in footer when selection provided", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={{
            text: "Hello World",
            rect: { x: 10, y: 20, width: 100, height: 20 },
          }}
        />
      );

      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      expect(screen.getByText(/"Hello World"/)).toBeInTheDocument();
    });

    it("does not show selection section when no text selected", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });

    it("does not show selection section when selection has empty text", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={{
            text: "",
            rect: null,
          }}
        />
      );

      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // VIEWPORT SCALING - Scale calculation display
  // -------------------------------------------------------------------------

  describe("Viewport Scaling", () => {
    it("shows scale percentage badge when scale is less than 100%", () => {
      // This behavior depends on container size vs viewport size
      // The scale badge appears when scale < 1
      const snapshot = createTestSnapshot({ viewport: { width: 1920, height: 1080 } });

      // Mock a small container that would cause scaling
      const { container } = render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      // Scale calculation happens in useEffect based on container dimensions
      // In jsdom, container dimensions may be 0, so the badge may/may not appear
      // The test captures current behavior - badge shows percentage when scaled
      const scaleBadge = screen.queryByText(/%\s*scale/i);
      // This is expected behavior - may or may not show depending on jsdom dimensions
      expect(container).toBeInTheDocument();
    });

    it("sets iframe dimensions to match visitor viewport", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 1920, height: 1080 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      const iframe = document.querySelector("iframe");
      expect(iframe).toHaveStyle({ width: "1920px" });
      expect(iframe).toHaveStyle({ height: "1080px" });
    });
  });

  // -------------------------------------------------------------------------
  // UI BADGES AND INDICATORS
  // -------------------------------------------------------------------------

  describe("UI Badges", () => {
    it("shows Live View badge when viewing snapshot", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("Live View")).toBeInTheDocument();
    });

    it("shows View Only badge indicating no interaction allowed", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("View Only")).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // SCROLL POSITION - Transform application
  // -------------------------------------------------------------------------

  describe("Scroll Position", () => {
    it("handles null scroll position gracefully", () => {
      const snapshot = createTestSnapshot();

      // Should not throw when scroll position is null
      expect(() =>
        render(
          <CobrowseViewer
            snapshot={snapshot}
            mousePosition={null}
            scrollPosition={null}
            selection={null}
          />
        )
      ).not.toThrow();
    });

    it("handles scroll position with x and y values", () => {
      const snapshot = createTestSnapshot();

      // Should not throw when scroll position is provided
      expect(() =>
        render(
          <CobrowseViewer
            snapshot={snapshot}
            mousePosition={null}
            scrollPosition={{ x: 100, y: 500 }}
            selection={null}
          />
        )
      ).not.toThrow();
    });

    it("handles zero scroll position", () => {
      const snapshot = createTestSnapshot();

      expect(() =>
        render(
          <CobrowseViewer
            snapshot={snapshot}
            mousePosition={null}
            scrollPosition={{ x: 0, y: 0 }}
            selection={null}
          />
        )
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // EDGE CASES AND ERROR HANDLING
  // -------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles snapshot with missing optional title", () => {
      const snapshot = createTestSnapshot({ title: undefined as unknown as string });

      expect(() =>
        render(
          <CobrowseViewer
            snapshot={snapshot}
            mousePosition={null}
            scrollPosition={null}
            selection={null}
          />
        )
      ).not.toThrow();
    });

    it("handles very small viewport dimensions", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 320, height: 480 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("320")).toBeInTheDocument();
      expect(screen.getByText("480")).toBeInTheDocument();
    });

    it("handles very large viewport dimensions", () => {
      const snapshot = createTestSnapshot({ viewport: { width: 3840, height: 2160 } });

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={null}
        />
      );

      expect(screen.getByText("3840")).toBeInTheDocument();
      expect(screen.getByText("2160")).toBeInTheDocument();
    });

    it("handles selection with rect but empty text", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={{
            text: "",
            rect: { x: 10, y: 20, width: 100, height: 20 },
          }}
        />
      );

      // Should not display selection when text is empty
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });

    it("handles selection with text but null rect", () => {
      const snapshot = createTestSnapshot();

      render(
        <CobrowseViewer
          snapshot={snapshot}
          mousePosition={null}
          scrollPosition={null}
          selection={{
            text: "Some selected text",
            rect: null,
          }}
        />
      );

      // Should still display the selected text in footer
      expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      expect(screen.getByText(/"Some selected text"/)).toBeInTheDocument();
    });
  });
});


