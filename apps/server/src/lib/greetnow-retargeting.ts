/**
 * GreetNow Retargeting Pixel Integration
 * 
 * Fires GreetNow's own Facebook pixel via Conversions API for widget visitors.
 * This is used to retarget visitors who saw/used the widget with ads promoting GreetNow.
 * 
 * Two audience types:
 * - ALL visitors: Base events fired for every widget interaction
 * - B2B visitors: Additional events fired for orgs marked as business owners
 * 
 * SEPARATE from customers' facebook_settings which fires on dispositions.
 */

import crypto from "crypto";
import { supabase, isSupabaseConfigured } from "./supabase.js";
import type { GreetNowFacebookPixelSettings } from "@ghost-greeter/domain/database.types";

const FB_CAPI_URL = "https://graph.facebook.com/v18.0";

// Cache for pixel settings and org B2B status
interface PixelSettingsCache {
  settings: GreetNowFacebookPixelSettings | null;
  expiresAt: number;
}

interface OrgB2BCache {
  isB2B: boolean;
  expiresAt: number;
}

let pixelSettingsCache: PixelSettingsCache | null = null;
const orgB2BCache = new Map<string, OrgB2BCache>();

// Cache TTLs
const PIXEL_SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ORG_B2B_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Hash data for Facebook (required for user matching)
 */
function hashSHA256(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

/**
 * Get GreetNow's Facebook pixel settings from platform_settings table
 */
async function getPixelSettings(): Promise<GreetNowFacebookPixelSettings | null> {
  // Check cache first
  if (pixelSettingsCache && pixelSettingsCache.expiresAt > Date.now()) {
    return pixelSettingsCache.settings;
  }

  if (!isSupabaseConfigured || !supabase) {
    console.log("[GreetNowRetargeting] Supabase not configured");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "greetnow_facebook_pixel")
      .single();

    if (error || !data) {
      console.log("[GreetNowRetargeting] No pixel settings found:", error?.message);
      pixelSettingsCache = { settings: null, expiresAt: Date.now() + PIXEL_SETTINGS_CACHE_TTL };
      return null;
    }

    const settings = data.value as GreetNowFacebookPixelSettings;
    pixelSettingsCache = { settings, expiresAt: Date.now() + PIXEL_SETTINGS_CACHE_TTL };
    return settings;
  } catch (err) {
    console.error("[GreetNowRetargeting] Error fetching pixel settings:", err);
    return null;
  }
}

/**
 * Check if an organization is marked as B2B (business owner visitors)
 */
async function isB2BOrg(orgId: string): Promise<boolean> {
  // Check cache first
  const cached = orgB2BCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.isB2B;
  }

  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("greetnow_retargeting_enabled")
      .eq("id", orgId)
      .single();

    if (error || !data) {
      orgB2BCache.set(orgId, { isB2B: false, expiresAt: Date.now() + ORG_B2B_CACHE_TTL });
      return false;
    }

    // greetnow_retargeting_enabled now means "this is a B2B org"
    const isB2B = data.greetnow_retargeting_enabled === true;
    orgB2BCache.set(orgId, { isB2B, expiresAt: Date.now() + ORG_B2B_CACHE_TTL });
    return isB2B;
  } catch (err) {
    console.error("[GreetNowRetargeting] Error checking org B2B status:", err);
    return false;
  }
}

/**
 * Send event to Facebook Conversions API
 */
