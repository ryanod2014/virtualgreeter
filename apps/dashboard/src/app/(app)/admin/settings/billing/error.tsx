"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Billing page error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-red-500/10">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Something went wrong loading billing settings
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

