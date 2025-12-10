"use client";

import { AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";

interface PaymentBlockerProps {
  isAdmin: boolean;
}

export function PaymentBlocker({ isAdmin }: PaymentBlockerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - non-dismissible */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Payment Required</h2>
              <p className="text-sm text-muted-foreground">
                Your account has a payment issue
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Box */}
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-muted-foreground mb-2">
              {isAdmin
                ? "Your subscription payment has failed. Please update your payment method to continue using the dashboard."
                : "Your organization's subscription payment has failed. Please contact your admin to resolve this issue."}
            </p>
          </div>

          {isAdmin ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                To continue using all features, please update your payment method in the billing settings.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                Only organization admins can update payment methods. Please reach out to your admin to resolve this payment issue.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
            <Link
              href="/admin/settings/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Update Payment Method
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
