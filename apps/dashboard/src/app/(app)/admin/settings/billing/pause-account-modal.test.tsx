/**
 * @vitest-environment jsdom
 *
 * PauseAccountModal Tests
 *
 * Behaviors Tested:
 * 1. Display: Returns null when not open, shows modal when open
 * 2. Display: Shows correct title based on completion state
 * 3. Display: Shows duration options (1, 2, 3 months)
 * 4. Display: Shows "Pause for Free" highlight
 * 5. Display: Shows what's preserved while paused
 * 6. Display: Shows calculated resume date
 * 7. Actions: Duration selection updates selectedMonths
 * 8. Actions: Pause button calls onPause with correct args
 * 9. Actions: Shows loading state during submission
 * 10. Actions: Shows completion screen after pause
 * 11. Actions: "Continue to cancel" calls onContinueToCancel
 * 12. Actions: Close/backdrop resets state and calls onClose
 * 13. Edge Cases: Button disabled during submission
 * 14. Edge Cases: Error handling (logs error, resets submitting state)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <div data-testid="x-icon" />,
  Snowflake: () => <div data-testid="snowflake-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  PlayCircle: () => <div data-testid="play-circle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

import { PauseAccountModal } from "./pause-account-modal";

describe("PauseAccountModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onPause: vi.fn().mockResolvedValue(undefined),
    onContinueToCancel: vi.fn(),
    organizationName: "Test Org",
    agentCount: 3,
    monthlyTotal: 99,
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

  describe("Display - Modal Visibility", () => {
    it("returns null when isOpen is false", () => {
      const { container } = render(
        <PauseAccountModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when isOpen is true", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText("Wait — Need a Break Instead?")).toBeInTheDocument();
    });

    it("shows subtitle about pausing account", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText("Pause your account for free and keep all your data")).toBeInTheDocument();
    });
  });

  describe("Display - Duration Options", () => {
    it("shows all three duration options", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText("1 Month")).toBeInTheDocument();
      expect(screen.getByText("2 Months")).toBeInTheDocument();
      expect(screen.getByText("3 Months")).toBeInTheDocument();
    });

    it("shows descriptions for each duration option", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText("Quick break")).toBeInTheDocument();
      expect(screen.getByText("Short hiatus")).toBeInTheDocument();
      expect(screen.getByText("Extended pause")).toBeInTheDocument();
    });

    it("1 month is selected by default", () => {
      render(<PauseAccountModal {...defaultProps} />);

      // The pause button should show "Pause for 1 Month"
      expect(screen.getByRole("button", { name: /pause for 1 month/i })).toBeInTheDocument();
    });

    it("shows checkmark on selected option", () => {
      render(<PauseAccountModal {...defaultProps} />);

      // Check icons are present (one is shown for the selected option)
      const checkIcons = screen.getAllByTestId("check-icon");
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe("Display - Pause for Free Highlight", () => {
    it("shows 'Pause for Free' heading", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText("Pause for Free")).toBeInTheDocument();
    });

    it("shows description about keeping data", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText(/Take a break without losing any of your recordings/)).toBeInTheDocument();
    });
  });

  describe("Display - What's Preserved", () => {
    it("shows 'What's preserved while paused' section", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText(/What's preserved while paused/)).toBeInTheDocument();
    });

    it("shows all preservation items", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText("All call recordings")).toBeInTheDocument();
      expect(screen.getByText("Call logs & history")).toBeInTheDocument();
      expect(screen.getByText("Analytics & stats")).toBeInTheDocument();
      expect(screen.getByText("Agent configurations")).toBeInTheDocument();
      expect(screen.getByText("Pool & routing rules")).toBeInTheDocument();
      expect(screen.getByText("One-click reactivation")).toBeInTheDocument();
    });

    it("shows widget hidden notice", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText(/Widget will be hidden on your sites during pause/)).toBeInTheDocument();
    });
  });

  describe("Display - Resume Date", () => {
    it("shows auto-resume date message", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText(/Your subscription will auto-resume on/)).toBeInTheDocument();
    });

    it("displays a calculated future date", () => {
      render(<PauseAccountModal {...defaultProps} />);

      // The resume date should be a future date (1 month from now by default)
      const resumeDateContainer = screen.getByText(/Your subscription will auto-resume on/).closest("div");
      expect(resumeDateContainer).toBeInTheDocument();
      // Date should contain month name like "January", "February", etc.
      const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)/;
      expect(resumeDateContainer?.textContent).toMatch(datePattern);
    });
  });

  describe("Display - Reason Input", () => {
    it("shows optional reason textarea", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByText(/Why are you pausing/)).toBeInTheDocument();
      expect(screen.getByText("(optional)")).toBeInTheDocument();
    });

    it("shows placeholder text in textarea", () => {
      render(<PauseAccountModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/Seasonal slowdown/);
      expect(textarea).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Duration Selection", () => {
    it("updates selected duration when clicking 2 Months option", () => {
      render(<PauseAccountModal {...defaultProps} />);

      const twoMonthsButton = screen.getByText("2 Months").closest("button");
      fireEvent.click(twoMonthsButton!);

      // Pause button should now say "Pause for 2 Months"
      expect(screen.getByRole("button", { name: /pause for 2 months/i })).toBeInTheDocument();
    });

    it("updates selected duration when clicking 3 Months option", () => {
      render(<PauseAccountModal {...defaultProps} />);

      const threeMonthsButton = screen.getByText("3 Months").closest("button");
      fireEvent.click(threeMonthsButton!);

      // Pause button should now say "Pause for 3 Months"
      expect(screen.getByRole("button", { name: /pause for 3 months/i })).toBeInTheDocument();
    });

    it("can switch back to 1 Month after selecting another", () => {
      render(<PauseAccountModal {...defaultProps} />);

      // Select 3 months
      const threeMonthsButton = screen.getByText("3 Months").closest("button");
      fireEvent.click(threeMonthsButton!);
      expect(screen.getByRole("button", { name: /pause for 3 months/i })).toBeInTheDocument();

      // Select back to 1 month
      const oneMonthButton = screen.getByText("1 Month").closest("button");
      fireEvent.click(oneMonthButton!);
      expect(screen.getByRole("button", { name: /pause for 1 month/i })).toBeInTheDocument();
    });
  });

  describe("Actions - Reason Input", () => {
    it("allows typing in the reason textarea", () => {
      render(<PauseAccountModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/Seasonal slowdown/) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Budget review" } });

      expect(textarea.value).toBe("Budget review");
    });
  });

  describe("Actions - Pause Button", () => {
    it("calls onPause with selectedMonths and reason when clicked", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      // Select 2 months
      const twoMonthsButton = screen.getByText("2 Months").closest("button");
      fireEvent.click(twoMonthsButton!);

      // Enter reason
      const textarea = screen.getByPlaceholderText(/Seasonal slowdown/);
      fireEvent.change(textarea, { target: { value: "Taking a break" } });

      // Click pause
      const pauseButton = screen.getByRole("button", { name: /pause for 2 months/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(onPause).toHaveBeenCalledWith(2, "Taking a break");
      });
    });

    it("shows loading state during submission", async () => {
      let resolvePromise: () => void;
      const onPause = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      // Should show "Pausing..." text
      await waitFor(() => {
        expect(screen.getByText("Pausing...")).toBeInTheDocument();
      });

      // Should show loader icon
      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();

      // Resolve to clean up
      resolvePromise!();
    });

    it("disables pause button during submission", async () => {
      let resolvePromise: () => void;
      const onPause = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        const submittingButton = screen.getByRole("button", { name: /pausing/i });
        expect(submittingButton).toBeDisabled();
      });

      resolvePromise!();
    });
  });

  describe("Actions - Completion Screen", () => {
    it("shows completion screen after successful pause", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText("Account Paused")).toBeInTheDocument();
      });
    });

    it("shows 'You're all set!' message on completion", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText("You're all set!")).toBeInTheDocument();
      });
    });

    it("shows correct pause duration in completion message", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      // Select 2 months
      const twoMonthsButton = screen.getByText("2 Months").closest("button");
      fireEvent.click(twoMonthsButton!);

      const pauseButton = screen.getByRole("button", { name: /pause for 2 months/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText(/paused for 2 months/)).toBeInTheDocument();
      });
    });

    it("shows 'What happens next' section on completion", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText("What happens next:")).toBeInTheDocument();
        expect(screen.getByText("All your data is safely preserved")).toBeInTheDocument();
        expect(screen.getByText("Email reminder 7 days before resume")).toBeInTheDocument();
      });
    });

    it("shows Done button on completion", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
      });
    });

    it("calls onClose when Done button clicked", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<PauseAccountModal {...defaultProps} onPause={onPause} onClose={onClose} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
      });

      const doneButton = screen.getByRole("button", { name: /done/i });
      fireEvent.click(doneButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Actions - Continue to Cancel", () => {
    it("calls onContinueToCancel when cancel link clicked", () => {
      const onContinueToCancel = vi.fn();
      render(<PauseAccountModal {...defaultProps} onContinueToCancel={onContinueToCancel} />);

      const cancelLink = screen.getByText(/No, cancel and delete all my data/);
      fireEvent.click(cancelLink);

      expect(onContinueToCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Actions - Close Button (X)", () => {
    it("calls onClose when X button clicked", () => {
      const onClose = vi.fn();
      render(<PauseAccountModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Actions - Backdrop Click", () => {
    it("calls onClose when backdrop clicked", () => {
      const onClose = vi.fn();
      const { container } = render(<PauseAccountModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector(".bg-black\\/60");
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("logs error when onPause fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onPause = vi.fn().mockRejectedValue(new Error("Pause failed"));
      const onClose = vi.fn();

      render(<PauseAccountModal {...defaultProps} onPause={onPause} onClose={onClose} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Failed to pause account:", expect.any(Error));
      });

      // Should NOT show completion screen
      expect(screen.queryByText("Account Paused")).not.toBeInTheDocument();

      // Modal should remain open (no onClose call)
      expect(onClose).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("resets submitting state after failed pause", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onPause = vi.fn().mockRejectedValue(new Error("Pause failed"));

      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      // Button should be enabled again
      await waitFor(() => {
        const retryButton = screen.getByRole("button", { name: /pause for 1 month/i });
        expect(retryButton).not.toBeDisabled();
      });

      consoleSpy.mockRestore();
    });

    it("resets state when closing via X button", async () => {
      const onClose = vi.fn();
      const { rerender } = render(<PauseAccountModal {...defaultProps} onClose={onClose} />);

      // Select 3 months and enter reason
      const threeMonthsButton = screen.getByText("3 Months").closest("button");
      fireEvent.click(threeMonthsButton!);

      const textarea = screen.getByPlaceholderText(/Seasonal slowdown/);
      fireEvent.change(textarea, { target: { value: "Some reason" } });

      // Close modal
      const closeButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalled();

      // Re-open modal
      rerender(<PauseAccountModal {...defaultProps} onClose={onClose} />);

      // Should be reset to defaults (1 month selected, empty reason)
      expect(screen.getByRole("button", { name: /pause for 1 month/i })).toBeInTheDocument();
      const newTextarea = screen.getByPlaceholderText(/Seasonal slowdown/) as HTMLTextAreaElement;
      expect(newTextarea.value).toBe("");
    });

    it("handles empty reason gracefully", async () => {
      const onPause = vi.fn().mockResolvedValue(undefined);
      render(<PauseAccountModal {...defaultProps} onPause={onPause} />);

      // Don't enter any reason, just click pause
      const pauseButton = screen.getByRole("button", { name: /pause for 1 month/i });
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(onPause).toHaveBeenCalledWith(1, "");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // VISUAL ELEMENTS
  // ---------------------------------------------------------------------------

  describe("Visual Elements", () => {
    it("shows Snowflake icon in header and button", () => {
      render(<PauseAccountModal {...defaultProps} />);

      // Multiple snowflake icons exist: one in header, one on pause button
      const snowflakeIcons = screen.getAllByTestId("snowflake-icon");
      expect(snowflakeIcons.length).toBeGreaterThanOrEqual(2);
    });

    it("shows Shield icon in preservation section", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByTestId("shield-icon")).toBeInTheDocument();
    });

    it("shows PlayCircle icon in resume date section", () => {
      render(<PauseAccountModal {...defaultProps} />);

      expect(screen.getByTestId("play-circle-icon")).toBeInTheDocument();
    });

    it("has fixed positioning with full screen backdrop", () => {
      const { container } = render(<PauseAccountModal {...defaultProps} />);

      const modalContainer = container.querySelector(".fixed.inset-0");
      expect(modalContainer).toBeInTheDocument();
    });
  });
});


