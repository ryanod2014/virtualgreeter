"use client";

import { useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  CreditCard,
  Shield,
  Loader2,
} from "lucide-react";

interface Agent {
  id: string;
  user_id: string;
  display_name: string;
  email?: string;
}

interface BillingInfo {
  purchasedSeats: number;
  usedSeats: number;
  pricePerSeat: number;
}

interface ReactivateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  agent: Agent | null;
  billingInfo: BillingInfo;
  error: string | null;
  currentUserId: string;
}

export function ReactivateAgentModal({
  isOpen,
  onClose,
  onConfirm,
  agent,
  billingInfo,
  error,
  currentUserId,
}: ReactivateAgentModalProps) {
  const [isReactivating, setIsReactivating] = useState(false);

  const wouldExceedPurchased = billingInfo.usedSeats >= billingInfo.purchasedSeats;

  const handleConfirm = async () => {
    setIsReactivating(true);
    try {
      await onConfirm();

      // Check if reactivating own account - if so, trigger reload
      if (agent?.user_id === currentUserId) {
        window.location.reload();
      }

      handleClose();
    } catch (error) {
      console.error("Failed to reactivate agent:", error);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleClose = () => {
    if (!isReactivating) {
      setIsReactivating(false);
      onClose();
    }
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center p-6 border-b border-border">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Reactivate Agent?
          </h3>
          <p className="text-sm text-muted-foreground">
            {agent.display_name} will be restored to your team and can take calls immediately.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Benefits Box */}
          <div className="p-4 rounded-xl bg-muted/30 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-foreground">Call history restored</strong>
                <p className="text-muted-foreground">All previous call logs and stats will be available.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-foreground">Billing seat used</strong>
                <p className="text-muted-foreground">
                  {wouldExceedPurchased
                    ? `This will increase your monthly cost by $${billingInfo.pricePerSeat}/month.`
                    : `You'll use 1 of your ${billingInfo.purchasedSeats} available seats.`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-foreground">Immediate access</strong>
                <p className="text-muted-foreground">Agent can log in and start taking calls right away.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
          <button
            onClick={handleClose}
            disabled={isReactivating}
            className="px-6 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isReactivating}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReactivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reactivate Agent
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
