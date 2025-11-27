import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

/**
 * Update seat count in Stripe subscription
 * Called when inviting or removing team members
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
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

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { action, quantity } = await request.json();

    if (!action || typeof quantity !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const org = Array.isArray(profile.organization)
      ? profile.organization[0]
      : profile.organization;

    if (!stripe) {
      // Dev mode - just update the seat count locally
      const newSeatCount =
        action === "add" ? org.seat_count + quantity : Math.max(0, org.seat_count - quantity);

      await supabase
        .from("organizations")
        .update({ seat_count: newSeatCount })
        .eq("id", org.id);

      return NextResponse.json({
        success: true,
        seatCount: newSeatCount,
        devMode: true,
      });
    }

    // Production - update Stripe subscription
    if (!org.stripe_subscription_item_id) {
      // First time - need to create subscription
      // This would typically happen in a separate onboarding flow
      return NextResponse.json(
        { error: "No active subscription. Please set up billing first." },
        { status: 400 }
      );
    }

    const newSeatCount =
      action === "add" ? org.seat_count + quantity : Math.max(0, org.seat_count - quantity);

    // Update Stripe subscription with prorated billing
    await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
      quantity: newSeatCount,
      proration_behavior: "create_prorations",
    });

    // Update local seat count
    await supabase.from("organizations").update({ seat_count: newSeatCount }).eq("id", org.id);

    return NextResponse.json({
      success: true,
      seatCount: newSeatCount,
    });
  } catch (error) {
    console.error("Seat update error:", error);
    return NextResponse.json({ error: "Failed to update seats" }, { status: 500 });
  }
}

