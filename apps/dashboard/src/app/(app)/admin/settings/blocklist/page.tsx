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

  // Try to fetch with blocked_countries, country_list_mode, and geo_failure_handling columns
  let blockedCountries: string[] = [];
  let countryListMode: CountryListMode = "blocklist";
  let geoFailureHandling: "allow" | "block" = "allow";

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, blocked_countries, country_list_mode, geo_failure_handling")
    .eq("id", auth.organization.id)
    .single();

  if (error) {
    // If the columns don't exist yet (migration not run), just use defaults
    // The columns will be created when the migration runs
    console.log("Note: country list columns may not exist yet. Using defaults.");
    blockedCountries = [];
    countryListMode = "blocklist";
    geoFailureHandling = "allow";
  } else if (organization) {
    blockedCountries = organization.blocked_countries || [];
    countryListMode = (organization.country_list_mode as CountryListMode) || "blocklist";
    geoFailureHandling = (organization.geo_failure_handling as "allow" | "block") || "allow";
  }

  return (
    <BlocklistSettingsClient
      orgId={auth.organization.id}
      initialBlockedCountries={blockedCountries}
      initialMode={countryListMode}
      initialGeoFailureHandling={geoFailureHandling}
    />
  );
}
