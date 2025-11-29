import { createClient } from "@/lib/supabase/server";
import { OrganizationsClient } from "./organizations-client";
import { startOfMonth, subDays } from "date-fns";

export default async function PlatformOrganizationsPage() {
  const supabase = await createClient();

  // Fetch all organizations with aggregated stats
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      plan,
      subscription_status,
      seat_count,
      mrr,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching organizations:", error);
  }

  // Get user counts per org
  const { data: userCounts } = await supabase
    .from("users")
    .select("organization_id");

  // Get agent counts per org
  const { data: agentCounts } = await supabase
    .from("agent_profiles")
    .select("organization_id")
    .eq("is_active", true);

  // Get call counts per org (total and this month) with status
  const { data: callCounts } = await supabase
    .from("call_logs")
    .select("organization_id, created_at, status");

  // Get pageview data per org (includes agent_id to detect missed opportunities)
  const { data: pageviewCounts } = await supabase
    .from("widget_pageviews")
    .select("organization_id, agent_id, created_at");

  const now = new Date();
  const startOfThisMonth = startOfMonth(now);
  const fourteenDaysAgo = subDays(now, 14);
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  // Build org stats with health scores
  const orgStats = (organizations ?? []).map((org) => {
    const userCount = userCounts?.filter((u) => u.organization_id === org.id).length ?? 0;
    const agentCount = agentCounts?.filter((a) => a.organization_id === org.id).length ?? 0;
    const orgCalls = callCounts?.filter((c) => c.organization_id === org.id) ?? [];
    const totalCalls = orgCalls.length;
    const callsThisMonth = orgCalls.filter(
      (c) => new Date(c.created_at) >= startOfThisMonth
    ).length;

    // Pageview stats
    const orgPageviews = pageviewCounts?.filter((p) => p.organization_id === org.id) ?? [];
    const pageviewsTotal = orgPageviews.length;
    const pageviewsThisMonth = orgPageviews.filter(
      (p) => new Date(p.created_at) >= startOfThisMonth
    ).length;
    const pageviewsWithAgent = orgPageviews.filter((p) => p.agent_id !== null).length;
    const pageviewsWithAgentThisMonth = orgPageviews.filter(
      (p) => p.agent_id !== null && new Date(p.created_at) >= startOfThisMonth
    ).length;
    
    // Coverage rate: % of pageviews where an agent was available
    const coverageRate = pageviewsTotal > 0 
      ? (pageviewsWithAgent / pageviewsTotal) * 100 
      : 100; // No traffic = 100% coverage (not a problem)
    const coverageRateThisMonth = pageviewsThisMonth > 0 
      ? (pageviewsWithAgentThisMonth / pageviewsThisMonth) * 100 
      : 100;
    
    // Missed opportunities: pageviews where no agent was available
    const missedOpportunities = pageviewsTotal - pageviewsWithAgent;
    const missedOpportunitiesThisMonth = pageviewsThisMonth - pageviewsWithAgentThisMonth;
    
    // Answered calls (accepted or completed status)
    const answeredCalls = orgCalls.filter(
      (c) => c.status === "accepted" || c.status === "completed"
    ).length;
    const answeredCallsThisMonth = orgCalls.filter(
      (c) => (c.status === "accepted" || c.status === "completed") && 
             new Date(c.created_at) >= startOfThisMonth
    ).length;
    
    // Answer rate: % of pageviews (with agent) that became answered calls
    const answerRate = pageviewsWithAgent > 0 
      ? (answeredCalls / pageviewsWithAgent) * 100 
      : 0;
    const answerRateThisMonth = pageviewsWithAgentThisMonth > 0 
      ? (answeredCallsThisMonth / pageviewsWithAgentThisMonth) * 100 
      : 0;

    // Calculate last activity (most recent call or updated_at)
    const lastCallDate = orgCalls.length > 0
      ? Math.max(...orgCalls.map((c) => new Date(c.created_at).getTime()))
      : null;
    const lastActivity = lastCallDate
      ? new Date(lastCallDate).toISOString()
      : org.updated_at;

    // Calculate days since last call
    const daysSinceLastCall = lastCallDate
      ? Math.floor((now.getTime() - lastCallDate) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate call trend (compare last 14 days vs previous 14 days)
    const callsLast14Days = orgCalls.filter(
      (c) => new Date(c.created_at) >= fourteenDaysAgo
    ).length;
    const callsPrevious14Days = orgCalls.filter(
      (c) => {
        const date = new Date(c.created_at);
        return date >= subDays(fourteenDaysAgo, 14) && date < fourteenDaysAgo;
      }
    ).length;
    
    let callsTrend: "increasing" | "stable" | "declining" = "stable";
    if (callsPrevious14Days > 0) {
      const change = (callsLast14Days - callsPrevious14Days) / callsPrevious14Days;
      if (change > 0.2) callsTrend = "increasing";
      else if (change < -0.2) callsTrend = "declining";
    } else if (callsLast14Days > 0) {
      callsTrend = "increasing";
    }

    // Calculate Health Score (0-100)
    let activityScore = 100;
    let engagementScore = 100;
    let coverageScore = Math.round(coverageRateThisMonth);
    let growthScore = 100;

    // Activity score based on recency of calls
    if (daysSinceLastCall === null) {
      activityScore = 20; // Never had a call
    } else if (daysSinceLastCall <= 1) {
      activityScore = 100;
    } else if (daysSinceLastCall <= 3) {
      activityScore = 90;
    } else if (daysSinceLastCall <= 7) {
      activityScore = 70;
    } else if (daysSinceLastCall <= 14) {
      activityScore = 50;
    } else if (daysSinceLastCall <= 30) {
      activityScore = 30;
    } else {
      activityScore = 10;
    }

    // Engagement score based on call volume
    if (callsThisMonth >= 20) {
      engagementScore = 100;
    } else if (callsThisMonth >= 10) {
      engagementScore = 80;
    } else if (callsThisMonth >= 5) {
      engagementScore = 60;
    } else if (callsThisMonth >= 1) {
      engagementScore = 40;
    } else {
      engagementScore = 20;
    }

    // Growth score based on trend
    if (callsTrend === "increasing") {
      growthScore = 100;
    } else if (callsTrend === "stable") {
      growthScore = 70;
    } else {
      growthScore = 30;
    }

    // Calculate overall health score (weighted average)
    const healthScore = Math.round(
      activityScore * 0.35 +
      engagementScore * 0.20 +
      coverageScore * 0.25 +
      growthScore * 0.20
    );

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (healthScore < 40) {
      riskLevel = "critical";
    } else if (healthScore < 60) {
      riskLevel = "high";
    } else if (healthScore < 80) {
      riskLevel = "medium";
    }

    // Only show risk for active orgs
    const isAtRisk = org.subscription_status === "active" && riskLevel !== "low";

    return {
      ...org,
      userCount,
      agentCount,
      totalCalls,
      callsThisMonth,
      lastActivity,
      // Coverage metrics
      pageviewsTotal,
      pageviewsThisMonth,
      pageviewsWithAgent,
      coverageRate,
      coverageRateThisMonth,
      missedOpportunities,
      missedOpportunitiesThisMonth,
      answeredCalls,
      answerRate,
      answerRateThisMonth,
      // Health metrics
      healthScore,
      riskLevel,
      isAtRisk,
      daysSinceLastCall,
      callsTrend,
      activityScore,
      engagementScore,
      coverageScore,
      growthScore,
      mrr: org.mrr || 0,
    };
  });

  // Calculate summary stats for the header
  const atRiskOrgs = orgStats.filter((o) => o.isAtRisk);
  const criticalOrgs = orgStats.filter((o) => o.riskLevel === "critical" && o.subscription_status === "active");
  const atRiskMRR = atRiskOrgs.reduce((sum, o) => sum + o.mrr, 0);

  // Calculate platform-wide totals (this month)
  const pageviewsThisMonth = orgStats.reduce((sum, o) => sum + o.pageviewsThisMonth, 0);
  const pageviewsWithAgentThisMonth = orgStats.reduce((sum, o) => sum + (o.pageviewsThisMonth - o.missedOpportunitiesThisMonth), 0);
  const callsThisMonth = orgStats.reduce((sum, o) => sum + o.callsThisMonth, 0);
  const answeredCallsThisMonth = orgStats.reduce((sum, o) => sum + 
    (o.answerRateThisMonth > 0 ? Math.round((o.pageviewsThisMonth - o.missedOpportunitiesThisMonth) * o.answerRateThisMonth / 100) : 0), 0);
  
  // Ring Rate: widget popups → rings (user clicked answer)
  const ringRate = pageviewsWithAgentThisMonth > 0 
    ? (callsThisMonth / pageviewsWithAgentThisMonth) * 100 
    : 0;
  
  // Agent Answer Rate: % of rings that agents answered
  const agentAnswerRate = callsThisMonth > 0 
    ? (answeredCallsThisMonth / callsThisMonth) * 100 
    : 0;
  
  const platformTotals = {
    pageviewsThisMonth,
    pageviewsWithAgentThisMonth,
    callsThisMonth,
    answeredCallsThisMonth,
    ringRate,
    agentAnswerRate,
  };

  return (
    <OrganizationsClient 
      organizations={orgStats} 
      atRiskCount={atRiskOrgs.length}
      criticalCount={criticalOrgs.length}
      atRiskMRR={atRiskMRR}
      platformTotals={platformTotals}
    />
  );
}
