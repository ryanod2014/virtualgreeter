/**
 * @vitest-environment jsdom
 *
 * SocraticQuestions Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows all 5 questions
 * 2. Display - Shows Yes/No buttons for each question
 * 3. Display - Shows progress indicator
 * 4. Display - Shows final CTA section
 * 5. State - First question is highlighted as active
 * 6. State - Unanswered questions after active are dimmed
 * 7. Interaction - Clicking Yes sets answer to "yes"
 * 8. Interaction - Clicking No sets answer to "no"
 * 9. Interaction - Clicking same answer again toggles it off (null)
 * 10. Progress - Shows "Check yes or no ✓" when no answers
 * 11. Progress - Shows "X/5 answered" during answering
 * 12. Progress - Shows "You know what to do 👇" when 4+ yes answers
 * 13. Progress - Shows "Interesting... 🤔" when fewer than 4 yes answers
 * 14. Visual - Answered questions have primary border styling
 * 15. Visual - Active question has pulse animation
 * 16. Visual - Yes button shows check when selected
 * 17. Visual - No button shows check when selected
 * 18. CTA - Shows signup link
 * 19. CTA - Shows compliance text
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  Check: () => <div data-testid="check-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

import { SocraticQuestions } from "./SocraticQuestions";

describe("SocraticQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Display", () => {
    it("shows all 5 questions", () => {
      render(<SocraticQuestions />);

      expect(
        screen.getByText(/Do you agree that a lead is never "hotter" than the moment they're on your website/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Are people more likely to buy from a human they can see/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Would you rather talk to a hot lead right now/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Don't you agree that nobody likes filling out forms/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Isn't it crazy to pay for traffic and then hide your salespeople/)
      ).toBeInTheDocument();
    });

    it("shows Yes button for each question", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      expect(yesButtons).toHaveLength(5);
    });

    it("shows No button for each question", () => {
      render(<SocraticQuestions />);

      const noButtons = screen.getAllByText("No");
      expect(noButtons).toHaveLength(5);
    });

    it("shows progress indicator", () => {
      render(<SocraticQuestions />);

      expect(screen.getByText("Check yes or no ✓")).toBeInTheDocument();
    });

    it("shows final question about the widget", () => {
      render(<SocraticQuestions />);

      expect(
        screen.getByText(/If this widget catches just/)
      ).toBeInTheDocument();
    });

    it("shows CTA link to signup", () => {
      render(<SocraticQuestions />);

      const link = screen.getByTestId("next-link");
      expect(link).toHaveAttribute("href", "/signup");
    });

    it("shows 'Start Free 7-Day Trial' CTA text", () => {
      render(<SocraticQuestions />);

      expect(screen.getByText("Start Free 7-Day Trial")).toBeInTheDocument();
    });

    it("shows compliance text", () => {
      render(<SocraticQuestions />);

      expect(screen.getByText(/Try it free for a full 7 days/)).toBeInTheDocument();
    });

    it("shows ArrowRight icon in CTA", () => {
      render(<SocraticQuestions />);

      expect(screen.getByTestId("arrow-right-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // INITIAL STATE BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Initial State", () => {
    it("first question is highlighted as active", () => {
      const { container } = render(<SocraticQuestions />);

      // First question should have active styling (border-primary/70)
      const questions = container.querySelectorAll(".rounded-xl");
      // The first question card should have the active border class
      expect(questions[0]).toHaveClass("border-primary/70");
    });

    it("subsequent questions are dimmed (opacity-50)", () => {
      const { container } = render(<SocraticQuestions />);

      // Questions 2-5 should have opacity-50 class
      const questions = container.querySelectorAll(".rounded-xl.relative");
      // Skip first question (index 0), check others
      for (let i = 1; i < questions.length; i++) {
        expect(questions[i]).toHaveClass("opacity-50");
      }
    });

    it("shows Check icons for Yes/No options", () => {
      render(<SocraticQuestions />);

      // Check icons should be present (10 total - 2 per question)
      const checkIcons = screen.getAllByTestId("check-icon");
      expect(checkIcons).toHaveLength(10);
    });
  });

  // ---------------------------------------------------------------------------
  // INTERACTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Interactions", () => {
    it("clicking Yes on first question sets answer to yes", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      fireEvent.click(yesButtons[0]);

      // Progress should update
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
    });

    it("clicking No on first question sets answer to no", () => {
      render(<SocraticQuestions />);

      const noButtons = screen.getAllByText("No");
      fireEvent.click(noButtons[0]);

      // Progress should update
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
    });

    it("clicking Yes twice toggles answer off", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      
      // Click Yes
      fireEvent.click(yesButtons[0]);
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
      
      // Click Yes again to toggle off
      fireEvent.click(yesButtons[0]);
      expect(screen.getByText("Check yes or no ✓")).toBeInTheDocument();
    });

    it("clicking No twice toggles answer off", () => {
      render(<SocraticQuestions />);

      const noButtons = screen.getAllByText("No");
      
      // Click No
      fireEvent.click(noButtons[0]);
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
      
      // Click No again to toggle off
      fireEvent.click(noButtons[0]);
      expect(screen.getByText("Check yes or no ✓")).toBeInTheDocument();
    });

    it("clicking Yes after No changes answer to yes", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      const noButtons = screen.getAllByText("No");
      
      // Click No first
      fireEvent.click(noButtons[0]);
      
      // Click Yes - should change from no to yes
      fireEvent.click(yesButtons[0]);
      
      // Still 1 answered
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // PROGRESS BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Progress", () => {
    it("shows 'Check yes or no ✓' when no questions answered", () => {
      render(<SocraticQuestions />);

      expect(screen.getByText("Check yes or no ✓")).toBeInTheDocument();
    });

    it("shows '1/5 answered' after answering first question", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      fireEvent.click(yesButtons[0]);

      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
      expect(screen.getByText(/answered/)).toBeInTheDocument();
    });

    it("shows '2/5 answered' after answering two questions", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      fireEvent.click(yesButtons[0]);
      fireEvent.click(yesButtons[1]);

      expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    });

    it("shows '5/5 answered' message after all questions answered", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      // Answer all 5 with Yes
      yesButtons.forEach((btn) => fireEvent.click(btn));

      // Should show completion message, not "5/5 answered"
      expect(screen.queryByText(/5\/5/)).not.toBeInTheDocument();
    });

    it("shows 'You know what to do 👇' when 5 yes answers", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      yesButtons.forEach((btn) => fireEvent.click(btn));

      expect(screen.getByText("You know what to do 👇")).toBeInTheDocument();
    });

    it("shows 'You know what to do 👇' when 4 yes answers", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      const noButtons = screen.getAllByText("No");

      // Answer 4 yes, 1 no
      fireEvent.click(yesButtons[0]);
      fireEvent.click(yesButtons[1]);
      fireEvent.click(yesButtons[2]);
      fireEvent.click(yesButtons[3]);
      fireEvent.click(noButtons[4]);

      expect(screen.getByText("You know what to do 👇")).toBeInTheDocument();
    });

    it("shows 'Interesting... 🤔' when fewer than 4 yes answers", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      const noButtons = screen.getAllByText("No");

      // Answer 3 yes, 2 no
      fireEvent.click(yesButtons[0]);
      fireEvent.click(yesButtons[1]);
      fireEvent.click(yesButtons[2]);
      fireEvent.click(noButtons[3]);
      fireEvent.click(noButtons[4]);

      expect(screen.getByText("Interesting... 🤔")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // VISUAL STATE BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Visual States", () => {
    it("answered question has primary border styling", () => {
      const { container } = render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      fireEvent.click(yesButtons[0]);

      // First question should now have answered styling
      const questions = container.querySelectorAll(".rounded-xl.relative");
      expect(questions[0]).toHaveClass("border-primary/50");
    });

    it("second question becomes active after first is answered", () => {
      const { container } = render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      fireEvent.click(yesButtons[0]);

      // Second question should now be active
      const questions = container.querySelectorAll(".rounded-xl.relative");
      expect(questions[1]).toHaveClass("border-primary/70");
    });

    it("previously dimmed questions become normal after answering prior questions", () => {
      const { container } = render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      
      // Answer first question
      fireEvent.click(yesButtons[0]);

      // Second question should no longer be opacity-50
      const questions = container.querySelectorAll(".rounded-xl.relative");
      expect(questions[1]).not.toHaveClass("opacity-50");
    });
  });

  // ---------------------------------------------------------------------------
  // QUESTION FLOW BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Question Flow", () => {
    it("allows answering questions out of order", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      
      // Answer third question first (should still work)
      fireEvent.click(yesButtons[2]);

      // Should count as 1 answered
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
    });

    it("allows changing answers", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      const noButtons = screen.getAllByText("No");

      // Answer Yes, then change to No
      fireEvent.click(yesButtons[0]);
      fireEvent.click(noButtons[0]);

      // Still 1 answered
      expect(screen.getByText(/1\/5/)).toBeInTheDocument();
    });

    it("updates yesCount correctly when changing from yes to no", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      const noButtons = screen.getAllByText("No");

      // Answer all 5 with Yes first
      yesButtons.forEach((btn) => fireEvent.click(btn));
      expect(screen.getByText("You know what to do 👇")).toBeInTheDocument();

      // Change one to No
      fireEvent.click(noButtons[0]);
      
      // Still shows positive message (4 yes)
      expect(screen.getByText("You know what to do 👇")).toBeInTheDocument();

      // Change another to No (3 yes now)
      fireEvent.click(noButtons[1]);
      
      // Now shows "Interesting..." message
      expect(screen.getByText("Interesting... 🤔")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles rapid clicking without breaking", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");
      const noButtons = screen.getAllByText("No");

      // Rapid click different buttons
      fireEvent.click(yesButtons[0]);
      fireEvent.click(noButtons[0]);
      fireEvent.click(yesButtons[0]);
      fireEvent.click(yesButtons[0]);
      fireEvent.click(noButtons[0]);

      // Component should still work
      expect(screen.getByText(/answered/)).toBeInTheDocument();
    });

    it("maintains correct count when toggling multiple answers", () => {
      render(<SocraticQuestions />);

      const yesButtons = screen.getAllByText("Yes");

      // Answer 3 questions
      fireEvent.click(yesButtons[0]);
      fireEvent.click(yesButtons[1]);
      fireEvent.click(yesButtons[2]);
      expect(screen.getByText(/3\/5/)).toBeInTheDocument();

      // Toggle one off
      fireEvent.click(yesButtons[1]);
      expect(screen.getByText(/2\/5/)).toBeInTheDocument();

      // Toggle it back on
      fireEvent.click(yesButtons[1]);
      expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    });
  });
});

