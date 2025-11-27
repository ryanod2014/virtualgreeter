"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  TrendingUp,
  Timer,
  BarChart3,
  Users,
  Activity,
  Calendar,
  Coffee,
} from "lucide-react";
import {
  calculateAgentStats,
  formatDuration,
  type CallLogForStats,
  type DispositionForStats,
} from "@/lib/stats/agent-stats";
import { DateRangePicker } from "@/lib/components/date-range-picker";

interface AgentWithUser {
  id: string;
  display_name: string;
  status: string;
  user: {
    email: string;
    full_name: string;
  } | null;
}

interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  idle_seconds: number;
  in_call_seconds: number;
  away_seconds: number;
  ended_reason: string | null;
}

interface Props {
  agent: AgentWithUser;
  calls: CallLogForStats[];
  sessions: Session[];
  dispositions: DispositionForStats[];
  dateRange: { from: string; to: string };
}

export function AgentStatsClient({
  agent,
  calls,
  sessions,
  dispositions,
  dateRange,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"performance" | "activity">("performance");
  const stats = calculateAgentStats(calls, dispositions);
  const activityStats = calculateActivityStats(sessions);

  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`/admin/agents/${agent.id}?${params.toString()}`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/agents"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{agent.display_name}</h1>
              <p className="text-muted-foreground">{agent.user?.email}</p>
            </div>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            from={new Date(dateRange.from)}
            to={new Date(dateRange.to)}
            onRangeChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab("performance")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === "performance"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance
          </span>
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === "activity"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </span>
        </button>
      </div>

      {activeTab === "performance" ? (
        <PerformanceContent stats={stats} calls={calls} dispositions={dispositions} />
      ) : (
        <ActivityContent sessions={sessions} stats={activityStats} />
      )}
    </div>
  );
}

// Activity Stats Calculator
function calculateActivityStats(sessions: Session[]) {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.ended_at);

  // Total logged time (including away)
  const totalLoggedSeconds = completedSessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? 0),
    0
  );
  
  const totalIdleSeconds = sessions.reduce((acc, s) => acc + s.idle_seconds, 0);
  const totalInCallSeconds = sessions.reduce((acc, s) => acc + s.in_call_seconds, 0);
  const totalAwaySeconds = sessions.reduce((acc, s) => acc + s.away_seconds, 0);

  // Active hours = only idle + in_call (NOT away time)
  const activeSeconds = totalIdleSeconds + totalInCallSeconds;

  const avgSessionLength =
    completedSessions.length > 0 ? totalLoggedSeconds / completedSessions.length : 0;

  // Utilization = time on calls vs total active time
  const utilizationPercentage =
    activeSeconds > 0 ? (totalInCallSeconds / activeSeconds) * 100 : 0;

  return {
    activeSeconds,        // Only idle + in_call (the "real" active hours)
    totalLoggedSeconds,   // Total session time including away
    totalSessions,
    avgSessionLength,
    totalIdleSeconds,
    totalInCallSeconds,
    totalAwaySeconds,
    utilizationPercentage,
  };
}

