import { supabase, isSupabaseConfigured } from "./supabase.js";

/**
 * Track a widget pageview (popup shown to visitor)
 * This is called when the widget state changes from "hidden" to "open"
 */
export async function recordPageview(data: {
  visitorId: string;
  agentId: string;
  orgId: string;
  pageUrl: string;
  poolId?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) {
    console.log("[PageviewLogger] Supabase not configured, skipping pageview log");
    return null;
  }

  try {
    // First, get the agent's organization_id from their profile
    const { data: agentProfile } = await supabase
      .from("agent_profiles")
      .select("organization_id")
      .eq("id", data.agentId)
      .single();

    if (!agentProfile) {
      console.warn(`[PageviewLogger] Agent profile not found for ${data.agentId}`);
      return null;
    }

    const { data: pageview, error } = await supabase
      .from("widget_pageviews")
      .insert({
        organization_id: agentProfile.organization_id,
        pool_id: data.poolId ?? null,
        visitor_id: data.visitorId,
        page_url: data.pageUrl,
        agent_id: data.agentId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[PageviewLogger] Failed to record pageview:", error);
      return null;
    }

    console.log(`[PageviewLogger] Recorded pageview ${pageview.id} for visitor ${data.visitorId}`);
    return pageview.id;
  } catch (err) {
    console.error("[PageviewLogger] Error recording pageview:", err);
    return null;
  }
}

