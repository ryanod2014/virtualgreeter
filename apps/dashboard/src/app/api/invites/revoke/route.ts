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

    const { inviteId } = await request.json();

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
    }

    // Verify invite belongs to this org and is pending
    const { data: invite } = await supabase
      .from("invites")
      .select("id, organization_id, accepted_at")
      .eq("id", inviteId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: "Cannot revoke accepted invite" }, { status: 400 });
    }

    // Delete the invite
    const { error: deleteError } = await supabase.from("invites").delete().eq("id", inviteId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
    }

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
    console.error("Revoke invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

