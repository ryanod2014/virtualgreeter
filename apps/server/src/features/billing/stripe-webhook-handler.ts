/**
 * Stripe Webhook Handler
 *
 * Handles critical Stripe webhook events for subscription lifecycle:
 * - invoice.paid: Update subscription status to active
 * - invoice.payment_failed: Log payment failure, potentially update status
 * - customer.subscription.updated: Sync subscription status changes
 * - customer.subscription.deleted: Handle cancellation
 * - customer.subscription.paused: Handle subscription pause
 * - customer.subscription.resumed: Handle subscription resume
 *
 * All handlers are designed to be idempotent - safe to replay.
 */

import type { Request, Response } from "express";
import type Stripe from "stripe";
import { stripe, webhookSecret } from "../../lib/stripe.js";
import { supabase, isSupabaseConfigured } from "../../lib/supabase.js";

// Type guard for Stripe subscription object
function isSubscription(obj: unknown): obj is Stripe.Subscription {
  return typeof obj === "object" && obj !== null && "object" in obj && (obj as Record<string, unknown>).object === "subscription";
}

// Type guard for Stripe invoice object
function isInvoice(obj: unknown): obj is Stripe.Invoice {
  return typeof obj === "object" && obj !== null && "object" in obj && (obj as Record<string, unknown>).object === "invoice";
}

/**
 * Map Stripe subscription status to our database status
 * Our DB allows: 'active', 'paused', 'cancelled', 'trialing', 'past_due'
 */
function mapStripeStatusToDbStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "paused":
      return "paused";
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
      // Treat payment-related issues as past_due
      return "past_due";
    default:
      console.warn(`[StripeWebhook] Unknown Stripe status: ${stripeStatus}, defaulting to active`);
      return "active";
  }
}

/**
 * Get organization by Stripe customer ID
 */
async function getOrgByStripeCustomerId(customerId: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.error("[StripeWebhook] Supabase not configured");
    return null;
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, subscription_status, stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error || !org) {
    console.error(`[StripeWebhook] Organization not found for customer ${customerId}:`, error);
    return null;
  }

  return org;
}

/**
 * Get organization by Stripe subscription ID
 */
async function getOrgByStripeSubscriptionId(subscriptionId: string) {
  if (!isSupabaseConfigured || !supabase) {
    console.error("[StripeWebhook] Supabase not configured");
    return null;
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, subscription_status, stripe_customer_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (error || !org) {
    console.error(`[StripeWebhook] Organization not found for subscription ${subscriptionId}:`, error);
    return null;
  }

  return org;
}

/**
 * Update organization subscription status
 * Idempotent: Will not update if status is already the same
 */
async function updateOrgSubscriptionStatus(
  orgId: string,
  newStatus: string,
  currentStatus: string,
  eventType: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    console.error("[StripeWebhook] Supabase not configured");
    return false;
  }

  // Idempotent check: Don't update if status is already the same
  if (currentStatus === newStatus) {
    console.log(`[StripeWebhook] Status already ${newStatus} for org ${orgId}, skipping update`);
    return true;
  }

  const { error } = await supabase
    .from("organizations")
    .update({ subscription_status: newStatus })
    .eq("id", orgId);

  if (error) {
    console.error(`[StripeWebhook] Failed to update org ${orgId} status:`, error);
    return false;
  }

  console.log(`[StripeWebhook] Updated org ${orgId} status: ${currentStatus} → ${newStatus} (${eventType})`);
  return true;
}

