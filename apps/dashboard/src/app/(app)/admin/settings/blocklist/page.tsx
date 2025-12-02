import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { BlocklistSettingsClient } from "./blocklist-settings-client";
import type { CountryListMode } from "@ghost-greeter/domain/database.types";

export default async function BlocklistSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  // Try to fetch with blocked_countries and country_list_mode columns
  let blockedCountries: string[] = [];
  let countryListMode: CountryListMode = "blocklist";
  
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, blocked_countries, country_list_mode")
    .eq("id", auth.organization.id)
    .single();

  if (error) {
    // If the columns don't exist yet (migration not run), just use defaults
    // The columns will be created when the migration runs
    console.log("Note: country list columns may not exist yet. Using defaults.");
    blockedCountries = [];
    countryListMode = "blocklist";
  } else if (organization) {
    blockedCountries = organization.blocked_countries || [];
    countryListMode = (organization.country_list_mode as CountryListMode) || "blocklist";
  }

  return (
    <BlocklistSettingsClient
      orgId={auth.organization.id}
      initialBlockedCountries={blockedCountries}
      initialMode={countryListMode}
    />
  );
}
