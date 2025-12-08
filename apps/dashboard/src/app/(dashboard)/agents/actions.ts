"use server";

import { createClient } from "@/lib/supabase/server";
import { sendInviteEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function resendInviteEmail(inviteId: string) {
  try {
    const supabase = await createClient();

    // Verify admin is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify user is admin
    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { success: false, error: "Only admins can resend invites" };
    }

    // Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("id, email, full_name, role, token, organization_id, organizations(name)")
      .eq("id", inviteId)
      .eq("organization_id", profile.organization_id)
      .is("accepted_at", null)
      .single();

    if (inviteError || !invite) {
      return { success: false, error: "Invite not found or already accepted" };
    }

    // Set status to pending while resending
    await supabase
      .from("invites")
      .update({ email_status: "pending" })
      .eq("id", invite.id);

    // Resend email with retry logic
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/accept-invite?token=${invite.token}`;
    const org = Array.isArray(invite.organizations) ? invite.organizations[0] : invite.organizations;
    const orgName = (org as { name: string })?.name || "GreetNow";

    const emailResult = await sendInviteEmail({
      to: invite.email,
      fullName: invite.full_name,
      orgName,
      inviteUrl,
      role: invite.role,
    });

    // Update invite with final email status
    const emailStatus = emailResult.success ? "sent" : "failed";
    await supabase
      .from("invites")
      .update({ email_status: emailStatus })
      .eq("id", invite.id);

    // Revalidate the agents page to show updated status
    revalidatePath("/admin/agents");

    if (!emailResult.success) {
      return {
        success: false,
        error: "Email delivery failed after multiple attempts. Please try again later.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Resend invite error:", error);
    return { success: false, error: "Internal server error" };
  }
}
