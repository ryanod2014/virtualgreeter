import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { DispositionsClient } from "./dispositions-client";

export default async function DispositionsSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  const { data: dispositions } = await supabase
    .from("dispositions")
    .select("*")
    .eq("organization_id", auth.organization.id)
    .order("display_order");

  // Ensure backwards compatibility if migration hasn't been applied yet
  const normalizedDispositions = (dispositions ?? []).map((d) => ({
    ...d,
    value: d.value ?? null,
  }));

  return (
    <DispositionsClient
      dispositions={normalizedDispositions}
      organizationId={auth.organization.id}
    />
  );
}

