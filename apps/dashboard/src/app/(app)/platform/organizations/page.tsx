import { createClient } from "@/lib/supabase/server";
import { OrganizationsClient } from "./organizations-client";

export default async function PlatformOrganizationsPage() {
  const supabase = await createClient();

  // Fetch all organizations with aggregated stats
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      plan,
      subscription_status,
      seat_count,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching organizations:", error);
  }

  // Get user counts per org
  const { data: userCounts } = await supabase
    .from("users")
    .select("organization_id");

  // Get agent counts per org
  const { data: agentCounts } = await supabase
    .from("agent_profiles")
    .select("organization_id")
    .eq("is_active", true);

  // Get call counts per org (total and this month)
  const { data: callCounts } = await supabase.from("call_logs").select("organization_id, created_at");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build org stats
  const orgStats = (organizations ?? []).map((org) => {
    const userCount = userCounts?.filter((u) => u.organization_id === org.id).length ?? 0;
    const agentCount = agentCounts?.filter((a) => a.organization_id === org.id).length ?? 0;
    const orgCalls = callCounts?.filter((c) => c.organization_id === org.id) ?? [];
    const totalCalls = orgCalls.length;
    const callsThisMonth = orgCalls.filter(
      (c) => new Date(c.created_at) >= startOfMonth
    ).length;

    // Calculate last activity (most recent call or updated_at)
    const lastCallDate = orgCalls.length > 0
      ? Math.max(...orgCalls.map((c) => new Date(c.created_at).getTime()))
      : null;
    const lastActivity = lastCallDate
      ? new Date(lastCallDate).toISOString()
      : org.updated_at;

    return {
      ...org,
      userCount,
      agentCount,
      totalCalls,
      callsThisMonth,
      lastActivity,
    };
  });

  return <OrganizationsClient organizations={orgStats} />;
}

