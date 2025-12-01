import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { OrganizationSettingsClient } from "./organization-settings-client";

export default async function OrganizationSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  return (
    <OrganizationSettingsClient
      organization={auth.organization}
      user={auth.profile}
    />
  );
}

