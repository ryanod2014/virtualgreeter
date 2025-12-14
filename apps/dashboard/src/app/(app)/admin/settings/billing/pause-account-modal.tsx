"use client";

import { useState } from "react";
import {
  X,
  Snowflake,
  Check,
  Calendar,
  Shield,
  Eye,
  PlayCircle,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface PauseAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPause: (months: number, reason: string) => Promise<void>;
  onContinueToCancel: () => void;
  organizationName: string;
  agentCount: number;
  monthlyTotal: number;
}

const PAUSE_DURATION_OPTIONS = [
  {
    months: 1,
    label: "1 Month",
    description: "Quick break",
  },
  {
    months: 2,
    label: "2 Months",
    description: "Short hiatus",
  },
  {
    months: 3,
    label: "3 Months",
    description: "Extended pause",
  },
];

export function PauseAccountModal({
  isOpen,
  onClose,
  onPause,
  onContinueToCancel,
  organizationName,
  agentCount,
  monthlyTotal,
}: PauseAccountModalProps) {
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const resumeDate = new Date();
  resumeDate.setMonth(resumeDate.getMonth() + selectedMonths);

  const formatDateWithTimezone = (date: Date) => {
    // Format local time
    const localDateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const localTimeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const timezoneStr = date.toLocaleTimeString("en-US", {
      timeZoneName: "short",
    }).split(" ").pop(); // Extract timezone abbreviation (e.g., "PST")

    // Format UTC time
    const utcDateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    const utcTimeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });

    // Return both local and UTC for clarity
    return `${localDateStr} at ${localTimeStr} ${timezoneStr} (${utcDateStr} at ${utcTimeStr} UTC)`;
  };

  const handlePause = async () => {
    setIsSubmitting(true);
    try {
      await onPause(selectedMonths, reason);
      setIsComplete(true);
    } catch (error) {
      console.error("Failed to pause account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedMonths(1);
    setReason("");
    setIsComplete(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent" />
          
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Snowflake className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {isComplete ? "Account Paused" : "Wait — Need a Break Instead?"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isComplete
                    ? "Your account is now frozen"
                    : "Pause your account for free and keep all your data"}
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
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Completion Screen */}
          {isComplete && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Snowflake className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">You&apos;re all set!</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your account is now paused for {selectedMonths} month{selectedMonths > 1 ? "s" : ""}. 
                We&apos;ll keep all your data safe and email you before your subscription resumes.
              </p>
              
              <div className="bg-muted/50 rounded-xl p-4 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-sm mb-3">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">What happens next:</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>All your data is safely preserved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Email reminder 7 days before resume</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Resumes on<br />
                      <span className="font-medium">{formatDateWithTimezone(resumeDate)}</span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Pause Selection Screen */}
          {!isComplete && (
            <div className="space-y-6">
              {/* Free pause highlight */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Sparkles className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-600">Pause for Free</div>
                    <div className="text-sm text-muted-foreground">
                      Take a break without losing any of your recordings, call logs, stats, settings, or agent configurations.
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration selection */}
              <div>
                <label className="block text-sm font-medium mb-3">How long do you need?</label>
                <div className="grid grid-cols-3 gap-3">
                  {PAUSE_DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.months}
                      onClick={() => setSelectedMonths(option.months)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        selectedMonths === option.months
                          ? "border-blue-500 bg-blue-500/5"
                          : "border-border hover:border-blue-500/50 hover:bg-muted/50"
                      }`}
                    >
                      {selectedMonths === option.months && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-blue-500" />
                        </div>
                      )}
                      <div className={`text-lg font-semibold ${selectedMonths === option.months ? "text-blue-600" : ""}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* What's included */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  What&apos;s preserved while paused:
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>All call recordings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Call logs & history</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Analytics & stats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Agent configurations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Pool & routing rules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>One-click reactivation</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                  Widget will be hidden on your sites during pause
                </div>
              </div>

              {/* Reason (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Why are you pausing? <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Seasonal slowdown, budget review, testing other solutions..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
              </div>

              {/* Resume date info */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-1">
                  <PlayCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Your subscription will auto-resume on </span>
                  </div>
                </div>
                <div className="ml-8 text-sm font-medium mb-1">
                  {formatDateWithTimezone(resumeDate)}
                </div>
                <p className="text-xs text-muted-foreground ml-8">
                  Displaying your local timezone with UTC reference to avoid confusion. Your account will resume at exactly this time.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isComplete && (
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
            <button
              onClick={onContinueToCancel}
              className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              No, cancel and delete all my data
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handlePause}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pausing...
                </>
              ) : (
                <>
                  <Snowflake className="w-4 h-4" />
                  Pause for {selectedMonths} Month{selectedMonths > 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer for complete state */}
        {isComplete && (
          <div className="flex justify-center p-6 border-t border-border">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

