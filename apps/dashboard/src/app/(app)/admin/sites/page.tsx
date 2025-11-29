import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { SiteSetupClient } from "./site-setup-client";

export default async function SitesPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch org default widget settings and embed verification status
  const { data: org } = await supabase
    .from("organizations")
    .select("default_widget_settings, embed_verified_at, embed_verified_domain")
    .eq("id", auth!.organization.id)
    .single();

  // Fetch unique detected domains from widget pageviews
  const { data: pageviews } = await supabase
    .from("widget_pageviews")
    .select("page_url, created_at")
    .eq("organization_id", auth!.organization.id)
    .order("created_at", { ascending: false });

  // Extract unique root domains with first/last seen dates
  const domainMap = new Map<string, { firstSeen: string; lastSeen: string; pageCount: number }>();
  
  for (const pv of pageviews ?? []) {
    try {
      const url = new URL(pv.page_url);
      const domain = url.origin; // e.g., "https://example.com"
      
      const existing = domainMap.get(domain);
      if (existing) {
        existing.pageCount++;
        // Update first/last seen
        if (pv.created_at < existing.firstSeen) existing.firstSeen = pv.created_at;
        if (pv.created_at > existing.lastSeen) existing.lastSeen = pv.created_at;
      } else {
        domainMap.set(domain, {
          firstSeen: pv.created_at,
          lastSeen: pv.created_at,
          pageCount: 1,
        });
      }
    } catch {
      // Skip invalid URLs
    }
  }

  const detectedSites = Array.from(domainMap.entries())
    .map(([domain, data]) => ({
      domain,
      ...data,
    }))
    .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

  const widgetSettings = org?.default_widget_settings ?? {
    size: "medium",
    position: "bottom-right",
    devices: "all",
    trigger_delay: 3,
    auto_hide_delay: null,
    show_minimize_button: false,
  };

  return (
    <SiteSetupClient
      organizationId={auth!.organization.id}
      initialWidgetSettings={widgetSettings}
      initialEmbedVerified={!!org?.embed_verified_at}
      initialVerifiedDomain={org?.embed_verified_domain}
      detectedSites={detectedSites}
    />
  );
}
