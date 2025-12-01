import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      visitor_id, 
      session_id,
      step, 
      value, 
      seats, 
      billing_type,
      is_conversion,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      page_url,
      referrer,
      user_agent 
    } = body;

    if (!visitor_id || !step) {
      return NextResponse.json(
        { error: "visitor_id and step are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("funnel_events").insert({
      visitor_id,
      session_id,
      step,
      is_conversion: is_conversion ?? false,
      value: value || null,
      seats: seats || null,
      billing_type: billing_type || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      page_url: page_url || null,
      referrer: referrer || null,
      user_agent: user_agent || null,
    });

    if (error) {
      console.error("Failed to track funnel event:", error);
      return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Funnel tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
