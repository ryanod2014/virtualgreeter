/**
 * @vitest-environment jsdom
 *
 * FunnelTracker Tests
 *
 * Behaviors Tested:
 * 1. Calls trackFunnelEvent with step prop on mount
 * 2. Returns null (renders nothing)
 * 3. Does not call trackFunnelEvent multiple times on same step
 * 4. Calls trackFunnelEvent again when step prop changes
 * 5. Handles different step values
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// Mock the funnel tracking module
const mockTrackFunnelEvent = vi.fn();

vi.mock("@/lib/funnel-tracking", () => ({
  trackFunnelEvent: (...args: unknown[]) => mockTrackFunnelEvent(...args),
}));

import { FunnelTracker } from "./FunnelTracker";

describe("FunnelTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // TRACKING BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Tracking", () => {
    it("calls trackFunnelEvent with step prop on mount", () => {
      render(<FunnelTracker step="homepage_view" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("homepage_view");
      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(1);
    });

    it("calls trackFunnelEvent with different step values", () => {
      render(<FunnelTracker step="pricing_page" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("pricing_page");
    });

    it("handles step with underscores", () => {
      render(<FunnelTracker step="signup_form_view" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("signup_form_view");
    });

    it("handles step with hyphens", () => {
      render(<FunnelTracker step="checkout-start" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("checkout-start");
    });
  });

  // ---------------------------------------------------------------------------
  // RENDERING BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Rendering", () => {
    it("returns null (renders nothing visible)", () => {
      const { container } = render(<FunnelTracker step="test_step" />);

      expect(container.firstChild).toBeNull();
    });

    it("does not create any DOM elements", () => {
      const { container } = render(<FunnelTracker step="test_step" />);

      expect(container.innerHTML).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // RE-RENDER BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Re-render Behavior", () => {
    it("does not call trackFunnelEvent again on re-render with same step", () => {
      const { rerender } = render(<FunnelTracker step="same_step" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(1);

      // Re-render with same step
      rerender(<FunnelTracker step="same_step" />);

      // Should still only be called once (React.StrictMode might double-invoke)
      // In non-strict mode, useEffect with same dependency won't re-run
      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(1);
    });

    it("calls trackFunnelEvent again when step prop changes", () => {
      const { rerender } = render(<FunnelTracker step="step_one" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step_one");
      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(1);

      // Re-render with different step
      rerender(<FunnelTracker step="step_two" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step_two");
      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(2);
    });

    it("tracks each unique step value", () => {
      const { rerender } = render(<FunnelTracker step="step_a" />);
      rerender(<FunnelTracker step="step_b" />);
      rerender(<FunnelTracker step="step_c" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step_a");
      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step_b");
      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step_c");
      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(3);
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles empty string step", () => {
      render(<FunnelTracker step="" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("");
      expect(mockTrackFunnelEvent).toHaveBeenCalledTimes(1);
    });

    it("handles step with special characters", () => {
      render(<FunnelTracker step="step.with.dots" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step.with.dots");
    });

    it("handles step with numbers", () => {
      render(<FunnelTracker step="step_123" />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith("step_123");
    });

    it("handles long step names", () => {
      const longStep = "this_is_a_very_long_step_name_that_might_be_used_for_detailed_tracking";
      render(<FunnelTracker step={longStep} />);

      expect(mockTrackFunnelEvent).toHaveBeenCalledWith(longStep);
    });
  });

  // ---------------------------------------------------------------------------
  // UNMOUNT BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Unmount", () => {
    it("does not throw error on unmount", () => {
      const { unmount } = render(<FunnelTracker step="test" />);

      expect(() => unmount()).not.toThrow();
    });

    it("does not call trackFunnelEvent on unmount", () => {
      const { unmount } = render(<FunnelTracker step="test" />);
      
      // Clear the mock after initial mount call
      mockTrackFunnelEvent.mockClear();
      
      unmount();

      expect(mockTrackFunnelEvent).not.toHaveBeenCalled();
    });
  });
});



