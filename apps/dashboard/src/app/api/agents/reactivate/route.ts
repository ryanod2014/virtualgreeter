import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { agentProfileId } = await request.json();

    if (!agentProfileId) {
      return NextResponse.json({ error: "Agent profile ID required" }, { status: 400 });
    }

    // Verify agent belongs to this org
    const { data: agent } = await supabase
      .from("agent_profiles")
      .select("id, user_id, organization_id, is_active, display_name")
      .eq("id", agentProfileId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.is_active) {
      return NextResponse.json({ error: "Agent is already active" }, { status: 400 });
    }

    // Reactivate the agent
    const { error: updateError } = await supabase
      .from("agent_profiles")
      .update({
        is_active: true,
        reactivated_at: new Date().toISOString(),
        reactivated_by: user.id,
        status: "offline", // Set to offline, they'll go online when they connect
        deactivated_at: null,
        deactivated_by: null,
      })
      .eq("id", agentProfileId);

    if (updateError) {
      console.error("Failed to reactivate agent:", updateError);
      return NextResponse.json({ error: "Failed to reactivate agent" }, { status: 500 });
    }

    // Add a billing seat
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const billingResponse = await fetch(`${baseUrl}/api/billing/seats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({ action: "add", quantity: 1 }),
    });

    if (!billingResponse.ok) {
      console.error("Failed to add billing seat");
      // Rollback the reactivation
      await supabase
        .from("agent_profiles")
        .update({
          is_active: false,
          reactivated_at: null,
          reactivated_by: null,
        })
        .eq("id", agentProfileId);

      return NextResponse.json(
        { error: "Failed to add billing seat. Please try again." },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase.from("audit_logs").insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: "agent.reactivated",
      resource_type: "agent_profile",
      resource_id: agentProfileId,
      metadata: {
        agent_name: agent.display_name,
        agent_user_id: agent.user_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reactivate agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
