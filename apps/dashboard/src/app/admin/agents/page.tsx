import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentsClient } from "./agents-client";

const PRICE_PER_SEAT = 297;

export default async function AgentsPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch ACTIVE agents with their pool memberships
  const { data: agents } = await supabase
    .from("agent_profiles")
    .select(`
      id,
      user_id,
      display_name,
      status,
      wave_video_url,
      intro_video_url,
      loop_video_url,
      max_simultaneous_simulations,
      is_active,
      user:users(email, full_name),
      agent_pool_members(
        id,
        pool:agent_pools(id, name, is_catch_all)
      )
    `)
    .eq("organization_id", auth!.organization.id)
    .eq("is_active", true) // Only active agents
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
    if (!call.agent_id) return; // Skip calls with null agent (deleted agents)
    if (!agentStats[call.agent_id]) {
      agentStats[call.agent_id] = { totalCalls: 0, completedCalls: 0, totalDuration: 0 };
    }
    agentStats[call.agent_id].totalCalls++;
    if (call.status === "completed") {
      agentStats[call.agent_id].completedCalls++;
      agentStats[call.agent_id].totalDuration += call.duration_seconds ?? 0;
    }
  });

  // Calculate billing info
  const activeAgentCount = agents?.length ?? 0;
  const pendingInviteCount = pendingInvites?.length ?? 0;
  const totalSeats = activeAgentCount + pendingInviteCount;
  const monthlyCost = totalSeats * PRICE_PER_SEAT;

  // Transform agents to fix Supabase join type
  const transformedAgents = (agents ?? []).map(agent => ({
    ...agent,
    user: Array.isArray(agent.user) ? agent.user[0] : agent.user,
    agent_pool_members: (agent.agent_pool_members ?? []).map((m: { id: string; pool: unknown }) => ({
      ...m,
      pool: Array.isArray(m.pool) ? m.pool[0] : m.pool,
    })),
  }));

  return (
    <AgentsClient
      agents={transformedAgents as unknown as Parameters<typeof AgentsClient>[0]["agents"]}
      pools={pools ?? []}
      agentStats={agentStats}
      organizationId={auth!.organization.id}
      pendingInvites={pendingInvites ?? []}
      currentUserId={auth!.user.id}
      billingInfo={{
        totalSeats,
        activeAgents: activeAgentCount,
        pendingInvites: pendingInviteCount,
        pricePerSeat: PRICE_PER_SEAT,
        monthlyCost,
      }}
    />
  );
}
