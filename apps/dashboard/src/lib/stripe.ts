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

// Centralized pricing by billing frequency
export const PRICING = {
  monthly: { price: 297, label: "Monthly", discount: 0 },
  annual: { price: 193, label: "Annual", discount: 35 },
  six_month: { price: 178, label: "6-Month", discount: 40 },
} as const;

// Other billing constants
export const INCLUDED_SEATS = 1;
export const FREE_STORAGE_GB = 10;
export const STORAGE_PRICE_PER_GB = 0.50;