// Performance Tab Content
function PerformanceContent({
  stats,
  calls,
  dispositions,
}: {
  stats: ReturnType<typeof calculateAgentStats>;
  calls: CallLogForStats[];
  dispositions: DispositionForStats[];
}) {
  return (
    <>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Rings"
          value={stats.totalRings}
          icon={PhoneIncoming}
          color="blue"
        />
        <StatCard
          title="Total Answers"
          value={stats.totalAnswers}
          icon={Phone}
          color="green"
        />
        <StatCard
          title="Missed Calls"
          value={stats.totalMissed}
          icon={PhoneMissed}
          color="red"
        />
        <StatCard
          title="Answer Rate"
          value={`${stats.answerPercentage.toFixed(1)}%`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Avg. Answer Time"
          value={formatDuration(stats.avgAnswerTime)}
          subtitle="Time to click answer"
          icon={Timer}
          color="amber"
        />
        <StatCard
          title="Avg. Call Duration"
          value={formatDuration(stats.avgCallDuration)}
          subtitle="For completed calls"
          icon={Clock}
          color="cyan"
        />
        <StatCard
          title="Total Talk Time"
          value={formatDuration(stats.totalTalkTime)}
          subtitle="All time on calls"
          icon={BarChart3}
          color="indigo"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard
          title="Rejected Calls"
          value={stats.totalRejected}
          subtitle="Calls declined by agent"
          icon={PhoneOff}
          color="orange"
        />
      </div>

      {/* Disposition Breakdown */}
      {stats.dispositionBreakdown.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Disposition Breakdown
          </h2>

          <div className="space-y-4">
            {stats.dispositionBreakdown.map((d) => (
              <div key={d.dispositionId} className="flex items-center gap-4">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{d.dispositionName}</span>
                    <span className="text-muted-foreground">
                      {d.count} ({d.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${d.percentage}%`,
                        backgroundColor: d.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {calls.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No calls in this period</h3>
          <p className="text-muted-foreground">
            Try selecting a different date range to see call statistics.
          </p>
        </div>
      )}
    </>
  );
}

// Activity Tab Content
function ActivityContent({
  sessions,
  stats,
}: {
  sessions: Session[];
  stats: ReturnType<typeof calculateActivityStats>;
}) {
  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Hours"
          value={formatDuration(stats.activeSeconds)}
          subtitle="Available + On Call"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Sessions"
          value={stats.totalSessions}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Time on Calls"
          value={formatDuration(stats.totalInCallSeconds)}
          icon={Phone}
          color="green"
        />
        <StatCard
          title="Utilization"
          value={`${stats.utilizationPercentage.toFixed(0)}%`}
          subtitle="Call time / Active time"
          icon={TrendingUp}
          color="cyan"
        />
      </div>

      {/* Time Breakdown */}
      <div className="glass rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Time Breakdown</h3>
        <div className="space-y-4">
          <TimeBreakdownBar
            label="In Call"
            seconds={stats.totalInCallSeconds}
            totalSeconds={stats.totalLoggedSeconds}
            color="green"
            icon={Phone}
          />
          <TimeBreakdownBar
            label="Available (Idle)"
            seconds={stats.totalIdleSeconds}
            totalSeconds={stats.totalLoggedSeconds}
            color="blue"
            icon={Clock}
          />
          <TimeBreakdownBar
            label="Away"
            seconds={stats.totalAwaySeconds}
            totalSeconds={stats.totalLoggedSeconds}
            color="amber"
            icon={Coffee}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
          Total logged time: {formatDuration(stats.totalLoggedSeconds)} (includes away time)
        </div>
      </div>

      {/* Sessions Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Session Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Start
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  End
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  In Call
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                  Ended By
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No sessions in this period</h3>
            <p className="text-muted-foreground">
              Activity will appear here once the agent logs in.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function TimeBreakdownBar({
  label,
  seconds,
  totalSeconds,
  color,
  icon: Icon,
}: {
  label: string;
  seconds: number;
  totalSeconds: number;
  color: "green" | "blue" | "amber";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
  const colorClasses = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
  };
  const textColorClasses = {
    green: "text-green-500",
    blue: "text-blue-500",
    amber: "text-amber-500",
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-36 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${textColorClasses[color]}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex-1">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClasses[color]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="w-28 text-right">
        <span className="text-sm font-medium">{formatDuration(seconds)}</span>
        <span className="text-xs text-muted-foreground ml-1">
          ({percentage.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const startDate = new Date(session.started_at);
  const endDate = session.ended_at ? new Date(session.ended_at) : null;

  const formatEndedReason = (reason: string | null) => {
    if (!reason) return "-";
    return reason
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20">
      <td className="px-6 py-4 text-sm">
        {startDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </td>
      <td className="px-6 py-4 text-sm">
        {startDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="px-6 py-4 text-sm">
        {endDate ? (
          endDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        ) : (
          <span className="text-green-500 font-medium">Active</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm font-medium">
        {session.duration_seconds ? formatDuration(session.duration_seconds) : "-"}
      </td>
      <td className="px-6 py-4 text-sm">{formatDuration(session.in_call_seconds)}</td>
      <td className="px-6 py-4 text-sm text-muted-foreground">
        {formatEndedReason(session.ended_reason)}
      </td>
    </tr>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color:
    | "blue"
    | "green"
    | "red"
    | "purple"
    | "amber"
    | "cyan"
    | "indigo"
    | "orange"
    | "slate";
}) {
  const colorClasses: Record<typeof color, string> = {
    blue: "text-blue-500 bg-blue-500/10",
    green: "text-green-500 bg-green-500/10",
    red: "text-red-500 bg-red-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    cyan: "text-cyan-500 bg-cyan-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    slate: "text-slate-500 bg-slate-500/10",
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
    </div>
  );
}
