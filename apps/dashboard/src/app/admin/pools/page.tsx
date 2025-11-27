import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { PoolsClient } from "./pools-client";

export default async function PoolsPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch pools with routing rules and members
  const { data: pools } = await supabase
    .from("agent_pools")
    .select(`
      *,
      pool_routing_rules(*),
      agent_pool_members(
        id,
        agent_profile_id,
        agent_profiles(id, display_name)
      )
    `)
    .eq("organization_id", auth!.organization.id)
    .order("is_catch_all", { ascending: false })
    .order("created_at", { ascending: true });

  // Fetch all agents for the organization
  const { data: agents } = await supabase
    .from("agent_profiles")
    .select("id, display_name")
    .eq("organization_id", auth!.organization.id)
    .order("display_name", { ascending: true });

  // Calculate visitor counts per PATH in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: callLogs } = await supabase
    .from("call_logs")
    .select("page_url")
    .eq("organization_id", auth!.organization.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .not("page_url", "is", null);

  // Count visitors per path
  const pathVisitorMap = new Map<string, number>();
  callLogs?.forEach((log) => {
    if (!log.page_url) return;
    try {
      const url = new URL(log.page_url);
      const path = url.pathname;
      pathVisitorMap.set(path, (pathVisitorMap.get(path) || 0) + 1);
    } catch {
      // Skip invalid URLs
    }
  });

  // Convert to array sorted by visitor count (most popular first)
  const pathsWithVisitors = Array.from(pathVisitorMap.entries())
    .map(([path, visitorCount]) => ({ path, visitorCount }))
    .sort((a, b) => b.visitorCount - a.visitorCount);

  return (
    <PoolsClient
      pools={pools ?? []}
      agents={agents ?? []}
      organizationId={auth!.organization.id}
      pathsWithVisitors={pathsWithVisitors}
    />
  );
}

