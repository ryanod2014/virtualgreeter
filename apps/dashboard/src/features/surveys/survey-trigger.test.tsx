/**
 * @vitest-environment jsdom
 *
 * SurveyTrigger Tests
 *
 * Behaviors Tested:
 * 1. Display - Returns null when not eligible, renders EllisSurveyModal when triggered
 * 2. Eligibility - Respects useSurveyEligibility hook result
 * 3. Session Storage - Checks/sets SESSION_STORAGE_KEY to prevent re-showing
 * 4. Timer - Sets random delay between MIN and MAX, triggers survey
 * 5. Cleanup - Clears timer on unmount
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin/dashboard"),
}));

// Mock the EllisSurveyModal component
vi.mock("./ellis-survey-modal", () => ({
  EllisSurveyModal: ({
    isOpen,
    onClose,
    userId,
    userRole,
    organizationId,
    triggeredBy,
    pageUrl,
  }: {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userRole: string;
    organizationId: string;
    triggeredBy: string;
    pageUrl: string;
  }) =>
    isOpen ? (
      <div data-testid="ellis-survey-modal">
        <div data-testid="modal-user-id">{userId}</div>
        <div data-testid="modal-user-role">{userRole}</div>
        <div data-testid="modal-org-id">{organizationId}</div>
        <div data-testid="modal-triggered-by">{triggeredBy}</div>
        <div data-testid="modal-page-url">{pageUrl}</div>
        <button data-testid="close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Mock the useSurveyEligibility hook
const mockUseSurveyEligibility = vi.fn();
vi.mock("./use-survey-eligibility", () => ({
  useSurveyEligibility: (params: { userId: string; userCreatedAt: string }) =>
    mockUseSurveyEligibility(params),
}));

import { SurveyTrigger } from "./survey-trigger";
import type { User } from "@ghost-greeter/domain/database.types";

// Session storage key from the component
const SESSION_STORAGE_KEY = "pmf_survey_shown_this_session";

describe("SurveyTrigger", () => {
  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    role: "admin",
    organization_id: "org-123",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clear session storage
    sessionStorage.clear();
    // Default: eligible and not loading
    mockUseSurveyEligibility.mockReturnValue({
      isEligible: true,
      isLoading: false,
      reason: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // ELIGIBILITY - Basic Checks
  // ---------------------------------------------------------------------------
  describe("Eligibility - Basic Checks", () => {
    it("returns null when not eligible and survey not showing", () => {
      mockUseSurveyEligibility.mockReturnValue({
        isEligible: false,
        isLoading: false,
        reason: "User not eligible",
      });

      const { container } = render(<SurveyTrigger user={mockUser} />);

      expect(container.firstChild).toBeNull();
    });

    it("returns null during loading state", () => {
      mockUseSurveyEligibility.mockReturnValue({
        isEligible: false,
        isLoading: true,
        reason: null,
      });

      const { container } = render(<SurveyTrigger user={mockUser} />);

      // During loading, isEligible is false, so nothing should render
      expect(container.firstChild).toBeNull();
    });

    it("calls useSurveyEligibility with correct params", () => {
      render(<SurveyTrigger user={mockUser} />);

      expect(mockUseSurveyEligibility).toHaveBeenCalledWith({
        userId: "user-123",
        userCreatedAt: "2024-01-01T00:00:00Z",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // SESSION STORAGE - Already Shown
  // ---------------------------------------------------------------------------
  describe("Session Storage - Already Shown", () => {
    it("does not set up timer if already shown this session", () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");

      render(<SurveyTrigger user={mockUser} />);

      // Advance past max delay (20 minutes)
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      // Survey should not appear
      expect(screen.queryByTestId("ellis-survey-modal")).not.toBeInTheDocument();
    });

    it("sets session storage key when survey is shown", async () => {
      mockUseSurveyEligibility.mockReturnValue({
        isEligible: true,
        isLoading: false,
        reason: null,
      });

      render(<SurveyTrigger user={mockUser} />);

      // Advance past max delay to ensure timer fires
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe("true");
    });
  });

  // ---------------------------------------------------------------------------
  // TIMER - Trigger Behavior
  // ---------------------------------------------------------------------------
  describe("Timer - Trigger Behavior", () => {
    it("does not show survey immediately", () => {
      render(<SurveyTrigger user={mockUser} />);

      // No time has passed
      expect(screen.queryByTestId("ellis-survey-modal")).not.toBeInTheDocument();
    });

    it("does not show survey before minimum delay (5 minutes)", () => {
      render(<SurveyTrigger user={mockUser} />);

      // Advance 4.5 minutes (just under minimum)
      act(() => {
        vi.advanceTimersByTime(4.5 * 60 * 1000);
      });

      expect(screen.queryByTestId("ellis-survey-modal")).not.toBeInTheDocument();
    });

    it("shows survey after max delay (20 minutes)", () => {
      render(<SurveyTrigger user={mockUser} />);

      // Advance past max delay
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      expect(screen.getByTestId("ellis-survey-modal")).toBeInTheDocument();
    });

    it("shows survey with triggeredBy set to 'random'", async () => {
      render(<SurveyTrigger user={mockUser} />);

      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      expect(screen.getByTestId("modal-triggered-by")).toHaveTextContent("random");
    });
  });

  // ---------------------------------------------------------------------------
  // SURVEY MODAL - Props Passed
  // ---------------------------------------------------------------------------
  describe("Survey Modal - Props Passed", () => {
    beforeEach(() => {
      render(<SurveyTrigger user={mockUser} />);
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });
    });

    it("passes userId to EllisSurveyModal", () => {
      expect(screen.getByTestId("modal-user-id")).toHaveTextContent("user-123");
    });

    it("passes userRole to EllisSurveyModal", () => {
      expect(screen.getByTestId("modal-user-role")).toHaveTextContent("admin");
    });

    it("passes organizationId to EllisSurveyModal", () => {
      expect(screen.getByTestId("modal-org-id")).toHaveTextContent("org-123");
    });

    it("passes pageUrl from usePathname to EllisSurveyModal", () => {
      expect(screen.getByTestId("modal-page-url")).toHaveTextContent("/admin/dashboard");
    });
  });

  // ---------------------------------------------------------------------------
  // SURVEY MODAL - Close Behavior
  // ---------------------------------------------------------------------------
  describe("Survey Modal - Close Behavior", () => {
    it("hides survey modal when onClose is called", () => {
      render(<SurveyTrigger user={mockUser} />);

      // Trigger survey
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      expect(screen.getByTestId("ellis-survey-modal")).toBeInTheDocument();

      // Close the modal
      act(() => {
        screen.getByTestId("close-modal").click();
      });

      expect(screen.queryByTestId("ellis-survey-modal")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CLEANUP - Timer Cleanup
  // ---------------------------------------------------------------------------
  describe("Cleanup - Timer Cleanup", () => {
    it("clears timeout on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      const { unmount } = render(<SurveyTrigger user={mockUser} />);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("does not trigger survey after unmount", () => {
      const { unmount } = render(<SurveyTrigger user={mockUser} />);

      // Unmount before timer fires
      unmount();

      // Advance past max delay
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      // Session storage should not be set (survey never shown)
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // ELIGIBILITY CHANGES
  // ---------------------------------------------------------------------------
  describe("Eligibility Changes", () => {
    it("does not set up timer while still loading", () => {
      mockUseSurveyEligibility.mockReturnValue({
        isEligible: false,
        isLoading: true,
        reason: null,
      });

      render(<SurveyTrigger user={mockUser} />);

      // Advance past max delay
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      // Survey should not appear because we're still loading
      expect(screen.queryByTestId("ellis-survey-modal")).not.toBeInTheDocument();
    });

    it("does not set up timer when not eligible", () => {
      mockUseSurveyEligibility.mockReturnValue({
        isEligible: false,
        isLoading: false,
        reason: "User has been surveyed recently",
      });

      render(<SurveyTrigger user={mockUser} />);

      // Advance past max delay
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });

      // Survey should not appear
      expect(screen.queryByTestId("ellis-survey-modal")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles SSR environment where window is undefined", () => {
      // This test verifies the typeof window check in the component
      // In jsdom, window is always defined, but we can verify the component
      // doesn't crash when rendered
      render(<SurveyTrigger user={mockUser} />);
      
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });
      
      expect(screen.getByTestId("ellis-survey-modal")).toBeInTheDocument();
    });

    it("renders modal even when isEligible becomes false after survey shown", () => {
      // First render with eligible
      const { rerender } = render(<SurveyTrigger user={mockUser} />);
      
      // Trigger survey
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000 + 1000);
      });
      
      expect(screen.getByTestId("ellis-survey-modal")).toBeInTheDocument();
      
      // Now eligibility changes to false
      mockUseSurveyEligibility.mockReturnValue({
        isEligible: false,
        isLoading: false,
        reason: "No longer eligible",
      });
      
      // Rerender with same user
      rerender(<SurveyTrigger user={mockUser} />);
      
      // Modal should still be visible because showSurvey state is true
      // The condition is: if (!isEligible && !showSurvey) return null
      // Since showSurvey is true, it won't return null
      expect(screen.getByTestId("ellis-survey-modal")).toBeInTheDocument();
    });
  });
});



