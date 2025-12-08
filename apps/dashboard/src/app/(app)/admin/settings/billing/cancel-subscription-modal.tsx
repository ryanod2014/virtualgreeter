"use client";

import { useState } from "react";
import {
  X,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Puzzle,
  Users,
  UserX,
  UsersRound,
  TrendingDown,
  PiggyBank,
  Wrench,
  HelpCircle,
  Building2,
  MessageSquare,
  Loader2,
  Check,
} from "lucide-react";
import type { CancellationReason } from "@ghost-greeter/domain/database.types";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CancellationData) => Promise<void>;
  organizationName: string;
  agentCount: number;
  monthlyTotal: number;
}

export interface CancellationData {
  primaryReason: CancellationReason;
  additionalReasons: CancellationReason[];
  detailedFeedback: string;
  competitorName: string;
  wouldReturn: boolean | null;
  returnConditions: string;
}

const CANCELLATION_REASONS: {
  value: CancellationReason;
  label: string;
  description: string;
  icon: typeof DollarSign;
}[] = [
  {
    value: "reps_not_using",
    label: "Reps Aren't Using It",
    description: "Our team isn't adopting the tool",
    icon: UserX,
  },
  {
    value: "not_enough_reps",
    label: "Not Enough Reps",
    description: "We don't have staff to answer calls",
    icon: UsersRound,
  },
  {
    value: "low_website_traffic",
    label: "Low Website Traffic",
    description: "Not enough visitors to justify the cost",
    icon: TrendingDown,
  },
  {
    value: "low_roi_per_call",
    label: "Low ROI Per Call",
    description: "Calls don't generate enough revenue",
    icon: PiggyBank,
  },
  {
    value: "too_expensive",
    label: "Too Expensive",
    description: "The pricing doesn't fit our budget",
    icon: DollarSign,
  },
  {
    value: "not_enough_features",
    label: "Missing Features",
    description: "It doesn't have features we need",
    icon: Puzzle,
  },
  {
    value: "switched_to_competitor",
    label: "Switching to Competitor",
    description: "We found a better alternative",
    icon: Users,
  },
  {
    value: "technical_issues",
    label: "Technical Issues",
    description: "We experienced bugs or performance problems",
    icon: Wrench,
  },
  {
    value: "difficult_to_use",
    label: "Difficult to Use",
    description: "The product was too complex or confusing",
    icon: HelpCircle,
  },
  {
    value: "business_closed",
    label: "Business Closed",
    description: "We're shutting down or restructuring",
    icon: Building2,
  },
  {
    value: "other",
    label: "Other Reason",
    description: "Something else not listed here",
    icon: MessageSquare,
  },
];

