import { supabase, isSupabaseConfigured } from "./supabase.js";

/**
 * Track a widget pageview (popup shown to visitor)
 * This is called when the widget state changes from "hidden" to "open"
 * 
 * NOTE: agentId can be null when no agents are available - this tracks
 * "missed opportunities" where visitors came but couldn't connect.
 */
export async function recordPageview(data: {
  visitorId: string;
  agentId: string | null;
  orgId: string;
  pageUrl: string;
  poolId?: string | null;
  visitorCountryCode?: string | null;
  triggerDelaySeconds?: number; // Widget trigger delay when this pageview was recorded
}): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[PageviewLogger] Supabase not configured, skipping pageview log");
    return null;
  }

  try {
    let organizationId: string;
    
    if (data.agentId) {
      // Get organization_id from agent profile
      const { data: agentProfile } = await supabase
        .from("agent_profiles")
        .select("organization_id")
        .eq("id", data.agentId)
        .single();

      if (!agentProfile) {
        console.warn(`[PageviewLogger] Agent profile not found for ${data.agentId}`);
        return null;
      }
      organizationId = agentProfile.organization_id;
    } else {
      // No agent available - use orgId directly (missed opportunity)
      organizationId = data.orgId;
    }

    const { data: pageview, error } = await supabase
      .from("widget_pageviews")
      .insert({
        organization_id: organizationId,
        pool_id: data.poolId ?? null,
        visitor_id: data.visitorId,
        page_url: data.pageUrl,
        agent_id: data.agentId, // Can be null - indicates no agent was available
        visitor_country_code: data.visitorCountryCode ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[PageviewLogger] Failed to record pageview:", error);
      return null;
    }

    const logType = data.agentId ? "pageview" : "missed_opportunity";
    console.log(`[PageviewLogger] Recorded ${logType} ${pageview.id} for visitor ${data.visitorId}`);
    return pageview.id;
  } catch (err) {
    console.error("[PageviewLogger] Error recording pageview:", err);
    return null;
  }
}

