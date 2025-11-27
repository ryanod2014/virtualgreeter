import { supabase, isSupabaseConfigured } from "./supabase.js";

export interface TokenVerificationResult {
  valid: boolean;
  userId?: string;
  agentProfileId?: string;
  organizationId?: string;
  error?: string;
}

/**
 * Verify an agent's Supabase JWT token and return their profile info
 * This ensures the agent is who they claim to be
 */
export async function verifyAgentToken(
  token: string,
  claimedAgentId: string
): Promise<TokenVerificationResult> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("[Auth] Supabase not configured - skipping token verification");
    // In dev without Supabase, allow all connections (trust the claimed ID)
    return { valid: true, agentProfileId: claimedAgentId };
  }

  try {
    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[Auth] Token verification failed:", authError?.message);
      return { valid: false, error: "Invalid or expired token" };
    }

    // Fetch the agent profile to verify the claimed agentId matches
    const { data: agentProfile, error: profileError } = await supabase
      .from("agent_profiles")
      .select("id, user_id, organization_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !agentProfile) {
      console.error("[Auth] Agent profile not found for user:", user.id);
      return { valid: false, error: "Agent profile not found" };
    }

    // Verify the claimed agentId matches the actual profile
    if (agentProfile.id !== claimedAgentId) {
      console.error("[Auth] Agent ID mismatch:", {
        claimed: claimedAgentId,
        actual: agentProfile.id,
      });
      return { valid: false, error: "Agent ID mismatch" };
    }

    console.log("[Auth] ✅ Token verified for agent:", agentProfile.id);
    return {
      valid: true,
      userId: user.id,
      agentProfileId: agentProfile.id,
      organizationId: agentProfile.organization_id,
    };
  } catch (err) {
    console.error("[Auth] Token verification error:", err);
    return { valid: false, error: "Token verification failed" };
  }
}

/**
 * Fetch the pool memberships for an agent
 * Returns array of pool IDs the agent belongs to
 */
export async function fetchAgentPoolMemberships(agentId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("[Auth] Supabase not configured - returning empty pool memberships");
    return [];
  }

  try {
    const { data: memberships, error } = await supabase
      .from("agent_pool_members")
      .select("pool_id")
      .eq("agent_profile_id", agentId);

    if (error) {
      console.error("[Auth] Failed to fetch pool memberships:", error);
      return [];
    }

    const poolIds = memberships?.map((m) => m.pool_id) ?? [];
    console.log(`[Auth] Agent ${agentId} belongs to ${poolIds.length} pools`);
    return poolIds;
  } catch (err) {
    console.error("[Auth] Pool memberships fetch error:", err);
    return [];
  }
}

/**
 * Fetch pool routing rules for an organization
 * Used to sync server-side routing configuration
 */
export async function fetchOrgRoutingConfig(orgId: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("[Auth] Supabase not configured - returning empty routing config");
    return { defaultPoolId: null, pathRules: [] };
  }

  try {
    // Fetch pools with their routing rules
    const { data: pools, error: poolsError } = await supabase
      .from("agent_pools")
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
      console.error("[Auth] Failed to fetch pools:", poolsError);
      return { defaultPoolId: null, pathRules: [] };
    }

    // Find default pool
    const defaultPool = pools?.find((p) => p.is_catch_all || p.is_default);
    const defaultPoolId = defaultPool?.id ?? null;

    // Flatten all routing rules with pool_id
    const pathRules = pools?.flatMap((pool) =>
      (pool.pool_routing_rules || []).map((rule: {
        id: string;
        domain_pattern: string;
        path_pattern: string;
        conditions: unknown[];
        priority: number;
        is_active: boolean;
      }) => ({
        id: rule.id,
        orgId,
        poolId: pool.id,
        domainPattern: rule.domain_pattern,
        pathPattern: rule.path_pattern,
        conditions: rule.conditions || [],
        priority: rule.priority,
        isActive: rule.is_active,
      }))
    ) ?? [];

    console.log(`[Auth] Loaded ${pathRules.length} routing rules for org ${orgId}`);
    return { defaultPoolId, pathRules };
  } catch (err) {
    console.error("[Auth] Routing config fetch error:", err);
    return { defaultPoolId: null, pathRules: [] };
  }
}

