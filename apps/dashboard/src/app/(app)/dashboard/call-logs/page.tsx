import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentCallLogsView } from "./agent-call-logs-view";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    url?: string;
    minDuration?: string;
    maxDuration?: string;
    disposition?: string;
    status?: string;
    country?: string; // ISO country codes, comma-separated
  }>;
}

export default async function CallLogsPage({ searchParams }: Props) {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");

  const params = await searchParams;
  const supabase = await createClient();

  const agentId = auth.agentProfile?.id;

  if (!agentId) {
    return (
      <div className="p-8">
        <div className="glass rounded-2xl p-12 text-center">
          <h2 className="text-xl font-bold mb-2">No Agent Profile</h2>
          <p className="text-muted-foreground">
            Your agent profile hasn't been set up yet.
          </p>
        </div>
      </div>
    );
  }

  // Date range (default: last 30 days)
  // Helper to parse date string as local date (not UTC)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Parse 'to' date and set to end of day (23:59:59.999) to include all calls that day
  const toDate = params.to ? parseLocalDate(params.to) : new Date();
  toDate.setHours(23, 59, 59, 999);
  
  // Parse 'from' date and set to start of day (00:00:00)
  const fromDate = params.from
    ? parseLocalDate(params.from)
    : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
  fromDate.setHours(0, 0, 0, 0);

  // Build query with filters - only this agent's calls
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
      visitor_city,
      visitor_region,
      visitor_country,
      visitor_country_code,
      site:sites(id, name, domain),
      disposition:dispositions(id, name, color)
    `
    )
    .eq("agent_id", agentId)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString())
    .order("created_at", { ascending: false });

  // Apply optional filters
  if (params.url) {
    query = query.ilike("page_url", `%${params.url}%`);
  }
  if (params.minDuration) {
    query = query.gte("duration_seconds", parseInt(params.minDuration));
  }
  if (params.maxDuration) {
    query = query.lte("duration_seconds", parseInt(params.maxDuration));
  }
  // Support multi-select filters (comma-separated values)
  if (params.disposition) {
    const dispositionIds = params.disposition.split(",").filter(Boolean);
    if (dispositionIds.length > 0) {
      query = query.in("disposition_id", dispositionIds);
    }
  }
  if (params.status) {
    const statuses = params.status.split(",").filter(Boolean);
    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }
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
    site: Array.isArray(call.site) ? call.site[0] ?? null : call.site,
    disposition: Array.isArray(call.disposition) ? call.disposition[0] ?? null : call.disposition,
  }));

  // Fetch filter options (dispositions)
  const { data: dispositions } = await supabase
    .from("dispositions")
    .select("id, name, color")
    .eq("organization_id", auth.organization.id)
    .eq("is_active", true)
    .order("display_order");

  return (
    <AgentCallLogsView
      calls={calls ?? []}
      dispositions={dispositions ?? []}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
      currentFilters={params}
    />
  );
}

