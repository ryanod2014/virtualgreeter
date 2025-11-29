import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Target,
  Heart,
  Meh,
  Frown,
  Users,
  Info,
} from "lucide-react";
import { subMonths, startOfMonth, endOfMonth, format, differenceInMonths } from "date-fns";

// Helper to calculate months since a date
function getMonthsSince(date: string): number {
  return differenceInMonths(new Date(), new Date(date));
}

export default async function PlatformOverviewPage() {
  const supabase = await createClient();

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Fetch all platform stats in parallel
  const [
    orgsResult,
    pmfSurveysResult,
    cancellationsResult,
    newOrgsThisMonthResult,
    churnedThisMonthResult,
    // Historical data for trend chart (last 6 months)
    orgsLastMonthResult,
    churnedLastMonthResult,
  ] = await Promise.all([
    // All organizations with MRR
    supabase.from("organizations").select("id, subscription_status, plan, seat_count, mrr, created_at"),
    // PMF Survey responses
    supabase.from("pmf_surveys").select("*").eq("dismissed", false),
    // All cancellations (for trend)
    supabase.from("cancellation_feedback").select("id, monthly_cost, created_at"),
    // New orgs this month
    supabase
      .from("organizations")
      .select("id, mrr")
      .gte("created_at", thisMonthStart.toISOString()),
    // Churned this month
    supabase
      .from("cancellation_feedback")
      .select("id, monthly_cost")
      .gte("created_at", thisMonthStart.toISOString()),
    // Orgs that existed at start of last month (for comparison)
    supabase
      .from("organizations")
      .select("id, mrr, subscription_status")
      .lt("created_at", lastMonthStart.toISOString()),
    // Churned last month
    supabase
      .from("cancellation_feedback")
      .select("id, monthly_cost")
      .gte("created_at", lastMonthStart.toISOString())
      .lt("created_at", thisMonthStart.toISOString()),
  ]);

  const organizations = orgsResult.data ?? [];
  const activeOrgs = organizations.filter((o) => o.subscription_status === "active");
  const cancelledOrgs = organizations.filter((o) => o.subscription_status === "cancelled");

  // Calculate MRR metrics
  const totalMRR = activeOrgs.reduce((sum, o) => sum + (o.mrr || 0), 0);
  const newOrgsThisMonth = newOrgsThisMonthResult.data ?? [];
  const newMRR = newOrgsThisMonth.reduce((sum, o) => sum + (o.mrr || 0), 0);
  const churnedThisMonth = churnedThisMonthResult.data ?? [];
  const churnedMRR = churnedThisMonth.reduce((sum, o) => sum + (o.monthly_cost || 0), 0);

  // Last month metrics for comparison
  const churnedLastMonth = churnedLastMonthResult.data ?? [];
  const churnedMRRLastMonth = churnedLastMonth.reduce((sum, o) => sum + (o.monthly_cost || 0), 0);

  // Calculate starting MRR (total - new + churned)
  const startingMRR = totalMRR - newMRR + churnedMRR;

  // For now, estimate expansion/contraction (would need MRR change tracking)
  const expansionMRR = 0; // TODO: Calculate from mrr_changes table
  const contractionMRR = 0; // TODO: Calculate from mrr_changes table

  // Net Revenue Retention (monthly)
  const nrr = startingMRR > 0
    ? ((startingMRR - churnedMRR - contractionMRR + expansionMRR) / startingMRR) * 100
    : 100;

  // Quick Ratio: (New + Expansion) / (Contraction + Churn)
  const quickRatioDenom = contractionMRR + churnedMRR;
  const quickRatioNum = newMRR + expansionMRR;
  const quickRatio = quickRatioDenom > 0
    ? quickRatioNum / quickRatioDenom
    : quickRatioNum > 0 ? Infinity : null; // null = no activity

  // Monthly revenue churn rate
  const revenueChurnRate = startingMRR > 0
    ? (churnedMRR / startingMRR) * 100
    : 0;

  // ARPU (Average Revenue Per Account)
  const arpu = activeOrgs.length > 0 ? totalMRR / activeOrgs.length : 0;

  // Average Customer Lifetime (in months)
  // Method 1: From churn rate (1 / monthly churn rate)
  // Method 2: From actual data (avg subscription_duration_days from cancellations)
  const allCancellations = cancellationsResult.data ?? [];
  
  // Calculate average lifetime from actual churned customers
  const avgLifetimeFromData = allCancellations.length > 0
    ? allCancellations.reduce((sum, c) => sum + (c.monthly_cost > 0 ? 1 : 0), 0) > 0
      ? (() => {
          // We need subscription duration - estimate from created_at for now
          // In reality, this would come from cancellation_feedback.subscription_duration_days
          return null; // Will use churn-based calculation
        })()
      : null
    : null;

  // Calculate lifetime from churn rate (standard method)
  // If 5% monthly churn, avg lifetime = 1/0.05 = 20 months
  const monthlyChurnDecimal = revenueChurnRate / 100;
  const avgLifetimeMonths = monthlyChurnDecimal > 0 
    ? 1 / monthlyChurnDecimal 
    : null; // Can't calculate if no churn

  // LTV = ARPU × Average Lifetime (in months)
  const ltv = avgLifetimeMonths !== null && arpu > 0
    ? arpu * avgLifetimeMonths
    : null;

  // LTV:CAC Ratio (CAC would need to be input or calculated from ad spend)
  // For now, we'll show LTV and let them input CAC
  // Industry benchmarks: LTV:CAC > 3 is healthy

  // Logo churn (this month)
  const activeAtStartOfMonth = activeOrgs.length + churnedThisMonth.length;
  const logoChurnRate = activeAtStartOfMonth > 0
    ? (churnedThisMonth.length / activeAtStartOfMonth) * 100
    : 0;

  // Build simple cohort retention data from organizations
  const cohortData: Record<string, { total: number; retained: number; mrr: number; retainedMrr: number }> = {};
  
  organizations.forEach((org) => {
    const cohortMonth = format(startOfMonth(new Date(org.created_at)), "yyyy-MM");
    if (!cohortData[cohortMonth]) {
      cohortData[cohortMonth] = { total: 0, retained: 0, mrr: 0, retainedMrr: 0 };
    }
    cohortData[cohortMonth].total++;
    cohortData[cohortMonth].mrr += org.mrr || 0;
    if (org.subscription_status === "active") {
      cohortData[cohortMonth].retained++;
      cohortData[cohortMonth].retainedMrr += org.mrr || 0;
    }
  });

  const cohortRetention = Object.entries(cohortData)
    .map(([month, data]) => ({
      month,
      total: data.total,
      retained: data.retained,
      retentionRate: data.total > 0 ? (data.retained / data.total) * 100 : 0,
      revenueRetention: data.mrr > 0 ? (data.retainedMrr / data.mrr) * 100 : 0,
      monthsAgo: getMonthsSince(month + "-01"),
    }))
    .filter((c) => c.monthsAgo >= 1) // Only show cohorts at least 1 month old
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Last 6 cohorts

  // Build monthly churn trend (last 6 months)
  const monthlyChurnTrend: { month: string; churnedOrgs: number; churnedMRR: number; churnRate: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    const monthLabel = format(monthStart, "MMM");
    
    const monthCancellations = allCancellations.filter((c) => {
      const date = new Date(c.created_at);
      return date >= monthStart && date <= monthEnd;
    });
    
    const monthChurnedMRR = monthCancellations.reduce((sum, c) => sum + (c.monthly_cost || 0), 0);
    
    // Rough estimate of active orgs at start of that month
    const orgsAtStartOfMonth = organizations.filter((o) => {
      const created = new Date(o.created_at);
      return created < monthStart;
    }).length || 1;
    
    monthlyChurnTrend.push({
      month: monthLabel,
      churnedOrgs: monthCancellations.length,
      churnedMRR: monthChurnedMRR,
      churnRate: (monthCancellations.length / orgsAtStartOfMonth) * 100,
    });
  }

  // Find max churn for scaling the chart
  const maxChurnRate = Math.max(...monthlyChurnTrend.map((m) => m.churnRate), 10);

  // PMF Score calculation - separated by role
  const surveys = pmfSurveysResult.data ?? [];

  // Split surveys by role
  const agentSurveys = surveys.filter((s) => s.user_role === "agent");
  const adminSurveys = surveys.filter((s) => s.user_role === "admin" || s.user_role === "owner");

  // Agent PMF metrics
  const agentVeryDisappointed = agentSurveys.filter(
    (s) => s.disappointment_level === "very_disappointed"
  ).length;
  const agentSomewhatDisappointed = agentSurveys.filter(
    (s) => s.disappointment_level === "somewhat_disappointed"
  ).length;
  const agentNotDisappointed = agentSurveys.filter(
    (s) => s.disappointment_level === "not_disappointed"
  ).length;
  const agentPmfScore = agentSurveys.length > 0 ? (agentVeryDisappointed / agentSurveys.length) * 100 : 0;

  // Admin PMF metrics
  const adminVeryDisappointed = adminSurveys.filter(
    (s) => s.disappointment_level === "very_disappointed"
  ).length;
  const adminSomewhatDisappointed = adminSurveys.filter(
    (s) => s.disappointment_level === "somewhat_disappointed"
  ).length;
  const adminNotDisappointed = adminSurveys.filter(
    (s) => s.disappointment_level === "not_disappointed"
  ).length;
  const adminPmfScore = adminSurveys.length > 0 ? (adminVeryDisappointed / adminSurveys.length) * 100 : 0;

  // PMF Score color
  const getPmfColor = (score: number) => {
    if (score >= 40) return "text-green-500";
    if (score >= 25) return "text-amber-500";
    return "text-red-500";
  };

  const getPmfBgColor = (score: number) => {
    if (score >= 40) return "bg-green-500/10";
    if (score >= 25) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  // NRR color
  const getNrrColor = (nrr: number) => {
    if (nrr >= 100) return "text-green-500";
    if (nrr >= 90) return "text-amber-500";
    return "text-red-500";
  };

  // Quick Ratio color and message
  const getQuickRatioColor = (qr: number | null) => {
    if (qr === null) return "text-muted-foreground";
    if (qr === Infinity || qr >= 4) return "text-green-500";
    if (qr >= 2) return "text-amber-500";
    return "text-red-500";
  };

  const getQuickRatioMessage = (qr: number | null) => {
    if (qr === null) return "No churn or new revenue yet";
    if (qr === Infinity) return "Perfect! Adding revenue, no churn";
    if (qr >= 4) return "Excellent efficiency! 🚀";
    if (qr >= 2) return "Good, aim for >4";
    return "Leaky bucket ⚠️";
  };

  // Churn rate color
  const getChurnColor = (rate: number) => {
    if (rate <= 3) return "text-green-500";
    if (rate <= 5) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">Revenue & Churn Metrics</h2>
        <p className="text-muted-foreground">
          Monthly metrics for {format(now, "MMMM yyyy")}
        </p>
      </div>

      {/* PRIMARY METRICS - The ones VCs ask about */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total MRR */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-2 border-emerald-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-400">Monthly Recurring Revenue</p>
              <p className="text-4xl font-bold mt-2 text-emerald-500">
                ${totalMRR.toLocaleString()}
              </p>
              <p className="text-sm mt-2 text-emerald-400/80">
                {activeOrgs.length} paying customers
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Net Revenue Retention */}
        <div className={`p-6 rounded-2xl border-2 ${
          nrr >= 100 
            ? "bg-green-500/10 border-green-500/30" 
            : nrr >= 90 
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium opacity-80">Net Revenue Retention</p>
                <span className="text-xs opacity-60">(monthly)</span>
              </div>
              <p className={`text-4xl font-bold mt-2 ${getNrrColor(nrr)}`}>
                {nrr.toFixed(1)}%
              </p>
              <p className="text-sm mt-2 opacity-80">
                {nrr >= 100 
                  ? "Growing without new sales! 🎉" 
                  : `Target: >100%`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              {nrr >= 100 ? (
                <TrendingUp className="w-6 h-6 text-green-500" />
              ) : (
                <TrendingDown className="w-6 h-6 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Monthly Revenue Churn */}
        <div className={`p-6 rounded-2xl border-2 ${
          revenueChurnRate <= 3 
            ? "bg-green-500/10 border-green-500/30" 
            : revenueChurnRate <= 5 
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium opacity-80">Revenue Churn</p>
                <span className="text-xs opacity-60">(monthly)</span>
              </div>
              <p className={`text-4xl font-bold mt-2 ${getChurnColor(revenueChurnRate)}`}>
                {revenueChurnRate.toFixed(1)}%
              </p>
              <p className="text-sm mt-2 opacity-80">
                ${churnedMRR.toLocaleString()} lost this month
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              <Percent className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick Ratio */}
        <div className={`p-6 rounded-2xl border-2 ${
          quickRatio === null
            ? "bg-muted/30 border-border"
            : quickRatio === Infinity || quickRatio >= 4 
              ? "bg-green-500/10 border-green-500/30" 
              : quickRatio >= 2 
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium opacity-80">Quick Ratio</p>
                <span className="text-xs opacity-60">(monthly)</span>
              </div>
              <p className={`text-4xl font-bold mt-2 ${getQuickRatioColor(quickRatio)}`}>
                {quickRatio === null ? "—" : quickRatio === Infinity ? "∞" : quickRatio.toFixed(1)}
              </p>
              <p className="text-sm mt-2 opacity-80">
                {getQuickRatioMessage(quickRatio)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              <Zap className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs mt-3 opacity-60">
            (New + Expansion) / (Contraction + Churn)
          </p>
        </div>
      </div>

      {/* LTV & Unit Economics */}
      <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-2xl border-2 border-violet-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Lifetime Value & Unit Economics</h3>
            <p className="text-sm text-muted-foreground">Predicted customer value based on current churn</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {/* LTV */}
          <div className="p-4 rounded-xl bg-background/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">Predicted LTV</p>
              <div className="group relative">
                <Info className="w-4 h-4 text-muted-foreground/50 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg text-xs w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Lifetime Value = ARPU × Avg Customer Lifetime. Based on current churn rate.
                </div>
              </div>
            </div>
            <p className={`text-3xl font-bold ${ltv !== null ? "text-violet-500" : "text-muted-foreground"}`}>
              {ltv !== null ? `$${Math.round(ltv).toLocaleString()}` : "—"}
            </p>
            {ltv === null && (
              <p className="text-xs text-muted-foreground mt-1">Need churn data</p>
            )}
          </div>

          {/* ARPU */}
          <div className="p-4 rounded-xl bg-background/50 border border-border">
            <p className="text-sm font-medium text-muted-foreground mb-1">ARPU</p>
            <p className="text-3xl font-bold">
              ${arpu.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per month</p>
          </div>

          {/* Avg Customer Lifetime */}
          <div className="p-4 rounded-xl bg-background/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-muted-foreground">Avg Lifetime</p>
              <div className="group relative">
                <Info className="w-4 h-4 text-muted-foreground/50 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg text-xs w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Calculated as 1 / monthly churn rate
                </div>
              </div>
            </div>
            <p className={`text-3xl font-bold ${avgLifetimeMonths !== null ? "" : "text-muted-foreground"}`}>
              {avgLifetimeMonths !== null 
                ? avgLifetimeMonths === Infinity 
                  ? "∞" 
                  : `${avgLifetimeMonths.toFixed(1)}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {avgLifetimeMonths !== null && avgLifetimeMonths !== Infinity
                ? `months (${(avgLifetimeMonths / 12).toFixed(1)} years)`
                : "months"}
            </p>
          </div>

        </div>
      </div>

      {/* MRR Movement This Month */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold mb-4">MRR Movement — {format(now, "MMMM yyyy")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground mb-1">Starting MRR</p>
            <p className="text-xl font-bold">${startingMRR.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 text-center">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">New</span>
            </div>
            <p className="text-xl font-bold text-green-500">+${newMRR.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{newOrgsThisMonth.length} orgs</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">Expansion</span>
            </div>
            <p className="text-xl font-bold text-blue-500">+${expansionMRR.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">upgrades</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-sm">Contraction</span>
            </div>
            <p className="text-xl font-bold text-amber-500">-${contractionMRR.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">downgrades</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 text-center">
            <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-sm">Churned</span>
            </div>
            <p className="text-xl font-bold text-red-500">-${churnedMRR.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{churnedThisMonth.length} orgs</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-muted-foreground">Net Change</span>
          <span className={`text-2xl font-bold ${
            newMRR + expansionMRR - contractionMRR - churnedMRR >= 0 
              ? "text-green-500" 
              : "text-red-500"
          }`}>
            {newMRR + expansionMRR - contractionMRR - churnedMRR >= 0 ? "+" : ""}
            ${(newMRR + expansionMRR - contractionMRR - churnedMRR).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Monthly Churn Trend Chart */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold">Monthly Churn Trend</h3>
            <p className="text-sm text-muted-foreground">Last 6 months</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-muted-foreground">Churn Rate %</span>
            </div>
          </div>
        </div>
        
        {/* Simple bar chart */}
        <div className="flex items-end justify-between gap-2 h-40">
          {monthlyChurnTrend.map((month, i) => (
            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center">
                <span className={`text-xs font-medium mb-1 ${
                  month.churnRate > 5 ? "text-red-500" : 
                  month.churnRate > 3 ? "text-amber-500" : "text-muted-foreground"
                }`}>
                  {month.churnRate.toFixed(1)}%
                </span>
                <div 
                  className={`w-full max-w-[40px] rounded-t transition-all ${
                    month.churnRate > 5 ? "bg-red-500" : 
                    month.churnRate > 3 ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ 
                    height: `${Math.max((month.churnRate / maxChurnRate) * 100, 4)}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">{month.month}</p>
                <p className="text-xs text-muted-foreground">{month.churnedOrgs} orgs</p>
                {month.churnedMRR > 0 && (
                  <p className="text-xs text-red-500">${month.churnedMRR}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Logo Churn Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">Logo Churn</p>
              <div className="group relative">
                <Info className="w-4 h-4 text-muted-foreground/50 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg text-xs w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  % of customers that cancelled, regardless of how much they paid. Revenue churn is more important.
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">this month</span>
          </div>
          <p className={`text-2xl font-bold ${getChurnColor(logoChurnRate)}`}>
            {logoChurnRate.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {churnedThisMonth.length} of {activeAtStartOfMonth} orgs
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">Revenue Churn</p>
              <div className="group relative">
                <Info className="w-4 h-4 text-muted-foreground/50 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg text-xs w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  % of MRR lost to cancellations. This is the metric that matters most.
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">this month</span>
          </div>
          <p className={`text-2xl font-bold ${getChurnColor(revenueChurnRate)}`}>
            {revenueChurnRate.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ${churnedMRR.toLocaleString()} of ${startingMRR.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Cohort Retention Curves */}
      {cohortRetention.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold">Cohort Retention</h3>
            <p className="text-sm text-muted-foreground">
              Customer retention by signup month
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Cohort</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Started</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Retained</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Logo Retention</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Revenue Retention</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Retention Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cohortRetention.map((cohort) => (
                  <tr key={cohort.month} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <span className="font-medium">
                        {format(new Date(cohort.month + "-01"), "MMM yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({cohort.monthsAgo}mo ago)
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium">{cohort.total}</td>
                    <td className="p-4 text-right font-medium text-green-500">{cohort.retained}</td>
                    <td className="p-4 text-right">
                      <span className={`font-bold ${
                        cohort.retentionRate >= 80 ? "text-green-500" :
                        cohort.retentionRate >= 60 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {cohort.retentionRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-bold ${
                        cohort.revenueRetention >= 100 ? "text-green-500" :
                        cohort.revenueRetention >= 80 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {cohort.revenueRetention.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            cohort.retentionRate >= 80 ? "bg-green-500" :
                            cohort.retentionRate >= 60 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${cohort.retentionRate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PMF Scores by Role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent PMF Score */}
        <div
          className={`p-6 rounded-2xl border-2 ${getPmfBgColor(agentPmfScore)} border-current ${getPmfColor(agentPmfScore)}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Agent PMF Score</p>
              <p className="text-4xl font-bold mt-2">{agentPmfScore.toFixed(0)}%</p>
              <p className="text-sm mt-2 opacity-80">
                {agentSurveys.length === 0
                  ? "No agent responses yet"
                  : agentPmfScore >= 40
                  ? "Agents love the product!"
                  : `Need ${(40 - agentPmfScore).toFixed(0)}% more to hit 40%`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {agentVeryDisappointed} very
            </span>
            <span className="flex items-center gap-1">
              <Meh className="w-4 h-4" /> {agentSomewhatDisappointed} somewhat
            </span>
            <span className="flex items-center gap-1">
              <Frown className="w-4 h-4" /> {agentNotDisappointed} not
            </span>
          </div>
          <p className="text-xs opacity-60 mt-2">{agentSurveys.length} total responses</p>
        </div>

        {/* Admin PMF Score */}
        <div
          className={`p-6 rounded-2xl border-2 ${getPmfBgColor(adminPmfScore)} border-current ${getPmfColor(adminPmfScore)}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Admin PMF Score</p>
              <p className="text-4xl font-bold mt-2">{adminPmfScore.toFixed(0)}%</p>
              <p className="text-sm mt-2 opacity-80">
                {adminSurveys.length === 0
                  ? "No admin responses yet"
                  : adminPmfScore >= 40
                  ? "Admins love the product!"
                  : `Need ${(40 - adminPmfScore).toFixed(0)}% more to hit 40%`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              <Target className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {adminVeryDisappointed} very
            </span>
            <span className="flex items-center gap-1">
              <Meh className="w-4 h-4" /> {adminSomewhatDisappointed} somewhat
            </span>
            <span className="flex items-center gap-1">
              <Frown className="w-4 h-4" /> {adminNotDisappointed} not
            </span>
          </div>
          <p className="text-xs opacity-60 mt-2">{adminSurveys.length} total responses</p>
        </div>
      </div>

    </div>
  );
}
