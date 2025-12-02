# Launch Checklist

## Stripe Billing
- [ ] Switch to live Stripe keys in Vercel (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- [ ] Create seat-based price in Stripe Dashboard
- [ ] Set `STRIPE_SEAT_PRICE_ID` to the live price ID
- [ ] Create separate prices for annual & 6-month billing (optional, can use same price initially)
- [ ] Create Stripe webhook handler (`/api/stripe/webhook`)
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Vercel after creating webhook endpoint
- [ ] Enable paywall redirect in signup flow (`apps/dashboard/src/app/(auth)/signup/page.tsx` line 63)

## Legal
- [ ] Create `/terms` page (Terms of Service)
- [ ] Create `/privacy` page (Privacy Policy)

## Widget
- [ ] Get widget working on mobile (visitor perspective)

## Content / Videos
- [ ] Create default videos for filming examples
- [ ] Update default video on landing page

## QA
- [ ] Test full billing flow end-to-end (signup → paywall → seats → billing → dashboard)
- [ ] Test card entry with Stripe test cards before going live
- [ ] Test subscription creation and trial period
- [ ] Test webhook receives events correctly
- [ ] Verify billing settings page shows correct data

## Domains
- [ ] Set up custom domain for Vercel (e.g., app.greetnow.com)
- [ ] Set up custom sending domain for Resend (for email deliverability)

## Resend Emails

### To Do
- [ ] Welcome email (sent immediately after signup)
- [ ] Invite accepted notification (notify admin when invitee joins)
- [ ] Trial ending reminder (3 days before trial ends)
- [ ] Payment failed notification
- [ ] Subscription paused confirmation
- [ ] Subscription resumed confirmation
- [ ] Subscription cancelled confirmation

### Onboarding Sequence (Quick Start Flow)
Drip emails to nudge users through each setup step if not completed:

- [ ] **Day 1**: "Install your widget" — Guide to Step 1 (embed code)
- [ ] **Day 2**: "Add your first agent" — Guide to Step 2 (if widget installed but no agents)
- [ ] **Day 3**: "Set up your first pool" — Guide to Step 3 (if agents added but no pools)
- [ ] **Day 4**: "Track your conversions" — Guide to Step 4 (dispositions setup)
- [ ] **Day 5**: "You're all set! Here's how to get your first call" — Final tips

*Logic: Skip emails for steps already completed. Stop sequence when all 4 steps done.*

### Ideas (Future)
- Weekly activity summary for admins (calls, conversions, agent performance)
- Monthly ROI report (calls → conversions → estimated value)
- "No agents online" alert during business hours
- Missed call digest (daily summary of missed opportunities)
- Re-engagement email if no logins for 7+ days
- Tips & best practices series (how to convert more calls, video tips, etc.)
- NPS/feedback request after X calls completed

## Optional / Nice-to-Have
- [ ] Set up Deepgram for call transcription ($0.01/min)
- [ ] Set up OpenAI for AI summaries ($0.02/min)
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring

---

## Payment Gateway Abstraction (Stripe ↔ NMI Hot-Swap)

Enable quick switching between Stripe and NMI payment processors via environment variable.

### Overview

**Goal**: If one payment processor gets shut down, switch to backup within minutes.

**Approach**: Create abstraction layer that normalizes both APIs behind a common interface.

**Effort Estimate**:
- Stripe refactor: ~2-3 hours (move existing code into gateway pattern)
- NMI implementation: ~2-4 days (build mini subscription engine)
- Total new code: ~700-800 lines

### Phase 1: Create Abstraction Layer

#### 1.1 Create type definitions
- [ ] Create `apps/dashboard/src/lib/payment/types.ts`

```typescript
// apps/dashboard/src/lib/payment/types.ts

export type PaymentProvider = "stripe" | "nmi";

export interface Customer {
  id: string;
  email: string;
  name?: string;
  defaultPaymentMethodId?: string;
  metadata: Record<string, string>;
}

export interface PaymentMethod {
  id: string;
  type: "card";
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface Subscription {
  id: string;
  customerId: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "paused";
  quantity: number;
  trialEnd?: Date;
  currentPeriodEnd: Date;
  metadata: Record<string, string>;
}

export interface SetupIntentResult {
  clientSecret: string;
  provider: PaymentProvider;
}

export interface ChargeResult {
  id: string;
  success: boolean;
  errorMessage?: string;
}

export interface PaymentGateway {
  provider: PaymentProvider;
  
  // Customer management
  createCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Customer>;
  
  getCustomer(customerId: string): Promise<Customer | null>;
  
  // Payment method collection (returns client secret for frontend)
  createSetupIntent(customerId: string): Promise<SetupIntentResult>;
  
  // Direct charge (for NMI recurring or one-time)
  chargeCustomer(params: {
    customerId: string;
    amountCents: number;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<ChargeResult>;
  
  // Subscriptions (Stripe native, NMI = DB-managed)
  createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity: number;
    trialDays?: number;
    paymentMethodId: string;
    metadata?: Record<string, string>;
  }): Promise<Subscription>;
  
  updateSubscriptionQuantity(
    subscriptionItemId: string,
    quantity: number
  ): Promise<void>;
  
  cancelSubscription(subscriptionId: string): Promise<void>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
}
```

#### 1.2 Create Stripe gateway implementation
- [ ] Create `apps/dashboard/src/lib/payment/stripe-gateway.ts`

```typescript
// apps/dashboard/src/lib/payment/stripe-gateway.ts

import Stripe from "stripe";
import type { 
  PaymentGateway, 
  Customer, 
  Subscription, 
  SetupIntentResult,
  ChargeResult 
} from "./types";

export class StripeGateway implements PaymentGateway {
  provider = "stripe" as const;
  private client: Stripe;

  constructor(secretKey: string) {
    this.client = new Stripe(secretKey, { apiVersion: "2025-11-17.clover" });
  }

  async createCustomer(params: { 
    email: string; 
    name?: string; 
    metadata?: Record<string, string> 
  }): Promise<Customer> {
    const customer = await this.client.customers.create({
      email: params.email,
      name: params.name,
      metadata: params.metadata,
    });
    
    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name ?? undefined,
      defaultPaymentMethodId: customer.invoice_settings?.default_payment_method as string | undefined,
      metadata: (customer.metadata as Record<string, string>) ?? {},
    };
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      const customer = await this.client.customers.retrieve(customerId);
      if (customer.deleted) return null;
      
      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name ?? undefined,
        defaultPaymentMethodId: customer.invoice_settings?.default_payment_method as string | undefined,
        metadata: (customer.metadata as Record<string, string>) ?? {},
      };
    } catch {
      return null;
    }
  }

  async createSetupIntent(customerId: string): Promise<SetupIntentResult> {
    const intent = await this.client.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    
    return {
      clientSecret: intent.client_secret!,
      provider: "stripe",
    };
  }

  async chargeCustomer(params: {
    customerId: string;
    amountCents: number;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<ChargeResult> {
    try {
      const invoice = await this.client.invoices.create({
        customer: params.customerId,
        auto_advance: true,
        collection_method: "charge_automatically",
        description: params.description,
        metadata: params.metadata,
      });

      await this.client.invoiceItems.create({
        customer: params.customerId,
        invoice: invoice.id,
        amount: params.amountCents,
        description: params.description,
      });

      const finalizedInvoice = await this.client.invoices.finalizeInvoice(invoice.id);
      const paidInvoice = await this.client.invoices.pay(finalizedInvoice.id);

      return {
        id: paidInvoice.id,
        success: paidInvoice.status === "paid",
        errorMessage: paidInvoice.status !== "paid" ? "Payment failed" : undefined,
      };
    } catch (error) {
      return {
        id: "",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Payment failed",
      };
    }
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity: number;
    trialDays?: number;
    paymentMethodId: string;
    metadata?: Record<string, string>;
  }): Promise<Subscription> {
    const trialEnd = params.trialDays 
      ? Math.floor(Date.now() / 1000) + (params.trialDays * 24 * 60 * 60)
      : undefined;

    const sub = await this.client.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId, quantity: params.quantity }],
      trial_end: trialEnd,
      default_payment_method: params.paymentMethodId,
      metadata: params.metadata,
      proration_behavior: "create_prorations",
    });

    return {
      id: sub.id,
      customerId: sub.customer as string,
      status: sub.status as Subscription["status"],
      quantity: sub.items.data[0].quantity ?? 1,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      metadata: (sub.metadata as Record<string, string>) ?? {},
    };
  }

  async updateSubscriptionQuantity(subscriptionItemId: string, quantity: number): Promise<void> {
    await this.client.subscriptionItems.update(subscriptionItemId, {
      quantity,
      proration_behavior: "create_prorations",
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.client.subscriptions.cancel(subscriptionId);
  }

  async pauseSubscription(subscriptionId: string): Promise<void> {
    await this.client.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: "void" },
    });
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    await this.client.subscriptions.update(subscriptionId, {
      pause_collection: null,
    });
  }
}
```

#### 1.3 Create NMI gateway implementation
- [ ] Create `apps/dashboard/src/lib/payment/nmi-gateway.ts`

```typescript
// apps/dashboard/src/lib/payment/nmi-gateway.ts

import type { 
  PaymentGateway, 
  Customer, 
  Subscription, 
  SetupIntentResult,
  ChargeResult 
} from "./types";

/**
 * NMI Payment Gateway Implementation
 * 
 * KEY DIFFERENCES FROM STRIPE:
 * - No built-in subscription management → we manage in database
 * - Customer Vault stores payment methods (like Stripe customers)
 * - Collect.js handles frontend tokenization (like Stripe Elements)
 * - We run our own billing cron to charge recurring payments
 * 
 * NMI API Docs: https://secure.nmi.com/merchants/resources/integration/integration_portal.php
 */
export class NMIGateway implements PaymentGateway {
  provider = "nmi" as const;
  private securityKey: string;
  private baseUrl = "https://secure.nmi.com/api/transact.php";

  constructor(securityKey: string) {
    this.securityKey = securityKey;
  }

  /**
   * Create customer in NMI Customer Vault
   * NMI requires a payment method to create a vault entry, so this creates
   * a "pending" customer that gets activated when card is added
   */
  async createCustomer(params: { 
    email: string; 
    name?: string; 
    metadata?: Record<string, string> 
  }): Promise<Customer> {
    // NMI Customer Vault requires payment info to create
    // For now, generate a placeholder ID - real vault ID created when card added
    const placeholderId = `nmi_pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    return {
      id: placeholderId,
      email: params.email,
      name: params.name,
      metadata: params.metadata ?? {},
    };
  }

  /**
   * Get customer from NMI vault
   * Note: NMI doesn't have a direct GET customer API
   * We store customer data in our DB and only use vault for charging
   */
  async getCustomer(customerId: string): Promise<Customer | null> {
    // NMI doesn't support direct customer lookup
    // Return null - caller should use database
    console.warn("NMI: getCustomer not supported, use database lookup");
    return null;
  }

  /**
   * Create setup intent for Collect.js frontend tokenization
   * Returns the tokenization key for Collect.js configuration
   */
  async createSetupIntent(customerId: string): Promise<SetupIntentResult> {
    const tokenizationKey = process.env.NMI_TOKENIZATION_KEY;
    
    if (!tokenizationKey) {
      throw new Error("NMI_TOKENIZATION_KEY not configured");
    }

    return {
      clientSecret: tokenizationKey,
      provider: "nmi",
    };
  }

  /**
   * Add payment method to Customer Vault and return vault ID
   * Called after Collect.js returns a payment token
   */
  async addPaymentMethodToVault(params: {
    paymentToken: string;
    email: string;
    firstName?: string;
    lastName?: string;
    organizationId: string;
  }): Promise<string> {
    const response = await this.makeRequest({
      type: "add_customer",
      payment_token: params.paymentToken,
      email: params.email,
      first_name: params.firstName ?? "",
      last_name: params.lastName ?? "",
      // Store org ID in vault for reference
      merchant_defined_field_1: params.organizationId,
    });

    if (response.response !== "1") {
      throw new Error(response.responsetext || "Failed to add payment method");
    }

    return response.customer_vault_id;
  }

  /**
   * Charge customer using their vault ID
   * This is called by our billing cron for recurring charges
   */
  async chargeCustomer(params: {
    customerId: string;  // This is the NMI customer_vault_id
    amountCents: number;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<ChargeResult> {
    const response = await this.makeRequest({
      type: "sale",
      customer_vault_id: params.customerId,
      amount: (params.amountCents / 100).toFixed(2),
      order_description: params.description,
      // Store metadata in merchant defined fields
      merchant_defined_field_1: params.metadata?.organization_id ?? "",
      merchant_defined_field_2: params.metadata?.billing_period ?? "",
    });

    return {
      id: response.transactionid ?? "",
      success: response.response === "1",
      errorMessage: response.response !== "1" ? response.responsetext : undefined,
    };
  }

  /**
   * "Create subscription" in NMI context means:
   * 1. Store subscription details in our database
   * 2. Schedule first charge for after trial period
   * 
   * NMI doesn't manage subscriptions - we do!
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity: number;
    trialDays?: number;
    paymentMethodId: string;
    metadata?: Record<string, string>;
  }): Promise<Subscription> {
    // Generate our own subscription ID
    const subscriptionId = `nmi_sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const now = new Date();
    const trialEnd = params.trialDays 
      ? new Date(now.getTime() + params.trialDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    // First billing date is after trial (or now if no trial)
    const firstBillingDate = trialEnd ?? now;
    
    // Return subscription object - caller must save to database!
    return {
      id: subscriptionId,
      customerId: params.customerId,
      status: params.trialDays ? "trialing" : "active",
      quantity: params.quantity,
      trialEnd,
      currentPeriodEnd: new Date(firstBillingDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      metadata: {
        ...params.metadata,
        nmi_vault_id: params.paymentMethodId,
        price_id: params.priceId,
        next_billing_date: firstBillingDate.toISOString(),
      },
    };
  }

  /**
   * Update quantity - just updates our database
   * Next charge will use new quantity
   */
  async updateSubscriptionQuantity(subscriptionItemId: string, quantity: number): Promise<void> {
    // This is a no-op for NMI - quantity is stored in our database
    // The billing cron reads quantity from DB when charging
    console.log(`NMI: Update quantity for ${subscriptionItemId} to ${quantity} in database`);
  }

  /**
   * Cancel subscription - mark as canceled in database
   * Billing cron will skip canceled subscriptions
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    // No NMI API call needed - just update database status
    console.log(`NMI: Mark subscription ${subscriptionId} as canceled in database`);
  }

  /**
   * Pause subscription - mark as paused in database
   */
  async pauseSubscription(subscriptionId: string): Promise<void> {
    console.log(`NMI: Mark subscription ${subscriptionId} as paused in database`);
  }

  /**
   * Resume subscription - mark as active in database
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    console.log(`NMI: Mark subscription ${subscriptionId} as active in database`);
  }

  /**
   * Make request to NMI API
   * NMI uses form-encoded POST and returns form-encoded response
   */
  private async makeRequest(params: Record<string, string>): Promise<Record<string, string>> {
    const body = new URLSearchParams({
      security_key: this.securityKey,
      ...params,
    });

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const text = await response.text();
    
    // NMI returns URL-encoded key=value pairs
    const result: Record<string, string> = {};
    for (const pair of text.split("&")) {
      const [key, value] = pair.split("=");
      if (key) result[key] = decodeURIComponent(value ?? "");
    }
    
    return result;
  }
}
```

#### 1.4 Create gateway factory
- [ ] Create `apps/dashboard/src/lib/payment/index.ts`

```typescript
// apps/dashboard/src/lib/payment/index.ts

import type { PaymentGateway, PaymentProvider } from "./types";
import { StripeGateway } from "./stripe-gateway";
import { NMIGateway } from "./nmi-gateway";

// Single env var controls active payment processor
// Change this to switch processors instantly
const ACTIVE_PROVIDER = (process.env.PAYMENT_PROVIDER || "stripe") as PaymentProvider;

let gatewayInstance: PaymentGateway | null = null;

/**
 * Get the active payment gateway
 * Returns null if no payment provider is configured (dev mode)
 */
export function getPaymentGateway(): PaymentGateway | null {
  if (gatewayInstance) return gatewayInstance;

  switch (ACTIVE_PROVIDER) {
    case "stripe":
      if (!process.env.STRIPE_SECRET_KEY) {
        console.warn("STRIPE_SECRET_KEY not set - billing in dev mode");
        return null;
      }
      gatewayInstance = new StripeGateway(process.env.STRIPE_SECRET_KEY);
      break;
    
    case "nmi":
      if (!process.env.NMI_SECURITY_KEY) {
        console.warn("NMI_SECURITY_KEY not set - billing in dev mode");
        return null;
      }
      gatewayInstance = new NMIGateway(process.env.NMI_SECURITY_KEY);
      break;
    
    default:
      console.error(`Unknown payment provider: ${ACTIVE_PROVIDER}`);
      return null;
  }

  return gatewayInstance;
}

/**
 * Get the currently active payment provider name
 */
export function getActiveProvider(): PaymentProvider {
  return ACTIVE_PROVIDER;
}

/**
 * Check if a specific provider is available (has credentials)
 */
export function isProviderAvailable(provider: PaymentProvider): boolean {
  switch (provider) {
    case "stripe":
      return !!process.env.STRIPE_SECRET_KEY;
    case "nmi":
      return !!process.env.NMI_SECURITY_KEY;
    default:
      return false;
  }
}

// Re-export types
export * from "./types";
```

### Phase 2: Database Schema Updates

#### 2.1 Create migration for generic payment columns
- [ ] Create migration `supabase/migrations/YYYYMMDD_payment_gateway_abstraction.sql`

```sql
-- Migration: Support multiple payment providers
-- Allows switching between Stripe and NMI

-- Add provider tracking column
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe'
  CHECK (payment_provider IN ('stripe', 'nmi'));

-- For NMI: We need to track billing ourselves
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_billing_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_billing_error TEXT;

-- Create billing_transactions table for NMI charge history
CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'nmi')),
  transaction_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_org 
  ON billing_transactions(organization_id, created_at DESC);

