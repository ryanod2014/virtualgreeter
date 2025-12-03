/**
 * Stripe Client Initialization
 * Handles Stripe SDK setup for the server-side webhook handling
 */

import Stripe from "stripe";

// Check for required environment variables
const STRIPE_SECRET_KEY = process.env["STRIPE_SECRET_KEY"];
const STRIPE_WEBHOOK_SECRET = process.env["STRIPE_WEBHOOK_SECRET"];

if (!STRIPE_SECRET_KEY) {
  console.warn("⚠️  STRIPE_SECRET_KEY not set. Stripe webhook handling disabled.");
}

if (!STRIPE_WEBHOOK_SECRET) {
  console.warn("⚠️  STRIPE_WEBHOOK_SECRET not set. Webhook signature verification disabled.");
}

// Initialize Stripe client
// Use the default API version from the Stripe SDK
export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

export const webhookSecret = STRIPE_WEBHOOK_SECRET;

export const isStripeConfigured = !!stripe && !!webhookSecret;

