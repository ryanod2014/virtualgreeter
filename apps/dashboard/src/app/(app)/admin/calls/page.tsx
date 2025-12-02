import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { CallsClient } from "./calls-client";
import { calculateHourlyCoverage } from "@/lib/stats/coverage-stats";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    agent?: string;
    status?: string;
    disposition?: string;
    pool?: string;
    urlConditions?: string; // JSON-encoded filter conditions
    minDuration?: string;
    maxDuration?: string;
    country?: string; // ISO country codes, comma-separated
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
      visitor_city,
      visitor_region,
      visitor_country,
      visitor_country_code,
      transcription,
      transcription_status,
      ai_summary,
      ai_summary_status,
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
  // URL conditions filtering is handled client-side after fetch
  if (params.minDuration) {
    query = query.gte("duration_seconds", parseInt(params.minDuration));
  }
  if (params.maxDuration) {
    query = query.lte("duration_seconds", parseInt(params.maxDuration));
  }
  if (params.country) {
    // Country filter - filter by ISO country codes
    const countryCodes = params.country.split(",").filter(Boolean).map(c => c.toUpperCase());
    if (countryCodes.length > 0) {
      query = query.in("visitor_country_code", countryCodes);
    }
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
  // Include active sessions - their time fields are updated on each status change
  const { data: teamSessions } = await supabase
    .from("agent_sessions")
    .select("duration_seconds, idle_seconds, in_call_seconds")
    .eq("organization_id", auth.organization.id)
    .gte("started_at", fromDate.toISOString())
    .lte("started_at", toDate.toISOString());

  // Active hours = idle + in_call (NOT away time)
  const teamIdleSeconds =
    teamSessions?.reduce((acc, s) => acc + s.idle_seconds, 0) ?? 0;
  const teamInCallSeconds =
    teamSessions?.reduce((acc, s) => acc + s.in_call_seconds, 0) ?? 0;
  const teamActiveSeconds = teamIdleSeconds + teamInCallSeconds;

  // Fetch organization's blocklist settings for filtering
  const { data: orgSettings } = await supabase
    .from("organizations")
    .select("blocked_countries, country_list_mode")
    .eq("id", auth.organization.id)
    .single();

  const blockedCountries = (orgSettings?.blocked_countries as string[]) || [];
  const countryListMode = (orgSettings?.country_list_mode as "blocklist" | "allowlist") || "blocklist";

  // Fetch pageview data for coverage calculation (with country code for filtering)
  // Note: visitor_country_code may not exist yet if migration hasn't run - query gracefully handles this
  const { data: rawPageviews, error: pageviewError } = await supabase
    .from("widget_pageviews")
    .select("id, agent_id, created_at, visitor_country_code")
    .eq("organization_id", auth.organization.id)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  // If query failed (likely missing column), retry without the new column
  let pageviewsData = rawPageviews;
  if (pageviewError) {
    console.warn("[CallsPage] Pageview query failed, retrying without visitor_country_code:", pageviewError.message);
    const { data: fallbackPageviews } = await supabase
      .from("widget_pageviews")
      .select("id, agent_id, created_at")
      .eq("organization_id", auth.organization.id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString());
    pageviewsData = fallbackPageviews?.map(p => ({ ...p, visitor_country_code: null })) ?? [];
  }

  // Filter pageviews based on blocklist/allowlist settings
  // This excludes traffic that the org doesn't want to cover
  const pageviews = (pageviewsData ?? []).filter((pv) => {
    if (blockedCountries.length === 0) return true;
    
    const countryCode = pv.visitor_country_code?.toUpperCase() ?? null;
    const isInList = countryCode ? blockedCountries.some(c => c.toUpperCase() === countryCode) : false;
    
    if (countryListMode === "allowlist") {
      // Allowlist mode: only include if IN the list (or unknown country)
      return isInList || !countryCode;
    } else {
      // Blocklist mode: exclude if IN the list
      return !isInList;
    }
  });

  const pageviewCount = pageviews.length;
  const pageviewsWithAgent = pageviews.filter(p => p.agent_id !== null).length;
  const missedOpportunities = pageviewCount - pageviewsWithAgent;
  const coverageRate = pageviewCount > 0 ? (pageviewsWithAgent / pageviewCount) * 100 : 100;

  // Fetch agent sessions for hourly coverage calculation
  // Get sessions that overlap with the date range
  const { data: sessionsForCoverage } = await supabase
    .from("agent_sessions")
    .select("started_at, ended_at")
    .eq("organization_id", auth.organization.id)
    .or(`and(started_at.lte.${toDate.toISOString()},or(ended_at.gte.${fromDate.toISOString()},ended_at.is.null))`);

  // Calculate hourly coverage statistics
  const hourlyCoverage = calculateHourlyCoverage(
    pageviews.map(p => ({ created_at: p.created_at, agent_id: p.agent_id })),
    sessionsForCoverage ?? [],
    fromDate,
    toDate
  );

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
      pageviewCount={pageviewCount}
      coverageStats={{
        pageviewsWithAgent,
        missedOpportunities,
        coverageRate,
      }}
      hourlyCoverage={hourlyCoverage}
    />
  );
}

