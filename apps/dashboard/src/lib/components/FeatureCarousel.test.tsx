/**
 * @vitest-environment jsdom
 *
 * FeatureCarousel Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows 4 visible features at a time
 * 2. Display - Shows feature title and description for each visible feature
 * 3. Display - Shows feature icons
 * 4. Display - Shows navigation counter (e.g., "1-4 of 11")
 * 5. Display - Shows "See more features" text
 * 6. Navigation - Up button disabled when at start
 * 7. Navigation - Down button enabled when more features below
 * 8. Navigation - Down button disabled when at end
 * 9. Navigation - Up button enabled after scrolling down
 * 10. Navigation - Clicking down advances by visibleCount
 * 11. Navigation - Clicking up goes back by visibleCount
 * 12. Mobile - Shows expand/collapse button on mobile
 * 13. Mobile - Clicking expand shows remaining features
 * 14. Mobile - Clicking again collapses features
 * 15. Animation - Sets isAnimating during scroll transition
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  Settings: () => <div data-testid="settings-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Video: () => <div data-testid="video-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronDownCircle: () => <div data-testid="chevron-down-circle-icon" />,
}));

import { FeatureCarousel } from "./FeatureCarousel";

describe("FeatureCarousel", () => {
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
  describe("Display", () => {
    it("shows first 4 features initially", () => {
      render(<FeatureCarousel />);

      // First 4 features from FEATURES array
      expect(screen.getByText("Customize Everything")).toBeInTheDocument();
      expect(screen.getByText("Only Shows When Available")).toBeInTheDocument();
      expect(screen.getByText("Assign Reps to Pages")).toBeInTheDocument();
      expect(screen.getByText("Record Every Call")).toBeInTheDocument();
    });

    it("does not show 5th feature initially", () => {
      render(<FeatureCarousel />);

      // 5th feature should not be visible in initial view
      expect(screen.queryByText("Auto-Transcribe Conversations")).not.toBeInTheDocument();
    });

    it("shows feature descriptions", () => {
      render(<FeatureCarousel />);

      expect(
        screen.getByText(
          "Control the look, size, pages it shows on, and which leads it blocks. Your brand, your rules."
        )
      ).toBeInTheDocument();
    });

    it("shows feature icons", () => {
      render(<FeatureCarousel />);

      expect(screen.getByTestId("settings-icon")).toBeInTheDocument();
      expect(screen.getByTestId("layers-icon")).toBeInTheDocument();
      expect(screen.getByTestId("users-icon")).toBeInTheDocument();
      expect(screen.getByTestId("video-icon")).toBeInTheDocument();
    });

    it("shows navigation counter with feature range", () => {
      const { container } = render(<FeatureCarousel />);

      // The desktop counter shows "1 - 4 of 11" split across spans
      // Mobile shows "1-4 of 11"
      // Just verify the counters exist in the navigation areas
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
      expect(desktopNav?.textContent).toContain("of 11");
    });

    it("shows 'See more features.' text in desktop navigation", () => {
      render(<FeatureCarousel />);

      expect(screen.getByText("See more features.")).toBeInTheDocument();
    });

    it("shows chevron icons for navigation", () => {
      render(<FeatureCarousel />);

      expect(screen.getByTestId("chevron-up-icon")).toBeInTheDocument();
      expect(screen.getByTestId("chevron-down-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DESKTOP NAVIGATION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Desktop Navigation", () => {
    it("up button is disabled when at start (startIndex = 0)", () => {
      render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const upButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-up-icon"]')
      );

      expect(upButton).toBeDisabled();
    });

    it("down button is enabled when more features are available", () => {
      render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      expect(downButton).not.toBeDisabled();
    });

    it("clicking down button advances to next set of features", async () => {
      render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      fireEvent.click(downButton!);

      // Wait for animation timeout (150ms + 50ms)
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Should now show features 5-8
      expect(screen.getByText("Auto-Transcribe Conversations")).toBeInTheDocument();
      expect(screen.getByText("AI Call Summaries")).toBeInTheDocument();
      expect(screen.getByText("Real-Time Analytics")).toBeInTheDocument();
      expect(screen.getByText("Custom Dispositions")).toBeInTheDocument();
    });

    it("updates counter after scrolling down", async () => {
      const { container } = render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      fireEvent.click(downButton!);

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Desktop counter should show 5-8 range now (mobile uses expand/collapse instead)
      const desktopNav = container.querySelector('.hidden.md\\:flex');
      expect(desktopNav?.textContent).toContain("5");
      expect(desktopNav?.textContent).toContain("8");
      expect(desktopNav?.textContent).toContain("11");
    });

    it("up button becomes enabled after scrolling down", async () => {
      render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      fireEvent.click(downButton!);

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      const upButton = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[data-testid="chevron-up-icon"]'));

      expect(upButton).not.toBeDisabled();
    });

    it("clicking up button goes back to previous set of features", async () => {
      const { container } = render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      // Scroll down first
      fireEvent.click(downButton!);
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Now scroll up
      const upButton = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[data-testid="chevron-up-icon"]'));

      fireEvent.click(upButton!);
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Should be back to features 1-4
      expect(screen.getByText("Customize Everything")).toBeInTheDocument();
      // Counter should show 1-4 of 11 again
      const mobileCounter = container.querySelector('.md\\:hidden span.text-muted-foreground');
      expect(mobileCounter?.textContent).toContain("1-4");
    });

    it("down button becomes disabled when at end", async () => {
      render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      // Scroll to end (11 features, visibleCount 4, so need to click until startIndex = 7)
      // First click: 0 -> 4
      fireEvent.click(downButton!);
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Second click: 4 -> 7 (clamped to FEATURES.length - visibleCount = 11 - 4 = 7)
      const downButton2 = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[data-testid="chevron-down-icon"]'));
      fireEvent.click(downButton2!);
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Now should be at end
      const downButtonFinal = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[data-testid="chevron-down-icon"]'));

      expect(downButtonFinal).toBeDisabled();
    });

    it("does not scroll when clicking disabled up button", () => {
      const { container } = render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const upButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-up-icon"]')
      );

      fireEvent.click(upButton!);

      // Should still show first features (1-4 range)
      const mobileCounter = container.querySelector('.md\\:hidden span.text-muted-foreground');
      expect(mobileCounter?.textContent).toContain("1-4");
    });
  });

  // ---------------------------------------------------------------------------
  // MOBILE NAVIGATION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Mobile Navigation", () => {
    it("shows 'See more features' link for mobile", () => {
      render(<FeatureCarousel />);

      // There's a mobile-specific "See more features" text (different from desktop)
      const mobileText = screen.getAllByText(/See more features/);
      expect(mobileText.length).toBeGreaterThanOrEqual(1);
    });

    it("shows mobile counter initially with feature range", () => {
      const { container } = render(<FeatureCarousel />);

      // Mobile shows "1-4 of 11" - find the span with "1-4"
      const mobileCounter = container.querySelector('.md\\:hidden span.text-muted-foreground');
      expect(mobileCounter?.textContent).toContain("1-4");
    });

    it("shows ChevronDownCircle icon for mobile expand", () => {
      render(<FeatureCarousel />);

      expect(screen.getByTestId("chevron-down-circle-icon")).toBeInTheDocument();
    });

    it("clicking mobile expand button shows remaining features", () => {
      render(<FeatureCarousel />);

      // Find the mobile expand button (has ChevronDownCircle)
      const mobileButtons = screen.getAllByRole("button");
      const mobileExpandButton = mobileButtons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-circle-icon"]')
      );

      fireEvent.click(mobileExpandButton!);

      // Should now show remaining features
      expect(screen.getByText("Auto-Transcribe Conversations")).toBeInTheDocument();
      expect(screen.getByText("AI Call Summaries")).toBeInTheDocument();
    });

    it("shows 'Show less' text after expanding", () => {
      render(<FeatureCarousel />);

      const mobileButtons = screen.getAllByRole("button");
      const mobileExpandButton = mobileButtons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-circle-icon"]')
      );

      fireEvent.click(mobileExpandButton!);

      expect(screen.getByText("Show less")).toBeInTheDocument();
    });

    it("clicking again collapses the expanded features", () => {
      render(<FeatureCarousel />);

      const mobileButtons = screen.getAllByRole("button");
      const mobileExpandButton = mobileButtons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-circle-icon"]')
      );

      // Expand
      fireEvent.click(mobileExpandButton!);
      expect(screen.getByText("AI Call Summaries")).toBeInTheDocument();

      // Collapse
      const collapseButton = screen
        .getAllByRole("button")
        .find((btn) => btn.querySelector('[data-testid="chevron-down-circle-icon"]'));
      fireEvent.click(collapseButton!);

      // Should no longer show expanded features (they're hidden by md:hidden class)
      // But the text "See more features" should be back
      expect(screen.queryByText("Show less")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ANIMATION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Animation", () => {
    it("ignores rapid clicks during animation", async () => {
      render(<FeatureCarousel />);

      const buttons = screen.getAllByRole("button");
      const downButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-icon"]')
      );

      // Click rapidly
      fireEvent.click(downButton!);
      fireEvent.click(downButton!);
      fireEvent.click(downButton!);

      // Wait for animation
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Should only have advanced once (to 5-8)
      expect(screen.getByText("5-8 of 11")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FEATURE CONTENT BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Feature Content", () => {
    it("each feature card has title and description", () => {
      render(<FeatureCarousel />);

      // Check that feature cards contain both title and description
      const customizeTitle = screen.getByText("Customize Everything");
      const customizeDescription = screen.getByText(/Control the look, size, pages it shows on/);

      expect(customizeTitle).toBeInTheDocument();
      expect(customizeDescription).toBeInTheDocument();
    });

    it("shows all 11 feature titles when fully expanded on mobile", () => {
      render(<FeatureCarousel />);

      const mobileButtons = screen.getAllByRole("button");
      const mobileExpandButton = mobileButtons.find((btn) =>
        btn.querySelector('[data-testid="chevron-down-circle-icon"]')
      );

      fireEvent.click(mobileExpandButton!);

      // Check for remaining features (5-11)
      expect(screen.getByText("Auto-Transcribe Conversations")).toBeInTheDocument();
      expect(screen.getByText("AI Call Summaries")).toBeInTheDocument();
      expect(screen.getByText("Real-Time Analytics")).toBeInTheDocument();
      expect(screen.getByText("Custom Dispositions")).toBeInTheDocument();
      expect(screen.getByText("Facebook Pixel Integration")).toBeInTheDocument();
      expect(screen.getByText("Block Countries")).toBeInTheDocument();
      expect(screen.getByText("Spam Protection")).toBeInTheDocument();
    });
  });
});

