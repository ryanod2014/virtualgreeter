import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/actions";
import crypto from "crypto";

// Facebook Conversion API endpoint
const FB_CAPI_URL = "https://graph.facebook.com/v18.0";

interface FacebookEventData {
  event_name: string;
  event_time: number;
  action_source: "website" | "phone_call" | "system_generated";
  user_data: {
    client_ip_address?: string;
    client_user_agent?: string;
    em?: string[]; // hashed email
    ph?: string[]; // hashed phone
    fn?: string; // hashed first name
    ln?: string; // hashed last name
    external_id?: string[];
    fbc?: string; // facebook click id
    fbp?: string; // facebook browser id
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    status?: string;
    [key: string]: unknown;
  };
  event_source_url?: string;
  event_id?: string;
}

interface CAPIRequestBody {
  dispositionId: string;
  callLogId: string;
  pageUrl?: string;
  visitorId?: string;
  userAgent?: string;
  clientIp?: string;
  // Optional Facebook browser cookies
  fbc?: string;
  fbp?: string;
}

// Hash function for Facebook user data (SHA-256, lowercase)
function hashForFacebook(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CAPIRequestBody = await request.json();
    const { dispositionId, callLogId, pageUrl, visitorId, userAgent, clientIp, fbc, fbp } = body;

    if (!dispositionId || !callLogId) {
      return NextResponse.json(
        { error: "dispositionId and callLogId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the disposition with FB event config
    const { data: disposition, error: dispError } = await supabase
      .from("dispositions")
      .select("*")
      .eq("id", dispositionId)
      .eq("organization_id", auth.organization.id)
      .single();

    if (dispError || !disposition) {
      return NextResponse.json(
        { error: "Disposition not found" },
        { status: 404 }
      );
    }

    // Check if FB event is enabled for this disposition
    if (!disposition.fb_event_enabled || !disposition.fb_event_name) {
      return NextResponse.json({
        success: true,
        fired: false,
        reason: "Facebook event not configured for this disposition",
      });
    }

    // Get organization's Facebook settings
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("facebook_settings")
      .eq("id", auth.organization.id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const fbSettings = org.facebook_settings as {
      pixel_id: string | null;
      capi_access_token: string | null;
      test_event_code: string | null;
      enabled: boolean;
      pixel_base_code: string | null;
      dataset_id: string | null;
    };

    // Check if Facebook is enabled and configured
    if (!fbSettings.enabled || !fbSettings.pixel_id || !fbSettings.capi_access_token) {
      return NextResponse.json({
        success: true,
        fired: false,
        reason: "Facebook integration not configured",
      });
    }

    // Fetch call log for additional context
    const { data: callLog } = await supabase
      .from("call_logs")
      .select("page_url, visitor_id, duration_seconds")
      .eq("id", callLogId)
      .single();

    // Build the event data
    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `${callLogId}_${dispositionId}_${eventTime}`;

    const eventData: FacebookEventData = {
      event_name: disposition.fb_event_name,
      event_time: eventTime,
      action_source: "phone_call", // Since this is from a video call
      user_data: {
        client_user_agent: userAgent || request.headers.get("user-agent") || undefined,
        client_ip_address: clientIp || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
        external_id: visitorId || callLog?.visitor_id ? [hashForFacebook(visitorId || callLog?.visitor_id)] : undefined,
        fbc: fbc || undefined,
        fbp: fbp || undefined,
      },
      event_source_url: pageUrl || callLog?.page_url || undefined,
      event_id: eventId,
    };

    // Add custom data if configured on the disposition
    if (disposition.fb_event_params || disposition.value) {
      eventData.custom_data = {
        ...(disposition.fb_event_params as Record<string, unknown> || {}),
      };
      
      // If disposition has a value, include it as the conversion value
      if (disposition.value != null) {
        eventData.custom_data.value = Number(disposition.value);
        eventData.custom_data.currency = eventData.custom_data.currency || "USD";
      }
    }

    // Build the API request
    const apiUrl = `${FB_CAPI_URL}/${fbSettings.pixel_id}/events`;
    
    const payload: { data: FacebookEventData[]; test_event_code?: string } = {
      data: [eventData],
    };

    // Add test event code if configured (for debugging)
    if (fbSettings.test_event_code) {
      payload.test_event_code = fbSettings.test_event_code;
    }

    console.log("[Facebook CAPI] Sending event:", {
      event_name: disposition.fb_event_name,
      event_id: eventId,
      pixel_id: fbSettings.pixel_id,
      has_test_code: !!fbSettings.test_event_code,
    });

    // Send to Facebook CAPI
    const response = await fetch(`${apiUrl}?access_token=${fbSettings.capi_access_token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[Facebook CAPI] Error response:", result);
      return NextResponse.json({
        success: false,
        fired: false,
        error: result.error?.message || "Failed to send event to Facebook",
      }, { status: 500 });
    }

    console.log("[Facebook CAPI] Success:", result);

    return NextResponse.json({
      success: true,
      fired: true,
      event_name: disposition.fb_event_name,
      event_id: eventId,
      events_received: result.events_received,
    });
  } catch (error) {
    console.error("[Facebook CAPI] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

