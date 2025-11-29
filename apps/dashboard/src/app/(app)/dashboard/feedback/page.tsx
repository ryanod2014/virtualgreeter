import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { FeedbackPageClient } from "./feedback-page-client";

export default async function AgentFeedbackPage() {
  const auth = await getCurrentUser();

  if (!auth) {
    redirect("/login");
  }

  return (
    <FeedbackPageClient
      organizationId={auth.organization.id}
      userId={auth.profile.id}
      isAdmin={auth.isAdmin}
    />
  );
}

