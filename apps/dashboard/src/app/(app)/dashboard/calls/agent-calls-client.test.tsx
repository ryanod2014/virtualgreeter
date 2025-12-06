/**
 * @vitest-environment jsdom
 *
 * AgentCallsClient Component Tests
 *
 * Tests capture the current behavior of the agent calls page:
 * - Display: Header, stats grid, filters bar, call logs table
 * - Actions: Date range changes, filter operations, recording playback
 * - Edge Cases: Empty states, filter with no results
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/calls",
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Phone: () => <div data-testid="phone-icon" />,
  PhoneIncoming: () => <div data-testid="phone-incoming-icon" />,
  PhoneMissed: () => <div data-testid="phone-missed-icon" />,
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  X: () => <div data-testid="x-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Download: () => <div data-testid="download-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Video: () => <div data-testid="video-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  MessageSquareText: () => <div data-testid="message-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

// Mock the stats calculation module
vi.mock("@/lib/stats/agent-stats", () => ({
  calculateAgentStats: vi.fn(() => ({
    totalRings: 100,
    totalAnswers: 80,
    totalMissed: 15,
    totalRejected: 5,
    answerPercentage: 80.0,
    avgAnswerTime: 5,
    avgCallDuration: 120,
    totalTalkTime: 9600,
    dispositionBreakdown: [],
  })),
  formatDuration: vi.fn((seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }),
  formatShortDuration: vi.fn((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }),
}));

// Mock DateRangePicker
vi.mock("@/lib/components/date-range-picker", () => ({
  DateRangePicker: ({ from, to, onRangeChange }: { from: Date; to: Date; onRangeChange: (from: Date, to: Date) => void }) => (
    <div data-testid="date-range-picker">
      <button
        data-testid="date-range-change"
        onClick={() => onRangeChange(new Date("2024-01-01"), new Date("2024-01-31"))}
      >
        Change Range
      </button>
      <span data-testid="from-date">{from.toISOString()}</span>
      <span data-testid="to-date">{to.toISOString()}</span>
    </div>
  ),
}));

// Mock MultiSelectDropdown
vi.mock("@/lib/components/multi-select-dropdown", () => ({
  MultiSelectDropdown: ({ options, selected, onChange, placeholder }: {
    options: Array<{ value: string; label: string }>;
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
  }) => (
    <div data-testid={`multi-select-${placeholder.toLowerCase().replace(/\s/g, "-")}`}>
      <button onClick={() => onChange(["completed"])} data-testid={`select-${placeholder}`}>
        Select Option
      </button>
      <span>{selected.length} selected</span>
    </div>
  ),
}));

// Mock CountrySelector
vi.mock("@/lib/components/country-selector", () => ({
  CountrySelector: ({ selected, onChange }: {
    selected: string[];
    onChange: (selected: string[]) => void;
  }) => (
    <div data-testid="country-selector">
      <button onClick={() => onChange(["US"])} data-testid="select-country">
        Select Country
      </button>
    </div>
  ),
}));

// Mock CallLogFilterConditions
vi.mock("@/lib/components/call-log-filter-conditions", () => ({
  CallLogFilterConditions: () => <div data-testid="url-filter" />,
  deserializeConditions: vi.fn(() => []),
  serializeConditions: vi.fn(() => ""),
}));

// Mock country flag utility
vi.mock("@/lib/utils/country-flag", () => ({
  formatLocationWithFlag: vi.fn((city?: string, region?: string, countryCode?: string) => {
    if (!city && !region && !countryCode) {
      return { flag: "🌐", text: "Unknown location" };
    }
    const flag = countryCode === "US" ? "🇺🇸" : "🌐";
    const parts = [city, region].filter(Boolean);
    return { flag, text: parts.join(", ") || "Unknown" };
  }),
}));

import { AgentCallsClient } from "./agent-calls-client";

describe("AgentCallsClient", () => {
  const defaultProps = {
    agentName: "Test Agent",
    calls: [],
    dispositions: [],
    dateRange: { from: "2024-01-01T00:00:00Z", to: "2024-01-31T23:59:59Z" },
    currentFilters: {},
  };

  const mockCall = {
    id: "call_1",
    created_at: "2024-01-15T10:30:00Z",
    status: "completed" as const,
    duration_seconds: 120,
    page_url: "https://example.com/test",
    recording_url: "https://storage.example.com/recording.webm",
    site: { id: "site_1", name: "Test Site", domain: "example.com" },
    disposition: { id: "disp_1", name: "Interested", color: "#22c55e" },
    visitor_city: "San Francisco",
    visitor_region: "California",
    visitor_country: "United States",
    visitor_country_code: "US",
    transcription: null,
    transcription_status: null,
    ai_summary: null,
    ai_summary_status: null,
    answered_at: "2024-01-15T10:30:05Z",
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

  describe("Display - Header", () => {
    it("shows 'My Calls' as page title", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("My Calls")).toBeInTheDocument();
    });

    it("shows subtitle about tracking performance metrics", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(
        screen.getByText("Track your performance metrics and view call history")
      ).toBeInTheDocument();
    });
  });

  describe("Display - Stats Grid", () => {
    it("shows Total Rings stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Total Rings")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("shows Total Answers stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Total Answers")).toBeInTheDocument();
      expect(screen.getByText("80")).toBeInTheDocument();
    });

    it("shows Missed Calls stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Missed Calls")).toBeInTheDocument();
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("shows Answer Rate stat card with percentage", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Answer Rate")).toBeInTheDocument();
      expect(screen.getByText("80.0%")).toBeInTheDocument();
    });

    it("shows Rejected stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Rejected")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("shows Avg. Answer Time stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Avg. Answer Time")).toBeInTheDocument();
    });

    it("shows Avg. Call Duration stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Avg. Call Duration")).toBeInTheDocument();
    });

    it("shows Total Talk Time stat card", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Total Talk Time")).toBeInTheDocument();
    });
  });

  describe("Display - Filters Bar", () => {
    it("renders date range picker", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    });

    it("shows Filters button", () => {
      render(<AgentCallsClient {...defaultProps} />);
      expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("expands filter panel when Filters button clicked", () => {
      render(<AgentCallsClient {...defaultProps} />);

      const filtersButton = screen.getByText("Filters");
      fireEvent.click(filtersButton);

      // Mocked components and filter labels are shown in the expanded section
      expect(screen.getByTestId("url-filter")).toBeInTheDocument();
      expect(screen.getByTestId("multi-select-all-statuses")).toBeInTheDocument();
      expect(screen.getByTestId("multi-select-all-dispositions")).toBeInTheDocument();
      expect(screen.getByTestId("country-selector")).toBeInTheDocument();
    });
  });

  describe("Display - Call Logs Table", () => {
    it("shows table headers when calls exist", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByText("Date/Time")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Duration")).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("Disposition")).toBeInTheDocument();
      expect(screen.getByText("Recording")).toBeInTheDocument();
      expect(screen.getByText("Transcription")).toBeInTheDocument();
      expect(screen.getByText("AI Summary")).toBeInTheDocument();
    });

    it("shows call date formatted as Month Day, Year", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
    });

    it("shows call status with appropriate icon", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByText("completed")).toBeInTheDocument();
    });

    it("shows location with flag when visitor has location data", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByText("🇺🇸")).toBeInTheDocument();
      expect(screen.getByText("San Francisco, California")).toBeInTheDocument();
    });

    it("shows disposition badge with color when disposition exists", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByText("Interested")).toBeInTheDocument();
    });

    it("shows results count", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByText("Showing 1 calls")).toBeInTheDocument();
    });
  });

  describe("Display - Empty State", () => {
    it("shows 'No calls found' when calls array is empty", () => {
      render(<AgentCallsClient {...defaultProps} calls={[]} />);
      expect(screen.getByText("No calls found")).toBeInTheDocument();
    });

    it("shows suggestion to adjust filters in empty state", () => {
      render(<AgentCallsClient {...defaultProps} calls={[]} />);
      expect(
        screen.getByText("Try adjusting your filters or date range")
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Actions - Date Range Change", () => {
    it("navigates with updated date params when date range changes", () => {
      render(<AgentCallsClient {...defaultProps} />);

      fireEvent.click(screen.getByTestId("date-range-change"));

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/calls?from=2024-01-01&to=2024-01-31")
      );
    });
  });

  describe("Actions - Filter Toggle", () => {
    it("toggles filter panel visibility when Filters button clicked", () => {
      render(<AgentCallsClient {...defaultProps} />);

      const filtersButton = screen.getByText("Filters");

      // Initially hidden
      expect(screen.queryByText("URL Filter")).not.toBeInTheDocument();

      // Click to show
      fireEvent.click(filtersButton);
      expect(screen.getByText("URL Filter")).toBeInTheDocument();

      // Click to hide
      fireEvent.click(filtersButton);
      expect(screen.queryByText("URL Filter")).not.toBeInTheDocument();
    });
  });

  describe("Actions - Apply Filters", () => {
    it("shows 'Applied' button when no changes have been made", () => {
      render(<AgentCallsClient {...defaultProps} />);

      // Open filters
      fireEvent.click(screen.getByText("Filters"));

      // Button should show "Applied" and be disabled when no unsaved changes
      expect(screen.getByText("Applied")).toBeInTheDocument();
    });

    it("shows Apply button that enables when filter changed", async () => {
      render(<AgentCallsClient {...defaultProps} />);

      // Open filters
      fireEvent.click(screen.getByText("Filters"));

      // Change a filter (country selector)
      fireEvent.click(screen.getByTestId("select-country"));

      await waitFor(() => {
        expect(screen.getByText("Apply")).toBeInTheDocument();
      });
    });
  });

  describe("Actions - Recording Playback", () => {
    it("shows play button for video recordings", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);

      // Video recording should show video + play icons
      expect(screen.getByTestId("video-icon")).toBeInTheDocument();
    });

    it("shows download button for recordings", () => {
      render(<AgentCallsClient {...defaultProps} calls={[mockCall]} />);
      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("handles call with no recording_url", () => {
      const callWithoutRecording = {
        ...mockCall,
        recording_url: null,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithoutRecording]} />);
      // Should not throw and should show dash for recording
      expect(screen.getByText("Showing 1 calls")).toBeInTheDocument();
    });

    it("handles call with no disposition", () => {
      const callWithoutDisposition = {
        ...mockCall,
        disposition: null,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithoutDisposition]} />);
      expect(screen.getByText("Showing 1 calls")).toBeInTheDocument();
    });

    it("handles call with no location data", () => {
      const callWithoutLocation = {
        ...mockCall,
        visitor_city: null,
        visitor_region: null,
        visitor_country: null,
        visitor_country_code: null,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithoutLocation]} />);
      expect(screen.getByText("Showing 1 calls")).toBeInTheDocument();
    });

    it("handles call with no duration", () => {
      const callWithoutDuration = {
        ...mockCall,
        duration_seconds: null,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithoutDuration]} />);
      expect(screen.getByText("Showing 1 calls")).toBeInTheDocument();
    });

    it("shows (limit reached) note when 500 calls shown", () => {
      const manyCalls = Array(500)
        .fill(null)
        .map((_, i) => ({ ...mockCall, id: `call_${i}` }));

      render(<AgentCallsClient {...defaultProps} calls={manyCalls} />);
      expect(screen.getByText(/limit reached/)).toBeInTheDocument();
    });

    it("handles transcription status showing Processing", () => {
      const callWithProcessingTranscription = {
        ...mockCall,
        transcription_status: "processing" as const,
      };
      render(
        <AgentCallsClient {...defaultProps} calls={[callWithProcessingTranscription]} />
      );
      expect(screen.getByText("Processing")).toBeInTheDocument();
    });

    it("handles transcription status showing Failed", () => {
      const callWithFailedTranscription = {
        ...mockCall,
        transcription_status: "failed" as const,
      };
      render(
        <AgentCallsClient {...defaultProps} calls={[callWithFailedTranscription]} />
      );
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("handles AI summary status showing Summarizing", () => {
      const callWithProcessingSummary = {
        ...mockCall,
        ai_summary_status: "processing" as const,
      };
      render(
        <AgentCallsClient {...defaultProps} calls={[callWithProcessingSummary]} />
      );
      expect(screen.getByText("Summarizing")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TRANSCRIPTION/SUMMARY EXPANSION
  // ---------------------------------------------------------------------------

  describe("Expandable Sections", () => {
    it("shows Transcribed badge when transcription is completed", () => {
      const callWithTranscription = {
        ...mockCall,
        transcription: "Hello, how can I help you?",
        transcription_status: "completed" as const,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithTranscription]} />);
      expect(screen.getByText("Transcribed")).toBeInTheDocument();
    });

    it("shows AI Summary badge when summary is completed", () => {
      const callWithSummary = {
        ...mockCall,
        ai_summary: "Customer inquired about pricing.",
        ai_summary_status: "completed" as const,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithSummary]} />);
      // AI Summary appears both as table header and as clickable badge
      const summaryElements = screen.getAllByText("AI Summary");
      expect(summaryElements.length).toBeGreaterThan(1); // Header + badge
    });

    it("expands transcription when Transcribed badge clicked", async () => {
      const callWithTranscription = {
        ...mockCall,
        transcription: "Hello, how can I help you?",
        transcription_status: "completed" as const,
      };
      render(<AgentCallsClient {...defaultProps} calls={[callWithTranscription]} />);

      // Find and click the Transcribed badge (which is a button)
      const transcribedBadge = screen.getByText("Transcribed").closest("button");
      expect(transcribedBadge).toBeInTheDocument();
      fireEvent.click(transcribedBadge!);

      // After clicking, the transcription content should be visible
      await waitFor(() => {
        expect(screen.getByText("Hello, how can I help you?")).toBeInTheDocument();
      });
    });
  });
});
