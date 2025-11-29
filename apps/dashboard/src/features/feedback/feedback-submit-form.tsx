"use client";

import { useState } from "react";
import { Bug, Lightbulb, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FeedbackType } from "@ghost-greeter/domain/database.types";

interface FeedbackSubmitFormProps {
  organizationId: string;
  userId: string;
  type: FeedbackType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeedbackSubmitForm({
  organizationId,
  userId,
  type,
  onSuccess,
  onCancel,
}: FeedbackSubmitFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [useCase, setUseCase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const isBug = type === "bug";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError("Please fill in the required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get browser info for bug reports
      const browserInfo = isBug
        ? `${navigator.userAgent} | Screen: ${window.screen.width}x${window.screen.height}`
        : null;

      const { error: insertError } = await supabase
        .from("feedback_items")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          type,
          title: title.trim(),
          description: description.trim(),
          status: "open",
          priority: "medium",
          steps_to_reproduce: isBug ? stepsToReproduce.trim() || null : null,
          expected_behavior: isBug ? expectedBehavior.trim() || null : null,
          actual_behavior: isBug ? actualBehavior.trim() || null : null,
          browser_info: browserInfo,
          page_url: isBug ? pageUrl.trim() || null : null,
          use_case: !isBug ? useCase.trim() || null : null,
          admin_response: null,
          admin_responded_at: null,
          admin_responded_by: null,
        });

      if (insertError) throw insertError;

      // Reset form
      setTitle("");
      setDescription("");
      setStepsToReproduce("");
      setExpectedBehavior("");
      setActualBehavior("");
      setPageUrl("");
      setUseCase("");

      onSuccess?.();
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isBug ? "bg-red-500/10" : "bg-amber-500/10"}`}>
            {isBug ? (
              <Bug className="w-5 h-5 text-red-500" />
            ) : (
              <Lightbulb className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <h3 className="text-lg font-semibold">
            {isBug ? "Report a Bug" : "Request a Feature"}
          </h3>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isBug ? "Brief description of the bug" : "What feature would you like?"}
          className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
          maxLength={200}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            isBug
              ? "Describe the bug in detail..."
              : "Describe the feature and how it would help you..."
          }
          rows={4}
          className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
          required
        />
      </div>

      {/* Bug-specific fields */}
      {isBug && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Steps to Reproduce
            </label>
            <textarea
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Expected Behavior
              </label>
              <textarea
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="What should happen?"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Actual Behavior
              </label>
              <textarea
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                placeholder="What happened instead?"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Page URL
            </label>
            <input
              type="text"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="Where did this happen? (e.g., /admin/agents)"
              className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
            />
          </div>
        </>
      )}

      {/* Feature-specific fields */}
      {!isBug && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Use Case
          </label>
          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Describe a specific scenario where this feature would be helpful..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !description.trim()}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
    </form>
  );
}