async function sendToFacebookCAPI(
  settings: GreetNowFacebookPixelSettings,
  event: {
    event_name: string;
    event_time: number;
    event_source_url: string;
    event_id: string;
    user_data: {
      client_ip_address?: string;
      client_user_agent?: string;
      external_id?: string;
    };
    custom_data?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (!settings.pixel_id || !settings.access_token) {
    return false;
  }

  try {
    const apiUrl = `${FB_CAPI_URL}/${settings.pixel_id}/events`;
    
    const payload: {
      data: typeof event[];
      access_token: string;
      test_event_code?: string;
    } = {
      data: [event],
      access_token: settings.access_token,
    };

    // Include test event code if configured (for debugging in FB Events Manager)
    if (settings.test_event_code) {
      payload.test_event_code = settings.test_event_code;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GreetNowRetargeting] CAPI error:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("[GreetNowRetargeting] ✅ Event sent:", event.event_name, result);
    return true;
  } catch (err) {
    console.error("[GreetNowRetargeting] Failed to send event:", err);
    return false;
  }
}

/**
 * Track when a visitor sees the widget popup (WidgetView event)
 * 
 * Fires TWO audiences:
 * - GreetNow_WidgetView: ALL visitors (for broad retargeting)
 * - GreetNow_WidgetView_B2B: Only B2B org visitors (for targeted "business owner" retargeting)
 */
export async function trackWidgetView(data: {
  orgId: string;
  visitorId: string;
  pageUrl: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  // Get pixel settings
  const settings = await getPixelSettings();
  if (!settings?.enabled || !settings.pixel_id || !settings.access_token) {
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const baseEventId = `gn_widgetview_${data.visitorId}_${eventTime}`;

  // 1. Fire base event for ALL visitors
  await sendToFacebookCAPI(settings, {
    event_name: "GreetNow_WidgetView",
    event_time: eventTime,
    event_source_url: data.pageUrl,
    event_id: baseEventId,
    user_data: {
      client_ip_address: data.ipAddress,
      client_user_agent: data.userAgent,
      external_id: hashSHA256(data.visitorId),
    },
    custom_data: {
      content_name: "GreetNow Widget",
      content_category: "Widget Impression",
    },
  });

  // 2. Check if this is a B2B org and fire additional event
  const isB2B = await isB2BOrg(data.orgId);
  if (isB2B) {
    const b2bEventId = `gn_widgetview_b2b_${data.visitorId}_${eventTime}`;
    await sendToFacebookCAPI(settings, {
      event_name: "GreetNow_WidgetView_B2B",
      event_time: eventTime,
      event_source_url: data.pageUrl,
      event_id: b2bEventId,
      user_data: {
        client_ip_address: data.ipAddress,
        client_user_agent: data.userAgent,
        external_id: hashSHA256(data.visitorId),
      },
      custom_data: {
        content_name: "GreetNow Widget",
        content_category: "B2B Widget Impression",
      },
    });
  }
}

/**
 * Track when a visitor starts a call (CallStarted event)
 * 
 * Fires TWO audiences:
 * - GreetNow_CallStarted + Lead: ALL visitors who had a conversation
 * - GreetNow_CallStarted_B2B: Only B2B org visitors (business owners who had a conversation)
 */
export async function trackCallStarted(data: {
  orgId: string;
  visitorId: string;
  callId: string;
  agentId: string;
  pageUrl: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  // Get pixel settings
  const settings = await getPixelSettings();
  if (!settings?.enabled || !settings.pixel_id || !settings.access_token) {
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const baseEventId = `gn_callstarted_${data.callId}_${eventTime}`;

  // 1. Fire base CallStarted event for ALL visitors
  await sendToFacebookCAPI(settings, {
    event_name: "GreetNow_CallStarted",
    event_time: eventTime,
    event_source_url: data.pageUrl,
    event_id: baseEventId,
    user_data: {
      client_ip_address: data.ipAddress,
      client_user_agent: data.userAgent,
      external_id: hashSHA256(data.visitorId),
    },
    custom_data: {
      content_name: "GreetNow Call",
      content_category: "Call Conversion",
      call_id: data.callId,
    },
  });

  // 2. Fire standard Lead event for ALL visitors (for easier FB optimization)
  const leadEventId = `gn_lead_${data.callId}_${eventTime}`;
  await sendToFacebookCAPI(settings, {
    event_name: "Lead",
    event_time: eventTime,
    event_source_url: data.pageUrl,
    event_id: leadEventId,
    user_data: {
      client_ip_address: data.ipAddress,
      client_user_agent: data.userAgent,
      external_id: hashSHA256(data.visitorId),
    },
    custom_data: {
      content_name: "GreetNow Call Started",
      content_category: "Video Call",
    },
  });

  // 3. Check if this is a B2B org and fire additional B2B-specific event
  const isB2B = await isB2BOrg(data.orgId);
  if (isB2B) {
    const b2bEventId = `gn_callstarted_b2b_${data.callId}_${eventTime}`;
    await sendToFacebookCAPI(settings, {
      event_name: "GreetNow_CallStarted_B2B",
      event_time: eventTime,
      event_source_url: data.pageUrl,
      event_id: b2bEventId,
      user_data: {
        client_ip_address: data.ipAddress,
        client_user_agent: data.userAgent,
        external_id: hashSHA256(data.visitorId),
      },
      custom_data: {
        content_name: "GreetNow Call",
        content_category: "B2B Call Conversion",
        call_id: data.callId,
      },
    });
  }
}

/**
 * Clear caches (useful for testing or when settings change)
 */
export function clearRetargetingCaches(): void {
  pixelSettingsCache = null;
  orgB2BCache.clear();
  console.log("[GreetNowRetargeting] Caches cleared");
}

