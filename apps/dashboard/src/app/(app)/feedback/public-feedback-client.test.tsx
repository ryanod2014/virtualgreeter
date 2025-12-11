/**
 * @vitest-environment jsdom
 *
 * PublicFeedbackClient Component Tests
 *
 * Tests capture the current behavior of the public feedback page.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  PlayCircle: () => <div data-testid="play-circle-icon" />,
  X: () => <div data-testid="x-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Send: () => <div data-testid="send-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Reply: () => <div data-testid="reply-icon" />,
  CornerDownRight: () => <div data-testid="corner-down-right-icon" />,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Create stable mock objects to prevent infinite re-renders
const mockQueryResult = Promise.resolve({ data: [], error: null });
const mockSingleResult = Promise.resolve({ data: { organization_id: "org_123" }, error: null });

const mockOrderChain = {
  order: () => mockQueryResult,
};

const mockEqChain = {
  or: () => mockOrderChain,
  order: () => mockOrderChain,
  in: () => mockQueryResult,
  single: () => mockSingleResult,
  eq: () => ({ eq: () => mockQueryResult }),
};

const mockSelectChain = {
  eq: () => mockEqChain,
  or: () => mockOrderChain,
  order: () => mockOrderChain,
};

const mockFromResult = {
  select: () => mockSelectChain,
  insert: () => mockQueryResult,
  delete: () => ({ eq: () => ({ eq: () => mockQueryResult }) }),
  update: () => ({ eq: () => ({ eq: () => mockQueryResult }) }),
};

// Use a stable singleton for the supabase client
const mockSupabaseClient = {
  from: () => mockFromResult,
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabaseClient,
}));

import { PublicFeedbackClient } from "./public-feedback-client";

describe("PublicFeedbackClient", () => {
  const defaultProps = {
    userId: "user_123",
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS - INITIAL RENDER
  // ---------------------------------------------------------------------------

  describe("Display - Initial Render", () => {
    it("shows loading spinner on initial render", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(screen.getByText("Loading requests...")).toBeInTheDocument();
    });

    it("renders search input placeholder", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search feature requests...")).toBeInTheDocument();
    });

    it("renders New Request button", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(screen.getByText("New Request")).toBeInTheDocument();
    });

    it("renders sort buttons", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(screen.getByText("Top")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("renders status filter dropdown", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders background glow effects", () => {
      const { container } = render(<PublicFeedbackClient {...defaultProps} />);
      expect(container.querySelectorAll(".glow-orb").length).toBeGreaterThan(0);
    });

    it("renders grid pattern", () => {
      const { container } = render(<PublicFeedbackClient {...defaultProps} />);
      expect(container.querySelector(".grid-pattern")).toBeInTheDocument();
    });
  });

  describe("Display - Hero Section", () => {
    it("shows Feature Requests title", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(screen.getByText("Feature Requests")).toBeInTheDocument();
    });

    it("shows voting explanation subtitle", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      expect(
        screen.getByText("Vote for features you want · Top voted get built first")
      ).toBeInTheDocument();
    });

    it("shows Back to Dashboard link with correct href", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      const backLink = screen.getByText("Back to Dashboard");
      expect(backLink.closest("a")).toHaveAttribute("href", "/dashboard");
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Sort Toggle", () => {
    it("Top button has active styling by default", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      const topButton = screen.getByText("Top").closest("button");
      expect(topButton).toHaveClass("bg-primary");
    });

    it("New button gets active styling when clicked", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      const newButton = screen.getByText("New").closest("button");
      fireEvent.click(newButton!);
      expect(newButton).toHaveClass("bg-primary");
    });
  });

  describe("Actions - Submit Modal", () => {
    it("opens submit form when New Request clicked", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      fireEvent.click(screen.getByText("New Request"));
      expect(screen.getByText("Request a Feature")).toBeInTheDocument();
    });

    it("shows title input in modal", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      fireEvent.click(screen.getByText("New Request"));
      expect(screen.getByPlaceholderText("Brief title for your idea")).toBeInTheDocument();
    });

    it("shows description textarea in modal", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      fireEvent.click(screen.getByText("New Request"));
      expect(
        screen.getByPlaceholderText("Describe the feature and why it would be helpful...")
      ).toBeInTheDocument();
    });

    it("Submit button is disabled when form is empty", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      fireEvent.click(screen.getByText("New Request"));
      expect(screen.getByText("Submit Request")).toBeDisabled();
    });

    it("Submit button enables when form is filled", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      fireEvent.click(screen.getByText("New Request"));

      fireEvent.change(screen.getByPlaceholderText("Brief title for your idea"), {
        target: { value: "Test" },
      });
      fireEvent.change(
        screen.getByPlaceholderText("Describe the feature and why it would be helpful..."),
        { target: { value: "Description" } }
      );

      expect(screen.getByText("Submit Request")).not.toBeDisabled();
    });

    it("closes modal when Cancel clicked", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      fireEvent.click(screen.getByText("New Request"));
      expect(screen.getByText("Request a Feature")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      expect(screen.queryByText("Request a Feature")).not.toBeInTheDocument();
    });
  });

  describe("Actions - Search Input", () => {
    it("accepts text input", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      const input = screen.getByPlaceholderText("Search feature requests...") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "test search" } });
      expect(input.value).toBe("test search");
    });
  });

  describe("Actions - Status Filter", () => {
    it("changes value when option selected", () => {
      render(<PublicFeedbackClient {...defaultProps} />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "open" } });
      expect(select.value).toBe("open");
    });
  });

});



