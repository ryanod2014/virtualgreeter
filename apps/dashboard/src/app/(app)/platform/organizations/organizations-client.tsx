"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Phone,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Shield,
  ShieldAlert,
  ShieldX,
  DollarSign,
  Activity,
} from "lucide-react";
import type { SubscriptionPlan, SubscriptionStatus } from "@ghost-greeter/domain/database.types";

type RiskLevel = "low" | "medium" | "high" | "critical";
type CallsTrend = "increasing" | "stable" | "declining";

interface OrgWithStats {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  seat_count: number;
  created_at: string;
  updated_at: string;
  userCount: number;
  agentCount: number;
  totalCalls: number;
  callsThisMonth: number;
  lastActivity: string;
  // Coverage metrics
  pageviewsTotal: number;
  pageviewsThisMonth: number;
  pageviewsWithAgent: number;
  coverageRate: number;
  coverageRateThisMonth: number;
  missedOpportunities: number;
  missedOpportunitiesThisMonth: number;
  answeredCalls: number;
  answerRate: number;
  answerRateThisMonth: number;
  // Health metrics
  healthScore: number;
  riskLevel: RiskLevel;
  isAtRisk: boolean;
  daysSinceLastCall: number | null;
  callsTrend: CallsTrend;
  activityScore: number;
  engagementScore: number;
  coverageScore: number;
  growthScore: number;
  mrr: number;
}

interface PlatformTotals {
  pageviewsThisMonth: number;
  pageviewsWithAgentThisMonth: number;
  callsThisMonth: number;
  answeredCallsThisMonth: number;
  ringRate: number;
  agentAnswerRate: number;
}

interface OrganizationsClientProps {
  organizations: OrgWithStats[];
  atRiskCount: number;
  criticalCount: number;
  atRiskMRR: number;
  platformTotals: PlatformTotals;
}

type SortField = "name" | "plan" | "healthScore" | "mrr" | "callsThisMonth" | "created_at" | "lastActivity" | "coverageRateThisMonth" | "answerRateThisMonth";
type SortDirection = "asc" | "desc";
type ViewFilter = "all" | "at-risk" | "healthy" | "churned";

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: "bg-slate-500/10 text-slate-500",
  starter: "bg-blue-500/10 text-blue-500",
  pro: "bg-purple-500/10 text-purple-500",
  enterprise: "bg-amber-500/10 text-amber-500",
};

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; icon: typeof Shield }> = {
  low: { bg: "bg-green-500/10", text: "text-green-500", icon: Shield },
  medium: { bg: "bg-amber-500/10", text: "text-amber-500", icon: ShieldAlert },
  high: { bg: "bg-orange-500/10", text: "text-orange-500", icon: ShieldAlert },
  critical: { bg: "bg-red-500/10", text: "text-red-500", icon: ShieldX },
};

const TREND_ICONS: Record<CallsTrend, { icon: typeof TrendingUp; color: string }> = {
  increasing: { icon: TrendingUp, color: "text-green-500" },
  stable: { icon: Minus, color: "text-muted-foreground" },
  declining: { icon: TrendingDown, color: "text-red-500" },
};

