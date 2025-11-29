import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { PublicFeedbackClient } from "./public-feedback-client";

export default async function PublicFeedbackPage() {
  const auth = await getCurrentUser();

  if (!auth) {
    redirect("/login");
  }

  return (
    <PublicFeedbackClient
      userId={auth.profile.id}
      isAdmin={auth.isAdmin}
    />
  );
}

