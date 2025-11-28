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
    />
  );
}
