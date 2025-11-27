import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentsClient } from "./agents-client";

export default async function AgentsPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch agents with their pool memberships
  const { data: agents } = await supabase
    .from("agent_profiles")
    .select(`
      *,
      user:users(email, full_name),
      agent_pool_members(
        id,
        pool:agent_pools(id, name, is_catch_all)
      )
    `)
    .eq("organization_id", auth!.organization.id)
    .order("display_name");

  // Fetch all pools for assignment dropdown
  const { data: pools } = await supabase
    .from("agent_pools")
    .select("id, name, is_catch_all")
    .eq("organization_id", auth!.organization.id)
    .order("is_catch_all", { ascending: false })
    .order("name");

  // Fetch pending invites
  const { data: pendingInvites } = await supabase
    .from("invites")
    .select("id, email, full_name, role, expires_at, created_at")
    .eq("organization_id", auth!.organization.id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  // Fetch call stats for agents (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: callStats } = await supabase
    .from("call_logs")
    .select("agent_id, status, duration_seconds")
    .eq("organization_id", auth!.organization.id)
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Aggregate stats by agent
  const agentStats: Record<string, { totalCalls: number; completedCalls: number; totalDuration: number }> = {};
  callStats?.forEach((call) => {
    if (!agentStats[call.agent_id]) {
      agentStats[call.agent_id] = { totalCalls: 0, completedCalls: 0, totalDuration: 0 };
    }
    agentStats[call.agent_id].totalCalls++;
    if (call.status === "completed") {
      agentStats[call.agent_id].completedCalls++;
      agentStats[call.agent_id].totalDuration += call.duration_seconds ?? 0;
    }
  });

  return (
    <AgentsClient
      agents={agents ?? []}
      pools={pools ?? []}
      agentStats={agentStats}
      organizationId={auth!.organization.id}
      pendingInvites={pendingInvites ?? []}
    />
  );
}
