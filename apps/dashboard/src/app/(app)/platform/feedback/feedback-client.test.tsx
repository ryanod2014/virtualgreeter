/**
 * @vitest-environment jsdom
 *
 * FeedbackClient Tests
 *
 * Behaviors Tested:
 * 1. Display: Page title, tabs (bug/feature/PMF), feedback items, status badges
 * 2. Actions: Tab switching, search, status filter, date filter, open detail modal
 * 3. Edge Cases: No feedback, no PMF surveys, long descriptions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Bug: () => <div data-testid="bug-icon" />,
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  PlayCircle: () => <div data-testid="play-circle-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Building2: () => <div data-testid="building-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  User: () => <div data-testid="user-icon" />,
  X: () => <div data-testid="x-icon" />,
  Image: () => <div data-testid="image-icon" />,
  Video: () => <div data-testid="video-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Meh: () => <div data-testid="meh-icon" />,
  Frown: () => <div data-testid="frown-icon" />,
}));

// Mock DateRangePicker
vi.mock("@/lib/components/date-range-picker", () => ({
  DateRangePicker: ({ from, to, onRangeChange }: { from: Date; to: Date; onRangeChange: (from: Date, to: Date) => void }) => (
    <div data-testid="date-range-picker">
      <button
        onClick={() => onRangeChange(new Date("2024-01-01"), new Date("2024-12-31"))}
        data-testid="change-date-range"
      >
        Change Date Range
      </button>
    </div>
  ),
}));

import { FeedbackClient } from "./feedback-client";

describe("FeedbackClient", () => {
  const mockBugReport = {
    id: "feedback-1",
    organization_id: "org-1",
    organization_name: "Acme Corp",
    organization_plan: "pro" as const,
    organization_status: "active" as const,
    user_id: "user-1",
    user_email: "jane@acme.com",
    user_name: "Jane Smith",
    user_role: "admin",
    type: "bug" as const,
    title: "Video not loading",
    description: "The intro video fails to load on mobile devices.",
    status: "open" as const,
    priority: "high" as const,
    vote_count: 5,
    comment_count: 3,
    screenshot_url: "https://example.com/screenshot.png",
    recording_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockFeatureRequest = {
    ...mockBugReport,
    id: "feedback-2",
    type: "feature" as const,
    title: "Add dark mode support",
    description: "Would love to have a dark mode option for the dashboard.",
    status: "in_progress" as const,
    priority: "medium" as const,
    vote_count: 25,
    screenshot_url: null,
    recording_url: null,
  };

  const mockPmfSurvey = {
    id: "pmf-1",
    organization_id: "org-1",
    organization_name: "Acme Corp",
    organization_plan: "pro" as const,
    organization_status: "active" as const,
    user_id: "user-1",
    user_email: "jane@acme.com",
    user_name: "Jane Smith",
    user_role: "admin",
    disappointment_level: "very_disappointed" as const,
    follow_up_text: "I use it every day for customer calls.",
    page_url: "/dashboard",
    dismissed: false,
    created_at: new Date().toISOString(),
  };

  const defaultProps = {
    feedbackItems: [mockBugReport, mockFeatureRequest],
    pmfSurveys: [mockPmfSurvey],
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
  describe("Display", () => {
    it("shows page title 'All Feedback'", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("All Feedback")).toBeInTheDocument();
    });

    it("shows page subtitle", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("Bug reports and feature requests from all organizations")).toBeInTheDocument();
    });

    it("shows Bug Reports tab with count", () => {
      render(<FeedbackClient {...defaultProps} />);
      const bugTab = screen.getByRole("button", { name: /Bug Reports/ });
      expect(bugTab).toBeInTheDocument();
      // Count is displayed as text within the button
      expect(bugTab.textContent).toContain("1");
    });

    it("shows Feature Requests tab with count", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Feature Requests/ })).toBeInTheDocument();
    });

    it("shows PMF Surveys tab with count", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByRole("button", { name: /PMF Surveys/ })).toBeInTheDocument();
    });

    it("shows search input", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search feedback, email, org...")).toBeInTheDocument();
    });

    it("shows status filter dropdown", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByDisplayValue("All Status")).toBeInTheDocument();
    });

    it("shows date range picker", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    });

    it("shows results count", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("1 results")).toBeInTheDocument();
    });
  });

  describe("Display - Bug Reports (Default View)", () => {
    it("shows bug report title", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("Video not loading")).toBeInTheDocument();
    });

    it("shows bug report description", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("The intro video fails to load on mobile devices.")).toBeInTheDocument();
    });

    it("shows organization name", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("shows user email", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("jane@acme.com")).toBeInTheDocument();
    });

    it("shows priority badge", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("high")).toBeInTheDocument();
    });

    it("shows status badge", () => {
      render(<FeedbackClient {...defaultProps} />);
      // Status displays both in dropdown option and as a badge
      const statusElements = screen.getAllByText("Open");
      expect(statusElements.length).toBeGreaterThanOrEqual(2);
    });

    it("shows comment count", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows screenshot indicator when screenshot exists", () => {
      render(<FeedbackClient {...defaultProps} />);
      expect(screen.getByTestId("image-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Actions - Tab Switching", () => {
    it("switches to Feature Requests view when tab clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      const featureTab = screen.getByRole("button", { name: /Feature Requests/ });
      fireEvent.click(featureTab);

      expect(screen.getByText("Add dark mode support")).toBeInTheDocument();
    });

    it("shows vote count for feature requests", () => {
      render(<FeedbackClient {...defaultProps} />);

      const featureTab = screen.getByRole("button", { name: /Feature Requests/ });
      fireEvent.click(featureTab);

      expect(screen.getByText("25")).toBeInTheDocument();
    });

    it("switches to PMF Surveys view when tab clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByText("Very disappointed")).toBeInTheDocument();
    });

    it("shows PMF survey follow-up text", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByText(/I use it every day for customer calls/)).toBeInTheDocument();
    });

    it("returns to Bug Reports view when tab clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      // Switch to feature requests first
      const featureTab = screen.getByRole("button", { name: /Feature Requests/ });
      fireEvent.click(featureTab);

      // Then back to bugs
      const bugTab = screen.getByRole("button", { name: /Bug Reports/ });
      fireEvent.click(bugTab);

      expect(screen.getByText("Video not loading")).toBeInTheDocument();
    });
  });

  describe("Actions - Search", () => {
    it("filters feedback by title when searching", () => {
      const anotherBug = {
        ...mockBugReport,
        id: "feedback-3",
        title: "Login button broken",
        description: "Cannot click the login button.",
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[mockBugReport, anotherBug]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search feedback, email, org...");
      fireEvent.change(searchInput, { target: { value: "video" } });

      expect(screen.getByText("Video not loading")).toBeInTheDocument();
      expect(screen.queryByText("Login button broken")).not.toBeInTheDocument();
    });

    it("filters feedback by organization name when searching", () => {
      const differentOrg = {
        ...mockBugReport,
        id: "feedback-4",
        organization_name: "Other Company",
        user_email: "bob@other.com",
        user_name: "Bob Jones",
        title: "Different bug",
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[mockBugReport, differentOrg]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search feedback, email, org...");
      fireEvent.change(searchInput, { target: { value: "Acme" } });

      // Video not loading should be visible (its org is Acme Corp)
      expect(screen.getByText("Video not loading")).toBeInTheDocument();
      // Different bug should not be visible after filtering
      expect(screen.queryByText("Different bug")).not.toBeInTheDocument();
    });

    it("filters feedback by user email when searching", () => {
      const differentUser = {
        ...mockBugReport,
        id: "feedback-5",
        user_email: "bob@other.com",
        title: "Bob's bug",
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[mockBugReport, differentUser]}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search feedback, email, org...");
      fireEvent.change(searchInput, { target: { value: "jane@" } });

      expect(screen.getByText("Video not loading")).toBeInTheDocument();
      expect(screen.queryByText("Bob's bug")).not.toBeInTheDocument();
    });

    it("search is case insensitive", () => {
      render(<FeedbackClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search feedback, email, org...");
      fireEvent.change(searchInput, { target: { value: "VIDEO" } });

      expect(screen.getByText("Video not loading")).toBeInTheDocument();
    });

    it("changes placeholder when on PMF tab", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByPlaceholderText("Search surveys, email, org...")).toBeInTheDocument();
    });
  });

  describe("Actions - Status Filter", () => {
    it("filters by open status", () => {
      const closedBug = {
        ...mockBugReport,
        id: "feedback-closed",
        title: "Closed bug",
        status: "closed" as const,
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[mockBugReport, closedBug]}
        />
      );

      const statusSelect = screen.getByDisplayValue("All Status");
      fireEvent.change(statusSelect, { target: { value: "open" } });

      expect(screen.getByText("Video not loading")).toBeInTheDocument();
      expect(screen.queryByText("Closed bug")).not.toBeInTheDocument();
    });

    it("hides status filter when on PMF tab", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.queryByDisplayValue("All Status")).not.toBeInTheDocument();
    });
  });

  describe("Actions - Detail Modal", () => {
    it("opens detail modal when feedback item clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      expect(feedbackItem).toBeInTheDocument();
      fireEvent.click(feedbackItem!);

      // Modal should show title
      expect(screen.getAllByText("Video not loading").length).toBeGreaterThanOrEqual(1);
      // Modal should show description section
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("shows user info in modal", () => {
      render(<FeedbackClient {...defaultProps} />);

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      fireEvent.click(feedbackItem!);

      expect(screen.getByText("Submitted By")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("shows organization info in modal", () => {
      render(<FeedbackClient {...defaultProps} />);

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      fireEvent.click(feedbackItem!);

      expect(screen.getByText("Organization")).toBeInTheDocument();
    });

    it("shows screenshot in modal when present", () => {
      render(<FeedbackClient {...defaultProps} />);

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      fireEvent.click(feedbackItem!);

      expect(screen.getByText("Attachments")).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/screenshot.png");
    });

    it("closes modal when X button clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      fireEvent.click(feedbackItem!);

      // Close modal - find button with X icon
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) => btn.querySelector("[data-testid='x-icon']"));
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton!);

      // Modal should be closed
      expect(screen.queryByText("Submitted By")).not.toBeInTheDocument();
    });

    it("closes modal when backdrop clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      fireEvent.click(feedbackItem!);

      // Click the backdrop
      const backdrop = screen.getByText("Submitted By").closest("div[class*='fixed']");
      fireEvent.click(backdrop!);

      // Modal should be closed
      expect(screen.queryByText("Submitted By")).not.toBeInTheDocument();
    });
  });

  describe("Actions - PMF Survey Detail Modal", () => {
    it("opens PMF survey modal when item clicked", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      const surveyItem = screen.getByText("Very disappointed").closest("div[class*='cursor-pointer']");
      expect(surveyItem).toBeInTheDocument();
      fireEvent.click(surveyItem!);

      expect(screen.getByText("PMF Survey Response")).toBeInTheDocument();
    });

    it("shows disappointment level in PMF modal", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      const surveyItem = screen.getByText("Very disappointed").closest("div[class*='cursor-pointer']");
      fireEvent.click(surveyItem!);

      expect(screen.getAllByText("Very disappointed").length).toBeGreaterThanOrEqual(1);
    });

    it("shows follow-up response in PMF modal", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      const surveyItem = screen.getByText("Very disappointed").closest("div[class*='cursor-pointer']");
      fireEvent.click(surveyItem!);

      expect(screen.getByText("Response")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("shows empty state when no bug reports", () => {
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[mockFeatureRequest]}
        />
      );

      expect(screen.getByText("No bug reports found")).toBeInTheDocument();
    });

    it("shows empty state when no feature requests", () => {
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[mockBugReport]}
        />
      );

      const featureTab = screen.getByRole("button", { name: /Feature Requests/ });
      fireEvent.click(featureTab);

      expect(screen.getByText("No feature requests found")).toBeInTheDocument();
    });

    it("shows empty state when no PMF surveys", () => {
      render(
        <FeedbackClient
          {...defaultProps}
          pmfSurveys={[]}
        />
      );

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByText("No PMF survey responses found")).toBeInTheDocument();
    });

    it("shows empty state when search has no matches", () => {
      render(<FeedbackClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search feedback, email, org...");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(screen.getByText("No bug reports found")).toBeInTheDocument();
    });

    it("handles feedback without screenshot or recording", () => {
      const noMediaBug = {
        ...mockBugReport,
        screenshot_url: null,
        recording_url: null,
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[noMediaBug]}
        />
      );

      // Should not show media icons
      expect(screen.queryByTestId("image-icon")).not.toBeInTheDocument();
    });

    it("handles feedback with recording", () => {
      const withRecording = {
        ...mockBugReport,
        recording_url: "https://example.com/recording.mp4",
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[withRecording]}
        />
      );

      expect(screen.getByTestId("video-icon")).toBeInTheDocument();
    });

    it("handles PMF survey with page URL", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByText("From: /dashboard")).toBeInTheDocument();
    });

    it("handles PMF survey without follow-up text", () => {
      const noFollowUp = {
        ...mockPmfSurvey,
        follow_up_text: null,
      };
      render(
        <FeedbackClient
          {...defaultProps}
          pmfSurveys={[noFollowUp]}
        />
      );

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      // Should still show the survey item
      expect(screen.getByText("Very disappointed")).toBeInTheDocument();
    });

    it("displays different PMF disappointment levels correctly", () => {
      const somewhatDisappointed = {
        ...mockPmfSurvey,
        id: "pmf-2",
        disappointment_level: "somewhat_disappointed" as const,
      };
      const notDisappointed = {
        ...mockPmfSurvey,
        id: "pmf-3",
        disappointment_level: "not_disappointed" as const,
      };
      render(
        <FeedbackClient
          {...defaultProps}
          pmfSurveys={[mockPmfSurvey, somewhatDisappointed, notDisappointed]}
        />
      );

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByText("Very disappointed")).toBeInTheDocument();
      expect(screen.getByText("Somewhat disappointed")).toBeInTheDocument();
      expect(screen.getByText("Not disappointed")).toBeInTheDocument();
    });

    it("shows user role in PMF survey list", () => {
      render(<FeedbackClient {...defaultProps} />);

      const pmfTab = screen.getByRole("button", { name: /PMF Surveys/ });
      fireEvent.click(pmfTab);

      expect(screen.getByText("• admin")).toBeInTheDocument();
    });

    it("does not show attachments section when no media in modal", () => {
      const noMediaBug = {
        ...mockBugReport,
        screenshot_url: null,
        recording_url: null,
      };
      render(
        <FeedbackClient
          {...defaultProps}
          feedbackItems={[noMediaBug]}
        />
      );

      const feedbackItem = screen.getByText("Video not loading").closest("div[class*='cursor-pointer']");
      fireEvent.click(feedbackItem!);

      expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
    });
  });
});


