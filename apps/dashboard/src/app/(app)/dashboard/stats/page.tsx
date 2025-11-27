import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentStatsView } from "./agent-stats-view";

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function StatsPage({ searchParams }: Props) {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");

  const { from, to } = await searchParams;
  const supabase = await createClient();

  // Date range (default: last 30 days)
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get the agent's profile ID
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

  return (
    <AgentStatsView
      agentName={auth.agentProfile.display_name}
      calls={calls ?? []}
      dispositions={dispositions ?? []}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
    />
  );
}
