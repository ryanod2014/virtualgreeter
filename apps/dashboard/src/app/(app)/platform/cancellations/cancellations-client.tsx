"use client";

import { useState, useMemo } from "react";
import {
  LogOut,
  Building2,
  Users,
  DollarSign,
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  Mail,
  User,
  X,
  Calendar,
  BarChart3,
  Percent,
  MessageSquareText,
  Quote,
} from "lucide-react";
import { subDays, format, startOfMonth, parseISO } from "date-fns";
import { DateRangePicker } from "@/lib/components/date-range-picker";
import type { CancellationReason, SubscriptionPlan } from "@ghost-greeter/domain/database.types";

interface CancellationFeedback {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_plan: SubscriptionPlan;
  organization_signup_date: string;
  user_id: string;
  user_email: string;
  user_name: string;
  primary_reason: CancellationReason;
  additional_reasons: CancellationReason[];
  detailed_feedback: string | null;
  competitor_name: string | null;
  would_return: boolean | null;
  return_conditions: string | null;
  agent_count: number;
  monthly_cost: number;
  subscription_duration_days: number;
  created_at: string;
}

interface CancellationsClientProps {
  cancellations: CancellationFeedback[];
  totalOrganizations: number;
  activeOrganizations: number;
}

const REASON_LABELS: Record<CancellationReason, string> = {
  reps_not_using: "Reps not using",
  not_enough_reps: "Not enough reps",
  low_website_traffic: "Low website traffic",
  low_roi_per_call: "Low ROI per call",
  too_expensive: "Too expensive",
  not_enough_features: "Not enough features",
  switched_to_competitor: "Switched to competitor",
  technical_issues: "Technical issues",
  difficult_to_use: "Difficult to use",
  business_closed: "Business closed",
  other: "Other",
};

const REASON_COLORS: Record<CancellationReason, string> = {
  reps_not_using: "bg-orange-500",
  not_enough_reps: "bg-amber-500",
  low_website_traffic: "bg-yellow-500",
  low_roi_per_call: "bg-lime-500",
  too_expensive: "bg-red-500",
  not_enough_features: "bg-purple-500",
  switched_to_competitor: "bg-rose-500",
  technical_issues: "bg-blue-500",
  difficult_to_use: "bg-indigo-500",
  business_closed: "bg-slate-500",
  other: "bg-gray-500",
};

const planColors: Record<SubscriptionPlan, string> = {
  free: "bg-slate-500/10 text-slate-500",
  starter: "bg-blue-500/10 text-blue-500",
  pro: "bg-purple-500/10 text-purple-500",
  enterprise: "bg-amber-500/10 text-amber-500",
};

type ViewMode = "overview" | "responses" | "cohorts" | "list";

