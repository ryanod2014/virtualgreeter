"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Clock,
  TrendingUp,
  Timer,
  BarChart3,
  Filter,
  X as XIcon,
  User,
  CheckCircle,
} from "lucide-react";
import {
  calculateAgentStats,
  formatDuration,
  type CallLogForStats,
  type DispositionForStats,
} from "@/lib/stats/agent-stats";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import { MultiSelectDropdown } from "@/lib/components/multi-select-dropdown";

interface Agent {
  id: string;
  display_name: string;
}

interface Disposition {
  id: string;
  name: string;
  color: string;
}

interface FilterParams {
  from?: string;
  to?: string;
  agent?: string;
  status?: string;
  disposition?: string;
}

interface Props {
  calls: CallLogForStats[];
  dispositions: DispositionForStats[];
  agents: Agent[];
  dateRange: { from: string; to: string };
  currentFilters: FilterParams;
}

export function AnalyticsClient({
  calls,
  dispositions,
  agents,
  dateRange,
  currentFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const stats = calculateAgentStats(calls, dispositions);

  const [showFilters, setShowFilters] = useState(false);

  // Filter state - multi-select fields use arrays
  const [filters, setFilters] = useState({
    dispositions: currentFilters.disposition?.split(",").filter(Boolean) ?? [],
    agents: currentFilters.agent?.split(",").filter(Boolean) ?? [],
    statuses: currentFilters.status?.split(",").filter(Boolean) ?? [],
  });

  const applyFilters = () => {
    const params = new URLSearchParams();

    // Always include date range
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);

    // Multi-select filters are comma-separated
    if (filters.dispositions.length > 0) params.set("disposition", filters.dispositions.join(","));
    if (filters.agents.length > 0) params.set("agent", filters.agents.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      dispositions: [],
      agents: [],
      statuses: [],
    });
    const params = new URLSearchParams();
    params.set("from", dateRange.from.split("T")[0]);
    params.set("to", dateRange.to.split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    filters.dispositions.length > 0 ||
    filters.agents.length > 0 ||
    filters.statuses.length > 0;

  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);

    // Preserve other filters
    if (filters.dispositions.length > 0) params.set("disposition", filters.dispositions.join(","));
    if (filters.agents.length > 0) params.set("agent", filters.agents.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));

    router.push(`${pathname}?${params.toString()}`);
  };

  // Options for multi-select dropdowns
  const statusOptions = [
    { value: "completed", label: "Completed", icon: <CheckCircle className="w-3 h-3 text-green-500" /> },
    { value: "accepted", label: "Accepted", icon: <Phone className="w-3 h-3 text-blue-500" /> },
    { value: "missed", label: "Missed", icon: <PhoneMissed className="w-3 h-3 text-red-500" /> },
    { value: "rejected", label: "Rejected", icon: <PhoneOff className="w-3 h-3 text-orange-500" /> },
    { value: "pending", label: "Pending", icon: <Clock className="w-3 h-3 text-yellow-500" /> },
  ];

  const dispositionOptions = dispositions.map((d) => ({
    value: d.id,
    label: d.name,
    color: d.color,
  }));

  const agentOptions = agents.map((a) => ({
    value: a.id,
    label: a.display_name,
    icon: <User className="w-3 h-3 text-primary" />,
  }));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">
          Track performance and call metrics across your team
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Date Range Picker */}
          <DateRangePicker
            from={new Date(dateRange.from)}
            to={new Date(dateRange.to)}
            onRangeChange={handleDateRangeChange}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-white" />
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Agent */}
              <div>
                <label className="block text-sm font-medium mb-1">Agent</label>
                <MultiSelectDropdown
                  options={agentOptions}
                  selected={filters.agents}
                  onChange={(selected) => setFilters({ ...filters, agents: selected })}
                  placeholder="All Agents"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <MultiSelectDropdown
                  options={statusOptions}
                  selected={filters.statuses}
                  onChange={(selected) => setFilters({ ...filters, statuses: selected })}
                  placeholder="All Statuses"
                />
              </div>

              {/* Disposition */}
              <div>
                <label className="block text-sm font-medium mb-1">Disposition</label>
                <MultiSelectDropdown
                  options={dispositionOptions}
                  selected={filters.dispositions}
                  onChange={(selected) => setFilters({ ...filters, dispositions: selected })}
                  placeholder="All Dispositions"
                />
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                >
                  Apply
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

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
          subtitle="Calls declined by agents"
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
            Try selecting a different date range or adjusting your filters.
          </p>
        </div>
      )}
    </div>
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
