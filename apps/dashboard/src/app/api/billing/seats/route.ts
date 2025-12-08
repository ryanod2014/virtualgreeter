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
    
    // Check if we need to expand billing (exceeding purchased seats)
    const needsExpansion = newUsedSeats > purchasedSeats;
    const newPurchasedSeats = needsExpansion ? newUsedSeats : purchasedSeats;

    if (!stripe) {
      // Dev mode - update seat_count only if expanding
      if (needsExpansion) {
        const { error: dbError } = await supabase
          .from("organizations")
          .update({ seat_count: newPurchasedSeats })
          .eq("id", org.id);

        if (dbError) {
          console.error("[SEAT_UPDATE] Dev mode: DB update failed:", {
            orgId: org.id,
            newSeats: newPurchasedSeats,
            error: dbError,
          });
          return NextResponse.json({
            error: "Failed to update seats in database"
          }, { status: 500 });
        }

        console.log("[SEAT_UPDATE] Dev mode: DB updated:", {
          orgId: org.id,
          newSeats: newPurchasedSeats,
          usedSeats: newUsedSeats,
        });
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
    // ATOMIC UPDATE PATTERN: DB first, then Stripe, with rollback on failure
    if (needsExpansion && org.stripe_subscription_item_id) {
      const oldSeatCount = purchasedSeats;

      // Step 1: Update DB first (optimistic)
      const { error: dbError } = await supabase
        .from("organizations")
        .update({ seat_count: newPurchasedSeats })
        .eq("id", org.id);

      if (dbError) {
        console.error("[SEAT_UPDATE] DB update failed, aborting before Stripe call:", {
          orgId: org.id,
          oldSeats: oldSeatCount,
          newSeats: newPurchasedSeats,
          error: dbError,
        });
        return NextResponse.json({
          error: "Failed to update seats in database"
        }, { status: 500 });
      }

      // Step 2: Update Stripe
      try {
        await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
          quantity: newPurchasedSeats,
          proration_behavior: "create_prorations",
        });

        console.log("[SEAT_UPDATE] Success - DB and Stripe updated:", {
          orgId: org.id,
          oldSeats: oldSeatCount,
          newSeats: newPurchasedSeats,
          usedSeats: newUsedSeats,
        });

      } catch (stripeError) {
        console.error("[SEAT_UPDATE] Stripe update failed, initiating rollback:", {
          orgId: org.id,
          oldSeats: oldSeatCount,
          attemptedSeats: newPurchasedSeats,
          error: stripeError,
        });

        // Step 3: Rollback DB change
        const { error: rollbackError } = await supabase
          .from("organizations")
          .update({ seat_count: oldSeatCount })
          .eq("id", org.id);

        if (rollbackError) {
          // CRITICAL: Rollback failed - manual intervention required
          console.error("[SEAT_UPDATE] CRITICAL: Rollback failed - database inconsistent:", {
            orgId: org.id,
            dbSeatCount: newPurchasedSeats,
            stripeSeatCount: oldSeatCount,
            rollbackError,
            stripeError,
            timestamp: new Date().toISOString(),
            severity: "CRITICAL",
            action_required: "Manual review and correction needed",
          });

          return NextResponse.json({
            error: "Critical: Seat update failed and rollback unsuccessful. Support has been notified."
          }, { status: 500 });
        }

        console.log("[SEAT_UPDATE] Rollback successful - DB restored to original state:", {
          orgId: org.id,
          restoredSeats: oldSeatCount,
        });

        return NextResponse.json({
          error: "Failed to update Stripe subscription. No charges applied."
        }, { status: 500 });
      }
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
