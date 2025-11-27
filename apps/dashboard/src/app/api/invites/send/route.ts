import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

    // Check if user already exists in this org (including deactivated)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("organization_id", profile.organization_id)
      .single();

    if (existingUser) {
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

    // === ADD SEAT TO BILLING (only for agent role) ===
    // Admins get to choose whether to take calls when they accept the invite
    const shouldChargeSeat = role === "agent";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
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
        const seatError = await seatResponse.json();
        return NextResponse.json(
          { error: seatError.error || "Failed to add billing seat" },
          { status: 400 }
        );
      }
    }

    // Generate secure token
    const token = crypto.randomUUID();

    // Create invite record
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
      // Rollback the seat charge if we charged one
      if (shouldChargeSeat) {
        await fetch(`${baseUrl}/api/billing/seats`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cookie": request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ action: "remove", quantity: 1 }),
        });
      }
      
      console.error("Failed to create invite:", inviteError);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    // Send email
    const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;
    // Handle Supabase returning organization as array due to join
    const org = Array.isArray(profile.organization) ? profile.organization[0] : profile.organization;
    const orgName = (org as { name: string })?.name || "Ghost-Greeter";

    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Ghost-Greeter <noreply@ghost-greeter.com>",
          to: email,
          subject: `You've been invited to join ${orgName} on Ghost-Greeter`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <h1 style="font-size: 24px; font-weight: bold; margin: 0;">👻 Ghost-Greeter</h1>
                </div>
                
                <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
                  <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi ${fullName}!</h2>
                  <p style="margin: 0 0 16px 0;">You've been invited to join <strong>${orgName}</strong> on Ghost-Greeter as ${role === 'admin' ? 'an Admin' : 'an Agent'}.</p>
                  <p style="margin: 0 0 24px 0;">Click the button below to set up your account and get started:</p>
                  
                  <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; text-align: center;">
                  This invitation expires in 7 days.<br>
                  If you didn't expect this invitation, you can ignore this email.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                  Can't click the button? Copy and paste this link:<br>
                  <a href="${inviteUrl}" style="color: #6366f1;">${inviteUrl}</a>
                </p>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail the request if email fails - invite is still created
      }
    } else {
      console.warn("RESEND_API_KEY not configured - email not sent");
      console.log("Invite URL:", inviteUrl);
    }

    return NextResponse.json({ 
      success: true, 
      invite: { id: invite.id, email: invite.email },
      // Include URL in dev mode for testing
      ...(process.env.NODE_ENV === "development" && { inviteUrl })
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
