import { createClient } from "@/lib/supabase/server";
import { FeedbackClient } from "./feedback-client";

export default async function PlatformFeedbackPage() {
  const supabase = await createClient();

  /**
   * Fetch all feedback items and PMF surveys in parallel.
   *
   * TKT-045: PMF surveys query excludes dismissed surveys and null disappointment_level
   * to ensure accurate PMF calculations. Dismissed surveys have null disappointment_level
   * set in ellis-survey-modal.tsx and are filtered here to prevent data skew.
   */
  const [feedbackResult, pmfSurveysResult] = await Promise.all([
    supabase
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
      .order("created_at", { ascending: false }),
    supabase
      .from("pmf_surveys")
      .select("*")
<<<<<<< HEAD
      .eq("dismissed", false) // Exclude explicitly dismissed surveys
      .not("disappointment_level", "is", null) // Exclude null responses (TKT-045)
=======
      .eq("dismissed", false)
      .not("disappointment_level", "is", null)
>>>>>>> origin/agent/tkt-045
      .order("created_at", { ascending: false }),
  ]);

  const feedbackItems = feedbackResult.data ?? [];
  const pmfSurveys = pmfSurveysResult.data ?? [];

  if (feedbackResult.error) {
    console.error("Error fetching feedback:", feedbackResult.error);
  }
  if (pmfSurveysResult.error) {
    console.error("Error fetching PMF surveys:", pmfSurveysResult.error);
  }

  // Get organization names and details
  const feedbackOrgIds = feedbackItems.map((f) => f.organization_id);
  const pmfOrgIds = pmfSurveys.map((s) => s.organization_id);
  const orgIds = Array.from(new Set([...feedbackOrgIds, ...pmfOrgIds]));
  
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, plan, subscription_status")
    .in("id", orgIds);

  const orgMap = new Map(organizations?.map((o) => [o.id, o]) ?? []);

  // Get user details
  const feedbackUserIds = feedbackItems.map((f) => f.user_id);
  const pmfUserIds = pmfSurveys.map((s) => s.user_id);
  const userIds = Array.from(new Set([...feedbackUserIds, ...pmfUserIds]));
  
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .in("id", userIds);

  const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

  // Add org and user details to feedback items
  const itemsWithDetails = feedbackItems.map((item) => {
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

  // Add org and user details to PMF surveys
  const surveysWithDetails = pmfSurveys.map((survey) => {
    const org = orgMap.get(survey.organization_id);
    const user = userMap.get(survey.user_id);
    return {
      ...survey,
      organization_name: org?.name ?? "Unknown",
      organization_plan: org?.plan ?? "free",
      organization_status: org?.subscription_status ?? "active",
      user_email: user?.email ?? "Unknown",
      user_name: user?.full_name ?? "Unknown",
    };
  });

  return <FeedbackClient feedbackItems={itemsWithDetails} pmfSurveys={surveysWithDetails} />;
}

