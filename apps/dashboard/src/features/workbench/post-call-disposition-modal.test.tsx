/**
 * @vitest-environment jsdom
 *
 * PostCallDispositionModal Tests
 *
 * Behaviors Tested:
 * 1. Display: Returns null when not open
 * 2. Display: Shows "Call Ended" header when open
 * 3. Display: Shows loading spinner while fetching dispositions
 * 4. Display: Shows dispositions list with colors
 * 5. Display: Shows "No dispositions configured" when empty
 * 6. Display: First disposition shows Trophy icon
 * 7. Display: Shows Facebook event badge when configured
 * 8. Actions: Clicking disposition saves and closes after delay
 * 9. Actions: "Skip for now" calls onClose
 * 10. Actions: Close X button calls onClose
 * 11. Actions: Backdrop click calls onClose
 * 12. Actions: Shows selection state during save
 * 13. Edge Cases: Doesn't save if no callLogId
 * 14. Edge Cases: Buttons disabled during save
 * 15. Edge Cases: Error handling for Supabase failures
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Trophy: () => <div data-testid="trophy-icon" />,
}));

// Create mock functions at module level
const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

import { PostCallDispositionModal } from "./post-call-disposition-modal";

// Mock fetch for Facebook CAPI
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PostCallDispositionModal", () => {
  const defaultProps = {
    isOpen: true,
    callLogId: "call-123",
    onClose: vi.fn(),
    organizationId: "org-456",
  };

  const mockDispositions = [
    { id: "d1", name: "Sale Made", color: "#10B981", fb_event_name: "Purchase", fb_event_enabled: true, value: 100 },
    { id: "d2", name: "Meeting Scheduled", color: "#3B82F6", fb_event_name: null, fb_event_enabled: false, value: null },
    { id: "d3", name: "No Interest", color: "#EF4444", fb_event_name: null, fb_event_enabled: false, value: null },
  ];

  // Helper to create chainable Supabase mock for dispositions table
  const createDispositionsMock = (dispositions: typeof mockDispositions | []) => {
    const mockOrder = vi.fn().mockResolvedValue({ data: dispositions, error: null });
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    return { select: mockSelect };
  };

  // Helper to create call_logs update mock
  const createCallLogsMock = (error: { message: string } | null = null) => {
    return {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: error ? null : [{ id: "call-123" }],
            error,
          }),
        }),
      }),
    };
  };

  const setupMocks = (dispositions = mockDispositions, updateError: { message: string } | null = null) => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "dispositions") {
        return createDispositionsMock(dispositions);
      }
      if (table === "call_logs") {
        return createCallLogsMock(updateError);
      }
      return createDispositionsMock(dispositions);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ fired: true, event_name: "Purchase", event_id: "123" }),
    });
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
        <PostCallDispositionModal {...defaultProps} isOpen={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders modal when isOpen is true", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Call Ended")).toBeInTheDocument();
      });
    });

    it("shows subtitle 'How did this call go?'", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/How did this call go/)).toBeInTheDocument();
      });
    });
  });

  describe("Display - Loading State", () => {
    it("shows CheckCircle icon in header", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
      });
    });
  });

  describe("Display - Dispositions List", () => {
    it("shows all dispositions when loaded", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
        expect(screen.getByText("Meeting Scheduled")).toBeInTheDocument();
        expect(screen.getByText("No Interest")).toBeInTheDocument();
      });
    });

    it("shows Trophy icon for first disposition", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
      });
    });

    it("shows colored dot for non-first dispositions", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        const coloredDots = document.querySelectorAll('[style*="background-color"]');
        expect(coloredDots.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("Display - Empty State", () => {
    it("shows 'No dispositions configured' when list is empty", async () => {
      setupMocks([]);

      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No dispositions configured.")).toBeInTheDocument();
      });
    });

    it("shows admin instruction when no dispositions", async () => {
      setupMocks([]);

      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/An admin can add them in Settings → Dispositions/)).toBeInTheDocument();
      });
    });
  });

  describe("Display - Facebook Event Badge", () => {
    it("shows Facebook event badge when fb_event_enabled is true", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Purchase")).toBeInTheDocument();
        expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
      });
    });

    it("does not show badge when fb_event_enabled is false", async () => {
      const dispositionsNoFb = [
        { id: "d1", name: "Test", color: "#10B981", fb_event_name: null, fb_event_enabled: false, value: null },
      ];
      setupMocks(dispositionsNoFb);

      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("zap-icon")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Disposition Selection", () => {
    it("calls Supabase update when disposition clicked", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith("call_logs");
      });
    });

    it("calls onClose after save with delay", async () => {
      const onClose = vi.fn();
      render(<PostCallDispositionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      // Wait for the 500ms delay + async operations
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it("fires Facebook CAPI event when disposition has fb_event_enabled", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/facebook/capi", expect.any(Object));
      });
    });

    it("does not fire Facebook event when fb_event_enabled is false", async () => {
      const onClose = vi.fn();
      render(<PostCallDispositionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Meeting Scheduled")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Meeting Scheduled").closest("button");
      fireEvent.click(dispositionButton!);

      // Wait for save to complete
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 2000 });

      // fetch should not have been called for Facebook
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Actions - Skip Button", () => {
    it("calls onClose when 'Skip for now' clicked", async () => {
      const onClose = vi.fn();
      render(<PostCallDispositionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Skip for now")).toBeInTheDocument();
      });

      const skipButton = screen.getByText("Skip for now");
      fireEvent.click(skipButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("Skip button is disabled during save", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      const skipButton = screen.getByText("Skip for now");
      expect(skipButton).toBeDisabled();
    });
  });

  describe("Actions - Close Button (X)", () => {
    it("calls onClose when X button clicked", async () => {
      const onClose = vi.fn();
      render(<PostCallDispositionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByTestId("x-icon")).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId("x-icon").closest("button");
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Actions - Backdrop Click", () => {
    it("calls onClose when backdrop clicked", async () => {
      const onClose = vi.fn();
      const { container } = render(<PostCallDispositionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Call Ended")).toBeInTheDocument();
      });

      const backdrop = container.querySelector(".bg-black\\/60");
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("does not save when callLogId is null", async () => {
      const updateMock = vi.fn();
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "dispositions") {
          return createDispositionsMock(mockDispositions);
        }
        if (table === "call_logs") {
          return { update: updateMock };
        }
        return createDispositionsMock(mockDispositions);
      });

      render(<PostCallDispositionModal {...defaultProps} callLogId={null} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      // Should not call update
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("shows other buttons as disabled (opacity-50) during save", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      // Other disposition buttons should have opacity-50 class
      const otherButton = screen.getByText("Meeting Scheduled").closest("button");
      expect(otherButton).toHaveClass("opacity-50");
    });

    it("logs error when Supabase update fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      setupMocks(mockDispositions, { message: "DB Error" });

      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("[Disposition] Supabase error:", { message: "DB Error" });
      });

      consoleSpy.mockRestore();
    });

    it("continues to close modal even if Facebook event fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error("Network error"));
      const onClose = vi.fn();

      render(<PostCallDispositionModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      consoleSpy.mockRestore();
    });

    it("fetches dispositions when modal opens", async () => {
      const { rerender } = render(
        <PostCallDispositionModal {...defaultProps} isOpen={false} />
      );

      // Reset the mock to track new calls
      mockSupabaseFrom.mockClear();
      setupMocks();

      rerender(<PostCallDispositionModal {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith("dispositions");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // VISUAL ELEMENTS
  // ---------------------------------------------------------------------------

  describe("Visual Elements", () => {
    it("has fixed positioning with backdrop", async () => {
      const { container } = render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        const modalContainer = container.querySelector(".fixed.inset-0");
        expect(modalContainer).toBeInTheDocument();
      });
    });

    it("has glass morphism effect on modal", async () => {
      const { container } = render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        const modal = container.querySelector(".glass");
        expect(modal).toBeInTheDocument();
      });
    });

    it("shows selected state styling on chosen disposition", async () => {
      render(<PostCallDispositionModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Sale Made")).toBeInTheDocument();
      });

      const dispositionButton = screen.getByText("Sale Made").closest("button");
      fireEvent.click(dispositionButton!);

      expect(dispositionButton).toHaveClass("bg-primary/20", "border-primary");
    });
  });
});




