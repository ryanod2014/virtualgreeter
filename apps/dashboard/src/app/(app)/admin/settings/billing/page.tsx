import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { BillingSettingsClient } from "./billing-settings-client";

export default async function BillingSettingsPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (!auth.isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  // Get ACTIVE agent count from agent_profiles
  const { count: activeAgentCount } = await supabase
    .from("agent_profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organization.id)
    .eq("is_active", true);

  // Get pending agent invite count (agents use seats)
  const { count: pendingAgentInviteCount } = await supabase
    .from("invites")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organization.id)
    .eq("role", "agent")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  // PRE-PAID SEATS MODEL:
  // usedSeats = active agents + pending agent invites
  // purchasedSeats = org.seat_count (what they're paying for, set in funnel)
  const usedSeats = (activeAgentCount ?? 0) + (pendingAgentInviteCount ?? 0);
  const purchasedSeats = auth.organization.seat_count ?? Math.max(usedSeats, 1);

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

  // Get AI usage for current billing period (this month)
  // Note: usage_records table is created by migration - may not exist yet
  const billingPeriodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let transcriptionCost = 0;
  let transcriptionMinutes = 0;
  let summaryCost = 0;
  let summaryMinutes = 0;
  
  try {
    const { data: usageRecords } = await supabase
      .from("usage_records")
      .select("usage_type, cost, duration_seconds")
      .eq("organization_id", auth.organization.id)
      .gte("created_at", billingPeriodStart.toISOString());

    // Calculate AI costs
    const transcriptionUsage = usageRecords?.filter(u => u.usage_type === "transcription") ?? [];
    const summaryUsage = usageRecords?.filter(u => u.usage_type === "ai_summary") ?? [];
    
    transcriptionCost = transcriptionUsage.reduce((sum, u) => sum + (u.cost || 0), 0);
    transcriptionMinutes = transcriptionUsage.reduce((sum, u) => sum + ((u.duration_seconds || 0) / 60), 0);
    summaryCost = summaryUsage.reduce((sum, u) => sum + (u.cost || 0), 0);
    summaryMinutes = summaryUsage.reduce((sum, u) => sum + ((u.duration_seconds || 0) / 60), 0);
  } catch {
    // Table doesn't exist yet - migration not run
  }

  // Use organization created_at as subscription start date (in production, get from Stripe)
  const subscriptionStartDate = new Date(auth.organization.created_at);

  return (
    <BillingSettingsClient
      organization={auth.organization}
      usedSeats={usedSeats}
      purchasedSeats={purchasedSeats}
      storageUsedGB={storageUsedGB}
      userId={auth.user.id}
      subscriptionStartDate={subscriptionStartDate}
      aiUsage={{
        transcriptionCost,
        transcriptionMinutes,
        summaryCost,
        summaryMinutes,
      }}
    />
  );
}
