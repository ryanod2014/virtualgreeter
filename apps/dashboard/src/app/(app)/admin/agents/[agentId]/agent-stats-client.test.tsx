/**
 * @vitest-environment jsdom
 *
 * AgentStatsClient Component Tests
 *
 * Behaviors Tested:
 * 1. Display: Agent info header, tabs, stat cards, session table, disposition breakdown
 * 2. Actions: Tab switching, date range change
 * 3. Edge Cases: No calls, no sessions, various stats scenarios
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
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  PhoneIncoming: () => <div data-testid="phone-incoming-icon" />,
  PhoneMissed: () => <div data-testid="phone-missed-icon" />,
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Timer: () => <div data-testid="timer-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Coffee: () => <div data-testid="coffee-icon" />,
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
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  },
}));

import { AgentStatsClient } from "./agent-stats-client";

describe("AgentStatsClient", () => {
  const defaultAgent = {
    id: "agent-1",
    display_name: "John Doe",
    status: "idle",
    user: {
      email: "john@example.com",
      full_name: "John Doe",
    },
  };

  const defaultProps = {
    agent: defaultAgent,
    calls: [],
    sessions: [],
    dispositions: [],
    dateRange: { from: "2024-01-01", to: "2024-01-31" },
  };

  const mockCall = {
    id: "call-1",
    created_at: "2024-01-15T10:30:00Z",
    status: "completed",
    duration_seconds: 180,
    disposition_id: null,
  };

  const mockSession = {
    id: "session-1",
    started_at: "2024-01-15T09:00:00Z",
    ended_at: "2024-01-15T17:00:00Z",
    duration_seconds: 28800,
    idle_seconds: 25200,
    in_call_seconds: 3600,
    away_seconds: 0,
    ended_reason: "manual_logout",
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
  // HEADER DISPLAY
  // ---------------------------------------------------------------------------
  describe("Header Display", () => {
    it("renders agent display name", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders agent email", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("renders back link to agents page", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Back to Agents")).toBeInTheDocument();
      const backLink = screen.getByText("Back to Agents").closest("a");
      expect(backLink).toHaveAttribute("href", "/admin/agents");
    });

    it("renders date range picker", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByTestId("date-range-picker")).toBeInTheDocument();
    });

    it("renders users icon in avatar area", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByTestId("users-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TABS DISPLAY
  // ---------------------------------------------------------------------------
  describe("Tabs Display", () => {
    it("renders Performance tab", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Performance")).toBeInTheDocument();
    });

    it("renders Activity tab", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Activity")).toBeInTheDocument();
    });

    it("Performance tab is active by default", () => {
      render(<AgentStatsClient {...defaultProps} />);

      const performanceTab = screen.getByText("Performance").closest("button");
      expect(performanceTab).toHaveClass("bg-background");
    });
  });

  // ---------------------------------------------------------------------------
  // PERFORMANCE TAB CONTENT
  // ---------------------------------------------------------------------------
  describe("Performance Tab Content", () => {
    it("shows Total Rings stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Total Rings")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("shows Total Answers stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Total Answers")).toBeInTheDocument();
      expect(screen.getByText("40")).toBeInTheDocument();
    });

    it("shows Missed Calls stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Missed Calls")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("shows Answer Rate stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Answer Rate")).toBeInTheDocument();
      expect(screen.getByText("80.0%")).toBeInTheDocument();
    });

    it("shows Avg. Answer Time stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Avg. Answer Time")).toBeInTheDocument();
      expect(screen.getByText("Time to click answer")).toBeInTheDocument();
    });

    it("shows Avg. Call Duration stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Avg. Call Duration")).toBeInTheDocument();
      expect(screen.getByText("For completed calls")).toBeInTheDocument();
    });

    it("shows Total Talk Time stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Total Talk Time")).toBeInTheDocument();
      expect(screen.getByText("All time on calls")).toBeInTheDocument();
    });

    it("shows Rejected Calls stat card", () => {
      render(<AgentStatsClient {...defaultProps} />);

      expect(screen.getByText("Rejected Calls")).toBeInTheDocument();
      expect(screen.getByText("Calls declined by agent")).toBeInTheDocument();
    });

    it("shows empty state when no calls", () => {
      render(<AgentStatsClient {...defaultProps} calls={[]} />);

      expect(screen.getByText("No calls in this period")).toBeInTheDocument();
      expect(screen.getByText("Try selecting a different date range to see call statistics.")).toBeInTheDocument();
    });

    it("hides empty state when calls exist", () => {
      render(<AgentStatsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.queryByText("No calls in this period")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // DISPOSITION BREAKDOWN
  // ---------------------------------------------------------------------------
  describe("Disposition Breakdown", () => {
    it("shows disposition breakdown when data exists", () => {
      // Temporarily add dispositions to the mock stats
      mockStats.dispositionBreakdown = [
        { dispositionId: "d1", dispositionName: "Qualified Lead", count: 25, percentage: 62.5, color: "#10b981" },
        { dispositionId: "d2", dispositionName: "Follow Up", count: 15, percentage: 37.5, color: "#3b82f6" },
      ];

      render(<AgentStatsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.getByText("Disposition Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Qualified Lead")).toBeInTheDocument();
      expect(screen.getByText("Follow Up")).toBeInTheDocument();
      
      // Reset for other tests
      mockStats.dispositionBreakdown = [];
    });

    it("hides disposition breakdown when no dispositions", () => {
      mockStats.dispositionBreakdown = [];
      render(<AgentStatsClient {...defaultProps} calls={[mockCall]} />);

      expect(screen.queryByText("Disposition Breakdown")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TAB SWITCHING
  // ---------------------------------------------------------------------------
  describe("Tab Switching", () => {
    it("switches to Activity tab when clicked", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      const activityTab = screen.getByText("Activity").closest("button");
      fireEvent.click(activityTab!);

      await waitFor(() => {
        // Activity tab content should be visible
        expect(screen.getByText("Active Hours")).toBeInTheDocument();
        expect(screen.getByText("Sessions")).toBeInTheDocument();
        expect(screen.getByText("Time on Calls")).toBeInTheDocument();
        expect(screen.getByText("Utilization")).toBeInTheDocument();
      });
    });

    it("shows Time Breakdown section in Activity tab", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("Time Breakdown")).toBeInTheDocument();
        // "In Call" appears multiple times (stat card + time breakdown label)
        expect(screen.getAllByText("In Call").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Available (Idle)")).toBeInTheDocument();
        expect(screen.getByText("Away")).toBeInTheDocument();
      });
    });

    it("shows Session Log table in Activity tab", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("Session Log")).toBeInTheDocument();
        expect(screen.getByText("Date")).toBeInTheDocument();
        expect(screen.getByText("Start")).toBeInTheDocument();
        expect(screen.getByText("End")).toBeInTheDocument();
        // Duration appears in both stats and table headers
        expect(screen.getAllByText("Duration").length).toBeGreaterThanOrEqual(1);
        // In Call appears in stat card, time breakdown, and table header
        expect(screen.getAllByText("In Call").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Ended By")).toBeInTheDocument();
      });
    });

    it("switches back to Performance tab", async () => {
      render(<AgentStatsClient {...defaultProps} />);

      // Switch to Activity
      fireEvent.click(screen.getByText("Activity").closest("button")!);
      
      // Switch back to Performance
      fireEvent.click(screen.getByText("Performance").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("Total Rings")).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ACTIVITY TAB CONTENT
  // ---------------------------------------------------------------------------
  describe("Activity Tab Content", () => {
    it("shows empty state when no sessions", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("No sessions in this period")).toBeInTheDocument();
        expect(screen.getByText("Activity will appear here once the agent logs in.")).toBeInTheDocument();
      });
    });

    it("displays session row with formatted date", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        // Should show Jan 15 (from session started_at)
        expect(screen.getByText("Jan 15")).toBeInTheDocument();
      });
    });

    it("displays session row with start time", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        // Should show a time in HH:MM format (timezone dependent)
        // Using regex to match time pattern like "09:00" or "02:00 AM" etc.
        const timeElements = screen.getAllByText(/\d{1,2}:\d{2}/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });

    it("displays session row with end time", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        // Should show 17:00 (end time) - depends on local timezone
        // Use regex to find time format
        const timeElements = screen.getAllByText(/\d{2}:\d{2}/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });

    it("shows Active badge for session without end time", async () => {
      const activeSession = {
        ...mockSession,
        ended_at: null,
        duration_seconds: null,
      };
      render(<AgentStatsClient {...defaultProps} sessions={[activeSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("Active")).toBeInTheDocument();
      });
    });

    it("displays formatted ended reason", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        // manual_logout should become "Manual Logout"
        expect(screen.getByText("Manual Logout")).toBeInTheDocument();
      });
    });

    it("shows total logged time message", async () => {
      render(<AgentStatsClient {...defaultProps} sessions={[mockSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText(/Total logged time:/)).toBeInTheDocument();
        expect(screen.getByText(/includes away time/)).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DATE RANGE ACTIONS
  // ---------------------------------------------------------------------------
  describe("Date Range Actions", () => {
    it("updates URL when date range changes", async () => {
      render(<AgentStatsClient {...defaultProps} />);

      const dateRangePicker = screen.getByTestId("date-range-picker");
      fireEvent.click(dateRangePicker);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/admin/agents/agent-1?from=2024-01-01&to=2024-01-15"
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles agent with null user gracefully", () => {
      const agentNoUser = { ...defaultAgent, user: null };
      render(<AgentStatsClient {...defaultProps} agent={agentNoUser} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      // Email should not crash
    });

    it("handles multiple sessions correctly", async () => {
      const sessions = [
        { ...mockSession, id: "s1" },
        { ...mockSession, id: "s2", ended_reason: "timeout" },
        { ...mockSession, id: "s3", ended_reason: "browser_close" },
      ];
      render(<AgentStatsClient {...defaultProps} sessions={sessions} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        // Should show all sessions
        expect(screen.getByText("Manual Logout")).toBeInTheDocument();
        expect(screen.getByText("Timeout")).toBeInTheDocument();
        expect(screen.getByText("Browser Close")).toBeInTheDocument();
      });
    });

    it("handles session with no ended_reason", async () => {
      const sessionNoReason = { ...mockSession, ended_reason: null };
      render(<AgentStatsClient {...defaultProps} sessions={[sessionNoReason]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        // Should show dash for ended reason
        const dashElements = screen.getAllByText("-");
        expect(dashElements.length).toBeGreaterThan(0);
      });
    });

    it("shows 0% utilization when no active time", async () => {
      const zeroSession = {
        ...mockSession,
        idle_seconds: 0,
        in_call_seconds: 0,
        away_seconds: 3600,
      };
      render(<AgentStatsClient {...defaultProps} sessions={[zeroSession]} />);

      fireEvent.click(screen.getByText("Activity").closest("button")!);

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
      });
    });
  });
});