/**
 * Handle invoice.paid event
 * Updates subscription status to active when payment succeeds
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<boolean> {
  const customerId = typeof invoice.customer === "string" 
    ? invoice.customer 
    : invoice.customer?.id;

  if (!customerId) {
    console.error("[StripeWebhook] invoice.paid: No customer ID in invoice");
    return false;
  }

  // Skip if this is a $0 invoice (trial)
  if (invoice.amount_paid === 0) {
    console.log(`[StripeWebhook] invoice.paid: Skipping $0 invoice (trial period)`);
    return true;
  }

  const org = await getOrgByStripeCustomerId(customerId);
  if (!org) return false;

  // Payment succeeded - mark as active
  return updateOrgSubscriptionStatus(org.id, "active", org.subscription_status, "invoice.paid");
}

/**
 * Handle invoice.payment_failed event
 * Logs the failure and updates status to past_due
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<boolean> {
  const customerId = typeof invoice.customer === "string" 
    ? invoice.customer 
    : invoice.customer?.id;

  if (!customerId) {
    console.error("[StripeWebhook] invoice.payment_failed: No customer ID in invoice");
    return false;
  }

  const org = await getOrgByStripeCustomerId(customerId);
  if (!org) return false;

  console.warn(`[StripeWebhook] Payment failed for org ${org.id} (${org.name}), invoice: ${invoice.id}`);

  // Update status to past_due to reflect payment issues
  return updateOrgSubscriptionStatus(org.id, "past_due", org.subscription_status, "invoice.payment_failed");
}

/**
 * Handle customer.subscription.updated event
 * Syncs subscription status changes from Stripe
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<boolean> {
  const org = await getOrgByStripeSubscriptionId(subscription.id);
  if (!org) return false;

  const newStatus = mapStripeStatusToDbStatus(subscription.status);
  
  return updateOrgSubscriptionStatus(org.id, newStatus, org.subscription_status, "customer.subscription.updated");
}

/**
 * Handle customer.subscription.deleted event
 * Updates status to cancelled when subscription is terminated
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<boolean> {
  const org = await getOrgByStripeSubscriptionId(subscription.id);
  if (!org) return false;

  return updateOrgSubscriptionStatus(org.id, "cancelled", org.subscription_status, "customer.subscription.deleted");
}

/**
 * Handle customer.subscription.paused event
 * Updates status to paused when subscription is paused
 */
async function handleSubscriptionPaused(subscription: Stripe.Subscription): Promise<boolean> {
  const org = await getOrgByStripeSubscriptionId(subscription.id);
  if (!org) return false;

  return updateOrgSubscriptionStatus(org.id, "paused", org.subscription_status, "customer.subscription.paused");
}

/**
 * Handle customer.subscription.resumed event
 * Updates status to active when subscription is resumed
 */
async function handleSubscriptionResumed(subscription: Stripe.Subscription): Promise<boolean> {
  const org = await getOrgByStripeSubscriptionId(subscription.id);
  if (!org) return false;

  return updateOrgSubscriptionStatus(org.id, "active", org.subscription_status, "customer.subscription.resumed");
}

/**
 * Main webhook handler
 * Verifies signature and routes to appropriate handler
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  // Check if Stripe is configured
  if (!stripe || !webhookSecret) {
    console.error("[StripeWebhook] Stripe not configured, rejecting webhook");
    res.status(503).json({ error: "Stripe webhooks not configured" });
    return;
  }

  // Get the signature from headers
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    console.error("[StripeWebhook] Missing stripe-signature header");
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[StripeWebhook] Signature verification failed: ${message}`);
    res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
    return;
  }

  console.log(`[StripeWebhook] Received event: ${event.type} (${event.id})`);

  // Route to appropriate handler
  let success = false;
  try {
    switch (event.type) {
      case "invoice.paid":
        if (isInvoice(event.data.object)) {
          success = await handleInvoicePaid(event.data.object);
        }
        break;

      case "invoice.payment_failed":
        if (isInvoice(event.data.object)) {
          success = await handleInvoicePaymentFailed(event.data.object);
        }
        break;

      case "customer.subscription.updated":
        if (isSubscription(event.data.object)) {
          success = await handleSubscriptionUpdated(event.data.object);
        }
        break;

      case "customer.subscription.deleted":
        if (isSubscription(event.data.object)) {
          success = await handleSubscriptionDeleted(event.data.object);
        }
        break;

      case "customer.subscription.paused":
        if (isSubscription(event.data.object)) {
          success = await handleSubscriptionPaused(event.data.object);
        }
        break;

      case "customer.subscription.resumed":
        if (isSubscription(event.data.object)) {
          success = await handleSubscriptionResumed(event.data.object);
        }
        break;

      default:
        // Log but don't fail for unhandled event types
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
        success = true;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[StripeWebhook] Handler error for ${event.type}: ${message}`);
    success = false;
  }

  if (success) {
    res.json({ received: true });
  } else {
    // Return 500 to trigger Stripe retry
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

