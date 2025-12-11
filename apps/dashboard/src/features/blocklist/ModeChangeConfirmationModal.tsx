"use client";

import { AlertTriangle, X, RefreshCw } from "lucide-react";

interface ModeChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  countryCount: number;
  fromMode: "blocklist" | "allowlist";
  toMode: "blocklist" | "allowlist";
}

export function ModeChangeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  countryCount,
  fromMode,
  toMode,
}: ModeChangeConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Confirm Mode Change</h2>
              <p className="text-sm text-muted-foreground">
                This will clear your country list
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Box */}
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-muted-foreground">
              Switching from{" "}
              <span className="font-semibold text-foreground">
                {fromMode === "blocklist" ? "Blocklist" : "Allowlist"}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {toMode === "blocklist" ? "Blocklist" : "Allowlist"}
              </span>{" "}
              mode will clear your current list of{" "}
              <span className="font-semibold text-foreground">
                {countryCount}
              </span>{" "}
              {countryCount === 1 ? "country" : "countries"}.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            You&apos;ll need to select new countries after switching modes. Do you want to continue?
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Confirm Switch
          </button>
        </div>
      </div>
    </div>
  );
}
