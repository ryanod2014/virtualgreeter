import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./analytics-client";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const params = await searchParams;
  const supabase = await createClient();

  // Date range (default: last 30 days)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Parse 'to' date and set to end of day (23:59:59.999)
  const toDate = params.to ? parseLocalDate(params.to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  // Parse 'from' date and set to start of day (00:00:00)
  const fromDate = params.from
    ? parseLocalDate(params.from)
    : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
  fromDate.setHours(0, 0, 0, 0);

  // Fetch all data in parallel
  const [pageviewsResult, callsResult, sessionsResult] = await Promise.all([
    // Pageviews with agent_id to calculate coverage
    supabase
      .from("widget_pageviews")
      .select("id, agent_id, created_at, page_url")
      .eq("organization_id", auth.organization.id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString())
      .order("created_at", { ascending: false }),
    
    // Calls with status for answer rate
    supabase
      .from("call_logs")
      .select("id, status, created_at, duration_seconds, page_url")
      .eq("organization_id", auth.organization.id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString())
      .order("created_at", { ascending: false }),
    
    // Agent sessions for availability
    supabase
      .from("agent_sessions")
      .select("id, idle_seconds, in_call_seconds, away_seconds, started_at")
      .eq("organization_id", auth.organization.id)
      .gte("started_at", fromDate.toISOString())
      .lte("started_at", toDate.toISOString()),
  ]);

  const pageviews = pageviewsResult.data ?? [];
  const calls = callsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];

  // Calculate metrics
  const pageviewsTotal = pageviews.length;
  const pageviewsWithAgent = pageviews.filter(p => p.agent_id !== null).length;
  const missedOpportunities = pageviewsTotal - pageviewsWithAgent;
  const coverageRate = pageviewsTotal > 0 ? (pageviewsWithAgent / pageviewsTotal) * 100 : 100;

  const answeredCalls = calls.filter(c => c.status === "accepted" || c.status === "completed").length;
  const missedCalls = calls.filter(c => c.status === "missed").length;
  const rejectedCalls = calls.filter(c => c.status === "rejected").length;
  const totalCalls = calls.length;

  // Answer rate = answered calls / pageviews with agent available
  const answerRate = pageviewsWithAgent > 0 ? (answeredCalls / pageviewsWithAgent) * 100 : 0;
  
  // Call answer rate = answered calls / total call attempts
  const callAnswerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

  // Agent availability
  const totalIdleSeconds = sessions.reduce((acc, s) => acc + s.idle_seconds, 0);
  const totalInCallSeconds = sessions.reduce((acc, s) => acc + s.in_call_seconds, 0);
  const totalAwaySeconds = sessions.reduce((acc, s) => acc + s.away_seconds, 0);
  const totalActiveSeconds = totalIdleSeconds + totalInCallSeconds;
  const utilizationRate = totalActiveSeconds > 0 ? (totalInCallSeconds / totalActiveSeconds) * 100 : 0;

  // Group pageviews by day for chart
  const pageviewsByDay = groupByDay(pageviews, "created_at");
  const callsByDay = groupByDay(calls, "created_at");
  const answeredByDay = groupByDay(
    calls.filter(c => c.status === "accepted" || c.status === "completed"),
    "created_at"
  );

  // Calculate daily answer rates
  const dailyStats = Object.keys(pageviewsByDay).map(day => {
    const dayPageviews = pageviewsByDay[day] ?? [];
    const dayCalls = callsByDay[day] ?? [];
    const dayAnswered = answeredByDay[day] ?? [];
    const dayPageviewsWithAgent = dayPageviews.filter((p: { agent_id: string | null }) => p.agent_id !== null).length;
    
    return {
      date: day,
      pageviews: dayPageviews.length,
      pageviewsWithAgent: dayPageviewsWithAgent,
      missedOpportunities: dayPageviews.length - dayPageviewsWithAgent,
      calls: dayCalls.length,
      answered: dayAnswered.length,
      coverageRate: dayPageviews.length > 0 ? (dayPageviewsWithAgent / dayPageviews.length) * 100 : 100,
      answerRate: dayPageviewsWithAgent > 0 ? (dayAnswered.length / dayPageviewsWithAgent) * 100 : 0,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Top pages by pageviews
  const pageUrlCounts = pageviews.reduce((acc, p) => {
    const url = p.page_url;
    if (!acc[url]) {
      acc[url] = { total: 0, withAgent: 0, answered: 0 };
    }
    acc[url].total++;
    if (p.agent_id) acc[url].withAgent++;
    return acc;
  }, {} as Record<string, { total: number; withAgent: number; answered: number }>);

  // Add answered calls by page
  calls.filter(c => c.status === "accepted" || c.status === "completed").forEach(c => {
    if (pageUrlCounts[c.page_url]) {
      pageUrlCounts[c.page_url].answered++;
    }
  });

  const topPages = Object.entries(pageUrlCounts)
    .map(([url, stats]) => ({
      url,
      pageviews: stats.total,
      pageviewsWithAgent: stats.withAgent,
      answered: stats.answered,
      coverageRate: stats.total > 0 ? (stats.withAgent / stats.total) * 100 : 100,
      answerRate: stats.withAgent > 0 ? (stats.answered / stats.withAgent) * 100 : 0,
    }))
    .sort((a, b) => b.pageviews - a.pageviews)
    .slice(0, 10);

  return (
    <AnalyticsClient
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
      stats={{
        pageviewsTotal,
        pageviewsWithAgent,
        missedOpportunities,
        coverageRate,
        answeredCalls,
        missedCalls,
        rejectedCalls,
        totalCalls,
        answerRate,
        callAnswerRate,
        totalActiveSeconds,
        totalInCallSeconds,
        utilizationRate,
      }}
      dailyStats={dailyStats}
      topPages={topPages}
    />
  );
}

// Helper function to group items by day
function groupByDay<T extends { [key: string]: unknown }>(
  items: T[],
  dateField: keyof T
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const date = new Date(item[dateField] as string).toISOString().split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

