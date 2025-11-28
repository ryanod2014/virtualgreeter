import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { BlocklistSettingsClient } from "./blocklist-settings-client";

export default async function BlocklistSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  // Try to fetch with blocked_countries column
  let blockedCountries: string[] = [];
  
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, blocked_countries")
    .eq("id", auth.organization.id)
    .single();

  if (error) {
    // If the column doesn't exist yet (migration not run), just use empty array
    // The column will be created when the migration runs
    console.log("Note: blocked_countries column may not exist yet. Using empty array.");
    blockedCountries = [];
  } else if (organization) {
    blockedCountries = organization.blocked_countries || [];
  }

  return (
    <BlocklistSettingsClient
      orgId={auth.organization.id}
      initialBlockedCountries={blockedCountries}
    />
  );
}

