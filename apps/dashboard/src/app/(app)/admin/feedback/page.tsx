import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { FeedbackPageClient } from "./feedback-page-client";

export default async function AdminFeedbackPage() {
  const auth = await getCurrentUser();

  if (!auth) {
    redirect("/login");
  }

  if (!auth.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <FeedbackPageClient
      organizationId={auth.organization.id}
      userId={auth.profile.id}
      isAdmin={true}
    />
  );
}

