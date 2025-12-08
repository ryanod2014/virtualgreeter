/**
 * @vitest-environment jsdom
 *
 * CobrowseViewer TKT-052 Loading States Tests
 *
 * Tests for TKT-052 loading state feature:
 * - Shows loading spinner with "Loading visitor's screen..." when awaiting first snapshot
 * - Shows placeholder after first snapshot received when no active snapshot
 * - Shows "Updating..." indicator for 500ms on subsequent snapshot updates
 * - Properly cleans up timers to prevent memory leaks
 * - Handles rapid updates without flickering
 * - Transitions correctly between loading/active/placeholder states
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CobrowseSnapshotPayload } from "@ghost-greeter/domain";
import { CobrowseViewer } from "./CobrowseViewer";

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

describe("CobrowseViewer - TKT-052: Loading States", () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    console.log = originalConsoleLog;
  });

  it("shows loading spinner with 'Loading visitor's screen...' when awaiting first snapshot", () => {
    render(
      <CobrowseViewer
        snapshot={null}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    expect(screen.getByText("Loading visitor's screen...")).toBeInTheDocument();
    expect(screen.getByText("Waiting for first snapshot")).toBeInTheDocument();
  });

  it("shows placeholder after first snapshot received when no active snapshot", () => {
    const { rerender } = render(
      <CobrowseViewer
        snapshot={null}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // First: Should show loading spinner
    expect(screen.getByText("Loading visitor's screen...")).toBeInTheDocument();

    // Simulate receiving first snapshot
    const mockSnapshot = createTestSnapshot();
    rerender(
      <CobrowseViewer
        snapshot={mockSnapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Now snapshot is loaded
    expect(screen.queryByText("Loading visitor's screen...")).not.toBeInTheDocument();
    expect(screen.getByText("Live View")).toBeInTheDocument();

    // Remove snapshot (e.g., call ended)
    rerender(
      <CobrowseViewer
        snapshot={null}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Should now show placeholder, NOT loading spinner
    expect(screen.queryByText("Loading visitor's screen...")).not.toBeInTheDocument();
    expect(screen.getByText(/Visitor's screen will appear here/i)).toBeInTheDocument();
  });

  it("shows 'Updating...' indicator when receiving subsequent snapshots", () => {
    const initialSnapshot = createTestSnapshot();
    const { rerender } = render(
      <CobrowseViewer
        snapshot={initialSnapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Should not show updating on first snapshot
    expect(screen.queryByText("Updating...")).not.toBeInTheDocument();

    // Simulate receiving updated snapshot
    const updatedSnapshot = createTestSnapshot({
      html: "<html><body><h1>Updated Page</h1></body></html>",
    });

    rerender(
      <CobrowseViewer
        snapshot={updatedSnapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Should show "Updating..." indicator
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });

  it("clears 'Updating...' indicator after 500ms timeout", () => {
    const initialSnapshot = createTestSnapshot();
    const { rerender } = render(
      <CobrowseViewer
        snapshot={initialSnapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Receive updated snapshot
    const updatedSnapshot = createTestSnapshot({
      html: "<html><body><h1>Updated</h1></body></html>",
    });

    rerender(
      <CobrowseViewer
        snapshot={updatedSnapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Initially shows "Updating..."
    expect(screen.getByText("Updating...")).toBeInTheDocument();

    // Fast-forward 500ms
    vi.advanceTimersByTime(500);

    // Should no longer show "Updating..."
    expect(screen.queryByText("Updating...")).not.toBeInTheDocument();
  });

  it("handles rapid snapshot updates without leaving stale timers", () => {
    const snapshot1 = createTestSnapshot({ html: "<div>Version 1</div>" });
    const { rerender } = render(
      <CobrowseViewer
        snapshot={snapshot1}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Rapid updates
    const snapshot2 = createTestSnapshot({ html: "<div>Version 2</div>" });
    const snapshot3 = createTestSnapshot({ html: "<div>Version 3</div>" });

    rerender(
      <CobrowseViewer
        snapshot={snapshot2}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    expect(screen.getByText("Updating...")).toBeInTheDocument();

    // Third update before timer expires
    rerender(
      <CobrowseViewer
        snapshot={snapshot3}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // Still shows updating
    expect(screen.getByText("Updating...")).toBeInTheDocument();

    // Wait for timeout
    vi.advanceTimersByTime(500);

    expect(screen.queryByText("Updating...")).not.toBeInTheDocument();
  });

  it("properly transitions from loading to active to placeholder states", () => {
    const { rerender } = render(
      <CobrowseViewer
        snapshot={null}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );

    // 1. Initial loading state
    expect(screen.getByText("Loading visitor's screen...")).toBeInTheDocument();

    // 2. Receive first snapshot
    const snapshot = createTestSnapshot();
    rerender(
      <CobrowseViewer
        snapshot={snapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );
    expect(screen.queryByText("Loading visitor's screen...")).not.toBeInTheDocument();
    expect(screen.getByText("Test Page")).toBeInTheDocument();

    // 3. Call ends (snapshot becomes null)
    rerender(
      <CobrowseViewer
        snapshot={null}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );
    expect(screen.getByText(/Visitor's screen will appear here/i)).toBeInTheDocument();

    // 4. New call starts (new snapshot)
    rerender(
      <CobrowseViewer
        snapshot={snapshot}
        mousePosition={null}
        scrollPosition={null}
        selection={null}
      />
    );
    expect(screen.getByText("Test Page")).toBeInTheDocument();
  });
});