export function CancellationsClient({
  cancellations,
  totalOrganizations,
  activeOrganizations,
}: CancellationsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedItem, setSelectedItem] = useState<CancellationFeedback | null>(null);
  
  // Date range state
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const handleDateRangeChange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  // Filter by date range
  const filteredCancellations = useMemo(() => {
    return cancellations.filter((item) => {
      const itemDate = new Date(item.created_at);
      return itemDate >= dateFrom && itemDate <= dateTo;
    });
  }, [cancellations, dateFrom, dateTo]);

  // Calculate reason breakdown
  const reasonBreakdown = useMemo(() => {
    const counts: Record<CancellationReason, number> = {} as Record<CancellationReason, number>;
    
    filteredCancellations.forEach((c) => {
      counts[c.primary_reason] = (counts[c.primary_reason] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({
        reason: reason as CancellationReason,
        count,
        percentage: filteredCancellations.length > 0 ? (count / filteredCancellations.length) * 100 : 0,
      }));

    return sorted;
  }, [filteredCancellations]);

  // Cohort analysis - group by signup month
  const cohortData = useMemo(() => {
    const cohorts: Record<string, {
      signupMonth: string;
      totalSignups: number;
      churned: number;
      churnRate: number;
      avgDaysToChurn: number;
      lostMRR: number;
      topReason: CancellationReason | null;
    }> = {};

    filteredCancellations.forEach((c) => {
      const signupMonth = format(startOfMonth(parseISO(c.organization_signup_date)), "yyyy-MM");
      
      if (!cohorts[signupMonth]) {
        cohorts[signupMonth] = {
          signupMonth,
          totalSignups: 0,
          churned: 0,
          churnRate: 0,
          avgDaysToChurn: 0,
          lostMRR: 0,
          topReason: null,
        };
      }
      
      cohorts[signupMonth].churned++;
      cohorts[signupMonth].avgDaysToChurn += c.subscription_duration_days;
      cohorts[signupMonth].lostMRR += c.monthly_cost;
    });

    // Calculate averages and find top reasons
    Object.values(cohorts).forEach((cohort) => {
      if (cohort.churned > 0) {
        cohort.avgDaysToChurn = Math.round(cohort.avgDaysToChurn / cohort.churned);
      }
      
      // Find top reason for this cohort
      const reasonCounts: Record<string, number> = {};
      filteredCancellations
        .filter((c) => format(startOfMonth(parseISO(c.organization_signup_date)), "yyyy-MM") === cohort.signupMonth)
        .forEach((c) => {
          reasonCounts[c.primary_reason] = (reasonCounts[c.primary_reason] || 0) + 1;
        });
      
      const topReason = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)[0];
      cohort.topReason = topReason ? (topReason[0] as CancellationReason) : null;
    });

    return Object.values(cohorts).sort((a, b) => b.signupMonth.localeCompare(a.signupMonth));
  }, [filteredCancellations]);

  // Calculate stats
  const wouldReturnCount = filteredCancellations.filter((c) => c.would_return === true).length;
  const wouldReturnPercentage = filteredCancellations.length > 0
    ? (wouldReturnCount / filteredCancellations.length) * 100
    : 0;

  const competitorMentions = filteredCancellations.filter((c) => c.competitor_name).length;

  const avgDurationDays = filteredCancellations.length > 0
    ? filteredCancellations.reduce((sum, c) => sum + c.subscription_duration_days, 0) / filteredCancellations.length
    : 0;

  const totalLostRevenue = filteredCancellations.reduce((sum, c) => sum + c.monthly_cost, 0);

  // Overall churn rate
  const churnRate = totalOrganizations > 0
    ? (cancellations.length / totalOrganizations) * 100
    : 0;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Cancellation Analysis</h2>
          <p className="text-muted-foreground">
            Exit survey responses and churn metrics
          </p>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onRangeChange={handleDateRangeChange}
        />
      </div>

      {/* View Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setViewMode("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "overview"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setViewMode("responses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "responses"
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquareText className="w-4 h-4" />
          Exit Survey Responses
          <span className="px-2 py-0.5 rounded-full bg-background text-xs">
            {filteredCancellations.filter(c => c.detailed_feedback || c.return_conditions).length}
          </span>
        </button>
        <button
          onClick={() => setViewMode("cohorts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "cohorts"
              ? "bg-purple-500/10 text-purple-500 border border-purple-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Cohort Analysis
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "list"
              ? "bg-red-500/10 text-red-500 border border-red-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <LogOut className="w-4 h-4" />
          All Cancellations
          <span className="px-2 py-0.5 rounded-full bg-background text-xs">
            {filteredCancellations.length}
          </span>
        </button>
      </div>

      {/* Stats Row - Always visible */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Percent className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{churnRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <LogOut className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredCancellations.length}</p>
              <p className="text-sm text-muted-foreground">Cancellations</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <RotateCcw className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{wouldReturnPercentage.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Would Return</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{competitorMentions}</p>
              <p className="text-sm text-muted-foreground">To Competitors</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalLostRevenue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Lost MRR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview View */}
      {viewMode === "overview" && (
        <>
          {/* Reason Breakdown Chart */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold mb-4">Cancellation Reasons</h3>
            
            {reasonBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data in selected period</p>
            ) : (
              <div className="space-y-3">
                {reasonBreakdown.map(({ reason, count, percentage }) => (
                  <div key={reason} className="flex items-center gap-4">
                    <div className="w-44 text-sm truncate">
                      {REASON_LABELS[reason]}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${REASON_COLORS[reason]} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right">
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Avg. Time to Churn</h3>
              <p className="text-4xl font-bold text-primary">
                {Math.floor(avgDurationDays / 30)} <span className="text-lg text-muted-foreground">months</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ({Math.round(avgDurationDays)} days average subscription)
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-semibold mb-4">Retention Rate</h3>
              <p className="text-4xl font-bold text-green-500">
                {totalOrganizations > 0 ? (100 - churnRate).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeOrganizations} of {totalOrganizations} orgs active
              </p>
            </div>
          </div>
        </>
      )}

      {/* Exit Survey Responses View */}
      {viewMode === "responses" && (
        <div className="space-y-6">
          {/* Detailed Feedback Section */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <Quote className="w-5 h-5 text-amber-500" />
                Detailed Feedback Responses
              </h3>
              <p className="text-sm text-muted-foreground">
                What customers said when they left
              </p>
            </div>

            {filteredCancellations.filter(c => c.detailed_feedback).length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquareText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No detailed feedback in selected period</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCancellations
                  .filter(c => c.detailed_feedback)
                  .map((item) => (
                    <div key={item.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-amber-500/10 flex-shrink-0">
                          <Quote className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground whitespace-pre-wrap mb-3">
                            &quot;{item.detailed_feedback}&quot;
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-medium text-muted-foreground">
                              {item.organization_name}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              {item.user_email}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${REASON_COLORS[item.primary_reason]} bg-opacity-20`}>
                              {REASON_LABELS[item.primary_reason]}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {timeAgo(item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Would Return Conditions */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-green-500" />
                What Would Bring Them Back?
              </h3>
              <p className="text-sm text-muted-foreground">
                Conditions under which churned customers would return
              </p>
            </div>

            {filteredCancellations.filter(c => c.return_conditions).length === 0 ? (
              <div className="p-12 text-center">
                <RotateCcw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No return conditions provided in selected period</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCancellations
                  .filter(c => c.return_conditions)
                  .map((item) => (
                    <div key={item.id} className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full flex-shrink-0 ${
                          item.would_return
                            ? "bg-green-500/10"
                            : "bg-red-500/10"
                        }`}>
                          <RotateCcw className={`w-4 h-4 ${
                            item.would_return ? "text-green-500" : "text-red-500"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground whitespace-pre-wrap mb-3">
                            &quot;{item.return_conditions}&quot;
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className={`font-medium ${
                              item.would_return ? "text-green-500" : "text-red-500"
                            }`}>
                              {item.would_return ? "Would return" : "Unlikely to return"}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-medium text-muted-foreground">
                              {item.organization_name}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="w-3.5 h-3.5" />
                              {item.user_email}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {timeAgo(item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Competitor Mentions */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Competitor Mentions
              </h3>
              <p className="text-sm text-muted-foreground">
                Who customers switched to
              </p>
            </div>

            {filteredCancellations.filter(c => c.competitor_name).length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No competitor mentions in selected period</p>
                <p className="text-sm text-muted-foreground mt-1">This is good news!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCancellations
                  .filter(c => c.competitor_name)
                  .map((item) => (
                    <div key={item.id} className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-rose-500/10">
                            <Building2 className="w-4 h-4 text-rose-500" />
                          </div>
                          <div>
                            <p className="font-medium">{item.organization_name}</p>
                            <p className="text-sm text-muted-foreground">{item.user_email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Switched to</p>
                          <p className="font-bold text-rose-500">{item.competitor_name}</p>
                        </div>
                      </div>
                      {item.detailed_feedback && (
                        <p className="mt-3 text-sm text-muted-foreground pl-11">
                          &quot;{item.detailed_feedback}&quot;
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cohort Analysis View */}
      {viewMode === "cohorts" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Cohort Analysis by Signup Month</h3>
            <p className="text-sm text-muted-foreground">
              How different signup cohorts churned over time
            </p>
          </div>

          {cohortData.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No cohort data in selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Signup Month</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Churned</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Avg Days to Churn</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Lost MRR</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Top Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cohortData.map((cohort) => (
                    <tr key={cohort.signupMonth} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <span className="font-medium">
                          {format(parseISO(cohort.signupMonth + "-01"), "MMM yyyy")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-red-500">{cohort.churned}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium">{cohort.avgDaysToChurn}</span>
                        <span className="text-muted-foreground text-sm ml-1">days</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium">${cohort.lostMRR.toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        {cohort.topReason && (
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${REASON_COLORS[cohort.topReason]} bg-opacity-20`}>
                            {REASON_LABELS[cohort.topReason]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">All Exit Surveys</h3>
            <p className="text-sm text-muted-foreground">
              Detailed feedback from each cancellation
            </p>
          </div>

          {filteredCancellations.length === 0 ? (
            <div className="p-12 text-center">
              <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No cancellations in selected period</p>
              <p className="text-sm text-muted-foreground mt-1">
                This is good news!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredCancellations.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-5 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <Building2 className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium">{item.organization_name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" />
                          {item.user_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${planColors[item.organization_plan]}`}>
                        {item.organization_plan}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {item.agent_count}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        ${item.monthly_cost}/mo
                      </span>
                      <span className="text-muted-foreground">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Primary reason: </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${REASON_COLORS[item.primary_reason]} bg-opacity-20`}>
                        {REASON_LABELS[item.primary_reason]}
                      </span>
                    </div>

                    {item.detailed_feedback && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        &quot;{item.detailed_feedback}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-red-500/10">
                    <LogOut className="w-4 h-4 text-red-500" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${planColors[selectedItem.organization_plan]}`}>
                    {selectedItem.organization_plan}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{selectedItem.organization_name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Cancelled {new Date(selectedItem.created_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* User Info */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Cancelled By</span>
                </div>
                <p className="font-medium">{selectedItem.user_name}</p>
                <p className="text-sm text-muted-foreground">{selectedItem.user_email}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                  <p className="text-2xl font-bold">{selectedItem.agent_count}</p>
                  <p className="text-sm text-muted-foreground">Agents</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                  <p className="text-2xl font-bold">${selectedItem.monthly_cost}</p>
                  <p className="text-sm text-muted-foreground">Monthly</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border text-center">
                  <p className="text-2xl font-bold">{Math.floor(selectedItem.subscription_duration_days / 30)}</p>
                  <p className="text-sm text-muted-foreground">Months Active</p>
                </div>
              </div>

              {/* Reasons */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Cancellation Reasons
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Primary: </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${REASON_COLORS[selectedItem.primary_reason]} bg-opacity-20`}>
                      {REASON_LABELS[selectedItem.primary_reason]}
                    </span>
                  </div>
                  {selectedItem.additional_reasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Also: </span>
                      {selectedItem.additional_reasons.map((reason) => (
                        <span
                          key={reason}
                          className="px-2 py-1 rounded-full bg-muted text-xs"
                        >
                          {REASON_LABELS[reason]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Feedback */}
              {selectedItem.detailed_feedback && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Detailed Feedback
                  </h3>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="whitespace-pre-wrap">&quot;{selectedItem.detailed_feedback}&quot;</p>
                  </div>
                </div>
              )}

              {/* Competitor */}
              {selectedItem.competitor_name && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Switched to competitor: </span>
                    <span className="font-bold text-amber-500">{selectedItem.competitor_name}</span>
                  </p>
                </div>
              )}

              {/* Would Return */}
              {selectedItem.would_return !== null && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Would Return?
                  </h3>
                  <div className={`p-4 rounded-xl border ${
                    selectedItem.would_return
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}>
                    <p className={`font-medium ${selectedItem.would_return ? "text-green-500" : "text-red-500"}`}>
                      {selectedItem.would_return ? "Yes, would consider returning" : "No, unlikely to return"}
                    </p>
                    {selectedItem.return_conditions && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Conditions: &quot;{selectedItem.return_conditions}&quot;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
