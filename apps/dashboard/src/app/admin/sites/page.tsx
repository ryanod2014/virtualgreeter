import { getCurrentUser } from "@/lib/auth/actions";
import { SiteSetupClient } from "./site-setup-client";

export default async function SitesPage() {
  const auth = await getCurrentUser();

  return (
    <SiteSetupClient
      organizationId={auth!.organization.id}
    />
  );
}
