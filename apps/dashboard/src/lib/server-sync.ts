/**
 * Server Sync Utilities
 * 
 * These functions sync configuration changes from the dashboard to the signaling server.
 * When pool configurations or agent memberships change, we need to notify the server
 * so it can update its in-memory routing tables.
 */

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER ?? "http://localhost:3001";

interface PoolRule {
  id: string;
  poolId: string;
  domainPattern: string;
  pathPattern: string;
  conditions: unknown[];
  priority: number;
  isActive: boolean;
}

interface OrgConfigPayload {
  orgId: string;
  defaultPoolId: string | null;
  pathRules: PoolRule[];
}

interface AgentPoolsPayload {
  agentId: string;
  poolIds: string[];
}

/**
 * Sync organization routing configuration to the signaling server
 * Call this when pool routing rules are created/updated/deleted
 */
export async function syncOrgConfig(config: OrgConfigPayload): Promise<boolean> {
  try {
    const response = await fetch(`${SIGNALING_SERVER}/api/config/org`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      console.error("[ServerSync] Failed to sync org config:", await response.text());
      return false;
    }

    console.log("[ServerSync] ✅ Org config synced successfully");
    return true;
  } catch (error) {
    console.error("[ServerSync] Error syncing org config:", error);
    return false;
  }
}

/**
 * Sync agent pool memberships to the signaling server
 * Call this when an agent is added/removed from pools
 */
export async function syncAgentPools(payload: AgentPoolsPayload): Promise<boolean> {
  try {
    const response = await fetch(`${SIGNALING_SERVER}/api/config/agent-pools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("[ServerSync] Failed to sync agent pools:", await response.text());
      return false;
    }

    console.log("[ServerSync] ✅ Agent pools synced successfully");
    return true;
  } catch (error) {
    console.error("[ServerSync] Error syncing agent pools:", error);
    return false;
  }
}

/**
 * Fetch routing rules from database and sync to server
 * This is a helper function that bundles the database fetch with the server sync
 */
export async function syncOrgConfigFromDatabase(
  supabase: { from: (table: string) => unknown },
  orgId: string
): Promise<boolean> {
  try {
    // Fetch pools with their routing rules
    const { data: pools, error: poolsError } = await (supabase.from("agent_pools") as {
      select: (query: string) => { eq: (field: string, value: string) => Promise<{ data: unknown[]; error: unknown }> };
    })
      .select(`
        id,
        name,
        is_default,
        is_catch_all,
        pool_routing_rules(
          id,
          domain_pattern,
          path_pattern,
          conditions,
          priority,
          is_active
        )
      `)
      .eq("organization_id", orgId);

    if (poolsError) {
      console.error("[ServerSync] Failed to fetch pools:", poolsError);
      return false;
    }

    // Find default pool
    const typedPools = pools as Array<{
      id: string;
      is_catch_all: boolean;
      is_default: boolean;
      pool_routing_rules?: Array<{
        id: string;
        domain_pattern: string;
        path_pattern: string;
        conditions: unknown[];
        priority: number;
        is_active: boolean;
      }>;
    }>;
    
    const defaultPool = typedPools?.find((p) => p.is_catch_all || p.is_default);
    const defaultPoolId = defaultPool?.id ?? null;

    // Flatten all routing rules with pool_id
    const pathRules: PoolRule[] = typedPools?.flatMap((pool) =>
      (pool.pool_routing_rules || []).map((rule) => ({
        id: rule.id,
        poolId: pool.id,
        domainPattern: rule.domain_pattern,
        pathPattern: rule.path_pattern,
        conditions: rule.conditions || [],
        priority: rule.priority,
        isActive: rule.is_active,
      }))
    ) ?? [];

    return await syncOrgConfig({
      orgId,
      defaultPoolId,
      pathRules,
    });
  } catch (error) {
    console.error("[ServerSync] Error syncing from database:", error);
    return false;
  }
}

