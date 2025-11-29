import { createClient } from "@/lib/supabase/server";
import { CancellationsClient } from "./cancellations-client";

export default async function PlatformCancellationsPage() {
  const supabase = await createClient();

  // Fetch all cancellation feedback with organization info
  const { data: cancellations, error } = await supabase
    .from("cancellation_feedback")
    .select(`
      id,
      organization_id,
      user_id,
      primary_reason,
      additional_reasons,
      detailed_feedback,
      competitor_name,
      would_return,
      return_conditions,
      agent_count,
      monthly_cost,
      subscription_duration_days,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching cancellations:", error);
  }

  // Get organization details including signup date for cohort analysis
  const orgIds = [...new Set(cancellations?.map((c) => c.organization_id) ?? [])];
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, plan, created_at")
    .in("id", orgIds);

  const orgMap = new Map(organizations?.map((o) => [o.id, o]) ?? []);

  // Get user details
  const userIds = [...new Set(cancellations?.map((c) => c.user_id) ?? [])];
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

  // Get total org count for churn rate calculation
  const { count: totalOrgs } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true });

  // Get total active MRR
  const { data: activeOrgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("subscription_status", "active");

  // Add org and user details to cancellations
  const cancellationsWithDetails = (cancellations ?? []).map((item) => {
    const org = orgMap.get(item.organization_id);
    const user = userMap.get(item.user_id);
    return {
      ...item,
      organization_name: org?.name ?? "Unknown",
      organization_plan: org?.plan ?? "free",
      organization_signup_date: org?.created_at ?? item.created_at,
      user_email: user?.email ?? "Unknown",
      user_name: user?.full_name ?? "Unknown",
    };
  });

  return (
    <CancellationsClient
      cancellations={cancellationsWithDetails}
      totalOrganizations={totalOrgs ?? 0}
      activeOrganizations={activeOrgs?.length ?? 0}
    />
  );
}

