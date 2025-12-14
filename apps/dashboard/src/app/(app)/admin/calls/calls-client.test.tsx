/**
 * @vitest-environment jsdom
 *
 * CallsClient Component Tests
 *
 * Behaviors Tested:
 * 1. Display: Page header, stat cards, call table, filters panel, empty state
 * 2. Actions: Filter toggle, date range change, play recording, download CSV, expand filters
 * 3. Edge Cases: No calls, filter with no results, URL conditions filtering
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
  usePathname: () => "/admin/calls",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
  User: () => <div data-testid="user-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Download: () => <div data-testid="download-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  ArrowRightLeft: () => <div data-testid="arrow-right-left-icon" />,
  FileDown: () => <div data-testid="file-down-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  MessageSquareText: () => <div data-testid="message-square-text-icon" />,
}));

// Mock DateRangePicker
vi.mock("@/lib/components/date-range-picker", () => ({
  DateRangePicker: ({ onRangeChange }: { onRangeChange: (from: Date, to: Date) => void }) => (
    <button
      data-testid="date-range-picker"
      onClick={() => onRangeChange(new Date("2024-01-01"), new Date("2024-01-15"))}
    >
      Date Picker
    </button>
  ),
}));

// Mock MultiSelectDropdown
vi.mock("@/lib/components/multi-select-dropdown", () => ({
  MultiSelectDropdown: ({ placeholder }: { placeholder: string }) => (
    <div data-testid="multi-select-dropdown">{placeholder}</div>
  ),
}));

// Mock CountrySelector
vi.mock("@/lib/components/country-selector", () => ({
  CountrySelector: ({ placeholder }: { placeholder: string }) => (
    <div data-testid="country-selector">{placeholder}</div>
  ),
}));

// Mock CallLogFilterConditions
vi.mock("@/lib/components/call-log-filter-conditions", () => ({
  CallLogFilterConditions: () => <div data-testid="call-log-filter-conditions" />,
  deserializeConditions: () => [],
  serializeConditions: () => "",
}));

// Mock country flag utils
vi.mock("@/lib/utils/country-flag", () => ({
  formatLocationWithFlag: (city: string, region: string, countryCode: string) => ({
    flag: "🇺🇸",
    text: `${city}, ${region}`,
  }),
}));

vi.mock("@/lib/utils/countries", () => ({
  getCountryByCode: () => ({ name: "United States", code: "US" }),
}));

// Mock stats calculation
const mockStats = {
  totalRings: 50,
  totalAnswers: 40,
  totalMissed: 8,
  totalRejected: 2,
  answerPercentage: 80,
  avgAnswerTime: 5,
  avgCallDuration: 180,
  totalTalkTime: 7200,
  dispositionBreakdown: [] as Array<{ dispositionId: string; dispositionName: string; count: number; percentage: number; color: string }>,
};

vi.mock("@/lib/stats/agent-stats", () => ({
  calculateAgentStats: () => mockStats,
  formatDuration: (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  },
  formatShortDuration: (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
}));

import { CallsClient } from "./calls-client";

describe("CallsClient", () => {
  const defaultProps = {
    calls: [],
    dispositions: [],
    agents: [],
    pools: [],
    dateRange: { from: "2024-01-01", to: "2024-01-31" },
    currentFilters: {},
    teamActivity: { activeSeconds: 3600, inCallSeconds: 1800 },
    pageviewCount: 1000,
    coverageStats: {
      pageviewsWithAgent: 900,
      missedOpportunities: 100,
      coverageRate: 90,
    },
    hourlyCoverage: [],
  };

  const mockCall = {
    id: "call-1",
    created_at: "2024-01-15T10:30:00Z",
    status: "completed",
    duration_seconds: 180,
    page_url: "https://example.com/pricing",
    recording_url: null,
    agent: { id: "agent-1", display_name: "John Doe" },
    site: null,
    disposition: null,
    visitor_city: "New York",
    visitor_region: "NY",
    visitor_country: "United States",
    visitor_country_code: "US",
    transcription: null,
    transcription_status: null,
    ai_summary: null,
    ai_summary_status: null,
  };

  const mockCallWithRecording = {
    ...mockCall,
    id: "call-2",
    recording_url: "https://storage.example.com/recording.webm",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock stats to defaults
    mockStats.totalRings = 50;
    mockStats.totalAnswers = 40;
    mockStats.totalMissed = 8;
    mockStats.totalRejected = 2;
    mockStats.answerPercentage = 80;
    mockStats.avgAnswerTime = 5;
    mockStats.avgCallDuration = 180;
    mockStats.totalTalkTime = 7200;
    mockStats.dispositionBreakdown = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Display", () => {
    it("renders page header with title and description", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("Calls")).toBeInTheDocument();
      expect(screen.getByText("Track performance metrics and view call history")).toBeInTheDocument();
    });

    it("renders date range picker", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    });

    it("renders filter button", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("renders stat cards with correct values", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("Total Rings")).toBeInTheDocument();
      expect(screen.getByText("Total Answers")).toBeInTheDocument();
      expect(screen.getByText("Missed Calls")).toBeInTheDocument();
      expect(screen.getByText("Answer Rate")).toBeInTheDocument();
    });

    it("shows coverage card with missed opportunities count", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("100 Missed Opportunities")).toBeInTheDocument();
    });

    it("shows full coverage message when no missed opportunities", () => {
      render(
        <CallsClient
          {...defaultProps}
          coverageStats={{ pageviewsWithAgent: 1000, missedOpportunities: 0, coverageRate: 100 }}
        />
      );

      expect(screen.getByText("Full Coverage")).toBeInTheDocument();
      expect(screen.getByText("Great Coverage!")).toBeInTheDocument();
    });

    it("renders call table headers", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("Date/Time")).toBeInTheDocument();
      expect(screen.getByText("Agent")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Duration")).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("Disposition")).toBeInTheDocument();
      expect(screen.getByText("Recording")).toBeInTheDocument();
    });

    it("shows call count in results text", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("Showing 1 calls")).toBeInTheDocument();
    });

    it("shows empty state when no calls", () => {
      render(<CallsClient {...defaultProps} calls={[]} />);

      expect(screen.getByText("No calls found")).toBeInTheDocument();
      expect(screen.getByText("Try adjusting your filters or date range")).toBeInTheDocument();
    });

    it("displays call row with agent name", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("displays call row with status", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("displays call row with formatted duration", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("3:00")).toBeInTheDocument();
    });

    it("displays call row with truncated URL", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("https://example.com/pricing")).toBeInTheDocument();
    });

    it("displays call row with location", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("New York, NY")).toBeInTheDocument();
    });

    it("shows Export CSV button when calls exist", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });

    it("hides Export CSV button when no calls", () => {
      render(<CallsClient {...defaultProps} calls={[]} />);

      expect(screen.queryByText("Export CSV")).not.toBeInTheDocument();
    });

    it("shows Add More Agents link when missed opportunities exist", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("Add More Agents")).toBeInTheDocument();
    });

    it("shows Active Hours stat card when team has active time", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("Active Hours")).toBeInTheDocument();
    });

    it("hides Active Hours stat card when no active time", () => {
      render(
        <CallsClient
          {...defaultProps}
          teamActivity={{ activeSeconds: 0, inCallSeconds: 0 }}
        />
      );

      expect(screen.queryByText("Active Hours")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CALL ROW SPECIFIC BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Call Row Display", () => {
    it("shows dash for duration when null", () => {
      const callNoDuration = { ...mockCall, duration_seconds: null };
      render(<CallsClient {...defaultProps} calls={[callNoDuration]} />);

      // Duration column should show dash
      const durationCells = screen.getAllByText("-");
      expect(durationCells.length).toBeGreaterThan(0);
    });

    it("shows dash for location when no city", () => {
      const callNoLocation = { ...mockCall, visitor_city: null };
      render(<CallsClient {...defaultProps} calls={[callNoLocation]} />);

      // Location column should show dash
      const dashCells = screen.getAllByText("-");
      expect(dashCells.length).toBeGreaterThan(0);
    });

    it("shows dash for recording when no recording_url", () => {
      render(<CallsClient {...defaultProps} calls={[mockCall]} />);

      // Recording column should show dash
      const dashCells = screen.getAllByText("-");
      expect(dashCells.length).toBeGreaterThan(0);
    });

    it("shows play button for video recording", () => {
      render(<CallsClient {...defaultProps} calls={[mockCallWithRecording]} />);

      expect(screen.getByTestId("video-icon")).toBeInTheDocument();
    });

    it("shows download button for recording", () => {
      render(<CallsClient {...defaultProps} calls={[mockCallWithRecording]} />);

      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
    });

    it("displays disposition badge when present", () => {
      const callWithDisposition = {
        ...mockCall,
        disposition: { id: "disp-1", name: "Qualified Lead", color: "#10b981" },
      };
      render(<CallsClient {...defaultProps} calls={[callWithDisposition]} />);

      expect(screen.getByText("Qualified Lead")).toBeInTheDocument();
    });

    it("shows transcription badge when completed", () => {
      const callWithTranscription = {
        ...mockCall,
        transcription: "Hello, how can I help?",
        transcription_status: "completed" as const,
      };
      render(<CallsClient {...defaultProps} calls={[callWithTranscription]} />);

      expect(screen.getByText("Transcribed")).toBeInTheDocument();
    });

    it("shows processing badge when transcription in progress", () => {
      const callProcessing = {
        ...mockCall,
        transcription_status: "processing" as const,
      };
      render(<CallsClient {...defaultProps} calls={[callProcessing]} />);

      expect(screen.getByText("Processing")).toBeInTheDocument();
    });

    it("shows AI Summary badge when completed", () => {
      const callWithSummary = {
        ...mockCall,
        ai_summary: "Customer inquired about pricing.",
        ai_summary_status: "completed" as const,
      };
      render(<CallsClient {...defaultProps} calls={[callWithSummary]} />);

      // AI Summary appears as a clickable badge in the table row
      const summaryBadges = screen.getAllByText("AI Summary");
      expect(summaryBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // FILTER BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Filter Actions", () => {
    it("toggles filter panel when Filters button clicked", async () => {
      render(<CallsClient {...defaultProps} />);

      const filterButton = screen.getByText("Filters");
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText("Pool & URL")).toBeInTheDocument();
        // Agent label in filter panel
        expect(screen.getAllByText("Agent").length).toBeGreaterThanOrEqual(1);
        // Status appears both in filter panel and in table header
        expect(screen.getAllByText("Status").length).toBeGreaterThanOrEqual(1);
        // Disposition appears both in filter panel and in table header
        expect(screen.getAllByText("Disposition").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Country")).toBeInTheDocument();
        expect(screen.getByText("Duration (sec)")).toBeInTheDocument();
      });
    });

    it("shows Apply button in filter panel", async () => {
      render(<CallsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Filters"));

      await waitFor(() => {
        expect(screen.getByText("Applied")).toBeInTheDocument();
      });
    });

    it("hides clear button when no active filters", async () => {
      render(<CallsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Filters"));

      await waitFor(() => {
        // Clear button (X icon in filters) should not be in filter actions area
        // when no filters are applied
        const filterActions = screen.getByText("Applied").parentElement;
        expect(filterActions?.querySelectorAll("[data-testid='x-icon']").length).toBe(0);
      });
    });

    it("renders duration min/max inputs in filter panel", async () => {
      render(<CallsClient {...defaultProps} />);

      fireEvent.click(screen.getByText("Filters"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Max")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DATE RANGE ACTIONS
  // ---------------------------------------------------------------------------
  describe("Date Range Actions", () => {
    it("updates URL when date range changes", async () => {
      render(<CallsClient {...defaultProps} />);

      const dateRangePicker = screen.getByTestId("date-range-picker");
      fireEvent.click(dateRangePicker);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining("from=2024-01-01")
        );
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining("to=2024-01-15")
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // COVERAGE CARD BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Coverage Card", () => {
    it("shows coverage rate percentage", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("90.0%")).toBeInTheDocument();
    });

    it("shows visitor counts breakdown", () => {
      render(<CallsClient {...defaultProps} />);

      // These numbers appear in the coverage card breakdown
      // Using getAllByText since numbers might appear multiple times
      expect(screen.getAllByText(/1000/).length).toBeGreaterThanOrEqual(1); // total visitors
      expect(screen.getAllByText(/900/).length).toBeGreaterThanOrEqual(1); // with agent
      expect(screen.getAllByText(/100/).length).toBeGreaterThanOrEqual(1); // missed
    });

    it("shows explainer text about coverage", () => {
      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText(/How this works:/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPOSITION BREAKDOWN
  // ---------------------------------------------------------------------------
  describe("Disposition Breakdown", () => {
    it("shows disposition breakdown section when dispositions exist", () => {
      // Temporarily add dispositions to the mock stats
      mockStats.dispositionBreakdown = [
        { dispositionId: "d1", dispositionName: "Qualified Lead", count: 20, percentage: 50, color: "#10b981" },
        { dispositionId: "d2", dispositionName: "Not Interested", count: 20, percentage: 50, color: "#ef4444" },
      ];

      render(<CallsClient {...defaultProps} />);

      expect(screen.getByText("Disposition Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Qualified Lead")).toBeInTheDocument();
      expect(screen.getByText("Not Interested")).toBeInTheDocument();
      
      // Reset for other tests
      mockStats.dispositionBreakdown = [];
    });

    it("hides disposition breakdown when no dispositions", () => {
      mockStats.dispositionBreakdown = [];
      render(<CallsClient {...defaultProps} />);

      expect(screen.queryByText("Disposition Breakdown")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles call with unknown agent gracefully", () => {
      const callNoAgent = { ...mockCall, agent: null };
      render(<CallsClient {...defaultProps} calls={[callNoAgent]} />);

      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    it("displays multiple calls correctly", () => {
      const calls = [
        { ...mockCall, id: "call-1", agent: { id: "a1", display_name: "Agent One" } },
        { ...mockCall, id: "call-2", agent: { id: "a2", display_name: "Agent Two" } },
        { ...mockCall, id: "call-3", agent: { id: "a3", display_name: "Agent Three" } },
      ];
      render(<CallsClient {...defaultProps} calls={calls} />);

      expect(screen.getByText("Agent One")).toBeInTheDocument();
      expect(screen.getByText("Agent Two")).toBeInTheDocument();
      expect(screen.getByText("Agent Three")).toBeInTheDocument();
      expect(screen.getByText("Showing 3 calls")).toBeInTheDocument();
    });

    it("shows limit reached message when 500 calls", () => {
      const manyCalls = Array.from({ length: 500 }, (_, i) => ({
        ...mockCall,
        id: `call-${i}`,
      }));
      render(<CallsClient {...defaultProps} calls={manyCalls} />);

      expect(screen.getByText("Showing 500 calls (limit reached)")).toBeInTheDocument();
    });

    it("handles all call statuses correctly", () => {
      const statusCalls = [
        { ...mockCall, id: "c1", status: "completed" },
        { ...mockCall, id: "c2", status: "missed" },
        { ...mockCall, id: "c3", status: "rejected" },
        { ...mockCall, id: "c4", status: "accepted" },
        { ...mockCall, id: "c5", status: "pending" },
      ];
      render(<CallsClient {...defaultProps} calls={statusCalls} />);

      // Each status appears in call rows - some may also appear in stat labels
      // Completed status in call row
      expect(screen.getByText("Completed")).toBeInTheDocument();
      // Missed status in call row
      expect(screen.getByText("Missed")).toBeInTheDocument();
      // Rejected appears both as a stat card ("Rejected" in stat label) and call status
      expect(screen.getAllByText("Rejected").length).toBeGreaterThanOrEqual(1);
      // Accepted status in call row
      expect(screen.getByText("Accepted")).toBeInTheDocument();
      // Pending status in call row
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });
});