type Step = "reason" | "details" | "confirm";

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onSubmit,
  organizationName,
  agentCount,
  monthlyTotal,
}: CancelSubscriptionModalProps) {
  const [step, setStep] = useState<Step>("reason");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Form state
  const [primaryReason, setPrimaryReason] = useState<CancellationReason | null>(null);
  const [additionalReasons, setAdditionalReasons] = useState<CancellationReason[]>([]);
  const [detailedFeedback, setDetailedFeedback] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [returnConditions, setReturnConditions] = useState("");

  const handleToggleAdditionalReason = (reason: CancellationReason) => {
    if (reason === primaryReason) return;
    setAdditionalReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (!primaryReason) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        primaryReason,
        additionalReasons,
        detailedFeedback,
        competitorName,
        wouldReturn,
        returnConditions,
      });
      setIsComplete(true);
    } catch (error) {
      console.error("Failed to submit cancellation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setStep("reason");
    setPrimaryReason(null);
    setAdditionalReasons([]);
    setDetailedFeedback("");
    setCompetitorName("");
    setWouldReturn(null);
    setReturnConditions("");
    setIsComplete(false);
    onClose();
  };

  if (!isOpen) return null;

  const selectedReasonData = CANCELLATION_REASONS.find((r) => r.value === primaryReason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {isComplete ? "Subscription Cancelled" : "Cancel Subscription"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isComplete
                  ? "Thank you for your feedback"
                  : `${organizationName} • ${agentCount} agent${agentCount !== 1 ? "s" : ""} • $${monthlyTotal}/mo`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        {!isComplete && (
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {(["reason", "details", "confirm"] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : (["reason", "details", "confirm"] as Step[]).indexOf(step) > i
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {(["reason", "details", "confirm"] as Step[]).indexOf(step) > i ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-sm hidden sm:block ${
                      step === s ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {s === "reason" && "Select Reason"}
                    {s === "details" && "Details"}
                    {s === "confirm" && "Confirm"}
                  </span>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-0.5 rounded ${
                        (["reason", "details", "confirm"] as Step[]).indexOf(step) > i
                          ? "bg-green-500"
                          : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Completion Screen */}
          {isComplete && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">We&apos;re sorry to see you go</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your subscription has been cancelled. Your access will continue until the end of
                your current billing period.
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you for your honest feedback — it helps us improve GreetNow for everyone.
              </p>
            </div>
          )}

          {/* Step 1: Primary Reason Selection */}
          {step === "reason" && !isComplete && (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">
                  What&apos;s the main reason you&apos;re cancelling?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your feedback helps us improve our product for everyone.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CANCELLATION_REASONS.map((reason) => {
                  const Icon = reason.icon;
                  const isSelected = primaryReason === reason.value;

                  return (
                    <button
                      key={reason.value}
                      onClick={() => setPrimaryReason(reason.value)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                          {reason.label}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {reason.description}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === "details" && !isComplete && (
            <div className="space-y-6">
              {/* Primary reason reminder */}
              {selectedReasonData && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <selectedReasonData.icon className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-sm text-muted-foreground">Primary reason: </span>
                    <span className="font-medium">{selectedReasonData.label}</span>
                  </div>
                </div>
              )}

              {/* Additional reasons */}
              <div>
                <h3 className="text-lg font-medium mb-2">Any other contributing factors?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select all that apply (optional)
                </p>
                <div className="flex flex-wrap gap-2">
                  {CANCELLATION_REASONS.filter((r) => r.value !== primaryReason).map((reason) => {
                    const isSelected = additionalReasons.includes(reason.value);
                    return (
                      <button
                        key={reason.value}
                        onClick={() => handleToggleAdditionalReason(reason.value)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        {reason.label}
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Competitor name (if switching) */}
              {(primaryReason === "switched_to_competitor" ||
                additionalReasons.includes("switched_to_competitor")) && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Which service are you switching to?
                  </label>
                  <input
                    type="text"
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    placeholder="e.g., Intercom, Drift, Zendesk..."
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}

              {/* Detailed feedback */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tell us more about your experience
                  <span className="text-muted-foreground font-normal ml-1">(required)</span>
                </label>
                <textarea
                  value={detailedFeedback}
                  onChange={(e) => setDetailedFeedback(e.target.value)}
                  placeholder="What could we have done better? What features were missing? Any specific issues you encountered?"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Please be as detailed as possible — this directly informs our product decisions.
                </p>
              </div>

              {/* Would return? */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Would you consider using GreetNow again in the future?
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWouldReturn(true)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-center transition-all ${
                      wouldReturn === true
                        ? "border-green-500 bg-green-500/10 text-green-600"
                        : "border-border hover:border-green-500/50"
                    }`}
                  >
                    Yes, possibly
                  </button>
                  <button
                    onClick={() => setWouldReturn(false)}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 text-center transition-all ${
                      wouldReturn === false
                        ? "border-red-500 bg-red-500/10 text-red-600"
                        : "border-border hover:border-red-500/50"
                    }`}
                  >
                    Probably not
                  </button>
                </div>
              </div>

              {/* Return conditions */}
              {wouldReturn === true && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What would bring you back?
                  </label>
                  <textarea
                    value={returnConditions}
                    onChange={(e) => setReturnConditions(e.target.value)}
                    placeholder="e.g., Lower pricing, specific features, better integrations..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && !isComplete && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-amber-500/20">
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-600 mb-2">
                      Data Retention Notice
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your data will be retained for 30 days after cancellation, then may be permanently deleted.
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      The following data will be affected:
                    </p>
                    <ul className="text-sm space-y-2.5">
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>All call recordings</strong> — every video call you&apos;ve saved</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Call logs & history</strong> — your complete call activity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Analytics & stats</strong> — all performance data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Agent configurations</strong> — videos, settings, pool assignments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Routing rules</strong> — all your custom setup</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-600 font-medium">
                        You can resubscribe within 30 days to retain your data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback summary */}
              <div className="p-4 rounded-xl bg-muted/50">
                <h4 className="text-sm font-medium mb-3">Your feedback summary:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">Primary reason:</span>
                    <span className="font-medium">{selectedReasonData?.label}</span>
                  </div>
                  {additionalReasons.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">Also mentioned:</span>
                      <span>
                        {additionalReasons
                          .map((r) => CANCELLATION_REASONS.find((cr) => cr.value === r)?.label)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {detailedFeedback && (
                    <div className="pt-2 border-t border-border mt-2">
                      <span className="text-muted-foreground">Details: </span>
                      <span className="italic">&ldquo;{detailedFeedback}&rdquo;</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isComplete && (
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
            <div>
              {step !== "reason" && (
                <button
                  onClick={() =>
                    setStep(step === "confirm" ? "details" : "reason")
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Keep Subscription
              </button>

              {step === "reason" && (
                <button
                  onClick={() => setStep("details")}
                  disabled={!primaryReason}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === "details" && (
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!detailedFeedback.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step === "confirm" && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Subscription"
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer for complete state */}
        {isComplete && (
          <div className="flex justify-center p-6 border-t border-border">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

