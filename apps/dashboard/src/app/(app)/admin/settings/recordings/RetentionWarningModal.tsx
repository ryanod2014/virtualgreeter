"use client";

import { useState } from "react";
import {
  X,
  AlertTriangle,
  Loader2,
  XCircle,
  Video,
} from "lucide-react";

interface RetentionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  oldRetentionDays: number;
  newRetentionDays: number;
  affectedCount: number;
}

export function RetentionWarningModal({
  isOpen,
  onClose,
  onConfirm,
  oldRetentionDays,
  newRetentionDays,
  affectedCount,
}: RetentionWarningModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isConfirmValid = confirmText === "DELETE";

  const handleConfirm = async () => {
    if (!isConfirmValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm();
      handleClose();
    } catch (err) {
      console.error("Failed to confirm deletion:", err);
      setError("Failed to trigger deletion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const getRetentionLabel = (days: number) => {
    if (days === -1) return "Forever";
    if (days === 365) return "1 year";
    return `${days} days`;
  };

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
              <h2 className="text-xl font-semibold">Retention Policy Change</h2>
              <p className="text-sm text-muted-foreground">
                Confirm deletion of old recordings
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Retention Change Summary */}
          <div className="mb-6 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Current retention:</span>
                <span className="ml-2 font-medium">{getRetentionLabel(oldRetentionDays)}</span>
              </div>
              <div className="text-muted-foreground">→</div>
              <div>
                <span className="text-muted-foreground">New retention:</span>
                <span className="ml-2 font-medium text-primary">{getRetentionLabel(newRetentionDays)}</span>
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="mb-6 p-6 rounded-xl bg-red-500/10 border-2 border-red-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-600 mb-2">
                  ⚠️ This Will Delete {affectedCount} Recording{affectedCount !== 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Reducing your retention period from{" "}
                  <strong className="text-foreground">{getRetentionLabel(oldRetentionDays)}</strong> to{" "}
                  <strong className="text-foreground">{getRetentionLabel(newRetentionDays)}</strong> will
                  immediately delete <strong className="text-foreground">{affectedCount}</strong>{" "}
                  existing recording{affectedCount !== 1 ? "s" : ""} that {affectedCount !== 1 ? "are" : "is"} older than{" "}
                  {getRetentionLabel(newRetentionDays)}.
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>This action is IRREVERSIBLE</strong> — deleted recordings cannot be recovered
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>Transcriptions will also be deleted</strong> — including AI summaries
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      <strong>Call logs will remain</strong> — only video/audio files are removed
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <Video className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-600 font-medium">
                      If you need to keep older recordings, cancel this change and export them first,
                      or keep your current retention period.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE in all caps"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            {confirmText && !isConfirmValid && (
              <p className="mt-2 text-sm text-red-500">
                Please type exactly "DELETE" in all capital letters
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              {error}
            </div>
          )}

          {/* Audit Note */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600">
              <strong>Note:</strong> This deletion will be logged for audit purposes, including
              the number of recordings deleted and who triggered the change.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting {affectedCount} Recording{affectedCount !== 1 ? "s" : ""}...
              </>
            ) : (
              <>
                Delete {affectedCount} Recording{affectedCount !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