export function OrganizationsClient({ 
  organizations, 
  atRiskCount,
  criticalCount,
  atRiskMRR,
  platformTotals,
}: OrganizationsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<SubscriptionPlan | "all">("all");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [sortField, setSortField] = useState<SortField>("healthScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filter and sort organizations
  const filteredOrgs = useMemo(() => {
    let result = [...organizations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (org) =>
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((org) => org.subscription_status === statusFilter);
    }

    // Apply plan filter
    if (planFilter !== "all") {
      result = result.filter((org) => org.plan === planFilter);
    }

    // Apply view filter
    if (viewFilter === "at-risk") {
      result = result.filter((org) => org.isAtRisk);
    } else if (viewFilter === "healthy") {
      result = result.filter((org) => org.subscription_status === "active" && !org.isAtRisk);
    } else if (viewFilter === "churned") {
      result = result.filter((org) => org.subscription_status === "cancelled");
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      // Handle date strings
      if (sortField === "created_at" || sortField === "lastActivity") {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [organizations, searchQuery, statusFilter, planFilter, viewFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default to desc for most fields, asc for healthScore (lowest first = most at risk)
      setSortDirection(field === "healthScore" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground/50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <ChevronDown className="w-4 h-4 text-primary" />
    );
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Page Header with At-Risk Summary */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">All Organizations</h2>
          <p className="text-muted-foreground">
            {organizations.length} organizations on the platform
          </p>
        </div>

        {/* At-Risk Summary Cards */}
        <div className="flex gap-3">
          {criticalCount > 0 && (
            <button
              onClick={() => setViewFilter(viewFilter === "at-risk" ? "all" : "at-risk")}
              className={`p-3 rounded-xl border-2 transition-all ${
                viewFilter === "at-risk" 
                  ? "bg-red-500/20 border-red-500" 
                  : "bg-red-500/10 border-red-500/30 hover:border-red-500/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldX className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <p className="text-lg font-bold text-red-500">{criticalCount}</p>
                  <p className="text-xs text-red-400">Critical Risk</p>
                </div>
              </div>
            </button>
          )}
          {atRiskCount > 0 && (
            <button
              onClick={() => setViewFilter(viewFilter === "at-risk" ? "all" : "at-risk")}
              className={`p-3 rounded-xl border-2 transition-all ${
                viewFilter === "at-risk" 
                  ? "bg-amber-500/20 border-amber-500" 
                  : "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div className="text-left">
                  <p className="text-lg font-bold text-amber-500">{atRiskCount}</p>
                  <p className="text-xs text-amber-400">At Risk</p>
                </div>
              </div>
            </button>
          )}
          {atRiskMRR > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                <div className="text-left">
                  <p className="text-lg font-bold text-red-500">${atRiskMRR.toLocaleString()}</p>
                  <p className="text-xs text-red-400">MRR at Risk</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform Totals - This Month */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Pageviews</span>
          </div>
          <p className="text-2xl font-bold">{platformTotals.pageviewsThisMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">total this month</p>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Widget Popups</span>
          </div>
          <p className="text-2xl font-bold">{platformTotals.pageviewsWithAgentThisMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">agent available</p>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Rings</span>
          </div>
          <p className="text-2xl font-bold">{platformTotals.callsThisMonth.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">user clicked answer</p>
        </div>
        
        <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl border-2 border-primary/30 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Ring Rate</span>
          </div>
          <p className={`text-2xl font-bold ${
            platformTotals.ringRate >= 20 ? "text-green-500" :
            platformTotals.ringRate >= 10 ? "text-amber-500" : "text-red-500"
          }`}>
            {platformTotals.ringRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">popups → rings</p>
        </div>
        
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Agent Answer Rate</span>
          </div>
          <p className={`text-2xl font-bold ${
            platformTotals.agentAnswerRate >= 80 ? "text-green-500" :
            platformTotals.agentAnswerRate >= 60 ? "text-amber-500" : "text-red-500"
          }`}>
            {platformTotals.agentAnswerRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">rings answered</p>
        </div>
      </div>

      {/* View Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setViewFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewFilter === "all"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({organizations.length})
        </button>
        <button
          onClick={() => setViewFilter("at-risk")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            viewFilter === "at-risk"
              ? "bg-red-500/10 text-red-500 border border-red-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          At Risk ({atRiskCount})
        </button>
        <button
          onClick={() => setViewFilter("healthy")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            viewFilter === "healthy"
              ? "bg-green-500/10 text-green-500 border border-green-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className="w-4 h-4" />
          Healthy
        </button>
        <button
          onClick={() => setViewFilter("churned")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewFilter === "churned"
              ? "bg-slate-500/10 text-slate-400 border border-slate-500/30"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          Churned
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | "all")}
            className="px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as SubscriptionPlan | "all")}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        {/* Results count */}
        <span className="text-sm text-muted-foreground">
          {filteredOrgs.length} results
        </span>
      </div>

      {/* Organizations Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors"
                  >
                    Organization
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("healthScore")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    Health
                    <SortIcon field="healthScore" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("mrr")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    MRR
                    <SortIcon field="mrr" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("coverageRateThisMonth")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    Coverage
                    <SortIcon field="coverageRateThisMonth" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("answerRateThisMonth")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                    title="% of pageviews that became answered calls"
                  >
                    Answer Rate
                    <SortIcon field="answerRateThisMonth" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <button
                    onClick={() => handleSort("callsThisMonth")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors mx-auto"
                  >
                    Calls
                    <SortIcon field="callsThisMonth" />
                  </button>
                </th>
                <th className="text-center p-4">
                  <span className="font-medium text-sm">Trend</span>
                </th>
                <th className="text-right p-4">
                  <button
                    onClick={() => handleSort("lastActivity")}
                    className="flex items-center gap-2 font-medium text-sm hover:text-primary transition-colors ml-auto"
                  >
                    Last Activity
                    <SortIcon field="lastActivity" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No organizations found</p>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const riskConfig = RISK_COLORS[org.riskLevel];
                  const RiskIcon = riskConfig.icon;
                  const trendConfig = TREND_ICONS[org.callsTrend];
                  const TrendIcon = trendConfig.icon;

                  return (
                    <tr
                      key={org.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        org.isAtRisk ? "bg-red-500/5" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            org.isAtRisk ? "bg-red-500/10" : "bg-primary/10"
                          }`}>
                            {org.isAtRisk ? (
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Building2 className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{org.slug}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${PLAN_COLORS[org.plan]}`}
                              >
                                {org.plan}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize border ${STATUS_COLORS[org.subscription_status]}`}
                              >
                                {org.subscription_status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            <RiskIcon className={`w-4 h-4 ${riskConfig.text}`} />
                            <span className={`font-bold ${getHealthColor(org.healthScore)}`}>
                              {org.healthScore}
                            </span>
                          </div>
                          {/* Mini health bar */}
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getHealthBg(org.healthScore)}`}
                              style={{ width: `${org.healthScore}%` }}
                            />
                          </div>
                          {org.riskLevel !== "low" && org.subscription_status === "active" && (
                            <span className={`text-xs ${riskConfig.text}`}>
                              {org.riskLevel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium">${org.mrr.toLocaleString()}</span>
                        <p className="text-xs text-muted-foreground">{org.agentCount} seats</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span
                            className={`font-bold ${
                              org.coverageRateThisMonth >= 90 ? "text-green-500" :
                              org.coverageRateThisMonth >= 70 ? "text-amber-500" : "text-red-500"
                            }`}
                          >
                            {org.coverageRateThisMonth.toFixed(0)}%
                          </span>
                        </div>
                        {org.missedOpportunitiesThisMonth > 0 && (
                          <p className="text-xs text-red-500">
                            {org.missedOpportunitiesThisMonth} missed
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span
                            className={`font-bold ${
                              org.answerRateThisMonth >= 20 ? "text-green-500" :
                              org.answerRateThisMonth >= 10 ? "text-amber-500" : 
                              org.pageviewsThisMonth > 0 ? "text-red-500" : "text-muted-foreground"
                            }`}
                          >
                            {org.answerRateThisMonth.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {org.pageviewsThisMonth} views
                        </p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className={`font-medium ${org.callsThisMonth > 0 ? "text-green-500" : "text-muted-foreground"}`}>
                            {org.callsThisMonth}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {org.totalCalls} total
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center">
                          <TrendIcon className={`w-5 h-5 ${trendConfig.color}`} />
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-sm ${
                          org.daysSinceLastCall !== null && org.daysSinceLastCall > 14 
                            ? "text-red-500 font-medium" 
                            : "text-muted-foreground"
                        }`}>
                          {timeAgo(org.lastActivity)}
                        </span>
                        {org.daysSinceLastCall !== null && org.daysSinceLastCall > 7 && (
                          <p className="text-xs text-red-500">
                            {org.daysSinceLastCall}d since call
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
