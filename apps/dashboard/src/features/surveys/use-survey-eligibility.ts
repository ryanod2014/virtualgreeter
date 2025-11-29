"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface SurveyEligibilityParams {
  userId: string;
  userCreatedAt: string;
}

interface EligibilityResult {
  isEligible: boolean;
  reason: string | null;
  isLoading: boolean;
}

// Configuration
const MIN_DAYS_SINCE_SIGNUP = 14; // Wait 14 days before first survey
const MIN_COMPLETED_CALLS = 2; // Must have at least 2 completed calls
const MIN_DAYS_SINCE_LAST_SURVEY = 90; // Don't survey again for 90 days
const MAX_DAYS_SINCE_ACTIVITY = 14; // Must have been active in last 14 days

export function useSurveyEligibility({
  userId,
  userCreatedAt,
}: SurveyEligibilityParams): EligibilityResult {
  const [isEligible, setIsEligible] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const checkEligibility = useCallback(async () => {
    try {
      // Check 1: User has been signed up for at least MIN_DAYS_SINCE_SIGNUP days
      const signupDate = new Date(userCreatedAt);
      const daysSinceSignup = Math.floor(
        (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceSignup < MIN_DAYS_SINCE_SIGNUP) {
        setReason(`User signed up ${daysSinceSignup} days ago (need ${MIN_DAYS_SINCE_SIGNUP})`);
        setIsEligible(false);
        setIsLoading(false);
        return;
      }

      // Check 2: User hasn't been surveyed recently
      const { data: cooldown } = await supabase
        .from("survey_cooldowns")
        .select("last_survey_at")
        .eq("user_id", userId)
        .single();

      if (cooldown?.last_survey_at) {
        const lastSurveyDate = new Date(cooldown.last_survey_at);
        const daysSinceLastSurvey = Math.floor(
          (Date.now() - lastSurveyDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastSurvey < MIN_DAYS_SINCE_LAST_SURVEY) {
          setReason(`Last survey was ${daysSinceLastSurvey} days ago (need ${MIN_DAYS_SINCE_LAST_SURVEY})`);
          setIsEligible(false);
          setIsLoading(false);
          return;
        }
      }

      // Check 3: User has completed at least MIN_COMPLETED_CALLS calls
      const { count: callCount } = await supabase
        .from("call_logs")
        .select("id", { count: "exact", head: true })
        .or(`agent_id.eq.${userId}`)
        .eq("status", "completed");

      if ((callCount ?? 0) < MIN_COMPLETED_CALLS) {
        setReason(`User has ${callCount ?? 0} completed calls (need ${MIN_COMPLETED_CALLS})`);
        setIsEligible(false);
        setIsLoading(false);
        return;
      }

      // Check 4: User has been active recently
      const { data: recentActivity } = await supabase
        .from("call_logs")
        .select("created_at")
        .or(`agent_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (recentActivity?.created_at) {
        const lastActivityDate = new Date(recentActivity.created_at);
        const daysSinceActivity = Math.floor(
          (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceActivity > MAX_DAYS_SINCE_ACTIVITY) {
          setReason(`Last activity was ${daysSinceActivity} days ago (max ${MAX_DAYS_SINCE_ACTIVITY})`);
          setIsEligible(false);
          setIsLoading(false);
          return;
        }
      }

      // All checks passed
      setReason(null);
      setIsEligible(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking survey eligibility:", error);
      setReason("Error checking eligibility");
      setIsEligible(false);
      setIsLoading(false);
    }
  }, [userId, userCreatedAt, supabase]);

  useEffect(() => {
    if (userId) {
      checkEligibility();
    }
  }, [userId, checkEligibility]);

  return { isEligible, reason, isLoading };
}

