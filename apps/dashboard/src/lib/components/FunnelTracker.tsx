"use client";

import { useEffect } from "react";
import { trackFunnelEvent } from "@/lib/funnel-tracking";

interface FunnelTrackerProps {
  step: string;
}

export function FunnelTracker({ step }: FunnelTrackerProps) {
  useEffect(() => {
    trackFunnelEvent(step);
  }, [step]);

  return null;
}

