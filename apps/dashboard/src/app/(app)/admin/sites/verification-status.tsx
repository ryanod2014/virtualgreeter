"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VerificationStatusProps {
  organizationId: string;
  initialVerified?: boolean;
  initialVerifiedDomain?: string | null;
  initialDetectedSitesCount?: number;
  onVerificationChange?: (verified: boolean, domain: string | null) => void;
}

export function VerificationStatus({
  organizationId,
  initialVerified = false,
  initialVerifiedDomain = null,
  initialDetectedSitesCount = 0,
  onVerificationChange,
}: VerificationStatusProps) {
  const [isVerified, setIsVerified] = useState(initialVerified || initialDetectedSitesCount > 0);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(
    initialVerifiedDomain || null
  );
  const [pollingStopped, setPollingStopped] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const supabase = createClient();

  const checkVerification = useCallback(async () => {
    try {
      // Check both embed_verified_at flag AND pageviews
      const [orgResult, pageviewsResult] = await Promise.all([
        supabase
          .from("organizations")
          .select("embed_verified_at, embed_verified_domain")
          .eq("id", organizationId)
          .single(),
        supabase
          .from("widget_pageviews")
          .select("page_url")
          .eq("organization_id", organizationId)
          .limit(1),
      ]);

      // Verified if we have the flag OR any pageviews exist
      if (orgResult.data?.embed_verified_at) {
        setIsVerified(true);
        setVerifiedDomain(orgResult.data.embed_verified_domain);
        onVerificationChange?.(true, orgResult.data.embed_verified_domain);
        return true;
      } else if (pageviewsResult.data && pageviewsResult.data.length > 0) {
        // Extract domain from first pageview
        try {
          const url = new URL(pageviewsResult.data[0].page_url);
          setIsVerified(true);
          setVerifiedDomain(url.origin);
          onVerificationChange?.(true, url.origin);
          return true;
        } catch {
          setIsVerified(true);
          setVerifiedDomain(null);
          onVerificationChange?.(true, null);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking verification:", error);
      return false;
    }
  }, [organizationId, supabase, onVerificationChange]);

  // Manual check handler
  const handleManualCheck = async () => {
    setIsManualChecking(true);
    const verified = await checkVerification();
    setIsManualChecking(false);

    // If verified, polling will resume automatically via useEffect
    // If not verified, user can click again
    if (!verified) {
      // Reset polling stopped state to resume polling
      setPollingStopped(false);
    }
  };

  // Poll for verification status with exponential backoff
  useEffect(() => {
    if (isVerified || pollingStopped) return;

    let interval: NodeJS.Timeout;
    const startTime = Date.now();

    const setupNextPoll = () => {
      const elapsed = Date.now() - startTime;
      const elapsedMinutes = elapsed / 60000;

      let nextInterval: number;

      // Exponential backoff schedule:
      // 0-1 min: 5s intervals
      // 1-3 min: 10s intervals
      // 3-5 min: 30s intervals
      // 5-10 min: 60s intervals
      // >10 min: stop polling
      if (elapsedMinutes < 1) {
        nextInterval = 5000; // 5 seconds
      } else if (elapsedMinutes < 3) {
        nextInterval = 10000; // 10 seconds
      } else if (elapsedMinutes < 5) {
        nextInterval = 30000; // 30 seconds
      } else if (elapsedMinutes < 10) {
        nextInterval = 60000; // 60 seconds
      } else {
        // Stop polling after 10 minutes
        setPollingStopped(true);
        return;
      }

      interval = setInterval(async () => {
        await checkVerification();
        clearInterval(interval);
        setupNextPoll();
      }, nextInterval);
    };

    // Check immediately on mount
    checkVerification();

    // Start the polling cycle
    setupNextPoll();

    // Cleanup function
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVerified, pollingStopped, checkVerification]);

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="w-5 h-5" />
        <div>
          <span className="font-semibold">Installed</span>
          {verifiedDomain && (
            <span className="text-sm text-muted-foreground ml-2">
              on {verifiedDomain}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (pollingStopped) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">
          <span className="font-medium">Not detected yet</span>
          <p className="text-sm">The widget hasn't been detected on any pages.</p>
        </div>
        <button
          onClick={handleManualCheck}
          disabled={isManualChecking}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isManualChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Check again
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Waiting for installation...</span>
    </div>
  );
}
