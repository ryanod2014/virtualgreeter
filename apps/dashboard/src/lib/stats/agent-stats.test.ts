import { describe, it, expect } from "vitest";
import {
  calculateAgentStats,
  formatDuration,
  formatShortDuration,
  type CallLogForStats,
  type DispositionForStats,
} from "./agent-stats";

describe("agent-stats", () => {
  describe("calculateAgentStats", () => {
    const mockDispositions: DispositionForStats[] = [
      { id: "disp-1", name: "Sale", color: "#22c55e" },
      { id: "disp-2", name: "Follow Up", color: "#3b82f6" },
      { id: "disp-3", name: "Not Interested", color: "#ef4444" },
    ];

    describe("totalRings", () => {
      it("counts all calls as rings", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalRings).toBe(3);
      });

      it("returns 0 when no calls", () => {
        const stats = calculateAgentStats([], mockDispositions);
        expect(stats.totalRings).toBe(0);
      });
    });

    describe("totalAnswers", () => {
      it("counts accepted and completed calls as answers", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "accepted", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: 3, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
          { id: "4", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:03:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalAnswers).toBe(2);
      });

      it("returns 0 when no answered calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalAnswers).toBe(0);
      });
    });

    describe("totalMissed", () => {
      it("counts calls with missed status", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalMissed).toBe(2);
      });

      it("returns 0 when no missed calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalMissed).toBe(0);
      });
    });

    describe("totalRejected", () => {
      it("counts calls with rejected status", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
          { id: "4", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:03:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalRejected).toBe(3);
      });
    });

    describe("avgAnswerTime", () => {
      it("calculates average answer time from calls with answer_time_seconds", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 10, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 120, ring_started_at: null, answered_at: null, answer_time_seconds: 20, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.avgAnswerTime).toBe(15); // (10 + 20) / 2
      });

      it("returns 0 when no calls have answer time", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.avgAnswerTime).toBe(0);
      });

      it("handles single call with answer time", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 7, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.avgAnswerTime).toBe(7);
      });
    });

    describe("answerPercentage", () => {
      it("calculates percentage of answered calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.answerPercentage).toBe(50);
      });

      it("returns 100 when all calls answered", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "accepted", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: 3, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.answerPercentage).toBe(100);
      });

      it("returns 0 when no calls answered", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "rejected", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.answerPercentage).toBe(0);
      });

      it("returns 0 when no calls exist", () => {
        const stats = calculateAgentStats([], mockDispositions);
        expect(stats.answerPercentage).toBe(0);
      });
    });

    describe("avgCallDuration", () => {
      it("calculates average duration from completed calls only", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 120, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "accepted", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.avgCallDuration).toBe(90); // (60 + 120) / 2
      });

      it("returns 0 when no completed calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "accepted", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.avgCallDuration).toBe(0);
      });

      it("ignores completed calls without duration", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.avgCallDuration).toBe(60);
      });
    });

    describe("totalTalkTime", () => {
      it("sums duration of all completed calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 120, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "completed", duration_seconds: 180, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:02:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalTalkTime).toBe(360); // 60 + 120 + 180
      });

      it("returns 0 when no completed calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "missed", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalTalkTime).toBe(0);
      });

      it("handles very long calls (over 1 hour)", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 3600, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 5400, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T11:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalTalkTime).toBe(9000); // 1h + 1h30m = 9000s
      });
    });

    describe("dispositionBreakdown", () => {
      it("calculates breakdown percentages for dispositions", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-2", created_at: "2024-01-01T10:02:00Z" },
          { id: "4", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-3", created_at: "2024-01-01T10:03:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        
        expect(stats.dispositionBreakdown).toHaveLength(3);
        
        const saleDisp = stats.dispositionBreakdown.find(d => d.dispositionId === "disp-1");
        expect(saleDisp?.count).toBe(2);
        expect(saleDisp?.percentage).toBe(50);
        expect(saleDisp?.dispositionName).toBe("Sale");
        expect(saleDisp?.color).toBe("#22c55e");
        
        const followUpDisp = stats.dispositionBreakdown.find(d => d.dispositionId === "disp-2");
        expect(followUpDisp?.count).toBe(1);
        expect(followUpDisp?.percentage).toBe(25);
      });

      it("excludes dispositions with zero count", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        
        expect(stats.dispositionBreakdown).toHaveLength(1);
        expect(stats.dispositionBreakdown[0].dispositionId).toBe("disp-1");
      });

      it("sorts dispositions by count descending", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-2", created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-2", created_at: "2024-01-01T10:02:00Z" },
          { id: "4", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-2", created_at: "2024-01-01T10:03:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        
        expect(stats.dispositionBreakdown[0].dispositionId).toBe("disp-2");
        expect(stats.dispositionBreakdown[0].count).toBe(3);
        expect(stats.dispositionBreakdown[1].dispositionId).toBe("disp-1");
        expect(stats.dispositionBreakdown[1].count).toBe(1);
      });

      it("returns empty array when no calls have dispositions", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.dispositionBreakdown).toHaveLength(0);
      });

      it("handles calls without dispositions mixed with calls with dispositions", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:00:00Z" },
          { id: "2", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: null, created_at: "2024-01-01T10:01:00Z" },
          { id: "3", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:02:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        
        expect(stats.dispositionBreakdown).toHaveLength(1);
        expect(stats.dispositionBreakdown[0].count).toBe(2);
        expect(stats.dispositionBreakdown[0].percentage).toBe(100); // 2/2 calls with disposition
      });
    });

    describe("edge cases", () => {
      it("handles empty calls array", () => {
        const stats = calculateAgentStats([], mockDispositions);
        
        expect(stats.totalRings).toBe(0);
        expect(stats.totalAnswers).toBe(0);
        expect(stats.totalMissed).toBe(0);
        expect(stats.totalRejected).toBe(0);
        expect(stats.avgAnswerTime).toBe(0);
        expect(stats.answerPercentage).toBe(0);
        expect(stats.avgCallDuration).toBe(0);
        expect(stats.totalTalkTime).toBe(0);
        expect(stats.dispositionBreakdown).toHaveLength(0);
      });

      it("handles empty dispositions array", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "completed", duration_seconds: 60, ring_started_at: null, answered_at: null, answer_time_seconds: 5, disposition_id: "disp-1", created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, []);
        expect(stats.dispositionBreakdown).toHaveLength(0);
      });

      it("handles pending status calls", () => {
        const calls: CallLogForStats[] = [
          { id: "1", status: "pending", duration_seconds: null, ring_started_at: null, answered_at: null, answer_time_seconds: null, disposition_id: null, created_at: "2024-01-01T10:00:00Z" },
        ];

        const stats = calculateAgentStats(calls, mockDispositions);
        expect(stats.totalRings).toBe(1);
        expect(stats.totalAnswers).toBe(0);
        expect(stats.totalMissed).toBe(0);
        expect(stats.totalRejected).toBe(0);
      });
    });
  });

  describe("formatDuration", () => {
    it("formats seconds less than 60 as Xs", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(1)).toBe("1s");
      expect(formatDuration(30)).toBe("30s");
      expect(formatDuration(59)).toBe("59s");
    });

    it("formats seconds between 60 and 3600 as Xm Ys", () => {
      expect(formatDuration(60)).toBe("1m 0s");
      expect(formatDuration(90)).toBe("1m 30s");
      expect(formatDuration(120)).toBe("2m 0s");
      expect(formatDuration(125)).toBe("2m 5s");
      expect(formatDuration(3599)).toBe("59m 59s");
    });

    it("formats seconds 3600 and above as Xh Ym", () => {
      expect(formatDuration(3600)).toBe("1h 0m");
      expect(formatDuration(3660)).toBe("1h 1m");
      expect(formatDuration(5400)).toBe("1h 30m");
      expect(formatDuration(7200)).toBe("2h 0m");
      expect(formatDuration(9000)).toBe("2h 30m");
    });

    it("rounds fractional seconds", () => {
      expect(formatDuration(30.4)).toBe("30s");
      expect(formatDuration(30.6)).toBe("31s");
    });

    it("handles very long durations", () => {
      expect(formatDuration(36000)).toBe("10h 0m");
      expect(formatDuration(86400)).toBe("24h 0m");
    });
  });

  describe("formatShortDuration", () => {
    it("formats seconds less than 60 as Xs", () => {
      expect(formatShortDuration(0)).toBe("0s");
      expect(formatShortDuration(1)).toBe("1s");
      expect(formatShortDuration(30)).toBe("30s");
      expect(formatShortDuration(59)).toBe("59s");
    });

    it("formats seconds 60 and above as M:SS", () => {
      expect(formatShortDuration(60)).toBe("1:00");
      expect(formatShortDuration(90)).toBe("1:30");
      expect(formatShortDuration(120)).toBe("2:00");
      expect(formatShortDuration(125)).toBe("2:05");
    });

    it("pads seconds with leading zero", () => {
      expect(formatShortDuration(61)).toBe("1:01");
      expect(formatShortDuration(69)).toBe("1:09");
      expect(formatShortDuration(605)).toBe("10:05");
    });

    it("handles long durations (over 10 minutes)", () => {
      expect(formatShortDuration(600)).toBe("10:00");
      expect(formatShortDuration(3600)).toBe("60:00");
      expect(formatShortDuration(3661)).toBe("61:01");
    });

    it("rounds fractional seconds", () => {
      expect(formatShortDuration(30.4)).toBe("30s");
      expect(formatShortDuration(30.6)).toBe("31s");
      expect(formatShortDuration(90.6)).toBe("1:31");
    });
  });
});


