import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { AgentsClient } from "./agents-client";
import { PRICING } from "@/lib/stripe";
import { calculateHourlyCoverage, calculateDailyHourlyCoverage } from "@/lib/stats/coverage-stats";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}

export default async function AgentsPage({ searchParams }: Props) {
  const auth = await getCurrentUser();
  const supabase = await createClient();
  const params = await searchParams;

  // Date range parsing (default: last 30 days)
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const toDate = params.to ? parseLocalDate(params.to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  const fromDate = params.from
    ? parseLocalDate(params.from)
    : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
  fromDate.setHours(0, 0, 0, 0);

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
    .select("id, email, full_name, role, expires_at, created_at, email_status")
    .eq("organization_id", auth!.organization.id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  // Fetch call stats for agents in date range
  const { data: callStats } = await supabase
    .from("call_logs")
    .select("agent_id, pool_id, status, duration_seconds")
    .eq("organization_id", auth!.organization.id)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

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

  // Calculate org-wide call metrics for staffing recommendations
  const totalRings = callStats?.length ?? 0;
  const completedCalls = callStats?.filter(c => c.status === "completed") ?? [];
  const totalCompletedDuration = completedCalls.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0);
  const avgCallDurationSeconds = completedCalls.length > 0 
    ? totalCompletedDuration / completedCalls.length 
    : 180; // Default to 3 minutes if no data

  // Fetch organization's blocklist settings for filtering coverage data
  const { data: orgSettings } = await supabase
    .from("organizations")
    .select("blocked_countries, country_list_mode")
    .eq("id", auth!.organization.id)
    .single();

  const blockedCountries = (orgSettings?.blocked_countries as string[]) || [];
  const countryListMode = (orgSettings?.country_list_mode as "blocklist" | "allowlist") || "blocklist";

  // Fetch pageview data for coverage calculation (with country code and pool for filtering)
  // Note: visitor_country_code may not exist yet if migration hasn't run - query gracefully handles this
  const { data: rawPageviews, error: pageviewError } = await supabase
    .from("widget_pageviews")
    .select("id, agent_id, pool_id, created_at, visitor_country_code")
    .eq("organization_id", auth!.organization.id)
    .gte("created_at", fromDate.toISOString())
    .lte("created_at", toDate.toISOString());

  // If query failed (likely missing column), retry without the new column
  let pageviewsData = rawPageviews;
  if (pageviewError) {
    console.warn("[AgentsPage] Pageview query failed, retrying without visitor_country_code:", pageviewError.message);
    const { data: fallbackPageviews } = await supabase
      .from("widget_pageviews")
      .select("id, agent_id, pool_id, created_at")
      .eq("organization_id", auth!.organization.id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString());
    pageviewsData = fallbackPageviews?.map(p => ({ ...p, visitor_country_code: null })) ?? [];
  }

  // Filter pageviews based on blocklist/allowlist settings
  const pageviews = (pageviewsData ?? []).filter((pv) => {
    if (blockedCountries.length === 0) return true;
    
    const countryCode = pv.visitor_country_code?.toUpperCase() ?? null;
    const isInList = countryCode ? blockedCountries.some(c => c.toUpperCase() === countryCode) : false;
    
    if (countryListMode === "allowlist") {
      return isInList || !countryCode;
    } else {
      return !isInList;
    }
  });

  // Fetch agent sessions for hourly coverage calculation
  const { data: sessionsForCoverage } = await supabase
    .from("agent_sessions")
    .select("started_at, ended_at")
    .eq("organization_id", auth!.organization.id)
    .or(`and(started_at.lte.${toDate.toISOString()},or(ended_at.gte.${fromDate.toISOString()},ended_at.is.null))`);

  // Calculate hourly coverage statistics
  const hourlyCoverage = calculateHourlyCoverage(
    pageviews.map(p => ({ created_at: p.created_at, agent_id: p.agent_id })),
    sessionsForCoverage ?? [],
    fromDate,
    toDate
  );

  // Calculate daily-hourly coverage for day-of-week breakdown
  const dailyHourlyCoverage = calculateDailyHourlyCoverage(
    pageviews.map(p => ({ created_at: p.created_at, agent_id: p.agent_id })),
    sessionsForCoverage ?? [],
    fromDate,
    toDate
  );

  // Calculate ring rate: rings / covered pageviews (pageviews when agent was online)
  const coveredPageviews = pageviews.filter(p => p.agent_id !== null).length;
  const ringRate = coveredPageviews > 0 ? totalRings / coveredPageviews : 0.15; // Default 15% if no data

  // Calculate pool-level coverage stats
  const poolStats: Record<string, { 
    poolId: string; 
    poolName: string;
    totalPageviews: number; 
    coveredPageviews: number; 
    missedPageviews: number;
    totalRings: number;
  }> = {};
  
  // Initialize pool stats from pools list
  pools?.forEach(pool => {
    poolStats[pool.id] = {
      poolId: pool.id,
      poolName: pool.name,
      totalPageviews: 0,
      coveredPageviews: 0,
      missedPageviews: 0,
      totalRings: 0,
    };
  });

  // Aggregate pageview stats by pool
  pageviews.forEach(pv => {
    const poolId = pv.pool_id;
    if (poolId && poolStats[poolId]) {
      poolStats[poolId].totalPageviews++;
      if (pv.agent_id) {
        poolStats[poolId].coveredPageviews++;
      } else {
        poolStats[poolId].missedPageviews++;
      }
    }
  });

  // Aggregate call stats by pool
  callStats?.forEach(call => {
    const poolId = call.pool_id;
    if (poolId && poolStats[poolId]) {
      poolStats[poolId].totalRings++;
    }
  });

  // Find pools that need coverage (have missed pageviews)
  const poolsNeedingCoverage = Object.values(poolStats)
    .filter(p => p.missedPageviews > 0)
    .sort((a, b) => b.missedPageviews - a.missedPageviews);

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
  const billingFrequency = (auth!.organization.billing_frequency ?? 'monthly') as keyof typeof PRICING;
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
      hourlyCoverage={hourlyCoverage}
      dailyHourlyCoverage={dailyHourlyCoverage}
      dateRange={{ from: fromDate.toISOString(), to: toDate.toISOString() }}
      staffingMetrics={{
        ringRate,
        avgCallDurationSeconds,
        poolsNeedingCoverage,
      }}
    />
  );
}
