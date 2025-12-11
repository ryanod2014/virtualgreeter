import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendInviteEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify admin is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin and get org details
    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id, organization:organizations(name, seat_count, stripe_subscription_item_id)")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can send invites" }, { status: 403 });
    }

    const { email, fullName, role = "agent" } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
    }

    // Check if user already exists in this org
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .eq("organization_id", profile.organization_id)
      .single();

    if (existingUser) {
      // Check if they have an inactive agent_profile (for agent role invites)
      if (role === "agent") {
        const { data: agentProfile } = await supabase
          .from("agent_profiles")
          .select("id, is_active, display_name")
          .eq("user_id", existingUser.id)
          .eq("organization_id", profile.organization_id)
          .single();

        // If they have an inactive agent profile, allow reactivation
        if (agentProfile && !agentProfile.is_active) {
          // Reactivate the agent profile
          const { error: reactivateError } = await supabase
            .from("agent_profiles")
            .update({
              is_active: true,
              deactivated_at: null,
              deactivated_by: null,
              status: "offline",
            })
            .eq("id", agentProfile.id);

          if (reactivateError) {
            console.error("Failed to reactivate agent:", reactivateError);
            return NextResponse.json({ error: "Failed to reactivate agent" }, { status: 500 });
          }

          // Add billing seat for reactivation
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const seatResponse = await fetch(`${baseUrl}/api/billing/seats`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cookie": request.headers.get("cookie") || "",
            },
            body: JSON.stringify({ action: "add", quantity: 1 }),
          });

          if (!seatResponse.ok) {
            // Rollback: Deactivate the agent again
            await supabase
              .from("agent_profiles")
              .update({ is_active: false })
              .eq("id", agentProfile.id);

            const seatError = await seatResponse.json();
            return NextResponse.json(
              { error: seatError.error || "Failed to add billing seat" },
              { status: 400 }
            );
          }

          // Send reactivation notification email
          const org = Array.isArray(profile.organization) ? profile.organization[0] : profile.organization;
          const orgName = (org as { name: string })?.name || "GreetNow";

          // TODO: Create sendReactivationEmail function
          // For now, we'll skip the email or reuse sendInviteEmail
          // The user can just log in with their existing credentials

          return NextResponse.json({
            success: true,
            reactivated: true,
            agentProfile: { id: agentProfile.id, display_name: agentProfile.display_name },
          });
        }
      }

      return NextResponse.json({ error: "User already exists in this organization" }, { status: 400 });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id")
      .eq("email", email)
      .eq("organization_id", profile.organization_id)
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "An invite has already been sent to this email" }, { status: 400 });
    }

    // === STEP 1: Generate token and create invite record FIRST ===
    // This is easily reversible with a simple DELETE if billing fails
    const token = crypto.randomUUID();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .insert({
        organization_id: profile.organization_id,
        email,
        full_name: fullName,
        role,
        token,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invite:", inviteError);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    // === STEP 2: ADD SEAT TO BILLING (only for agent role) ===
    // We do this AFTER creating the invite so rollback is trivial (just delete the invite)
    // Admins get to choose whether to take calls when they accept the invite
    const shouldChargeSeat = role === "agent";
    
    if (shouldChargeSeat) {
      const seatResponse = await fetch(`${baseUrl}/api/billing/seats`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Forward auth cookie
          "Cookie": request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ action: "add", quantity: 1 }),
      });

      if (!seatResponse.ok) {
        // Rollback: Delete the invite we just created (this is reliable)
        await supabase
          .from("invites")
          .delete()
          .eq("id", invite.id);
        
        const seatError = await seatResponse.json();
        return NextResponse.json(
          { error: seatError.error || "Failed to add billing seat" },
          { status: 400 }
        );
      }
    }

    // === STEP 3: Send email with retry logic ===
    const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;
    // Handle Supabase returning organization as array due to join
    const org = Array.isArray(profile.organization) ? profile.organization[0] : profile.organization;
    const orgName = (org as { name: string })?.name || "GreetNow";

    const emailResult = await sendInviteEmail({
      to: email,
      fullName,
      orgName,
      inviteUrl,
      role,
    });

    // Update invite with email status
    const emailStatus = emailResult.success ? "sent" : "failed";
    await supabase
      .from("invites")
      .update({ email_status: emailStatus })
      .eq("id", invite.id);

    // If email failed after all retries, still return success but include warning
    if (!emailResult.success) {
      console.error("Email delivery failed after retries:", emailResult.error);
      return NextResponse.json({
        success: true,
        invite: { id: invite.id, email: invite.email },
        warning: "Invite created but email delivery failed. You can resend from the Agents page.",
        emailStatus: "failed",
        ...(process.env.NODE_ENV === "development" && { inviteUrl })
      });
    }

    // Dev mode: log URL for testing
    if (process.env.NODE_ENV === "development") {
      console.log("Invite URL:", inviteUrl);
    }

    return NextResponse.json({
      success: true,
      invite: { id: invite.id, email: invite.email },
      emailStatus: "sent",
      // Include URL in dev mode for testing
      ...(process.env.NODE_ENV === "development" && { inviteUrl })
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