-- Comment for clarity
COMMENT ON COLUMN organizations.payment_provider IS 'Active payment processor: stripe or nmi';
COMMENT ON COLUMN organizations.next_billing_date IS 'For NMI: when to charge next (Stripe manages this itself)';
```

### Phase 3: Update API Routes

#### 3.1 Update create-subscription route
- [ ] Refactor `apps/dashboard/src/app/api/billing/create-subscription/route.ts` to use gateway

#### 3.2 Update setup-intent route
- [ ] Refactor `apps/dashboard/src/app/api/billing/setup-intent/route.ts` to use gateway

#### 3.3 Update seats route
- [ ] Refactor `apps/dashboard/src/app/api/billing/seats/route.ts` to use gateway

#### 3.4 Update billing settings route
- [ ] Refactor `apps/dashboard/src/app/api/billing/update-settings/route.ts` to use gateway

### Phase 4: NMI Billing Cron Job

#### 4.1 Create billing cron endpoint
- [ ] Create `apps/dashboard/src/app/api/cron/process-billing/route.ts`

```typescript
// apps/dashboard/src/app/api/cron/process-billing/route.ts
// Called daily by Vercel Cron to process NMI recurring charges

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaymentGateway, getActiveProvider } from "@/lib/payment";
import { PRICING } from "@/lib/stripe";

