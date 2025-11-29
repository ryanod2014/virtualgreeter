"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { EllisSurveyModal } from "./ellis-survey-modal";
import { useSurveyEligibility } from "./use-survey-eligibility";
import type { User } from "@ghost-greeter/domain/database.types";

interface SurveyTriggerProps {
  user: User;
}

// Configuration for random trigger
const MIN_TRIGGER_DELAY_MS = 5 * 60 * 1000; // 5 minutes minimum
const MAX_TRIGGER_DELAY_MS = 20 * 60 * 1000; // 20 minutes maximum
const SESSION_STORAGE_KEY = "pmf_survey_shown_this_session";

export function SurveyTrigger({ user }: SurveyTriggerProps) {
  const [showSurvey, setShowSurvey] = useState(false);
  const [triggeredBy, setTriggeredBy] = useState("random");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  const { isEligible, isLoading } = useSurveyEligibility({
    userId: user.id,
    userCreatedAt: user.created_at,
  });

  useEffect(() => {
    // Don't set up trigger if already shown this session
    if (typeof window !== "undefined") {
      const alreadyShown = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (alreadyShown) return;
    }

    // Wait for eligibility check
    if (isLoading || !isEligible) return;

    // Set random delay
    const delay =
      MIN_TRIGGER_DELAY_MS + Math.random() * (MAX_TRIGGER_DELAY_MS - MIN_TRIGGER_DELAY_MS);

    timerRef.current = setTimeout(() => {
      setTriggeredBy("random");
      setShowSurvey(true);
      // Mark as shown for this session
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isEligible, isLoading]);

  const handleClose = () => {
    setShowSurvey(false);
  };

  // Don't render anything if not eligible
  if (!isEligible && !showSurvey) return null;

  return (
    <EllisSurveyModal
      isOpen={showSurvey}
      onClose={handleClose}
      userId={user.id}
      userRole={user.role}
      organizationId={user.organization_id}
      triggeredBy={triggeredBy}
      pageUrl={pathname}
    />
  );
}

