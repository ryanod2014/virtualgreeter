// Funnel tracking utilities

const VISITOR_ID_KEY = "gn_visitor_id";
const SESSION_ID_KEY = "gn_session_id";

// Get or create a persistent visitor ID
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

// Get or create a session ID (resets on browser close)
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// Get UTM parameters from URL
export function getUtmParams(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
  };
}

// Track a funnel event (pageview or conversion)
export async function trackFunnelEvent(
  step: string,
  options?: {
    value?: number;
    seats?: number;
    billing_type?: string;
    is_conversion?: boolean; // true = actual conversion, false = just pageview
  }
) {
  if (typeof window === "undefined") return;

  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const utmParams = getUtmParams();

  try {
    await fetch("/api/funnel/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_id: visitorId,
        session_id: sessionId,
        step,
        value: options?.value,
        seats: options?.seats,
        billing_type: options?.billing_type,
        is_conversion: options?.is_conversion ?? false,
        ...utmParams,
        page_url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
      }),
    });
  } catch (error) {
    console.error("Failed to track funnel event:", error);
  }
}

// Funnel step constants
export const FUNNEL_STEPS = {
  // Pageviews (someone landed on the page)
  LANDING: "landing",
  SIGNUP: "signup",
  PAYWALL: "paywall",
  SEATS: "seats",
  BILLING: "billing",
  DASHBOARD: "dashboard",                   // Reached the dashboard
  
  // Conversions (someone completed an action)
  SIGNUP_COMPLETE: "signup_complete",      // Actually created account
  PAYWALL_COMPLETE: "paywall_complete",    // Actually entered card
  SEATS_COMPLETE: "seats_complete",        // Actually selected seats
  BILLING_ANNUAL: "billing_annual",        // Selected annual
  BILLING_MONTHLY: "billing_monthly",      // Selected monthly
  BILLING_6MONTH: "billing_6month",        // Selected 6-month downsell
  DASHBOARD_REACHED: "dashboard_reached",  // Actually reached dashboard (conversion)
} as const;
