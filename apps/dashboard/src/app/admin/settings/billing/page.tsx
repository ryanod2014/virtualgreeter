import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { BillingSettingsClient } from "./billing-settings-client";

export default async function BillingSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  // Get ACTIVE user count from agent_profiles (includes both admins and agents)
  // All users get an agent_profile upon creation (via trigger or invite acceptance)
  const { count: activeUserCount } = await supabase
    .from("agent_profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organization.id)
    .eq("is_active", true);

  // Get pending invite count
  const { count: pendingInviteCount } = await supabase
    .from("invites")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organization.id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  // Total billable seats = active users (from agent_profiles) + pending invites
  const totalSeats = (activeUserCount ?? 0) + (pendingInviteCount ?? 0);

  // Get recording storage usage using storage API
  // Recordings are stored with path: {org_id}/{callLogId}_{timestamp}.webm
  const { data: storageFiles } = await supabase.storage
    .from("recordings")
    .list(auth.organization.id, {
      limit: 10000, // Get all files (adjust if needed)
    });

  // Calculate total storage in bytes, then convert to GB
  let totalStorageBytes = 0;
  if (storageFiles) {
    for (const file of storageFiles) {
      // Supabase storage list returns metadata with size
      const size = (file.metadata as { size?: number })?.size ?? 0;
      totalStorageBytes += size;
    }
  }
  const storageUsedGB = totalStorageBytes / (1024 * 1024 * 1024); // Convert bytes to GB

  // Use organization created_at as subscription start date (in production, get from Stripe)
  const subscriptionStartDate = new Date(auth.organization.created_at);

  return (
    <BillingSettingsClient
      organization={auth.organization}
      agentCount={totalSeats}
      storageUsedGB={storageUsedGB}
      userId={auth.user.id}
      subscriptionStartDate={subscriptionStartDate}
    />
  );
}
