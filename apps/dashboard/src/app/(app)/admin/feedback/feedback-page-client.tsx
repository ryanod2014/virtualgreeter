"use client";

import { FeedbackForum } from "@/features/feedback";

interface FeedbackPageClientProps {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
}

export function FeedbackPageClient({
  organizationId,
  userId,
  isAdmin,
}: FeedbackPageClientProps) {
  return (
    <FeedbackForum
      organizationId={organizationId}
      userId={userId}
      isAdmin={isAdmin}
    />
  );
}

