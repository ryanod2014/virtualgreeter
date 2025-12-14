/**
 * @vitest-environment jsdom
 *
 * FeedbackButtons Tests
 *
 * Behaviors Tested:
 * 1. Display - Bug report button, feature request button, notification bell
 * 2. Bug Modal - Opens/closes, form validation, submission
 * 3. Notifications - Bell badge, dropdown, mark as read
 * 4. Success feedback - Shows success message after submission
 * 5. Navigation - Feature request navigates to /feedback
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock lucide-react icons BEFORE importing component
vi.mock("lucide-react", () => ({
  Bug: () => <div data-testid="bug-icon" />,
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  X: () => <div data-testid="x-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Camera: () => <div data-testid="camera-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Square: () => <div data-testid="square-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Circle: () => <div data-testid="circle-icon" />,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin"),
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}));

// Simplified supabase mock that avoids circular mock structures
let mockNotificationsData: Array<{
  id: string;
  type: "reply" | "upvote" | "status_change";
  message: string;
  feedback_item_id: string | null;
  is_read: boolean;
  created_at: string;
}> = [];
let mockInsertError: Error | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "feedback_notifications") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockNotificationsData, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
            in: () => Promise.resolve({ error: null }),
          }),
        };
      }
      if (table === "feedback_items") {
        return {
          insert: () => {
            if (mockInsertError) {
              return Promise.reject(mockInsertError);
            }
            return Promise.resolve({ error: null });
          },
        };
      }
      return {
        select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({
          data: { publicUrl: "https://example.com/screenshot.png" },
        }),
      }),
    },
  }),
}));

import { FeedbackButtons } from "./feedback-buttons";

describe("FeedbackButtons", () => {
  const defaultProps = {
    organizationId: "org-123",
    userId: "user-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationsData = [];
    mockInsertError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY - Floating Buttons
  // ---------------------------------------------------------------------------
  describe("Display - Floating Buttons", () => {
    it("renders Bug report button", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
    });

    it("renders Feature request button", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTitle("Request a Feature")).toBeInTheDocument();
      });
    });

    it("renders Notifications bell button", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
    });

    it("shows Bug icon in bug report button", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("bug-icon")).toBeInTheDocument();
      });
    });

    it("shows Lightbulb icon in feature request button", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByTestId("lightbulb-icon")).toBeInTheDocument();
      });
    });

    it("shows Bell icon in notifications button", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getAllByTestId("bell-icon").length).toBeGreaterThan(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // BUG MODAL - Open/Close
  // ---------------------------------------------------------------------------
  describe("Bug Modal - Open/Close", () => {
    it("opens bug modal when Report Bug button is clicked", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(screen.getByText("Report a Bug")).toBeInTheDocument();
    });

    it("shows current page URL in bug modal header", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(screen.getByText("Page: /admin")).toBeInTheDocument();
    });

    it("closes bug modal when X button is clicked", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      // Open modal
      fireEvent.click(screen.getByTitle("Report a Bug"));
      expect(screen.getByText("Report a Bug")).toBeInTheDocument();
      
      // Close via X button (find the button containing X icon)
      const closeButtons = screen.getAllByRole("button");
      const xButton = closeButtons.find((btn) =>
        btn.querySelector('[data-testid="x-icon"]')
      );
      fireEvent.click(xButton!);
      
      expect(screen.queryByText("Report a Bug")).not.toBeInTheDocument();
    });

    it("closes bug modal when Cancel button is clicked", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      
      expect(screen.queryByText("Report a Bug")).not.toBeInTheDocument();
    });

    it("closes bug modal when clicking backdrop", async () => {
      const { container } = render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      // Click the backdrop (the first fixed inset-0 element)
      const backdrop = container.querySelector(".fixed.inset-0.z-\\[60\\]");
      fireEvent.click(backdrop!);
      
      expect(screen.queryByText("Report a Bug")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // BUG MODAL - Form Inputs
  // ---------------------------------------------------------------------------
  describe("Bug Modal - Form Inputs", () => {
    it("shows title input with placeholder", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(
        screen.getByPlaceholderText("Brief description of the bug")
      ).toBeInTheDocument();
    });

    it("shows description textarea with placeholder", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(
        screen.getByPlaceholderText("What happened? What were you trying to do?")
      ).toBeInTheDocument();
    });

    it("updates title input when user types", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const input = screen.getByPlaceholderText("Brief description of the bug");
      fireEvent.change(input, { target: { value: "Test bug title" } });
      
      expect(input).toHaveValue("Test bug title");
    });

    it("updates description when user types", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const textarea = screen.getByPlaceholderText(
        "What happened? What were you trying to do?"
      );
      fireEvent.change(textarea, { target: { value: "Detailed description" } });
      
      expect(textarea).toHaveValue("Detailed description");
    });

    it("clears form fields when modal is reopened", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      // Open and fill form
      fireEvent.click(screen.getByTitle("Report a Bug"));
      const input = screen.getByPlaceholderText("Brief description of the bug");
      fireEvent.change(input, { target: { value: "Test title" } });
      
      // Close modal
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      
      // Reopen modal
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      // Form should be cleared
      expect(
        screen.getByPlaceholderText("Brief description of the bug")
      ).toHaveValue("");
    });
  });

  // ---------------------------------------------------------------------------
  // BUG MODAL - Form Validation
  // ---------------------------------------------------------------------------
  describe("Bug Modal - Form Validation", () => {
    it("disables submit button when title is empty", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const textarea = screen.getByPlaceholderText(
        "What happened? What were you trying to do?"
      );
      fireEvent.change(textarea, { target: { value: "Description only" } });
      
      const submitButton = screen.getByRole("button", { name: /submit bug report/i });
      expect(submitButton).toBeDisabled();
    });

    it("disables submit button when description is empty", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const input = screen.getByPlaceholderText("Brief description of the bug");
      fireEvent.change(input, { target: { value: "Title only" } });
      
      const submitButton = screen.getByRole("button", { name: /submit bug report/i });
      expect(submitButton).toBeDisabled();
    });

    it("enables submit button when both title and description are filled", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const input = screen.getByPlaceholderText("Brief description of the bug");
      const textarea = screen.getByPlaceholderText(
        "What happened? What were you trying to do?"
      );
      
      fireEvent.change(input, { target: { value: "Bug title" } });
      fireEvent.change(textarea, { target: { value: "Bug description" } });
      
      const submitButton = screen.getByRole("button", { name: /submit bug report/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("shows error when submitting with empty fields via form submit", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      // Try to submit empty form via form submission
      const form = screen.getByRole("button", { name: /submit bug report/i })
        .closest("form");
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(screen.getByText("Please fill in all fields")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // BUG MODAL - Submission
  // ---------------------------------------------------------------------------
  describe("Bug Modal - Submission", () => {
    it("closes modal after successful submission", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const input = screen.getByPlaceholderText("Brief description of the bug");
      const textarea = screen.getByPlaceholderText(
        "What happened? What were you trying to do?"
      );
      
      fireEvent.change(input, { target: { value: "Bug title" } });
      fireEvent.change(textarea, { target: { value: "Bug description" } });
      
      fireEvent.click(screen.getByRole("button", { name: /submit bug report/i }));
      
      await waitFor(() => {
        expect(screen.queryByText("Report a Bug")).not.toBeInTheDocument();
      });
    });

    it("shows success message after successful submission", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const input = screen.getByPlaceholderText("Brief description of the bug");
      const textarea = screen.getByPlaceholderText(
        "What happened? What were you trying to do?"
      );
      
      fireEvent.change(input, { target: { value: "Bug title" } });
      fireEvent.change(textarea, { target: { value: "Bug description" } });
      
      fireEvent.click(screen.getByRole("button", { name: /submit bug report/i }));
      
      await waitFor(() => {
        expect(screen.getByText("Bug reported!")).toBeInTheDocument();
      });
    });

    it("shows error message when submission fails", async () => {
      mockInsertError = new Error("API Error");
      
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      const input = screen.getByPlaceholderText("Brief description of the bug");
      const textarea = screen.getByPlaceholderText(
        "What happened? What were you trying to do?"
      );
      
      fireEvent.change(input, { target: { value: "Bug title" } });
      fireEvent.change(textarea, { target: { value: "Bug description" } });
      
      fireEvent.click(screen.getByRole("button", { name: /submit bug report/i }));
      
      await waitFor(() => {
        expect(screen.getByText("Failed to submit. Please try again.")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // BUG MODAL - Screenshot/Recording Buttons
  // ---------------------------------------------------------------------------
  describe("Bug Modal - Screenshot/Recording", () => {
    it("shows Screenshot button in modal", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(screen.getByRole("button", { name: /screenshot/i })).toBeInTheDocument();
    });

    it("shows Record Screen button in modal", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(screen.getByRole("button", { name: /record screen/i })).toBeInTheDocument();
    });

    it("shows 'Attach evidence (optional)' label", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Report a Bug")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Report a Bug"));
      
      expect(screen.getByText(/attach evidence/i)).toBeInTheDocument();
      expect(screen.getByText(/optional/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS - Dropdown
  // ---------------------------------------------------------------------------
  describe("Notifications - Dropdown", () => {
    it("opens notifications dropdown when bell is clicked", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Notifications"));
      
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("shows 'No notifications yet' when empty", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Notifications"));
      
      await waitFor(() => {
        expect(screen.getByText("No notifications yet")).toBeInTheDocument();
      });
    });

    it("closes notifications dropdown when clicking outside", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
      
      // Open dropdown
      fireEvent.click(screen.getByTitle("Notifications"));
      
      await waitFor(() => {
        expect(screen.getByText("No notifications yet")).toBeInTheDocument();
      });
      
      // Click the overlay that closes the dropdown
      const overlay = document.querySelector(".fixed.inset-0.z-40");
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      // The dropdown should close
      await waitFor(() => {
        expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
      });
    });

    it("shows unread badge count when there are unread notifications", async () => {
      mockNotificationsData = [
        {
          id: "notif-1",
          type: "reply",
          message: "Someone replied to your bug",
          feedback_item_id: "feedback-1",
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "notif-2",
          type: "upvote",
          message: "Your feature got an upvote",
          feedback_item_id: "feedback-2",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("shows 9+ when unread count exceeds 9", async () => {
      mockNotificationsData = Array.from({ length: 10 }, (_, i) => ({
        id: `notif-${i}`,
        type: "reply" as const,
        message: `Notification ${i}`,
        feedback_item_id: `feedback-${i}`,
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText("9+")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS - Mark as Read
  // ---------------------------------------------------------------------------
  describe("Notifications - Mark as Read", () => {
    it("shows 'Mark all read' button when there are unread notifications", async () => {
      mockNotificationsData = [
        {
          id: "notif-1",
          type: "reply" as const,
          message: "Test notification",
          feedback_item_id: "feedback-1",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Notifications"));
      
      await waitFor(() => {
        expect(screen.getByText("Mark all read")).toBeInTheDocument();
      });
    });

    it("does not show 'Mark all read' when all notifications are read", async () => {
      mockNotificationsData = [
        {
          id: "notif-1",
          type: "reply" as const,
          message: "Test notification",
          feedback_item_id: "feedback-1",
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ];
      
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Notifications"));
      
      await waitFor(() => {
        // Wait for notification list to render
        expect(screen.getByText("Test notification")).toBeInTheDocument();
      });
      
      expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FEATURE REQUEST - Navigation
  // ---------------------------------------------------------------------------
  describe("Feature Request - Navigation", () => {
    it("navigates to /feedback when Feature Request button is clicked", async () => {
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Request a Feature")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Request a Feature"));
      
      expect(mockPush).toHaveBeenCalledWith("/feedback");
    });
  });

  // ---------------------------------------------------------------------------
  // TIME AGO
  // ---------------------------------------------------------------------------
  describe("Time Ago Formatting", () => {
    it("shows 'now' for very recent notifications", async () => {
      mockNotificationsData = [
        {
          id: "notif-1",
          type: "reply" as const,
          message: "Just happened",
          feedback_item_id: "feedback-1",
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      
      render(<FeedbackButtons {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTitle("Notifications")).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByTitle("Notifications"));
      
      await waitFor(() => {
        expect(screen.getByText("now")).toBeInTheDocument();
      });
    });
  });
});




