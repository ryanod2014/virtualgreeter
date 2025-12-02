import { NextRequest, NextResponse } from "next/server";
import { stripe, getPriceIdForFrequency } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Update billing settings (seat count and/or billing frequency)
 * 
 * Rules:
 * - Seat count can be increased anytime (auto-expands billing)
 * - Seat count can only be decreased to >= current usage
 * - Billing frequency can be toggled between monthly/annual/six_month
 * - Switching away from six_month loses the offer forever
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const { seatCount, billingFrequency } = await request.json();

    // Get current organization state
    const { data: org } = await supabase
      .from("organizations")
      .select("*, stripe_subscription_item_id")
      .eq("id", profile.organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get current usage (active agents + pending agent invites)
    const { count: activeAgentCount } = await supabase
      .from("agent_profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("is_active", true);

    const { count: pendingAgentInviteCount } = await supabase
      .from("invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("role", "agent")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    const currentUsage = (activeAgentCount ?? 0) + (pendingAgentInviteCount ?? 0);

    const updates: Record<string, unknown> = {};
    const response: Record<string, unknown> = { success: true };

    // Handle seat count change
    if (seatCount !== undefined) {
      const newSeatCount = Math.max(1, Math.floor(seatCount));
      
      // Can't reduce below current usage
      if (newSeatCount < currentUsage) {
        return NextResponse.json({ 
          error: `Cannot reduce seats below current usage (${currentUsage} in use)`,
          currentUsage,
          minSeats: currentUsage,
        }, { status: 400 });
      }

      updates.seat_count = newSeatCount;
      response.seatCount = newSeatCount;
      response.availableSeats = newSeatCount - currentUsage;

      // Update Stripe if in production and expanding
      if (stripe && org.stripe_subscription_item_id && newSeatCount !== org.seat_count) {
        await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
          quantity: newSeatCount,
          proration_behavior: "create_prorations",
        });
        response.stripeUpdated = true;
      }
    }

    // Handle billing frequency change
    if (billingFrequency !== undefined) {
      const validFrequencies = ['monthly', 'annual', 'six_month'];
      
      if (!validFrequencies.includes(billingFrequency)) {
        return NextResponse.json({ 
          error: "Invalid billing frequency" 
        }, { status: 400 });
      }

      // Check if they can use six_month
      if (billingFrequency === 'six_month' && !org.has_six_month_offer) {
        return NextResponse.json({ 
          error: "6-month pricing is not available for your account" 
        }, { status: 400 });
      }

      // If switching away from six_month, they lose the offer forever
      if (org.billing_frequency === 'six_month' && billingFrequency !== 'six_month') {
        updates.has_six_month_offer = false;
        response.sixMonthOfferRemoved = true;
      }

      updates.billing_frequency = billingFrequency;
      response.billingFrequency = billingFrequency;

      // Update Stripe subscription to new price ID if frequency is changing
      if (stripe && org.stripe_subscription_item_id && org.billing_frequency !== billingFrequency) {
        const newPriceId = getPriceIdForFrequency(billingFrequency as "monthly" | "annual" | "six_month");
        
        if (!newPriceId) {
          return NextResponse.json({ 
            error: `Price not configured for ${billingFrequency} billing` 
          }, { status: 500 });
        }

        // Swap the subscription item to the new price
        // This replaces the current price with the new one, applying proration
        await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
          price: newPriceId,
          proration_behavior: "create_prorations",
        });
        
        response.stripePriceUpdated = true;
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", org.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
      }
    }

    response.currentUsage = currentUsage;

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error updating billing settings:", error);
    return NextResponse.json(
      { error: "Failed to update billing settings" },
      { status: 500 }
    );
  }
}

