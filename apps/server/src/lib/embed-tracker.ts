import { supabase, isSupabaseConfigured } from "./supabase.js";

/**
 * Record first successful widget embed for an organization.
 * Only updates if embed_verified_at is null (first time).
 *
 * @param orgId - Organization ID from widget config
 * @param pageUrl - Full page URL where widget loaded
 */
export async function recordEmbedVerification(
  orgId: string,
  pageUrl: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  try {
    // Extract domain from page URL
    const url = new URL(pageUrl);
    const domain = url.hostname;

    // Only update if not already verified (first time only)
    const { error } = await supabase
      .from("organizations")
      .update({
        embed_verified_at: new Date().toISOString(),
        embed_verified_domain: domain,
      })
      .eq("id", orgId)
      .is("embed_verified_at", null); // Only if not already set

    if (error) {
      // Only log actual errors, not "no rows updated"
      if (!error.message?.includes("0 rows")) {
        console.error("[EmbedTracker] Failed to record verification:", error);
      }
    } else {
      console.log(`[EmbedTracker] ✅ Embed verified for org ${orgId} on ${domain}`);
    }
  } catch (err) {
    console.error("[EmbedTracker] Error:", err);
  }
}

