import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentsClient } from "./agents-client";
import { PRICING } from "@/lib/stripe";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch ACTIVE agents with their pool memberships and per-pool video URLs
  // Specify FK explicitly because agent_profiles has multiple FKs to users (user_id, deactivated_by)
  const { data: agents, error: agentsError } = await supabase
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
      user:users!agent_profiles_user_id_fkey(email, full_name),
      agent_pool_members(
        id,
        priority_rank,
        wave_video_url,
        intro_video_url,
        loop_video_url,
        pool:agent_pools(id, name, is_catch_all)
      )
    `)
    .eq("organization_id", auth!.organization.id)
    .eq("is_active", true) // Only active agents
    .order("display_name");

  if (agentsError) {
    console.error("[AgentsPage] Query error:", agentsError.message);
  }

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

  // Calculate billing info with PRE-PAID SEATS model
  // Count all active agents + pending agent invites as "used seats"
  const activeAgentCount = agents?.length ?? 0;
  const pendingAgentInviteCount = pendingInvites?.filter(i => i.role === "agent").length ?? 0;
  const usedSeats = activeAgentCount + pendingAgentInviteCount;
  
  // Purchased seats = what they committed to in funnel (billing floor)
  // Falls back to used seats if not set (legacy orgs)
  const purchasedSeats = auth!.organization.seat_count ?? Math.max(usedSeats, 1);
  const availableSeats = Math.max(0, purchasedSeats - usedSeats);
  
  // Get price based on org's billing frequency
  const billingFrequency = auth!.organization.billing_frequency ?? 'monthly';
  const pricePerSeat = PRICING[billingFrequency].price;
  
  // Monthly cost is based on PURCHASED seats, not used seats
  const monthlyCost = purchasedSeats * pricePerSeat;

  // Transform agents to fix Supabase join type and include pool video URLs
  const transformedAgents = (agents ?? []).map(agent => ({
    ...agent,
    user: Array.isArray(agent.user) ? agent.user[0] : agent.user,
    agent_pool_members: (agent.agent_pool_members ?? []).map((m: { 
      id: string; 
      pool: unknown;
      priority_rank?: number;
      wave_video_url: string | null;
      intro_video_url: string | null;
      loop_video_url: string | null;
    }) => ({
      ...m,
      pool: Array.isArray(m.pool) ? m.pool[0] : m.pool,
    })),
  }));

  // Check if current user is already an active agent
  const isCurrentUserAgent = agents?.some(a => a.user_id === auth!.user.id) ?? false;

  return (
    <AgentsClient
      agents={transformedAgents as unknown as Parameters<typeof AgentsClient>[0]["agents"]}
      pools={pools ?? []}
      agentStats={agentStats}
      organizationId={auth!.organization.id}
      pendingInvites={pendingInvites ?? []}
      currentUserId={auth!.user.id}
      currentUserName={auth!.profile.full_name}
      isCurrentUserAgent={isCurrentUserAgent}
      billingInfo={{
        usedSeats,
        purchasedSeats,
        availableSeats,
        activeAgents: activeAgentCount,
        pendingInvites: pendingAgentInviteCount,
        pricePerSeat,
        monthlyCost,
      }}
    />
  );
}
