import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set - billing features will run in dev mode");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;

// Price ID for seat-based billing (create in Stripe Dashboard)
export const SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID || "";

export const PRICE_PER_SEAT = 297; // $297/seat/month

