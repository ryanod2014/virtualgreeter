import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { CallsClient } from "./calls-client";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    agent?: string;
    status?: string;
    disposition?: string;
    pool?: string;
    url?: string;
    minDuration?: string;
    maxDuration?: string;
  }>;
}

export default async function CallsPage({ searchParams }: Props) {
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

  // Build query with full data for both stats and table display
  let query = supabase
    .from("call_logs")
    .select(
      `
      id,
      status,
      page_url,
      duration_seconds,
      recording_url,
      created_at,
      ring_started_at,
      answered_at,
      answer_time_seconds,
      disposition_id,
      pool_id,
      agent:agent_profiles(id, display_name),
      site:sites(id, name, domain),
      disposition:dispositions(id, name, color)
    `
    )
    .eq("organization_id", auth.organization.id)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString())
    .order("created_at", { ascending: false });

  // Apply optional filters
  if (params.agent) {
    const agentIds = params.agent.split(",").filter(Boolean);
    if (agentIds.length > 0) {
      query = query.in("agent_id", agentIds);
    }
  }
  if (params.status) {
    const statuses = params.status.split(",").filter(Boolean);
    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }
  }
  if (params.disposition) {
    const dispositionIds = params.disposition.split(",").filter(Boolean);
    if (dispositionIds.length > 0) {
      query = query.in("disposition_id", dispositionIds);
    }
  }
  if (params.pool) {
    const poolIds = params.pool.split(",").filter(Boolean);
    if (poolIds.length > 0) {
      query = query.in("pool_id", poolIds);
    }
  }
  if (params.url) {
    query = query.ilike("page_url", `%${params.url}%`);
  }
  if (params.minDuration) {
    query = query.gte("duration_seconds", parseInt(params.minDuration));
  }
  if (params.maxDuration) {
    query = query.lte("duration_seconds", parseInt(params.maxDuration));
  }

  const { data: rawCalls } = await query.limit(500);

  // Transform Supabase array relations to single objects
  const calls = rawCalls?.map((call) => ({
    ...call,
    agent: Array.isArray(call.agent) ? call.agent[0] ?? null : call.agent,
    site: Array.isArray(call.site) ? call.site[0] ?? null : call.site,
    disposition: Array.isArray(call.disposition) ? call.disposition[0] ?? null : call.disposition,
  }));

  // Fetch filter options
  const { data: dispositions } = await supabase
    .from("dispositions")
    .select("id, name, color")
    .eq("organization_id", auth.organization.id)
    .eq("is_active", true)
    .order("display_order");

  const { data: agents } = await supabase
    .from("agent_profiles")
    .select("id, display_name")
    .eq("organization_id", auth.organization.id)
    .order("display_name");

  const { data: pools } = await supabase
    .from("agent_pools")
    .select("id, name")
    .eq("organization_id", auth.organization.id)
    .order("name");

  // Fetch team total active hours for the date range
  const { data: teamSessions } = await supabase
    .from("agent_sessions")
    .select("duration_seconds, idle_seconds, in_call_seconds")
    .eq("organization_id", auth.organization.id)
    .gte("started_at", fromDate.toISOString())
    .lte("started_at", toDate.toISOString())
    .not("ended_at", "is", null); // Only completed sessions

  // Active hours = idle + in_call (NOT away time)
  const teamIdleSeconds =
    teamSessions?.reduce((acc, s) => acc + s.idle_seconds, 0) ?? 0;
  const teamInCallSeconds =
    teamSessions?.reduce((acc, s) => acc + s.in_call_seconds, 0) ?? 0;
  const teamActiveSeconds = teamIdleSeconds + teamInCallSeconds;

  // Fetch pageview count for the date range
  const { count: pageviewCount } = await supabase
    .from("widget_pageviews")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", auth.organization.id)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  return (
    <CallsClient
      calls={calls ?? []}
      dispositions={dispositions ?? []}
      agents={agents ?? []}
      pools={pools ?? []}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
      currentFilters={params}
      teamActivity={{
        activeSeconds: teamActiveSeconds,
        inCallSeconds: teamInCallSeconds,
      }}
      pageviewCount={pageviewCount ?? 0}
    />
  );
}

