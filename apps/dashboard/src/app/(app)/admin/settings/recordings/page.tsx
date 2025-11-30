import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { RecordingSettingsClient } from "./recording-settings-client";

export default async function RecordingSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, recording_settings")
    .eq("id", auth.organization.id)
    .single();

  if (!organization) redirect("/admin");

  const defaultSettings = {
    enabled: false,
    retention_days: 30,
    transcription_enabled: false,
    ai_summary_enabled: false,
    ai_summary_prompt_format: null,
  };

  return (
    <RecordingSettingsClient
      organizationId={organization.id}
      initialSettings={{ ...defaultSettings, ...organization.recording_settings }}
    />
  );
}

