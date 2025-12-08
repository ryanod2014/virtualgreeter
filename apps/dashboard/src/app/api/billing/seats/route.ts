import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

/**
 * Update seat usage when inviting or removing team members
 * 
 * PRE-PAID SEATS MODEL:
 * - org.seat_count = purchased seats (set during funnel, this is billing floor)
 * - We track usage but only EXPAND billing if exceeding purchased seats
 * - Removing agents frees up seats but doesn't reduce billing
 * - To reduce billing, user must explicitly downgrade in billing settings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, organization_id, organization:organizations(*)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    const { action, quantity } = await request.json();

    if (!action || typeof quantity !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const org = Array.isArray(profile.organization)
      ? profile.organization[0]
      : profile.organization;

    // Get current active agent count
    const { count: activeAgentCount } = await supabase
      .from("agent_profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("is_active", true);

    // Get pending invite count (agent role only - they use seats)
    const { count: pendingInviteCount } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("role", "agent")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    const currentUsedSeats = (activeAgentCount ?? 0) + (pendingInviteCount ?? 0);
    const purchasedSeats = org.seat_count ?? 1; // What they paid for (billing floor)
    
    // Calculate new used seat count
    const newUsedSeats = action === "add" 
      ? currentUsedSeats + quantity 
      : Math.max(0, currentUsedSeats - quantity);
    
    // Enforce maximum seat limit of 50 when adding seats
    // Note: Existing orgs already over 50 are grandfathered (only blocks adding MORE seats that would exceed 50)
    const MAX_SEAT_LIMIT = 50;
    if (action === "add" && newUsedSeats > MAX_SEAT_LIMIT) {
      return NextResponse.json(
        { error: "Maximum seat limit is 50" },
        { status: 400 }
      );
    }
    
    // Check if we need to expand billing (exceeding purchased seats)
    const needsExpansion = newUsedSeats > purchasedSeats;
    const newPurchasedSeats = needsExpansion ? newUsedSeats : purchasedSeats;

    if (!stripe) {
      // Dev mode - update seat_count only if expanding
      if (needsExpansion) {
      await supabase
        .from("organizations")
          .update({ seat_count: newPurchasedSeats })
        .eq("id", org.id);
      }

      return NextResponse.json({
        success: true,
        usedSeats: newUsedSeats,
        purchasedSeats: newPurchasedSeats,
        availableSeats: newPurchasedSeats - newUsedSeats,
        billingExpanded: needsExpansion,
        devMode: true,
      });
    }

    // Production - only update Stripe if we need to EXPAND (never shrink)
    if (needsExpansion && org.stripe_subscription_item_id) {
      await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
        quantity: newPurchasedSeats,
        proration_behavior: "create_prorations",
      });

      // Update purchased seat count in database
      await supabase
        .from("organizations")
        .update({ seat_count: newPurchasedSeats })
        .eq("id", org.id);
    }

    return NextResponse.json({
      success: true,
      usedSeats: newUsedSeats,
      purchasedSeats: newPurchasedSeats,
      availableSeats: newPurchasedSeats - newUsedSeats,
      billingExpanded: needsExpansion,
    });
  } catch (error) {
    console.error("Seat update error:", error);
    return NextResponse.json({ error: "Failed to update seats" }, { status: 500 });
  }
}
