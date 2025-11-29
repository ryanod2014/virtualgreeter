"use client";

import { useRouter } from "next/navigation";
import {
  Eye,
  Phone,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  Users,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import Link from "next/link";

interface Stats {
  pageviewsTotal: number;
  pageviewsWithAgent: number;
  missedOpportunities: number;
  coverageRate: number;
  answeredCalls: number;
  missedCalls: number;
  rejectedCalls: number;
  totalCalls: number;
  answerRate: number;
  callAnswerRate: number;
  totalActiveSeconds: number;
  totalInCallSeconds: number;
  utilizationRate: number;
}

interface DailyStat {
  date: string;
  pageviews: number;
  pageviewsWithAgent: number;
  missedOpportunities: number;
  calls: number;
  answered: number;
  coverageRate: number;
  answerRate: number;
}

interface TopPage {
  url: string;
  pageviews: number;
  pageviewsWithAgent: number;
  answered: number;
  coverageRate: number;
  answerRate: number;
}

interface Props {
  dateRange: { from: string; to: string };
  stats: Stats;
  dailyStats: DailyStat[];
  topPages: TopPage[];
}

export function AnalyticsClient({ dateRange, stats, dailyStats, topPages }: Props) {
  const router = useRouter();

  const handleDateRangeChange = (from: Date, to: Date) => {
    const params = new URLSearchParams();
    params.set("from", from.toISOString().split("T")[0]);
    params.set("to", to.toISOString().split("T")[0]);
    router.push(`/admin/analytics?${params.toString()}`);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getAnswerRateColor = (rate: number) => {
    if (rate >= 20) return "text-green-500";
    if (rate >= 10) return "text-amber-500";
    return "text-red-500";
  };

  const getCoverageColor = (rate: number) => {
    if (rate >= 90) return "text-green-500";
    if (rate >= 70) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Conversion Analytics</h1>
          <p className="text-muted-foreground">
            Track pageview to answer rates and agent coverage
          </p>
        </div>
        <DateRangePicker
          from={new Date(dateRange.from)}
          to={new Date(dateRange.to)}
          onRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Main Metrics - The Funnel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Pageviews */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Widget Impressions</p>
              <p className="text-3xl font-bold">{stats.pageviewsTotal.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Times visitors saw the widget
          </p>
        </div>

        {/* Coverage */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Agent Available</p>
              <p className="text-3xl font-bold">{stats.pageviewsWithAgent.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getCoverageColor(stats.coverageRate)}`}>
              {stats.coverageRate.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">coverage rate</span>
          </div>
          {stats.missedOpportunities > 0 && (
            <p className="text-sm text-red-500 mt-1">
              {stats.missedOpportunities} missed (no agent)
            </p>
          )}
        </div>

        {/* Answered Calls */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Phone className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Answered Calls</p>
              <p className="text-3xl font-bold">{stats.answeredCalls.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            of {stats.totalCalls} total call attempts
          </p>
        </div>

        {/* Answer Rate - THE KEY METRIC */}
        <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl border-2 border-primary/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pageview → Answer</p>
              <p className={`text-4xl font-bold ${getAnswerRateColor(stats.answerRate)}`}>
                {stats.answerRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Conversion rate when agent available
          </p>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-6">Conversion Funnel</h2>
        <div className="flex items-center justify-between gap-4">
          {/* Step 1: Pageviews */}
          <div className="flex-1 text-center">
            <div className="w-full h-24 bg-blue-500/20 rounded-xl flex items-center justify-center mb-2">
              <div>
                <p className="text-2xl font-bold text-blue-500">{stats.pageviewsTotal}</p>
                <p className="text-xs text-muted-foreground">Pageviews</p>
              </div>
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />

          {/* Step 2: With Agent */}
          <div className="flex-1 text-center">
            <div 
              className="w-full h-24 bg-purple-500/20 rounded-xl flex items-center justify-center mb-2"
              style={{ 
                width: `${Math.max(40, stats.coverageRate)}%`,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <div>
                <p className="text-2xl font-bold text-purple-500">{stats.pageviewsWithAgent}</p>
                <p className="text-xs text-muted-foreground">With Agent</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.coverageRate.toFixed(0)}% coverage
            </p>
          </div>

          <ArrowRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />

          {/* Step 3: Answered */}
          <div className="flex-1 text-center">
            <div 
              className="w-full h-24 bg-green-500/20 rounded-xl flex items-center justify-center mb-2"
              style={{ 
                width: `${Math.max(30, stats.answerRate * 2)}%`,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.answeredCalls}</p>
                <p className="text-xs text-muted-foreground">Answered</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.answerRate.toFixed(1)}% of covered
            </p>
          </div>
        </div>

        {/* Loss analysis */}
        <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{stats.missedOpportunities}</p>
            <p className="text-sm text-muted-foreground">No agent available</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-500">{stats.missedCalls}</p>
            <p className="text-sm text-muted-foreground">Call not answered</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-500">{stats.rejectedCalls}</p>
            <p className="text-sm text-muted-foreground">Call rejected</p>
          </div>
        </div>
      </div>

      {/* Daily Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Stats Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Daily Breakdown
            </h2>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium">Date</th>
                  <th className="text-center p-3 text-sm font-medium">Views</th>
                  <th className="text-center p-3 text-sm font-medium">Coverage</th>
                  <th className="text-center p-3 text-sm font-medium">Answered</th>
                  <th className="text-center p-3 text-sm font-medium">Answer Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dailyStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No data for this period
                    </td>
                  </tr>
                ) : (
                  [...dailyStats].reverse().map((day) => (
                    <tr key={day.date} className="hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{formatDate(day.date)}</td>
                      <td className="p-3 text-center text-sm">
                        {day.pageviews}
                        {day.missedOpportunities > 0 && (
                          <span className="text-xs text-red-500 ml-1">
                            ({day.missedOpportunities} missed)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-medium ${getCoverageColor(day.coverageRate)}`}>
                          {day.coverageRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">{day.answered}</td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-bold ${getAnswerRateColor(day.answerRate)}`}>
                          {day.answerRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Top Pages by Traffic
            </h2>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-medium">Page URL</th>
                  <th className="text-center p-3 text-sm font-medium">Views</th>
                  <th className="text-center p-3 text-sm font-medium">Coverage</th>
                  <th className="text-center p-3 text-sm font-medium">Answer Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topPages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No data for this period
                    </td>
                  </tr>
                ) : (
                  topPages.map((page, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 text-sm">
                        <span className="text-muted-foreground truncate block max-w-[200px]" title={page.url}>
                          {new URL(page.url).pathname}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm font-medium">{page.pageviews}</td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-medium ${getCoverageColor(page.coverageRate)}`}>
                          {page.coverageRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-bold ${getAnswerRateColor(page.answerRate)}`}>
                          {page.answerRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Agent Utilization */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Agent Availability
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Active Hours</p>
            <p className="text-2xl font-bold">{formatDuration(stats.totalActiveSeconds)}</p>
            <p className="text-xs text-muted-foreground">Time agents were available</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Time on Calls</p>
            <p className="text-2xl font-bold text-green-500">{formatDuration(stats.totalInCallSeconds)}</p>
            <p className="text-xs text-muted-foreground">Actual call time</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Utilization</p>
            <p className="text-2xl font-bold">{stats.utilizationRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Call time / Active time</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {(stats.coverageRate < 80 || stats.answerRate < 15) && (
        <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-500 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recommendations
          </h3>
          <div className="space-y-3">
            {stats.coverageRate < 80 && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
                <div>
                  <p className="font-medium">Improve Agent Coverage</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.missedOpportunities} visitors couldn&apos;t connect because no agents were online.{" "}
                    <Link href="/admin/agents" className="text-primary hover:underline">
                      Add more agents
                    </Link>
                    {" "}or adjust schedules to match traffic peaks.
                  </p>
                </div>
              </div>
            )}
            {stats.answerRate < 15 && stats.pageviewsWithAgent > 10 && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
                <div>
                  <p className="font-medium">Increase Answer Rate</p>
                  <p className="text-sm text-muted-foreground">
                    Only {stats.answerRate.toFixed(1)}% of covered pageviews convert to answered calls.
                    Review your widget positioning, agent videos, or call-to-action messaging.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

