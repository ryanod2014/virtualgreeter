import { createClient } from "@/lib/supabase/server";
import { FeedbackClient } from "./feedback-client";

export default async function PlatformFeedbackPage() {
  const supabase = await createClient();

  // Fetch all feedback items with organization info
  const { data: feedbackItems, error } = await supabase
    .from("feedback_items")
    .select(`
      id,
      organization_id,
      user_id,
      type,
      title,
      description,
      status,
      priority,
      vote_count,
      comment_count,
      screenshot_url,
      recording_url,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching feedback:", error);
  }

  // Get organization names and details
  const orgIds = [...new Set(feedbackItems?.map((f) => f.organization_id) ?? [])];
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, plan, subscription_status")
    .in("id", orgIds);

  const orgMap = new Map(organizations?.map((o) => [o.id, o]) ?? []);

  // Get user details
  const userIds = [...new Set(feedbackItems?.map((f) => f.user_id) ?? [])];
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .in("id", userIds);

  const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

  // Add org and user details to feedback items
  const itemsWithDetails = (feedbackItems ?? []).map((item) => {
    const org = orgMap.get(item.organization_id);
    const user = userMap.get(item.user_id);
    return {
      ...item,
      organization_name: org?.name ?? "Unknown",
      organization_plan: org?.plan ?? "free",
      organization_status: org?.subscription_status ?? "active",
      user_email: user?.email ?? "Unknown",
      user_name: user?.full_name ?? "Unknown",
      user_role: user?.role ?? "agent",
    };
  });

  return <FeedbackClient feedbackItems={itemsWithDetails} />;
}

