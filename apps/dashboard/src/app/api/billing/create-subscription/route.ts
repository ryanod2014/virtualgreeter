import { NextRequest, NextResponse } from "next/server";
import { stripe, SEAT_PRICE_ID } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * Create a Stripe subscription after funnel completion
 * - Creates subscription with seat count from funnel selection
 * - Sets 7-day trial period
 * - Stores seat_count in organizations table as the billing floor
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { seatCount, billingPreference } = await request.json();

    if (!seatCount || seatCount < 1) {
      return NextResponse.json({ error: "Invalid seat count" }, { status: 400 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id, stripe_subscription_id, name")
      .eq("id", userData.organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Check if already has a subscription
    if (org.stripe_subscription_id) {
      return NextResponse.json({ 
        error: "Subscription already exists",
        subscriptionId: org.stripe_subscription_id 
      }, { status: 400 });
    }

    // Validate billing preference
    const validFrequencies = ['monthly', 'annual', 'six_month'];
    const billingFrequency = validFrequencies.includes(billingPreference) 
      ? billingPreference 
      : 'monthly';
    
    // 6-month offer is only available if they selected it during signup
    const hasSixMonthOffer = billingFrequency === 'six_month';

    // Dev mode - no Stripe, just update database
    if (!stripe) {
      await supabase
        .from("organizations")
        .update({ 
          seat_count: seatCount,
          subscription_status: "trialing",
          billing_frequency: billingFrequency,
          has_six_month_offer: hasSixMonthOffer,
        })
        .eq("id", userData.organization_id);

      return NextResponse.json({
        success: true,
        devMode: true,
        seatCount,
        billingFrequency,
        hasSixMonthOffer,
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Production - create Stripe subscription
    if (!org.stripe_customer_id) {
      return NextResponse.json({ 
        error: "No payment method on file. Please add a card first." 
      }, { status: 400 });
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(org.stripe_customer_id);
    if (customer.deleted) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
    if (!defaultPaymentMethod) {
      return NextResponse.json({ 
        error: "No payment method on file. Please add a card first." 
      }, { status: 400 });
    }

    // Calculate trial end (7 days from now)
    const trialEnd = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

    // Determine price ID based on billing preference
    // TODO: Create separate price IDs in Stripe for annual/6-month plans
    // For now, using the same price ID (monthly) - adjust pricing in Stripe Dashboard
    const priceId = SEAT_PRICE_ID;
    
    if (!priceId) {
      return NextResponse.json({ 
        error: "Stripe price not configured" 
      }, { status: 500 });
    }

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: org.stripe_customer_id,
      items: [
        {
          price: priceId,
          quantity: seatCount,
        },
      ],
      trial_end: trialEnd,
      default_payment_method: defaultPaymentMethod as string,
      metadata: {
        organization_id: userData.organization_id,
        billing_preference: billingPreference,
        initial_seat_count: seatCount.toString(),
      },
      // Proration behavior for future seat changes
      proration_behavior: "create_prorations",
    });

    // Update organization with subscription info
    await supabase
      .from("organizations")
      .update({
        stripe_subscription_id: subscription.id,
        stripe_subscription_item_id: subscription.items.data[0].id,
        seat_count: seatCount,
        subscription_status: "trialing",
        billing_frequency: billingFrequency,
        has_six_month_offer: hasSixMonthOffer,
      })
      .eq("id", userData.organization_id);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      seatCount,
      billingFrequency,
      hasSixMonthOffer,
      trialEnd: new Date(trialEnd * 1000).toISOString(),
      status: subscription.status,
    });

  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}

