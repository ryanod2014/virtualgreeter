// ============================================================================
// AGENT STATS CALCULATION UTILITY
// ============================================================================

import type { CallStatus } from "@ghost-greeter/domain";

export interface CallLogForStats {
  id: string;
  status: CallStatus;
  duration_seconds: number | null;
  ring_started_at: string | null;
  answered_at: string | null;
  answer_time_seconds: number | null;
  disposition_id: string | null;
  created_at: string;
}

export interface DispositionForStats {
  id: string;
  name: string;
  color: string;
}

export interface DispositionBreakdown {
  dispositionId: string;
  dispositionName: string;
  color: string;
  count: number;
  percentage: number;
}

export interface AgentStatsData {
  totalRings: number;
  totalAnswers: number;
  totalMissed: number;
  totalRejected: number;
  avgAnswerTime: number;
  answerPercentage: number;
  avgCallDuration: number;
  totalTalkTime: number;
  dispositionBreakdown: DispositionBreakdown[];
}

export function calculateAgentStats(
  calls: CallLogForStats[],
  dispositions: DispositionForStats[]
): AgentStatsData {
  // Total rings = all calls where ring started (or all calls if not tracked)
  const totalRings = calls.length;

  // Answered calls = accepted or completed
  const answeredCalls = calls.filter(
    (c) => c.status === "accepted" || c.status === "completed"
  );
  const totalAnswers = answeredCalls.length;

  // Missed and rejected
  const totalMissed = calls.filter((c) => c.status === "missed").length;
  const totalRejected = calls.filter((c) => c.status === "rejected").length;

  // Average answer time (only for calls with answer_time_seconds)
  const callsWithAnswerTime = calls.filter((c) => c.answer_time_seconds != null);
  const avgAnswerTime =
    callsWithAnswerTime.length > 0
      ? callsWithAnswerTime.reduce((acc, c) => acc + (c.answer_time_seconds ?? 0), 0) /
        callsWithAnswerTime.length
      : 0;

  // Answer percentage
  const answerPercentage = totalRings > 0 ? (totalAnswers / totalRings) * 100 : 0;

  // Average call duration (completed calls with duration)
  const completedCalls = calls.filter(
    (c) => c.status === "completed" && c.duration_seconds != null
  );
  const avgCallDuration =
    completedCalls.length > 0
      ? completedCalls.reduce((acc, c) => acc + (c.duration_seconds ?? 0), 0) /
        completedCalls.length
      : 0;

  // Total talk time
  const totalTalkTime = completedCalls.reduce(
    (acc, c) => acc + (c.duration_seconds ?? 0),
    0
  );

  // Disposition breakdown
  const dispositionCounts = new Map<string, number>();
  calls.forEach((c) => {
    if (c.disposition_id) {
      dispositionCounts.set(
        c.disposition_id,
        (dispositionCounts.get(c.disposition_id) ?? 0) + 1
      );
    }
  });

  const totalWithDisposition = calls.filter((c) => c.disposition_id).length;
  const dispositionBreakdown: DispositionBreakdown[] = dispositions
    .map((d) => ({
      dispositionId: d.id,
      dispositionName: d.name,
      color: d.color,
      count: dispositionCounts.get(d.id) ?? 0,
      percentage:
        totalWithDisposition > 0
          ? ((dispositionCounts.get(d.id) ?? 0) / totalWithDisposition) * 100
          : 0,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalRings,
    totalAnswers,
    totalMissed,
    totalRejected,
    avgAnswerTime,
    answerPercentage,
    avgCallDuration,
    totalTalkTime,
    dispositionBreakdown,
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function formatShortDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

