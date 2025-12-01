"use client";

import { useEffect, useRef } from "react";
import { trackFunnelEvent, FUNNEL_STEPS } from "@/lib/funnel-tracking";

export function DashboardTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per session
    if (tracked.current) return;
    tracked.current = true;

    // Track dashboard pageview
    trackFunnelEvent(FUNNEL_STEPS.DASHBOARD);

    // Track dashboard reached conversion (user made it through the funnel)
    trackFunnelEvent(FUNNEL_STEPS.DASHBOARD_REACHED, { is_conversion: true });
  }, []);

  return null;
}

