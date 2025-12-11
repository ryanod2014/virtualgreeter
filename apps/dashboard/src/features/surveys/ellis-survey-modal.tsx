"use client";

import { useState } from "react";
import { X, Loader2, Heart, Meh, Frown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DisappointmentLevel } from "@ghost-greeter/domain/database.types";

interface EllisSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole: string;
  organizationId: string;
  triggeredBy: string;
  pageUrl: string;
}

const DISAPPOINTMENT_OPTIONS: {
  value: DisappointmentLevel;
  label: string;
  description: string;
  icon: typeof Heart;
  color: string;
  bgColor: string;
}[] = [
  {
    value: "very_disappointed",
    label: "Very disappointed",
    description: "I rely on this daily",
    icon: Heart,
    color: "text-rose-500",
    bgColor: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30",
  },
  {
    value: "somewhat_disappointed",
    label: "Somewhat disappointed",
    description: "It's useful but not essential",
    icon: Meh,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30",
  },
  {
    value: "not_disappointed",
    label: "Not disappointed",
    description: "I could easily live without it",
    icon: Frown,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30",
  },
];

export function EllisSurveyModal({
  isOpen,
  onClose,
  userId,
  userRole,
  organizationId,
  triggeredBy,
  pageUrl,
}: EllisSurveyModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<DisappointmentLevel | null>(null);
  const [followUpText, setFollowUpText] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const handleSelectLevel = (level: DisappointmentLevel) => {
    setSelectedLevel(level);
    setShowFollowUp(true);
  };

  const handleSubmit = async () => {
    if (!selectedLevel) return;

    setIsSubmitting(true);

    try {
      // Insert survey response
      const { error: surveyError } = await supabase.from("pmf_surveys").insert({
        organization_id: organizationId,
        user_id: userId,
        user_role: userRole,
        disappointment_level: selectedLevel,
        follow_up_text: followUpText.trim() || null,
        triggered_by: triggeredBy,
        page_url: pageUrl,
        dismissed: false,
      });

      if (surveyError) {
        console.error("Survey submission error:", surveyError);
      }

      // Update or insert cooldown
      const { error: cooldownError } = await supabase.from("survey_cooldowns").upsert(
        {
          user_id: userId,
          last_survey_at: new Date().toISOString(),
          total_surveys: 1, // Will be incremented by trigger if exists
        },
        {
          onConflict: "user_id",
        }
      );

      if (cooldownError) {
        console.error("Cooldown update error:", cooldownError);
      }
    } catch (error) {
      console.error("Survey submission error:", error);
    } finally {
      setIsSubmitting(false);
      // Always close modal after submit attempt
      onClose();
    }
  };

  /**
   * Handles survey dismissal (Skip button, X button, or backdrop click).
   *
   * TKT-045: Sets disappointment_level to null instead of "not_disappointed"
   * to prevent dismissed surveys from skewing PMF data negatively.
   *
   * @remarks
   * - Dismissed surveys are excluded from PMF calculations via query filters
   * - Cooldown is still updated to prevent re-showing the survey
   */
  const handleDismiss = async () => {
    // Track dismissal
    try {
      await supabase.from("pmf_surveys").insert({
        organization_id: organizationId,
        user_id: userId,
        user_role: userRole,
<<<<<<< HEAD
        disappointment_level: null, // Null for dismissed to exclude from PMF calculation (TKT-045)
=======
        disappointment_level: null, // Null for dismissed to exclude from PMF calculation
>>>>>>> origin/agent/tkt-045
        follow_up_text: null,
        triggered_by: triggeredBy,
        page_url: pageUrl,
        dismissed: true,
      });

      // Update cooldown even for dismissals
      await supabase.from("survey_cooldowns").upsert(
        {
          user_id: userId,
          last_survey_at: new Date().toISOString(),
          total_surveys: 1,
        },
        {
          onConflict: "user_id",
        }
      );
    } catch (error) {
      console.error("Dismiss tracking error:", error);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop - only dismissible after selection */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={showFollowUp ? handleDismiss : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-semibold text-lg">Quick question</h3>
              </div>
              {/* Only show close button after user has selected an option */}
              {showFollowUp && (
                <button
                  onClick={handleDismiss}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Question */}
              <p className="text-lg font-medium mb-6 leading-relaxed">
                How would you feel if you could no longer use{" "}
                <span className="text-primary">GreetNow</span>?
              </p>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {DISAPPOINTMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedLevel === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelectLevel(option.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? `${option.bgColor} border-current ${option.color}`
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected ? option.bgColor : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${isSelected ? option.color : "text-muted-foreground"}`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${isSelected ? option.color : ""}`}>
                          {option.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {isSelected && (
                        <div className={`w-6 h-6 rounded-full ${option.color} bg-current/20 flex items-center justify-center`}>
                          <div className={`w-3 h-3 rounded-full bg-current`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Follow-up (appears after selection) */}
              {showFollowUp && (
                <div className="animate-in slide-in-from-bottom-2 duration-200">
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Why? <span className="font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="What's the main reason for your answer?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none text-sm"
                  />
                </div>
              )}
            </div>

        {/* Footer */}
        {showFollowUp && (
          <div className="flex justify-end gap-3 p-5 pt-0">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedLevel || isSubmitting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

