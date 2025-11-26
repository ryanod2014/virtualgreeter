import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { SiteSetupClient } from "./site-setup-client";

export default async function SitesPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch sites with path rules
  const { data: sites } = await supabase
    .from("sites")
    .select("*, site_path_rules(*)")
    .eq("organization_id", auth!.organization.id)
    .order("created_at", { ascending: false });

  // Fetch agent pools with members
  const { data: pools } = await supabase
    .from("agent_pools")
    .select("*, agent_pool_members(*, agent_profile:agent_profiles(id, display_name, user_id))")
    .eq("organization_id", auth!.organization.id)
    .order("is_default", { ascending: false });

  // Fetch all agents for assignment
  const { data: agents } = await supabase
    .from("agent_profiles")
    .select("id, display_name, user_id, status")
    .eq("organization_id", auth!.organization.id)
    .order("display_name");

  return (
    <SiteSetupClient
      sites={sites ?? []}
      pools={pools ?? []}
      agents={agents ?? []}
      organizationId={auth!.organization.id}
    />
  );
}
