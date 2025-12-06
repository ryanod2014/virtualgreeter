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
      .select("id, user_id, organization_id, is_active, status")
      .eq("id", agentProfileId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.is_active) {
      return NextResponse.json({ error: "Agent already deactivated" }, { status: 400 });
    }

    // If agent is in a call, end it gracefully first
    if (agent.status === "in_call") {
      console.log(`[Remove Agent] Agent ${agentProfileId} is in a call, ending it first`);
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
      try {
        const endCallResponse = await fetch(`${serverUrl}/api/agent/end-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId: agentProfileId }),
        });

        if (!endCallResponse.ok) {
          console.error("[Remove Agent] Failed to end agent's call:", await endCallResponse.text());
          // Continue with removal even if call end fails
        } else {
          const result = await endCallResponse.json();
          console.log(`[Remove Agent] Call end result:`, result);
        }
      } catch (error) {
        console.error("[Remove Agent] Error ending agent's call:", error);
        // Continue with removal even if call end fails
      }
    }

    // Soft delete the agent
    const { error: updateError } = await supabase
      .from("agent_profiles")
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: user.id,
        status: "offline", // Force offline status
      })
      .eq("id", agentProfileId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to remove agent" }, { status: 500 });
    }

    // Remove from all pools
    await supabase.from("agent_pool_members").delete().eq("agent_profile_id", agentProfileId);

    // Credit back the seat
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/billing/seats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({ action: "remove", quantity: 1 }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

