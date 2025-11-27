import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { DispositionsClient } from "./dispositions-client";

export default async function DispositionsSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  // Fetch dispositions and org facebook settings in parallel
  const [dispositionsResult, orgResult] = await Promise.all([
    supabase
      .from("dispositions")
      .select("*")
      .eq("organization_id", auth.organization.id)
      .order("display_order"),
    supabase
      .from("organizations")
      .select("facebook_settings")
      .eq("id", auth.organization.id)
      .single(),
  ]);

  // Ensure backwards compatibility if migration hasn't been applied yet
  const normalizedDispositions = (dispositionsResult.data ?? []).map((d) => ({
    ...d,
    value: d.value ?? null,
  }));

  // Default facebook settings
  const defaultFbSettings = {
    pixel_id: null,
    capi_access_token: null,
    test_event_code: null,
    enabled: false,
    pixel_base_code: null,
    dataset_id: null,
  };

  const facebookSettings = orgResult.data?.facebook_settings ?? defaultFbSettings;

  return (
    <DispositionsClient
      dispositions={normalizedDispositions}
      organizationId={auth.organization.id}
      facebookSettings={facebookSettings}
    />
  );
}

