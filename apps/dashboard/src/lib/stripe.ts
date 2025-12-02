import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set - billing features will run in dev mode");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;

// Price IDs for seat-based billing by frequency (create in Stripe Dashboard)
// Monthly: $297/seat/month, recurring monthly
// Annual: $2,316/seat/year ($193/mo equivalent), recurring annually
// Six-Month: $1,068/seat/6mo ($178/mo equivalent), recurring every 6 months
export const PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_SEAT_PRICE_ID || "",
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || "",
  six_month: process.env.STRIPE_SIX_MONTH_PRICE_ID || "",
} as const;

// Legacy: Keep SEAT_PRICE_ID for backwards compatibility (defaults to monthly)
export const SEAT_PRICE_ID = PRICE_IDS.monthly;

/**
 * Get the Stripe Price ID for a billing frequency
 * Falls back to monthly price ID if specific frequency price not configured
 */
export function getPriceIdForFrequency(frequency: "monthly" | "annual" | "six_month"): string {
  const priceId = PRICE_IDS[frequency];
  if (priceId) return priceId;
  
  // Fallback: if specific price not configured, use monthly price
  // This ensures backwards compatibility but logs a warning
  if (PRICE_IDS.monthly) {
    console.warn(`STRIPE_${frequency.toUpperCase()}_PRICE_ID not set, falling back to monthly price ID`);
    return PRICE_IDS.monthly;
  }
  
  return "";
}

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

