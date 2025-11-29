"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bug, Lightbulb, Loader2, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FeedbackButtonsProps {
  organizationId: string;
  userId: string;
}

export function FeedbackButtons({ organizationId, userId }: FeedbackButtonsProps) {
  const [showBugModal, setShowBugModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const openBugReport = () => {
    setShowBugModal(true);
    setTitle("");
    setDescription("");
    setError(null);
  };

  const openFeatureRequests = () => {
    // Navigate to the public feature requests forum
    router.push("/feedback");
  };

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from("feedback_items")
        .insert({
          organization_id: organizationId,
          user_id: userId,
          type: "bug",
          title: title.trim(),
          description: description.trim(),
          status: "open",
          priority: "medium",
          page_url: pathname,
          browser_info: `${navigator.userAgent} | ${window.screen.width}x${window.screen.height}`,
          steps_to_reproduce: null,
          expected_behavior: null,
          actual_behavior: null,
          use_case: null,
          admin_response: null,
          admin_responded_at: null,
          admin_responded_by: null,
        });

      if (insertError) throw insertError;

      setShowBugModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {showSuccess && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-medium animate-in fade-in slide-in-from-right-2">
            <Check className="w-4 h-4" />
            Bug reported!
          </div>
        )}
        <button
          onClick={openBugReport}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-red-500/50 hover:bg-red-500/5 text-muted-foreground hover:text-red-500 transition-all shadow-lg"
          title="Report a Bug"
        >
          <Bug className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Report Bug</span>
        </button>
        <button
          onClick={openFeatureRequests}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-amber-500/50 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-500 transition-all shadow-lg"
          title="Request a Feature"
        >
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Request Feature</span>
        </button>
      </div>

      {/* Bug Report Modal */}
      {showBugModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBugModal(false)}
        >
          <div
            className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <Bug className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Report a Bug</h3>
                  <p className="text-xs text-muted-foreground">
                    Page: {pathname}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBugModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBug} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What&apos;s the issue?
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the bug"
                  className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Tell us more
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened? What were you trying to do?"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted/50 border border-border focus:border-primary outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBugModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Bug Report"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

