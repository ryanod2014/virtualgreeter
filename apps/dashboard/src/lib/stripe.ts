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

// Validate that required price IDs are configured at startup
if (process.env.STRIPE_SECRET_KEY) {
  const missingPriceIds: string[] = [];
  if (!PRICE_IDS.monthly) missingPriceIds.push("STRIPE_MONTHLY_PRICE_ID");
  if (!PRICE_IDS.annual) missingPriceIds.push("STRIPE_ANNUAL_PRICE_ID");

  if (missingPriceIds.length > 0) {
    console.error(
      `⚠️  Missing Stripe Price IDs: ${missingPriceIds.join(", ")}. ` +
      `Billing options without configured price IDs will not be shown to users. ` +
      `Set these environment variables to enable all billing options.`
    );
  }
}

// Legacy: Keep SEAT_PRICE_ID for backwards compatibility (defaults to monthly)
export const SEAT_PRICE_ID = PRICE_IDS.monthly;

/**
 * Get the Stripe Price ID for a billing frequency
 * Returns empty string if price ID is not configured (no fallback)
 */
export function getPriceIdForFrequency(frequency: "monthly" | "annual" | "six_month"): string {
  return PRICE_IDS[frequency] || "";
}

/**
 * Check if a billing frequency has a configured price ID
 */
export function isPriceIdConfigured(frequency: "monthly" | "annual" | "six_month"): boolean {
  return Boolean(PRICE_IDS[frequency]);
}

/**
 * Get all available billing frequencies that have configured price IDs
 */
export function getAvailableBillingFrequencies(): ("monthly" | "annual" | "six_month")[] {
  const frequencies: ("monthly" | "annual" | "six_month")[] = [];
  if (PRICE_IDS.monthly) frequencies.push("monthly");
  if (PRICE_IDS.annual) frequencies.push("annual");
  if (PRICE_IDS.six_month) frequencies.push("six_month");
  return frequencies;
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

