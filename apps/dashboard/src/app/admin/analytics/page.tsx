import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./analytics-client";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    agent?: string;
    status?: string;
    disposition?: string;
  }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
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

  // Build query with filters - fetch fields needed for stats calculation
  let query = supabase
    .from("call_logs")
    .select(
      `
      id,
      status,
      duration_seconds,
      ring_started_at,
      answered_at,
      answer_time_seconds,
      disposition_id,
      created_at
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

  const { data: calls } = await query;

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

  return (
    <AnalyticsClient
      calls={calls ?? []}
      dispositions={dispositions ?? []}
      agents={agents ?? []}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
      currentFilters={params}
    />
  );
}
