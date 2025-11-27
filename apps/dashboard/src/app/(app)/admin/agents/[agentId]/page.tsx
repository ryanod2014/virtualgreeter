import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentStatsClient } from "./agent-stats-client";

interface Props {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function AgentStatsPage({ params, searchParams }: Props) {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const { agentId } = await params;
  const { from, to } = await searchParams;

  const supabase = await createClient();

  // Date range (default: last 30 days)
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch agent profile
  // Specify FK explicitly because agent_profiles has multiple FKs to users (user_id, deactivated_by)
  const { data: agent } = await supabase
    .from("agent_profiles")
    .select(
      `
      *,
      user:users!agent_profiles_user_id_fkey(email, full_name)
    `
    )
    .eq("id", agentId)
    .eq("organization_id", auth.organization.id)
    .single();

  if (!agent) notFound();

  // Fetch call logs for this agent in date range
  const { data: calls } = await supabase
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
    .eq("agent_id", agentId)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString())
    .order("created_at", { ascending: false });

  // Fetch all dispositions for this org
  const { data: dispositions } = await supabase
    .from("dispositions")
    .select("id, name, color")
    .eq("organization_id", auth.organization.id)
    .eq("is_active", true)
    .order("display_order");

  // Fetch activity sessions for this agent in date range
  const { data: sessions } = await supabase
    .from("agent_sessions")
    .select(`
      id,
      started_at,
      ended_at,
      duration_seconds,
      idle_seconds,
      in_call_seconds,
      away_seconds,
      ended_reason
    `)
    .eq("agent_id", agentId)
    .gte("started_at", fromDate.toISOString())
    .lte("started_at", toDate.toISOString())
    .order("started_at", { ascending: false });

  return (
    <AgentStatsClient
      agent={agent}
      calls={calls ?? []}
      sessions={sessions ?? []}
      dispositions={dispositions ?? []}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
    />
  );
}

