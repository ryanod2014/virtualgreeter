import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { CallLogsClient } from "./call-logs-client";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    url?: string;
    minDuration?: string;
    maxDuration?: string;
    disposition?: string;
    agent?: string;
    status?: string;
  }>;
}

export default async function CallLogsPage({ searchParams }: Props) {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const params = await searchParams;
  const supabase = await createClient();

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

  // Build query with filters
  let query = supabase
    .from("call_logs")
    .select(
      `
      *,
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

  const { data: calls } = await query.limit(500);

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

  // Get unique URLs for filter suggestions
  const { data: urlData } = await supabase
    .from("call_logs")
    .select("page_url")
    .eq("organization_id", auth.organization.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const uniqueUrls = Array.from(new Set(urlData?.map((u) => u.page_url) ?? []));

  return (
    <CallLogsClient
      calls={calls ?? []}
      dispositions={dispositions ?? []}
      agents={agents ?? []}
      uniqueUrls={uniqueUrls}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
      currentFilters={params}
    />
  );
}

