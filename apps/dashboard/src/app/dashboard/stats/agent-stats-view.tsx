"use client";

import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  TrendingUp,
  Timer,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  calculateAgentStats,
  formatDuration,
  type CallLogForStats,
  type DispositionForStats,
} from "@/lib/stats/agent-stats";

interface Props {
  agentName: string;
  calls: CallLogForStats[];
  dispositions: DispositionForStats[];
  dateRange: { from: string; to: string };
}

export function AgentStatsView({
  agentName,
  calls,
  dispositions,
  dateRange,
}: Props) {
  const router = useRouter();
  const stats = calculateAgentStats(calls, dispositions);

  const handleDateRangeChange = (days: number) => {
    const to = new Date();
    const from = new Date();
    if (days > 0) {
      from.setDate(from.getDate() - days);
    }
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`/dashboard/stats?${params.toString()}`);
  };

  // Preset date ranges
  const presets = [
    { label: "Today", days: 0 },
    { label: "7 days", days: 7 },
    { label: "30 days", days: 30 },
    { label: "90 days", days: 90 },
  ];

  // Determine active preset
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);
  const daysDiff = Math.round(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-2xl font-bold">My Stats</h1>
            <p className="text-muted-foreground">
              Track your performance and call metrics
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleDateRangeChange(preset.days)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    daysDiff === preset.days
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-background"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
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
            subtitle="Calls you declined"
            icon={PhoneOff}
            color="orange"
          />
          <StatCard
            title="Total Calls"
            value={calls.length}
            subtitle={`From ${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`}
            icon={Phone}
            color="slate"
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
              Try selecting a different date range to see your call statistics.
            </p>
          </div>
        )}
      </div>
    </>
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

