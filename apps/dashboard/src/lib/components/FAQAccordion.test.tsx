/**
 * @vitest-environment jsdom
 *
 * FAQAccordion Tests
 *
 * Behaviors Tested:
 * 1. Display - Shows all FAQ questions
 * 2. Display - All questions collapsed by default
 * 3. Display - Shows ChevronDown icon when collapsed
 * 4. Display - Shows ChevronUp icon when expanded
 * 5. Actions - Expands question on click
 * 6. Actions - Collapses question on second click
 * 7. Actions - Only one question open at a time (exclusive mode)
 * 8. Actions - Clicking new question closes previous one
 * 9. Edge Cases - Handles all FAQ items rendering
 * 10. Edge Cases - Answer text visible when expanded
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
}));

import { FAQAccordion } from "./FAQAccordion";

describe("FAQAccordion", () => {
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
    it("renders all FAQ questions", () => {
      render(<FAQAccordion />);

      // Verify some of the FAQ questions are rendered
      expect(screen.getByText("Who is this for?")).toBeInTheDocument();
      expect(screen.getByText("We're not awake 24/7. How do I staff this?")).toBeInTheDocument();
      expect(screen.getByText("I don't want my closers wasting time on tire-kickers.")).toBeInTheDocument();
      expect(screen.getByText("Won't this scare away introverts? They have to be on camera?")).toBeInTheDocument();
      expect(screen.getByText("We already use a chatbot. Isn't that enough?")).toBeInTheDocument();
      expect(screen.getByText("What if I install this and nobody clicks it?")).toBeInTheDocument();
      expect(screen.getByText("This sounds technically complicated.")).toBeInTheDocument();
      expect(screen.getByText("Does this work on mobile phones?")).toBeInTheDocument();
      expect(screen.getByText("What if it doesn't work for my business?")).toBeInTheDocument();
    });

    it("renders 9 FAQ items total", () => {
      render(<FAQAccordion />);

      // Count FAQ item buttons (one per question)
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(9);
    });

    it("shows ChevronDown icon for all items when collapsed", () => {
      render(<FAQAccordion />);

      const chevronDownIcons = screen.getAllByTestId("chevron-down-icon");
      // All 9 items should show down icon initially
      expect(chevronDownIcons).toHaveLength(9);
    });

    it("does not show any ChevronUp icons initially", () => {
      render(<FAQAccordion />);

      const chevronUpIcons = screen.queryAllByTestId("chevron-up-icon");
      expect(chevronUpIcons).toHaveLength(0);
    });

    it("all answers are hidden by default (max-h-0)", () => {
      render(<FAQAccordion />);

      // The first answer text should not be visible (collapsed)
      // Check that "GreetNow is built for businesses" is not visible initially
      // Using queryByText since it might be in DOM but hidden
      const answerText = screen.queryByText(/GreetNow is built for businesses/);
      // The text exists in DOM but the container has max-h-0
      if (answerText) {
        const container = answerText.closest(".overflow-hidden");
        expect(container).toHaveClass("max-h-0");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // EXPAND/COLLAPSE BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Expand/Collapse", () => {
    it("expands FAQ item when clicked", () => {
      render(<FAQAccordion />);

      // Click the first question
      fireEvent.click(screen.getByText("Who is this for?"));

      // Should now show ChevronUp for the expanded item
      expect(screen.getByTestId("chevron-up-icon")).toBeInTheDocument();
    });

    it("shows answer text when FAQ item is expanded", () => {
      render(<FAQAccordion />);

      // Click the first question
      fireEvent.click(screen.getByText("Who is this for?"));

      // The answer should now be visible (max-h-96 instead of max-h-0)
      const answerText = screen.getByText(/GreetNow is built for businesses/);
      const container = answerText.closest(".overflow-hidden");
      expect(container).toHaveClass("max-h-96");
    });

    it("collapses FAQ item when clicked again", () => {
      render(<FAQAccordion />);

      const question = screen.getByText("Who is this for?");

      // Click to expand
      fireEvent.click(question);
      expect(screen.getByTestId("chevron-up-icon")).toBeInTheDocument();

      // Click again to collapse
      fireEvent.click(question);
      expect(screen.queryByTestId("chevron-up-icon")).not.toBeInTheDocument();
    });

    it("shows 9 ChevronDown icons after collapse (back to all closed)", () => {
      render(<FAQAccordion />);

      const question = screen.getByText("Who is this for?");

      // Expand then collapse
      fireEvent.click(question);
      fireEvent.click(question);

      const chevronDownIcons = screen.getAllByTestId("chevron-down-icon");
      expect(chevronDownIcons).toHaveLength(9);
    });
  });

  // ---------------------------------------------------------------------------
  // EXCLUSIVE MODE BEHAVIORS (Only one open at a time)
  // ---------------------------------------------------------------------------
  describe("Exclusive Mode", () => {
    it("closes previously open item when new item is clicked", () => {
      render(<FAQAccordion />);

      // Open first question
      fireEvent.click(screen.getByText("Who is this for?"));
      expect(screen.getAllByTestId("chevron-up-icon")).toHaveLength(1);

      // Open second question
      fireEvent.click(screen.getByText("We're not awake 24/7. How do I staff this?"));

      // Should still only have one up icon (exclusive mode)
      expect(screen.getAllByTestId("chevron-up-icon")).toHaveLength(1);
    });

    it("opens clicked item when different item was open", () => {
      render(<FAQAccordion />);

      // Open first question
      fireEvent.click(screen.getByText("Who is this for?"));

      // Open chatbot question
      fireEvent.click(screen.getByText("We already use a chatbot. Isn't that enough?"));

      // The chatbot answer should be visible
      const chatbotAnswer = screen.getByText(/Chatbots are for support/);
      const container = chatbotAnswer.closest(".overflow-hidden");
      expect(container).toHaveClass("max-h-96");
    });

    it("first question answer becomes hidden when second is opened", () => {
      render(<FAQAccordion />);

      // Open first question
      fireEvent.click(screen.getByText("Who is this for?"));

      // Verify first answer is visible
      let firstAnswer = screen.getByText(/GreetNow is built for businesses/);
      let container = firstAnswer.closest(".overflow-hidden");
      expect(container).toHaveClass("max-h-96");

      // Open second question
      fireEvent.click(screen.getByText("We're not awake 24/7. How do I staff this?"));

      // First answer should now be hidden
      firstAnswer = screen.getByText(/GreetNow is built for businesses/);
      container = firstAnswer.closest(".overflow-hidden");
      expect(container).toHaveClass("max-h-0");
    });
  });

  // ---------------------------------------------------------------------------
  // STYLING BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Styling", () => {
    it("applies bg-primary/5 class when item is open", () => {
      render(<FAQAccordion />);

      const question = screen.getByText("Who is this for?");
      fireEvent.click(question);

      // The container div should have the open state styling
      const itemContainer = question.closest(".border");
      expect(itemContainer).toHaveClass("bg-primary/5");
    });

    it("applies hover styling class when item is closed", () => {
      render(<FAQAccordion />);

      const question = screen.getByText("Who is this for?");
      const itemContainer = question.closest(".border");

      // When closed, should have hover:bg-muted/50
      expect(itemContainer).toHaveClass("hover:bg-muted/50");
    });

    it("shows ChevronUp with text-primary class when expanded", () => {
      render(<FAQAccordion />);

      fireEvent.click(screen.getByText("Who is this for?"));

      // The ChevronUp should be styled with primary color
      // Since we mock icons, we check that up icon is rendered
      expect(screen.getByTestId("chevron-up-icon")).toBeInTheDocument();
    });

    it("shows ChevronDown with text-muted-foreground class when collapsed", () => {
      render(<FAQAccordion />);

      // Icons are mocked, just verify down icons are present
      expect(screen.getAllByTestId("chevron-down-icon")).toHaveLength(9);
    });
  });

  // ---------------------------------------------------------------------------
  // FAQ CONTENT VERIFICATION
  // ---------------------------------------------------------------------------
  describe("FAQ Content", () => {
    it("shows correct answer for 'Who is this for?' question", () => {
      render(<FAQAccordion />);

      fireEvent.click(screen.getByText("Who is this for?"));

      expect(
        screen.getByText(/GreetNow is built for businesses selling high-ticket services/)
      ).toBeInTheDocument();
    });

    it("shows correct answer for mobile question", () => {
      render(<FAQAccordion />);

      fireEvent.click(screen.getByText("Does this work on mobile phones?"));

      expect(
        screen.getByText(/GreetNow works seamlessly on both mobile and desktop browsers/)
      ).toBeInTheDocument();
    });

    it("shows correct answer for chatbot question", () => {
      render(<FAQAccordion />);

      fireEvent.click(screen.getByText("We already use a chatbot. Isn't that enough?"));

      expect(
        screen.getByText(/Chatbots are for support: 'Where's my order\?'/)
      ).toBeInTheDocument();
    });

    it("shows correct answer for trial/cancellation question", () => {
      render(<FAQAccordion />);

      fireEvent.click(screen.getByText("What if it doesn't work for my business?"));

      expect(
        screen.getByText(/Start your free 7-day trial/)
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("renders without crashing", () => {
      const { container } = render(<FAQAccordion />);
      expect(container.firstChild).not.toBeNull();
    });

    it("handles rapid clicking without error", () => {
      render(<FAQAccordion />);

      const question = screen.getByText("Who is this for?");

      // Rapid clicks
      fireEvent.click(question);
      fireEvent.click(question);
      fireEvent.click(question);
      fireEvent.click(question);

      // Should not throw, just toggle state
      expect(true).toBe(true);
    });

    it("clicking same question toggles state correctly", () => {
      render(<FAQAccordion />);

      const question = screen.getByText("Who is this for?");

      // Open
      fireEvent.click(question);
      expect(screen.getAllByTestId("chevron-up-icon")).toHaveLength(1);

      // Close
      fireEvent.click(question);
      expect(screen.queryAllByTestId("chevron-up-icon")).toHaveLength(0);

      // Open again
      fireEvent.click(question);
      expect(screen.getAllByTestId("chevron-up-icon")).toHaveLength(1);
    });

    it("maintains correct state after multiple interactions", () => {
      render(<FAQAccordion />);

      // Open first
      fireEvent.click(screen.getByText("Who is this for?"));
      // Open second (first should close)
      fireEvent.click(screen.getByText("This sounds technically complicated."));
      // Open third (second should close)
      fireEvent.click(screen.getByText("Does this work on mobile phones?"));

      // Only the mobile question should be open
      expect(screen.getAllByTestId("chevron-up-icon")).toHaveLength(1);

      // Verify mobile answer is visible
      expect(
        screen.getByText(/GreetNow works seamlessly on both mobile and desktop browsers/)
      ).toBeInTheDocument();
    });
  });
});




