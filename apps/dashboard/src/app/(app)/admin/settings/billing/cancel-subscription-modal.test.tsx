import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <div data-testid="x-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Puzzle: () => <div data-testid="puzzle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  UserX: () => <div data-testid="user-x-icon" />,
  UsersRound: () => <div data-testid="users-round-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  PiggyBank: () => <div data-testid="piggy-bank-icon" />,
  Wrench: () => <div data-testid="wrench-icon" />,
  HelpCircle: () => <div data-testid="help-circle-icon" />,
  Building2: () => <div data-testid="building2-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Check: () => <div data-testid="check-icon" />,
}));

import { CancelSubscriptionModal, type CancellationData } from "./cancel-subscription-modal";

/**
 * CancelSubscriptionModal Component Tests
 *
 * Tests capture the current behavior of the CancelSubscriptionModal component:
 * - Display: Shows cancellation message, organization info, multi-step wizard
 * - Step Navigation: Reason selection -> Details -> Confirmation
 * - Actions: Confirm triggers onSubmit, Cancel/Close calls onClose
 * - Form Validation: Primary reason required, detailed feedback required
 * - Loading/Completion States: Shows loading during submission, completion screen after
 */

describe("CancelSubscriptionModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    organizationName: "Acme Corp",
    agentCount: 5,
    monthlyTotal: 149,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // DISPLAY BEHAVIORS
  // ===========================================================================

  describe("Display - Modal Visibility", () => {
    it("returns null when isOpen is false", () => {
      const { container } = render(
        <CancelSubscriptionModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when isOpen is true", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByText("Cancel Subscription")).toBeInTheDocument();
    });

    it("shows backdrop overlay when modal is open", () => {
      const { container } = render(<CancelSubscriptionModal {...defaultProps} />);

      const backdrop = container.querySelector(".bg-black\\/60");
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe("Display - Shows cancellation message", () => {
    it("shows header with Cancel Subscription title", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByRole("heading", { name: /Cancel Subscription/i })).toBeInTheDocument();
    });

    it("shows organization name in header subtitle", () => {
      render(<CancelSubscriptionModal {...defaultProps} organizationName="Test Org" />);

      expect(screen.getByText(/Test Org/)).toBeInTheDocument();
    });

    it("shows agent count in header subtitle", () => {
      render(<CancelSubscriptionModal {...defaultProps} agentCount={3} />);

      expect(screen.getByText(/3 agents/)).toBeInTheDocument();
    });

    it("shows singular 'agent' when agentCount is 1", () => {
      render(<CancelSubscriptionModal {...defaultProps} agentCount={1} />);

      expect(screen.getByText(/1 agent •/)).toBeInTheDocument();
    });

    it("shows monthly total in header subtitle", () => {
      render(<CancelSubscriptionModal {...defaultProps} monthlyTotal={299} />);

      expect(screen.getByText(/\$299\/mo/)).toBeInTheDocument();
    });

    it("shows AlertTriangle icon in header", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByTestId("alert-triangle-icon")).toBeInTheDocument();
    });

    it("shows 'What's the main reason you're cancelling?' on first step", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByText(/What's the main reason you're cancelling/)).toBeInTheDocument();
    });

    it("shows feedback message encouraging user feedback", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByText(/Your feedback helps us improve our product/)).toBeInTheDocument();
    });
  });

  describe("Display - Step Progress Indicator", () => {
    it("shows 3-step progress indicator", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByText("Select Reason")).toBeInTheDocument();
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Confirm")).toBeInTheDocument();
    });

    it("highlights 'Select Reason' step as current on first step", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      // Step 1 should be active (has number 1 visible)
      const stepIndicators = screen.getAllByText("1");
      expect(stepIndicators.length).toBeGreaterThan(0);
    });
  });

  describe("Display - Cancellation Reasons", () => {
    it("shows all 11 cancellation reason options", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByText("Reps Aren't Using It")).toBeInTheDocument();
      expect(screen.getByText("Not Enough Reps")).toBeInTheDocument();
      expect(screen.getByText("Low Website Traffic")).toBeInTheDocument();
      expect(screen.getByText("Low ROI Per Call")).toBeInTheDocument();
      expect(screen.getByText("Too Expensive")).toBeInTheDocument();
      expect(screen.getByText("Missing Features")).toBeInTheDocument();
      expect(screen.getByText("Switching to Competitor")).toBeInTheDocument();
      expect(screen.getByText("Technical Issues")).toBeInTheDocument();
      expect(screen.getByText("Difficult to Use")).toBeInTheDocument();
      expect(screen.getByText("Business Closed")).toBeInTheDocument();
      expect(screen.getByText("Other Reason")).toBeInTheDocument();
    });

    it("shows description for each cancellation reason", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByText("Our team isn't adopting the tool")).toBeInTheDocument();
      expect(screen.getByText("The pricing doesn't fit our budget")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // STEP NAVIGATION BEHAVIORS
  // ===========================================================================

  describe("Step Navigation - Step 1: Reason Selection", () => {
    it("Continue button is disabled when no reason is selected", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it("Continue button is enabled when a reason is selected", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      // Click on a reason
      fireEvent.click(screen.getByText("Too Expensive"));

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).not.toBeDisabled();
    });

    it("highlights selected reason with visual styling", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      const reasonButton = screen.getByText("Too Expensive").closest("button");
      fireEvent.click(reasonButton!);

      // The button should have border-primary class when selected
      expect(reasonButton).toHaveClass("border-primary");
    });

    it("advances to step 2 when Continue is clicked with selected reason", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Should now show Details step content
      expect(screen.getByText(/Any other contributing factors/)).toBeInTheDocument();
    });
  });

  describe("Step Navigation - Step 2: Details", () => {
    const goToStep2 = () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    };

    it("shows primary reason reminder", () => {
      goToStep2();

      expect(screen.getByText("Primary reason:")).toBeInTheDocument();
      expect(screen.getByText("Too Expensive")).toBeInTheDocument();
    });

    it("shows additional reasons selector", () => {
      goToStep2();

      expect(screen.getByText(/Any other contributing factors/)).toBeInTheDocument();
      expect(screen.getByText("Select all that apply (optional)")).toBeInTheDocument();
    });

    it("excludes primary reason from additional reasons list", () => {
      goToStep2();

      // "Too Expensive" should not be in the additional reasons (since it's primary)
      const additionalButtons = screen.getAllByRole("button").filter(
        (btn) => btn.textContent?.includes("Too Expensive") && btn.classList.contains("rounded-full")
      );
      expect(additionalButtons.length).toBe(0);
    });

    it("shows detailed feedback textarea", () => {
      goToStep2();

      expect(screen.getByPlaceholderText(/What could we have done better/)).toBeInTheDocument();
    });

    it("marks detailed feedback as required", () => {
      goToStep2();

      expect(screen.getByText(/Tell us more about your experience/)).toBeInTheDocument();
      expect(screen.getByText("(required)")).toBeInTheDocument();
    });

    it("Continue button is disabled when detailed feedback is empty", () => {
      goToStep2();

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });

    it("Continue button is enabled when detailed feedback is provided", () => {
      goToStep2();

      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Some feedback" } });

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).not.toBeDisabled();
    });

    it("shows competitor name input when 'switched_to_competitor' is selected", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Switching to Competitor"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      expect(screen.getByPlaceholderText(/Intercom, Drift, Zendesk/)).toBeInTheDocument();
    });

    it("shows 'would return' question", () => {
      goToStep2();

      expect(screen.getByText(/Would you consider using GreetNow again/)).toBeInTheDocument();
    });

    it("shows return conditions textarea when user selects 'Yes, possibly'", () => {
      goToStep2();

      fireEvent.click(screen.getByText("Yes, possibly"));

      expect(screen.getByPlaceholderText(/Lower pricing, specific features/)).toBeInTheDocument();
    });

    it("Back button returns to step 1", () => {
      goToStep2();

      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      expect(screen.getByText(/What's the main reason you're cancelling/)).toBeInTheDocument();
    });

    it("advances to step 3 when Continue is clicked with valid feedback", () => {
      goToStep2();

      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Some feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Should show confirmation step with TKT-003 30-day retention notice
      expect(screen.getByText(/Data Retention Notice/)).toBeInTheDocument();
    });
  });

  describe("Step Navigation - Step 3: Confirmation (TKT-003)", () => {
    const goToStep3 = () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Some feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    };

    it("shows Data Retention Notice heading", () => {
      goToStep3();

      expect(screen.getByText("Data Retention Notice")).toBeInTheDocument();
    });

    it("shows 30-day data retention message", () => {
      goToStep3();

      expect(screen.getByText(/Your data will be retained for 30 days after cancellation, then may be permanently deleted/)).toBeInTheDocument();
    });

    it("shows affected data heading", () => {
      goToStep3();

      expect(screen.getByText("The following data will be affected:")).toBeInTheDocument();
    });

    it("lists all data types that will be affected", () => {
      goToStep3();

      expect(screen.getByText(/All call recordings/)).toBeInTheDocument();
      expect(screen.getByText(/Call logs & history/)).toBeInTheDocument();
      expect(screen.getByText(/Analytics & stats/)).toBeInTheDocument();
      expect(screen.getByText(/Agent configurations/)).toBeInTheDocument();
      expect(screen.getByText(/Routing rules/)).toBeInTheDocument();
    });

    it("shows resubscribe within 30 days message", () => {
      goToStep3();

      expect(screen.getByText("You can resubscribe within 30 days to retain your data.")).toBeInTheDocument();
    });

    it("shows feedback summary", () => {
      goToStep3();

      expect(screen.getByText(/Your feedback summary/)).toBeInTheDocument();
      expect(screen.getByText("Too Expensive")).toBeInTheDocument();
    });

    it("shows Cancel Subscription button in red", () => {
      goToStep3();

      const cancelButton = screen.getByRole("button", { name: /cancel subscription/i });
      expect(cancelButton).toHaveClass("bg-red-600");
    });

    it("Back button returns to step 2", () => {
      goToStep3();

      fireEvent.click(screen.getByRole("button", { name: /back/i }));

      expect(screen.getByText(/Any other contributing factors/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // ACTION BEHAVIORS
  // ===========================================================================

  describe("Actions - Shows confirmation button", () => {
    it("shows 'Keep Subscription' button on all steps", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /keep subscription/i })).toBeInTheDocument();
    });

    it("shows 'Cancel Subscription' button on final step", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      
      // Navigate to final step
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      expect(screen.getByRole("button", { name: /cancel subscription/i })).toBeInTheDocument();
    });
  });

  describe("Actions - Confirm triggers onSubmit (cancelSubscription)", () => {
    const completeFormAndSubmit = async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Step 1: Select reason
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 2: Add details
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Too expensive for our budget" } });
      fireEvent.click(screen.getByText("Yes, possibly"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Confirm
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      return onSubmit;
    };

    it("calls onSubmit when Cancel Subscription button is clicked", async () => {
      const onSubmit = await completeFormAndSubmit();

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it("passes correct cancellation data to onSubmit", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Step 1: Select reason
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 2: Add details
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Too expensive for us" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Confirm
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          primaryReason: "too_expensive",
          additionalReasons: [],
          detailedFeedback: "Too expensive for us",
          competitorName: "",
          wouldReturn: null,
          returnConditions: "",
        });
      });
    });

    it("includes additional reasons in submission data", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Step 1: Select reason
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 2: Add additional reasons
      fireEvent.click(screen.getByText("Technical Issues"));
      fireEvent.click(screen.getByText("Difficult to Use"));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Confirm
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            additionalReasons: ["technical_issues", "difficult_to_use"],
          })
        );
      });
    });

    it("includes competitor name when switching to competitor", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Step 1: Select reason
      fireEvent.click(screen.getByText("Switching to Competitor"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 2: Add competitor name
      const competitorInput = screen.getByPlaceholderText(/Intercom, Drift, Zendesk/);
      fireEvent.change(competitorInput, { target: { value: "Intercom" } });
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Confirm
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            competitorName: "Intercom",
          })
        );
      });
    });

    it("includes wouldReturn and returnConditions in submission", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Step 1: Select reason
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 2: Add return info
      fireEvent.click(screen.getByText("Yes, possibly"));
      const returnInput = screen.getByPlaceholderText(/Lower pricing, specific features/);
      fireEvent.change(returnInput, { target: { value: "Lower prices" } });
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Step 3: Confirm
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            wouldReturn: true,
            returnConditions: "Lower prices",
          })
        );
      });
    });

    it("shows loading state during submission", async () => {
      let resolveSubmit: () => void;
      const onSubmit = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
      );
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Navigate to final step
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(screen.getByText("Cancelling...")).toBeInTheDocument();
      });

      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();

      resolveSubmit!();
    });

    it("disables Cancel Subscription button during submission", async () => {
      let resolveSubmit: () => void;
      const onSubmit = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
      );
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Navigate to final step
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        const cancellingButton = screen.getByRole("button", { name: /cancelling/i });
        expect(cancellingButton).toBeDisabled();
      });

      resolveSubmit!();
    });

    it("shows completion screen after successful submission", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Navigate to final step
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(screen.getByText("Subscription Cancelled")).toBeInTheDocument();
      });

      expect(screen.getByText(/We're sorry to see you go/)).toBeInTheDocument();
      expect(screen.getByText(/Your subscription has been cancelled/)).toBeInTheDocument();
    });

    it("shows Close button on completion screen", async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Navigate to final step
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
      });
    });

    it("logs error when submission fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onSubmit = vi.fn().mockRejectedValue(new Error("Submission failed"));
      render(<CancelSubscriptionModal {...defaultProps} onSubmit={onSubmit} />);

      // Navigate to final step
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Failed to submit cancellation:", expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Actions - Cancel closes modal", () => {
    it("calls onClose when Keep Subscription button is clicked", () => {
      const onClose = vi.fn();
      render(<CancelSubscriptionModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: /keep subscription/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when X button is clicked", () => {
      const onClose = vi.fn();
      render(<CancelSubscriptionModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", () => {
      const onClose = vi.fn();
      const { container } = render(<CancelSubscriptionModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector(".bg-black\\/60");
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Close button is clicked on completion screen", async () => {
      const onClose = vi.fn();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CancelSubscriptionModal {...defaultProps} onClose={onClose} onSubmit={onSubmit} />);

      // Navigate to final step and submit
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "Feedback" } });
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));
      fireEvent.click(screen.getByRole("button", { name: /cancel subscription/i }));

      // Wait for completion screen
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it("resets form state when handleClose is called (via Keep Subscription)", async () => {
      const onClose = vi.fn();
      const { rerender } = render(<CancelSubscriptionModal {...defaultProps} onClose={onClose} />);

      // Select a reason
      fireEvent.click(screen.getByText("Too Expensive"));
      expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();

      // Close modal via Keep Subscription button (which calls handleClose)
      fireEvent.click(screen.getByRole("button", { name: /keep subscription/i }));
      expect(onClose).toHaveBeenCalled();

      // Simulate parent closing and reopening the modal
      rerender(<CancelSubscriptionModal {...defaultProps} onClose={onClose} isOpen={false} />);
      rerender(<CancelSubscriptionModal {...defaultProps} onClose={onClose} isOpen={true} />);

      // Should be back to step 1 with no selection (state was reset by handleClose)
      // Wait for state updates to be applied
      await waitFor(() => {
        expect(screen.getByText(/What's the main reason you're cancelling/)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).toBeDisabled();
      });
    });
  });

  // ===========================================================================
  // TOGGLE BEHAVIORS
  // ===========================================================================

  describe("Additional Reasons Toggle", () => {
    it("can toggle additional reasons on and off", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      // Select an additional reason
      const technicalIssuesButton = screen.getByRole("button", { name: /Technical Issues/i });
      fireEvent.click(technicalIssuesButton);
      expect(technicalIssuesButton).toHaveClass("bg-primary");

      // Deselect it
      fireEvent.click(technicalIssuesButton);
      expect(technicalIssuesButton).not.toHaveClass("bg-primary");
    });

    it("can select multiple additional reasons", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      fireEvent.click(screen.getByRole("button", { name: /Technical Issues/i }));
      fireEvent.click(screen.getByRole("button", { name: /Difficult to Use/i }));

      expect(screen.getByRole("button", { name: /Technical Issues/i })).toHaveClass("bg-primary");
      expect(screen.getByRole("button", { name: /Difficult to Use/i })).toHaveClass("bg-primary");
    });
  });

  describe("Would Return Toggle", () => {
    it("can select 'Yes, possibly' option", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      fireEvent.click(screen.getByText("Yes, possibly"));

      expect(screen.getByText("Yes, possibly").closest("button")).toHaveClass("border-green-500");
    });

    it("can select 'Probably not' option", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      fireEvent.click(screen.getByText("Probably not"));

      expect(screen.getByText("Probably not").closest("button")).toHaveClass("border-red-500");
    });

    it("can switch between options", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      fireEvent.click(screen.getByText("Yes, possibly"));
      fireEvent.click(screen.getByText("Probably not"));

      expect(screen.getByText("Yes, possibly").closest("button")).not.toHaveClass("border-green-500");
      expect(screen.getByText("Probably not").closest("button")).toHaveClass("border-red-500");
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("Edge Cases", () => {
    it("handles organization name with special characters", () => {
      render(<CancelSubscriptionModal {...defaultProps} organizationName="O'Reilly & Sons (LLC)" />);

      expect(screen.getByText(/O'Reilly & Sons \(LLC\)/)).toBeInTheDocument();
    });

    it("handles zero agent count", () => {
      render(<CancelSubscriptionModal {...defaultProps} agentCount={0} />);

      expect(screen.getByText(/0 agents/)).toBeInTheDocument();
    });

    it("handles very long detailed feedback", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      const longFeedback = "A".repeat(1000);
      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: longFeedback } });

      expect(textarea).toHaveValue(longFeedback);
    });

    it("trims whitespace-only feedback as invalid", () => {
      render(<CancelSubscriptionModal {...defaultProps} />);
      fireEvent.click(screen.getByText("Too Expensive"));
      fireEvent.click(screen.getByRole("button", { name: /continue/i }));

      const textarea = screen.getByPlaceholderText(/What could we have done better/);
      fireEvent.change(textarea, { target: { value: "   " } });

      const continueButton = screen.getByRole("button", { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });
  });
});
