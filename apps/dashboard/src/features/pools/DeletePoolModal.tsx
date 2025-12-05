"use client";

import { useState } from "react";
import {
  X,
  AlertTriangle,
  Trash2,
  Users,
  Route,
  Loader2,
} from "lucide-react";

interface DeletePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  poolName: string;
  agentCount: number;
  routingRulesCount: number;
}

export function DeletePoolModal({
  isOpen,
  onClose,
  onConfirm,
  poolName,
  agentCount,
  routingRulesCount,
}: DeletePoolModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText === poolName;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    try {
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error("Failed to delete pool:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setIsDeleting(false);
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
      <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Delete Pool</h2>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone
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
        <div className="p-6 space-y-6">
          {/* Warning Box */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-muted-foreground mb-4">
              You are about to delete the pool{" "}
              <span className="font-semibold text-foreground">&ldquo;{poolName}&rdquo;</span>.
              This will:
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <Users className="w-4 h-4 text-orange-500" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">{agentCount}</span>{" "}
                  {agentCount === 1 ? "agent" : "agents"} will be unassigned
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <Route className="w-4 h-4 text-red-500" />
                </div>
                <span>
                  <span className="font-semibold text-foreground">{routingRulesCount}</span>{" "}
                  routing {routingRulesCount === 1 ? "rule" : "rules"} will be deleted
                </span>
              </li>
            </ul>
          </div>

          {/* Confirmation Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Type <span className="font-semibold text-foreground">{poolName}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter pool name"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoComplete="off"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Pool
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
