import { createClient } from "@/lib/supabase/server";
import { RetargetingClient } from "./retargeting-client";
import type { GreetNowFacebookPixelSettings } from "@ghost-greeter/domain/database.types";

export default async function PlatformRetargetingPage() {
  const supabase = await createClient();

  // Fetch GreetNow's pixel settings
  const { data: pixelSettingsRow } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "greetnow_facebook_pixel")
    .single();

  const pixelSettings: GreetNowFacebookPixelSettings = pixelSettingsRow?.value ?? {
    enabled: false,
    pixel_id: null,
    access_token: null,
    test_event_code: null,
  };

  // Fetch all organizations with retargeting status
  const { data: organizations, error: orgsError } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      plan,
      subscription_status,
      greetnow_retargeting_enabled,
      created_at
    `)
    .order("name", { ascending: true });

  if (orgsError) {
    console.error("Error fetching organizations:", orgsError);
  }

  // Get call counts per org for context
  const { data: callCounts } = await supabase
    .from("call_logs")
    .select("organization_id, status");

  // Get pageview counts per org
  const { data: pageviewCounts } = await supabase
    .from("widget_pageviews")
    .select("organization_id");

  // Build org stats
  const orgsWithStats = (organizations ?? []).map((org) => {
    const orgCalls = callCounts?.filter((c) => c.organization_id === org.id) ?? [];
    const totalCalls = orgCalls.length;
    const completedCalls = orgCalls.filter((c) => c.status === "completed" || c.status === "accepted").length;
    const pageviews = pageviewCounts?.filter((p) => p.organization_id === org.id).length ?? 0;

    return {
      ...org,
      totalCalls,
      completedCalls,
      pageviews,
    };
  });

  // Count how many orgs have retargeting enabled
  const enabledCount = orgsWithStats.filter((o) => o.greetnow_retargeting_enabled).length;

  return (
    <RetargetingClient 
      pixelSettings={pixelSettings}
      organizations={orgsWithStats}
      enabledCount={enabledCount}
    />
  );
}