// Verify cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Verify this is a legitimate cron call
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only run for NMI - Stripe handles its own billing
  if (getActiveProvider() !== "nmi") {
    return NextResponse.json({ message: "Skipped - using Stripe" });
  }

  const gateway = getPaymentGateway();
  if (!gateway) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const now = new Date();

  // Find organizations due for billing
  const { data: dueOrgs, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("payment_provider", "nmi")
    .in("subscription_status", ["active", "trialing"])
    .lte("next_billing_date", now.toISOString())
    .lt("billing_retry_count", 3);  // Max 3 retries

  if (error) {
    console.error("Error fetching due orgs:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const org of dueOrgs ?? []) {
    results.processed++;

    // Calculate amount based on billing frequency and seats
    const pricing = PRICING[org.billing_frequency as keyof typeof PRICING] ?? PRICING.monthly;
    const amountCents = pricing.price * 100 * (org.seat_count ?? 1);

    // For trial ending, transition to active
    const wasTrialing = org.subscription_status === "trialing";

    try {
      const chargeResult = await gateway.chargeCustomer({
        customerId: org.stripe_customer_id,  // Actually NMI vault ID
        amountCents,
        description: `Digital Greeter - ${org.seat_count} seat(s) - ${pricing.label}`,
        metadata: {
          organization_id: org.id,
          billing_period: now.toISOString(),
        },
      });

      if (chargeResult.success) {
        results.succeeded++;

        // Calculate next billing date based on frequency
        const nextBilling = new Date(now);
        if (org.billing_frequency === "annual") {
          nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        } else if (org.billing_frequency === "six_month") {
          nextBilling.setMonth(nextBilling.getMonth() + 6);
        } else {
          nextBilling.setMonth(nextBilling.getMonth() + 1);
        }

        await supabase
          .from("organizations")
          .update({
            subscription_status: "active",
            next_billing_date: nextBilling.toISOString(),
            billing_retry_count: 0,
            last_billing_attempt: now.toISOString(),
            last_billing_error: null,
          })
          .eq("id", org.id);

        // Record successful transaction
        await supabase.from("billing_transactions").insert({
          organization_id: org.id,
          provider: "nmi",
          transaction_id: chargeResult.id,
          amount_cents: amountCents,
          status: "success",
          billing_period_start: now.toISOString(),
          billing_period_end: nextBilling.toISOString(),
        });

      } else {
        results.failed++;
        results.errors.push(`Org ${org.id}: ${chargeResult.errorMessage}`);

        await supabase
          .from("organizations")
          .update({
            billing_retry_count: (org.billing_retry_count ?? 0) + 1,
            last_billing_attempt: now.toISOString(),
            last_billing_error: chargeResult.errorMessage,
            // Mark as past_due after first failure
            subscription_status: "past_due",
          })
          .eq("id", org.id);

        // Record failed transaction
        await supabase.from("billing_transactions").insert({
          organization_id: org.id,
          provider: "nmi",
          transaction_id: chargeResult.id || "failed",
          amount_cents: amountCents,
          status: "failed",
          error_message: chargeResult.errorMessage,
        });

        // TODO: Send payment failed email
      }
    } catch (err) {
      results.failed++;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.errors.push(`Org ${org.id}: ${errorMsg}`);
    }
  }

  return NextResponse.json(results);
}
```

#### 4.2 Configure Vercel Cron
- [ ] Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-billing",
      "schedule": "0 6 * * *"
    }
  ]
}
```

- [ ] Add `CRON_SECRET` to environment variables

### Phase 5: Frontend Payment Form

#### 5.1 Create dual-mode payment form component
- [ ] Create `apps/dashboard/src/lib/components/PaymentForm.tsx`

```typescript
// See implementation in conversation above
// Supports both Stripe Elements and NMI Collect.js
```

#### 5.2 Update paywall page to use new component
- [ ] Update `apps/dashboard/src/app/paywall/page.tsx` to detect provider and render appropriate form

### Phase 6: Environment Variables

#### 6.1 Add new env vars to Vercel
- [ ] `PAYMENT_PROVIDER` - Set to "stripe" or "nmi"
- [ ] `NMI_SECURITY_KEY` - NMI API security key
- [ ] `NMI_TOKENIZATION_KEY` - NMI Collect.js tokenization key
- [ ] `CRON_SECRET` - Secret for cron job authentication

#### 6.2 Update env.example
- [ ] Document all payment-related env vars

### Phase 7: Testing & Validation

- [ ] Test Stripe flow still works after refactor
- [ ] Test NMI customer vault creation
- [ ] Test NMI Collect.js tokenization in frontend
- [ ] Test NMI direct charge API
- [ ] Test billing cron job with test transactions
- [ ] Test switching providers via env var
- [ ] Load test billing cron for high org counts

### Switching Processors Checklist

When you need to switch from Stripe to NMI (or vice versa):

1. [ ] Ensure backup provider credentials are in env vars
2. [ ] Change `PAYMENT_PROVIDER` env var
3. [ ] Redeploy application
4. [ ] New signups will use new provider
5. [ ] Existing customers continue on their original provider
6. [ ] Monitor billing_transactions table for any issues

### NMI-Specific Notes

**Customer Vault**: NMI's equivalent of Stripe customers. Stores card securely.

**Collect.js**: NMI's frontend library for secure card entry. Similar to Stripe Elements.
- Load via script tag with tokenization key
- Returns a payment token on success
- Token used to create vault entry

**No Webhooks for Subscriptions**: Unlike Stripe, NMI doesn't send subscription events.
- We manage subscription state in our database
- Billing cron checks `next_billing_date` daily
- Failed payments marked `past_due`, retry up to 3 times

**Response Codes**:
- `response=1` = Approved
- `response=2` = Declined
- `response=3` = Error
- Check `responsetext` for details

