import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

const INCLUDED_SEATS = 1; // Base subscription ($297/mo) includes 1 seat

/**
 * Update seat count in Stripe subscription
 * Called when inviting or removing team members
 * 
 * Billing model: $297/mo base includes 1 seat, additional seats $297/mo each
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

    // Get current agent count (active agents)
    const { count: currentAgentCount } = await supabase
      .from("agent_profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("is_active", true);

    const actualAgentCount = currentAgentCount ?? 0;
    
    // Calculate new agent count
    const newAgentCount = action === "add" 
      ? actualAgentCount + quantity 
      : Math.max(0, actualAgentCount - quantity);

    // Calculate additional seats (seats beyond the included one)
    const currentAdditionalSeats = Math.max(0, actualAgentCount - INCLUDED_SEATS);
    const newAdditionalSeats = Math.max(0, newAgentCount - INCLUDED_SEATS);
    
    // Only update Stripe if additional seats actually changed
    const additionalSeatsChanged = newAdditionalSeats !== currentAdditionalSeats;

    if (!stripe) {
      // Dev mode - just update the seat count locally
      await supabase
        .from("organizations")
        .update({ seat_count: newAgentCount })
        .eq("id", org.id);

      return NextResponse.json({
        success: true,
        agentCount: newAgentCount,
        additionalSeats: newAdditionalSeats,
        includedSeats: INCLUDED_SEATS,
        additionalSeatsChanged,
        devMode: true,
      });
    }

    // Production - only update Stripe if additional seats changed
    // Note: Stripe subscription tracks additional seats only (base is separate)
    if (additionalSeatsChanged && org.stripe_subscription_item_id) {
      await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
        quantity: newAdditionalSeats,
        proration_behavior: "create_prorations",
      });
    }

    // Update local seat count
    await supabase.from("organizations").update({ seat_count: newAgentCount }).eq("id", org.id);

    return NextResponse.json({
      success: true,
      agentCount: newAgentCount,
      additionalSeats: newAdditionalSeats,
      includedSeats: INCLUDED_SEATS,
      additionalSeatsChanged,
    });
  } catch (error) {
    console.error("Seat update error:", error);
    return NextResponse.json({ error: "Failed to update seats" }, { status: 500 });
  }
}

