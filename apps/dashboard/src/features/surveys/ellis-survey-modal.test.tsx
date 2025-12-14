/**
 * @vitest-environment jsdom
 *
 * EllisSurveyModal Tests
 *
 * Behaviors Tested:
 * 1. Display: Returns null when not open
 * 2. Display: Shows "Quick question" title when open
 * 3. Display: Shows survey question about GreetNow
 * 4. Display: Shows all three disappointment options
 * 5. Display: Close button only appears after selection
 * 6. Display: Footer only appears after selection
 * 7. Display: Follow-up textarea appears after selection
 * 8. Actions: Clicking option selects it and shows follow-up
 * 9. Actions: Submit button calls handleSubmit
 * 10. Actions: Skip button calls handleDismiss
 * 11. Actions: Close X button calls handleDismiss
 * 12. Actions: Backdrop click only works after selection
 * 13. Actions: Submit inserts survey response to Supabase
 * 14. Actions: Dismiss inserts dismissal record
 * 15. Edge Cases: Submit button disabled without selection
 * 16. Edge Cases: Submit button disabled while submitting
 * 17. Edge Cases: Empty follow-up text becomes null
 * 18. Edge Cases: Error handling for Supabase failures
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Meh: () => <div data-testid="meh-icon" />,
  Frown: () => <div data-testid="frown-icon" />,
}));

// Mock Supabase client
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

import { EllisSurveyModal } from "./ellis-survey-modal";

describe("EllisSurveyModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userId: "user-123",
    userRole: "agent",
    organizationId: "org-456",
    triggeredBy: "manual",
    pageUrl: "https://app.greetnow.com/dashboard",
  };

  const setupMocks = () => {
    mockInsert.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "pmf_surveys") {
        return { insert: mockInsert };
      }
      if (table === "survey_cooldowns") {
        return { upsert: mockUpsert };
      }
      return { insert: mockInsert };
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
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
        <EllisSurveyModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when isOpen is true", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.getByText("Quick question")).toBeInTheDocument();
    });
  });

  describe("Display - Survey Question", () => {
    it("shows the main survey question", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.getByText(/How would you feel if you could no longer use/)).toBeInTheDocument();
      expect(screen.getByText("GreetNow")).toBeInTheDocument();
    });
  });

  describe("Display - Disappointment Options", () => {
    it("shows 'Very disappointed' option with Heart icon", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.getByText("Very disappointed")).toBeInTheDocument();
      expect(screen.getByText("I rely on this daily")).toBeInTheDocument();
      expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
    });

    it("shows 'Somewhat disappointed' option with Meh icon", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.getByText("Somewhat disappointed")).toBeInTheDocument();
      expect(screen.getByText("It's useful but not essential")).toBeInTheDocument();
      expect(screen.getByTestId("meh-icon")).toBeInTheDocument();
    });

    it("shows 'Not disappointed' option with Frown icon", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.getByText("Not disappointed")).toBeInTheDocument();
      expect(screen.getByText("I could easily live without it")).toBeInTheDocument();
      expect(screen.getByTestId("frown-icon")).toBeInTheDocument();
    });
  });

  describe("Display - Close Button Visibility", () => {
    it("does not show close X button before selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      // X icon should not be in a button before selection
      const xIcon = screen.queryByTestId("x-icon");
      expect(xIcon).not.toBeInTheDocument();
    });

    it("shows close X button after selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });
  });

  describe("Display - Footer Visibility", () => {
    it("does not show footer with Skip/Submit before selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.queryByText("Skip")).not.toBeInTheDocument();
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("shows footer with Skip/Submit after selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      expect(screen.getByText("Skip")).toBeInTheDocument();
      expect(screen.getByText("Submit")).toBeInTheDocument();
    });
  });

  describe("Display - Follow-up Textarea", () => {
    it("does not show follow-up textarea before selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.queryByText(/Why\?/)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/What's the main reason/)).not.toBeInTheDocument();
    });

    it("shows follow-up textarea after selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      expect(screen.getByText(/Why\?/)).toBeInTheDocument();
      expect(screen.getByText("(optional)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/What's the main reason/)).toBeInTheDocument();
    });
  });

  describe("Display - Selection State", () => {
    it("shows selected state styling on chosen option", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      // Should have the rose color classes for "very_disappointed"
      expect(optionButton).toHaveClass("text-rose-500");
    });

    it("shows radio indicator on selected option", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      // Radio indicator is a div with rounded-full and bg-current
      const radioIndicator = optionButton?.querySelector(".w-3.h-3.rounded-full");
      expect(radioIndicator).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Option Selection", () => {
    it("clicking option sets selectedLevel and shows follow-up", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      expect(screen.queryByText("Submit")).not.toBeInTheDocument();

      const optionButton = screen.getByText("Somewhat disappointed").closest("button");
      fireEvent.click(optionButton!);

      expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    it("can change selection after initial choice", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      // Select first option
      const firstOption = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(firstOption!);
      expect(firstOption).toHaveClass("text-rose-500");

      // Select different option
      const secondOption = screen.getByText("Somewhat disappointed").closest("button");
      fireEvent.click(secondOption!);
      expect(secondOption).toHaveClass("text-amber-500");
    });
  });

  describe("Actions - Follow-up Text", () => {
    it("allows typing in follow-up textarea", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const textarea = screen.getByPlaceholderText(/What's the main reason/) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "Great product!" } });

      expect(textarea.value).toBe("Great product!");
    });
  });

  describe("Actions - Submit Button", () => {
    it("calls Supabase insert when Submit clicked", async () => {
      const onClose = vi.fn();
      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("pmf_surveys");
        expect(mockInsert).toHaveBeenCalledWith({
          organization_id: "org-456",
          user_id: "user-123",
          user_role: "agent",
          disappointment_level: "very_disappointed",
          follow_up_text: null,
          triggered_by: "manual",
          page_url: "https://app.greetnow.com/dashboard",
          dismissed: false,
        });
      });
    });

    it("includes follow-up text in submission when provided", async () => {
      const onClose = vi.fn();
      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const textarea = screen.getByPlaceholderText(/What's the main reason/);
      fireEvent.change(textarea, { target: { value: "Love this product!" } });

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            follow_up_text: "Love this product!",
          })
        );
      });
    });

    it("updates survey_cooldowns on submit", async () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("survey_cooldowns");
        expect(mockUpsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: "user-123",
            total_surveys: 1,
          }),
          { onConflict: "user_id" }
        );
      });
    });

    it("calls onClose after successful submit", async () => {
      const onClose = vi.fn();
      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("shows loading state during submission", async () => {
      mockInsert.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)));

      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Submitting...")).toBeInTheDocument();
        expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
      });
    });
  });

  describe("Actions - Skip Button", () => {
    it("calls handleDismiss when Skip clicked", async () => {
      const onClose = vi.fn();
      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const skipButton = screen.getByText("Skip");
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("pmf_surveys");
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            dismissed: true,
            disappointment_level: null, // TKT-045: null instead of "not_disappointed"
          })
        );
      });
    });

    it("calls onClose after Skip", async () => {
      const onClose = vi.fn();
      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const skipButton = screen.getByText("Skip");
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Actions - Close X Button (TKT-045)", () => {
    it("calls handleDismiss when X button clicked with disappointment_level null", async () => {
      const onClose = vi.fn();
      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      // First select an option to show the X button
      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const closeButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(closeButton!);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            dismissed: true,
            disappointment_level: null, // TKT-045: null instead of "not_disappointed"
          })
        );
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Actions - Backdrop Click", () => {
    it("does not close when backdrop clicked before selection", () => {
      const onClose = vi.fn();
      const { container } = render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector(".bg-black\\/40");
      fireEvent.click(backdrop!);

      // onClose should NOT be called before selection
      expect(onClose).not.toHaveBeenCalled();
    });

    it("calls handleDismiss when backdrop clicked after selection", async () => {
      const onClose = vi.fn();
      const { container } = render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      // Select an option first
      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const backdrop = container.querySelector(".bg-black\\/40");
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("Submit button is disabled when no selection", () => {
      render(<EllisSurveyModal {...defaultProps} />);

      // No selection made, so footer shouldn't even be visible
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("Submit button is disabled while submitting", async () => {
      mockInsert.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)));

      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        const submittingButton = screen.getByRole("button", { name: /submitting/i });
        expect(submittingButton).toBeDisabled();
      });
    });

    it("trims whitespace and converts empty string to null for follow_up_text", async () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const textarea = screen.getByPlaceholderText(/What's the main reason/);
      fireEvent.change(textarea, { target: { value: "   " } }); // Just whitespace

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            follow_up_text: null,
          })
        );
      });
    });

    it("logs error when survey submission fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInsert.mockResolvedValue({ error: { message: "DB Error" } });
      const onClose = vi.fn();

      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Survey submission error:", { message: "DB Error" });
      });

      // Should still close modal
      expect(onClose).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it("logs error when cooldown update fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockUpsert.mockResolvedValue({ error: { message: "Cooldown Error" } });

      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Cooldown update error:", { message: "Cooldown Error" });
      });

      consoleSpy.mockRestore();
    });

    it("handles dismissal tracking error gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInsert.mockRejectedValue(new Error("Network error"));
      const onClose = vi.fn();

      render(<EllisSurveyModal {...defaultProps} onClose={onClose} />);

      const optionButton = screen.getByText("Very disappointed").closest("button");
      fireEvent.click(optionButton!);

      const skipButton = screen.getByText("Skip");
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Dismiss tracking error:", expect.any(Error));
      });

      // Should still call onClose
      expect(onClose).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it("correctly sets disappointment_level based on selection", async () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Somewhat disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            disappointment_level: "somewhat_disappointed",
          })
        );
      });
    });

    it("correctly sets not_disappointed level", async () => {
      render(<EllisSurveyModal {...defaultProps} />);

      const optionButton = screen.getByText("Not disappointed").closest("button");
      fireEvent.click(optionButton!);

      const submitButton = screen.getByText("Submit");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            disappointment_level: "not_disappointed",
          })
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // VISUAL ELEMENTS
  // ---------------------------------------------------------------------------

  describe("Visual Elements", () => {
    it("has fixed positioning with high z-index", () => {
      const { container } = render(<EllisSurveyModal {...defaultProps} />);

      const modalContainer = container.querySelector(".fixed.inset-0.z-\\[100\\]");
      expect(modalContainer).toBeInTheDocument();
    });

    it("has backdrop blur effect", () => {
      const { container } = render(<EllisSurveyModal {...defaultProps} />);

      const backdrop = container.querySelector(".backdrop-blur-sm");
      expect(backdrop).toBeInTheDocument();
    });

    it("modal has rounded corners and border", () => {
      const { container } = render(<EllisSurveyModal {...defaultProps} />);

      const modal = container.querySelector(".rounded-2xl.border");
      expect(modal).toBeInTheDocument();
    });

    it("has animation classes for entrance", () => {
      const { container } = render(<EllisSurveyModal {...defaultProps} />);

      const modal = container.querySelector(".animate-in.fade-in");
      expect(modal).toBeInTheDocument();
    });
  });
});





