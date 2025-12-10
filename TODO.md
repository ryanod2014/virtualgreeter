# Launch Checklist

## Stripe Billing
- [ ] Switch to live Stripe keys in Vercel (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- [ ] Create seat-based price in Stripe Dashboard
- [ ] Create three prices in Stripe Dashboard (monthly, annual, 6-month)
- [ ] Set `STRIPE_MONTHLY_PRICE_ID` to the monthly price ID ($297/seat/mo)
- [ ] Set `STRIPE_ANNUAL_PRICE_ID` to the annual price ID ($2,316/seat/yr)
- [ ] Set `STRIPE_SIX_MONTH_PRICE_ID` to the 6-month price ID ($1,068/seat/6mo)
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

---

## Billing Testing Scenarios (Use Stripe Test Mode)

**Prerequisites:**
- Enable Stripe test mode in dashboard
- Use test cards: `4242424242424242` (success), `4000000000000341` (attach fail), `4000000000009995` (insufficient funds)
- Set clock in Stripe test mode for time-dependent tests

### 1. TRIAL PERIOD

#### 1.1 Trial Start
- [ ] New signup creates 7-day trial correctly
- [ ] Trial end date displayed correctly in billing settings
- [ ] Trial status shows "trialing" in organization
- [ ] No charge attempted during trial

#### 1.2 Trial Expiration
- [ ] Trial → Active transition when card charged successfully at trial end
- [ ] Trial → Past Due when payment fails at trial end
- [ ] Correct prorated amount charged based on plan selected
- [ ] Email notification sent on trial ending (if implemented)

#### 1.3 Trial Cancellation
- [ ] Cancel during trial stops subscription without charge
- [ ] Cancellation feedback modal works
- [ ] Organization marked as cancelled/free

### 2. SUBSCRIPTION CREATION

#### 2.1 Monthly Plan ($297/seat)
- [ ] Create subscription with 1 seat - $297 charged after trial
- [ ] Create subscription with 3 seats - $891 charged after trial
- [ ] Create subscription with 5 seats - $1,485 charged after trial
- [ ] Correct metadata stored (organization_id, billing_preference)

#### 2.2 Annual Plan ($193/seat/month = $2,316/seat/year)
- [ ] Create annual subscription with 1 seat - $2,316 charged after trial
- [ ] Create annual subscription with 3 seats - $6,948 charged after trial
- [ ] 35% discount applied correctly vs monthly
- [ ] Annual renewal date set correctly (1 year out)

#### 2.3 Six-Month Plan ($178/seat/month = $1,068/seat/6mo)
- [ ] Create 6-month subscription with 1 seat - $1,068 charged after trial
- [ ] Create 6-month subscription with 3 seats - $3,204 charged after trial
- [ ] 40% discount applied correctly vs monthly
- [ ] has_six_month_offer flag set correctly
- [ ] 6-month renewal date set correctly

### 3. SEAT MANAGEMENT & PRORATION

#### 3.1 Adding Seats (Mid-Cycle)
- [ ] Add 1 seat mid-month → prorated charge created
- [ ] Add 2 seats mid-month → correct prorated amount
- [ ] Seat count updates in Stripe subscription item
- [ ] seat_count updates in organizations table
- [ ] Next invoice reflects new seat count

#### 3.2 Seat Addition Proration Calculations
- [ ] Add seat on day 1 of 30-day cycle → ~100% charge
- [ ] Add seat on day 15 of 30-day cycle → ~50% charge
- [ ] Add seat on day 25 of 30-day cycle → ~17% charge
- [ ] Verify proration appears on next invoice

#### 3.3 Reducing Seats
- [ ] Reduce seats creates credit for remaining period
- [ ] Cannot reduce below current usage (active agents + pending invites)
- [ ] Error message shows current usage when reduction blocked
- [ ] Prorated credit applied to next invoice

#### 3.4 Seat Edge Cases
- [ ] Add seat → remove seat same day (minimal/no charge)
- [ ] Rapid seat changes in sequence
- [ ] Seat change during trial period (no immediate charge)
- [ ] Seat count matches active agents enforcement

### 4. BILLING FREQUENCY CHANGES

#### 4.1 Monthly → Annual
- [ ] Upgrade mid-cycle creates prorated credit for unused monthly
- [ ] Annual charge prorated from upgrade date
- [ ] billing_frequency updates in database
- [ ] Stripe subscription item price ID changes
- [ ] Next billing date reflects annual cycle

#### 4.2 Annual → Monthly
- [ ] Downgrade applies at end of annual period (no early refund)
- [ ] OR: Immediate switch with prorated refund (if supported)
- [ ] Monthly billing starts at next period

#### 4.3 Monthly → Six-Month
- [ ] Upgrade creates prorated credit for unused monthly
- [ ] Six-month charge prorated from upgrade date
- [ ] has_six_month_offer only available if originally selected

#### 4.4 Six-Month → Monthly
- [ ] Downgrade behavior at period end

### 5. PAUSE FUNCTIONALITY

#### 5.1 Pause Initiation
- [ ] Pause for 1 month → pause_ends_at = +1 month
- [ ] Pause for 2 months → pause_ends_at = +2 months
- [ ] Pause for 3 months → pause_ends_at = +3 months
- [ ] subscription_status = "paused"
- [ ] Stripe subscription paused (pause_collection: void)
- [ ] pause_history record created

#### 5.2 During Pause
- [ ] No billing during pause period
- [ ] Widget access restricted (if implemented)
- [ ] Dashboard shows pause status and resume date
- [ ] Resume button available

#### 5.3 Manual Resume
- [ ] Resume before pause_ends_at works
- [ ] subscription_status = "active"
- [ ] Stripe subscription resumed
- [ ] Billing resumes from resume date
- [ ] pause_history record created (action: resumed)

#### 5.4 Auto-Resume
- [ ] Subscription auto-resumes at pause_ends_at
- [ ] Billing restarts correctly
- [ ] Email notification sent (if implemented)

#### 5.5 Pause Edge Cases
- [ ] Multiple pauses (check if limits exist)
- [ ] Pause during trial period (behavior?)
- [ ] Cancel while paused

### 6. CANCELLATION

#### 6.1 Immediate Cancellation
- [ ] Cancel triggers cancellation feedback modal
- [ ] Primary reason required
- [ ] Additional reasons optional
- [ ] Feedback saved to cancellation_feedback table

#### 6.2 Post-Cancellation State
- [ ] subscription_status = "canceled"
- [ ] Stripe subscription canceled
- [ ] plan downgraded to "free"
- [ ] Access continues until period end (or immediate cutoff?)

#### 6.3 Cancellation Scenarios
- [ ] Cancel during trial (no charge)
- [ ] Cancel mid-month (access until period end)
- [ ] Cancel mid-annual (access until period end)
- [ ] Cancel while paused

#### 6.4 Reactivation After Cancel
- [ ] Resubscribe after cancellation works
- [ ] New trial or immediate billing?
- [ ] Previous seat count restored or fresh start?

### 7. PAYMENT FAILURES

#### 7.1 Card Declined
- [ ] Use card `4000000000009995` (insufficient funds)
- [ ] subscription_status = "past_due"
- [ ] Retry mechanism (Stripe Smart Retries)
- [ ] Email notification sent

#### 7.2 Card Expired
- [ ] Use card `4000000000000069` (expired)
- [ ] Update card flow works
- [ ] Subscription recovers after card update

#### 7.3 Failed Payment Recovery
- [ ] Update payment method while past_due
- [ ] Outstanding invoice charged successfully
- [ ] subscription_status returns to "active"

#### 7.4 Multiple Failed Attempts
- [ ] After 3+ failures, subscription canceled?
- [ ] Grace period behavior
- [ ] Access restrictions during past_due

### 8. WEBHOOKS

#### 8.1 Subscription Events
- [ ] `customer.subscription.created` - handled correctly
- [ ] `customer.subscription.updated` - status/quantity synced
- [ ] `customer.subscription.deleted` - organization updated
- [ ] `customer.subscription.trial_will_end` - notification sent

#### 8.2 Invoice Events
- [ ] `invoice.paid` - subscription stays active
- [ ] `invoice.payment_failed` - status updated to past_due
- [ ] `invoice.upcoming` - (for proactive notifications)

#### 8.3 Payment Events
- [ ] `payment_intent.succeeded` - logged
- [ ] `payment_intent.payment_failed` - logged, alerts sent

### 9. BILLING SETTINGS UI

#### 9.1 Display Accuracy
- [ ] Current plan/price displayed correctly
- [ ] Used seats vs purchased seats accurate
- [ ] Next billing date correct
- [ ] Billing history shows all transactions

#### 9.2 Actions Work
- [ ] Change seat count from UI
- [ ] Change billing frequency from UI
- [ ] Update payment method
- [ ] Download invoices/receipts

### 10. EDGE CASES & RACE CONDITIONS

#### 10.1 Concurrent Operations
- [ ] Two admins change seats simultaneously
- [ ] Seat change during billing cycle rollover
- [ ] Plan change while webhook processing

#### 10.2 Timing Edge Cases
- [ ] Subscription created at 11:59 PM (day boundary)
- [ ] Trial ends on weekend/holiday
- [ ] Pause ends during failed payment retry

#### 10.3 Data Consistency
- [ ] Stripe and DB seat counts match
- [ ] Stripe and DB subscription status match
- [ ] Stripe and DB billing frequency match

### 11. STRIPE TEST CARDS REFERENCE

| Card Number | Behavior |
|-------------|----------|
| 4242424242424242 | Success |
| 4000000000000341 | Attaching fails |
| 4000000000009995 | Insufficient funds |
| 4000000000000002 | Generic decline |
| 4000000000000069 | Expired card |
| 4000000000000127 | Incorrect CVC |
| 4000002500003155 | Requires 3D Secure |
| 4000003720000278 | Funds immediately after auth |

**Test Clock (Stripe Dashboard → Developers → Test Clocks):**
- Use to simulate time passing for trial expiration, renewals, etc.

---

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
- Pool coverage alerts (notify admin when specific pools have no agents assigned or high missed visitor rates)
- Missed call digest (daily summary of missed opportunities)
- Re-engagement email if no logins for 7+ days
- Tips & best practices series (how to convert more calls, video tips, etc.)
- NPS/feedback request after X calls completed

## Settings
- [ ] Add company-level setting to change max visitors per agent (currently hardcoded default of 25 in `agent_profiles.max_simultaneous_simulations`)

## Optional / Nice-to-Have
- [ ] Set up Deepgram for call transcription ($0.01/min)
- [ ] Set up OpenAI for AI summaries ($0.02/min)
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring

---

## GreetNow B2B Retargeting Pixel

Server-side Facebook Conversions API integration to retarget widget visitors with GreetNow ads.

### What It Does

Fires GreetNow's Facebook pixel via server-side Conversions API (invisible to users/ad blockers):

| Event | Audience | When Fired |
|-------|----------|------------|
| `GreetNow_WidgetView` | All visitors | Widget popup shown |
| `GreetNow_WidgetView_B2B` | B2B visitors only | Widget popup shown (if org marked B2B) |
| `GreetNow_CallStarted` | All visitors | Call accepted |
| `GreetNow_CallStarted_B2B` | B2B visitors only | Call accepted (if org marked B2B) |
| `Lead` | All visitors | Call accepted (standard FB event for optimization) |

### How to Configure

1. **Get Facebook Credentials**:
   - Go to [Facebook Events Manager](https://www.facebook.com/events_manager)
   - Create or select your Pixel
   - Get the **Pixel ID** (under Data Sources)
   - Generate a **Conversions API Access Token** (Settings → Generate Access Token)

2. **Configure in Platform Dashboard**:
   - Navigate to `/platform/retargeting`
   - Enter Pixel ID and Access Token
   - Enable the pixel toggle
   - Mark B2B organizations (toggle per-org in the table)

3. **Test with Test Event Code** (optional):
   - In Facebook Events Manager, go to Test Events
   - Copy the test event code
   - Paste in the "Test Event Code" field
   - Events will appear in Test Events tab for debugging
   - Remove test code for production

### Testing Checklist

- [ ] Configure pixel settings in `/platform/retargeting`
- [ ] Enable at least one organization as B2B
- [ ] Trigger a widget view on a test page
- [ ] Trigger a call accept
- [ ] Verify events appear in Facebook Events Manager → Test Events
- [ ] Verify two audiences buildable: "All Widget Visitors" and "B2B Widget Visitors"

### Creating Facebook Audiences

After events are flowing:

1. **All Visitors Audience**:
   - Audiences → Create Custom Audience → Website
   - Event: `GreetNow_WidgetView` or `GreetNow_CallStarted`
   - Retention: 30-180 days

2. **B2B Visitors Audience** (higher intent):
   - Same process but use `GreetNow_WidgetView_B2B` or `GreetNow_CallStarted_B2B`
   - Ad copy: "You had a conversation using GreetNow. Want the same for your business?"

### Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20251201200000_greetnow_retargeting.sql` | DB schema |
| `apps/server/src/lib/greetnow-retargeting.ts` | Server-side CAPI integration |
| `apps/dashboard/src/app/(app)/platform/retargeting/` | Platform admin UI |
| `apps/server/src/features/signaling/socket-handlers.ts` | Event triggers |

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

---

## QA Bug Fixes & Feature Tickets

> These tickets were generated from a comprehensive QA audit. Each ticket is self-contained and can be assigned to an agent to work on independently.

---

### P0 - Critical Bugs (Ship Blockers)

---

#### ✅ P0-001: Allow Cancelled Users to Re-Subscribe (COMPLETED)

**Priority:** P0 - Critical  
**Type:** Bug Fix  
**Estimated Effort:** 30 minutes
**Status:** ✅ Completed

**Description:**  
Users who cancel their subscription cannot create a new subscription. The system blocks them because `stripe_subscription_id` already exists, even though the subscription status is "cancelled".

**Current Behavior:**  
- User cancels subscription
- `stripe_subscription_id` remains in database
- User tries to re-subscribe
- API returns `"Subscription already exists"` error
- User is stuck and cannot pay

**Expected Behavior:**  
- Cancelled users should be able to create a new subscription
- Should get a new 7-day trial (per product decision)
- Old `stripe_subscription_id` should be cleared or a new one created

**Files Modified:**
- `apps/dashboard/src/app/api/billing/create-subscription/route.ts`
- `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts` (new - regression tests)

**Acceptance Criteria:**
- [x] User with cancelled subscription can navigate to paywall
- [x] User can enter payment info and create new subscription
- [x] User receives 7-day trial on new subscription
- [x] Old subscription ID is cleared from database
- [x] New subscription ID is stored correctly

---

#### ✅ P0-002: Call Rejection Should Route to Different Agent (COMPLETED)

**Priority:** P0 - Critical  
**Type:** Bug Fix  
**Estimated Effort:** 1-2 hours
**Status:** ✅ Completed

**Description:**  
When an agent rejects an incoming call, the system creates a new call request for THE SAME AGENT. This means the visitor is stuck waiting for an agent who already rejected them, and could create an infinite rejection loop.

**Current Behavior:**  
- Visitor requests call with Agent A
- Agent A rejects
- System creates NEW request for Agent A again
- Agent A gets notified again (could reject again infinitely)
- Visitor waits forever

**Expected Behavior:**  
- Agent A rejects call
- System finds Agent B (different agent in same pool)
- If no other agents available, inform visitor
- Agent A should NOT receive the same visitor again (at least not immediately)

**Files Modified:**
- `apps/server/src/features/signaling/socket-handlers.ts` - Updated CALL_REJECT handler
- `apps/server/src/features/routing/pool-manager.ts` - Added `excludeAgentId` parameter to `findBestAgent` and `findBestAgentForVisitor`

**Acceptance Criteria:**
- [x] When agent rejects, call routes to different agent
- [x] If no other agents, visitor receives "no agents available" message
- [x] Widget shows appropriate UI for rejection
- [x] Call logs show both the rejection and new routing
- [x] Rejected agent does not receive same visitor again immediately

---

#### ✅ P0-003: Invite Creation Order - Create Invite Before Charging Seat (COMPLETED)

**Priority:** P0 - Critical  
**Type:** Bug Fix  
**Estimated Effort:** 1 hour
**Status:** ✅ Completed

**Description:**  
The invite flow charges the billing seat BEFORE creating the invite record. If invite creation fails, the seat charge rollback may also fail, leaving the customer charged for a seat with no invite.

**Current Behavior:**  
1. Add seat to Stripe (API call)
2. Create invite record (DB insert)
3. If step 2 fails, try to remove seat
4. If rollback fails, customer is charged with no invite

**Expected Behavior:**  
1. Create invite record (DB insert) - easily reversible
2. Add seat to Stripe (API call)
3. If step 2 fails, delete invite record (trivial)
4. No orphaned charges possible

**Files Modified:**
- `apps/dashboard/src/app/api/invites/send/route.ts`

**Acceptance Criteria:**
- [x] Invite record is created before Stripe is called
- [x] If Stripe fails, invite is deleted (clean rollback)
- [x] No orphaned billing charges possible
- [x] Happy path still works correctly
- [ ] Add test for failure scenario

---

#### ✅ P0-004: RNA Timeout Should Lose Race to Agent Accept (COMPLETED)

**Priority:** P0 - Critical  
**Type:** Bug Fix  
**Estimated Effort:** 30 minutes
**Status:** ✅ Completed

**Description:**  
When an agent clicks "Accept" at the exact moment the RNA (Ring-No-Answer) timeout fires, it's a race condition. The agent should always win - if they clicked accept, the call should connect.

**Current Behavior:**  
- RNA timeout and Accept click race
- Whichever processes first wins
- Agent might see "Call Cancelled" even though they clicked Accept

**Expected Behavior:**  
- If agent clicks Accept, they always win
- RNA timeout should check if call was already accepted before proceeding

**Files Modified:**
- `apps/server/src/features/signaling/socket-handlers.ts`

**Solution:**
Added a race condition check in the `startRNATimeout` function. After the timeout fires, we now check if an active call already exists for the visitor (meaning the agent accepted). If so, we skip the timeout processing and let the call continue.

The `CALL_ACCEPT` handler already clears the timeout first (line 644), but this additional check handles the edge case where the timeout callback has already started executing.

**Acceptance Criteria:**
- [x] Agent clicking accept always wins over RNA timeout
- [x] No "Call Cancelled" shown when agent accepted
- [x] RNA timeout gracefully handles race condition
- [x] Call connects successfully in race scenario

---

### P1 - High Priority Bugs

---

#### ✅ P1-001: Widget Should Reappear When Agent Becomes Available (COMPLETED)

**Priority:** P1 - High  
**Type:** Feature  
**Estimated Effort:** 2-3 hours
**Status:** ✅ Completed

**Description:**  
When a visitor loads a page with no agents available, the widget doesn't appear. If an agent then comes online, the visitor never sees the widget - they have to refresh the page.

**Files Modified:**
- `apps/server/src/features/signaling/socket-handlers.ts` - Fixed AGENT_LOGIN and AGENT_BACK handlers to use `findBestAgentForVisitor` for proper pool-based routing when assigning unassigned visitors
- `apps/widget/src/Widget.tsx` - Added `visitorConnectedAtRef` and remaining trigger delay calculation
- `packages/domain/src/types.ts` - Added `visitorConnectedAt` to `AgentAssignedPayload`

**Solution:**
1. **Server-side fixes:**
   - Updated `AGENT_LOGIN` handler to use `findBestAgentForVisitor()` instead of blindly assigning all unassigned visitors
   - Updated `AGENT_BACK` handler with the same fix
   - Both handlers now include `visitorConnectedAt` in the payload so widget can calculate remaining trigger delay

2. **Widget-side fixes:**
   - Added `visitorConnectedAtRef` to track when visitor first connected
   - Updated the widget show effect to calculate remaining trigger delay:
     - If visitor has been on page longer than `trigger_delay`, shows immediately
     - If less than `trigger_delay`, waits only the remaining time
   - This ensures visitors who waited for an agent don't have to wait the full trigger delay again

**Acceptance Criteria:**
- [x] Visitor on page with no agents sees no widget
- [x] When agent comes online, visitor receives AGENT_ASSIGNED
- [x] Widget appears respecting trigger delay logic (shows instantly if waited long enough)
- [x] Auto-hide timer starts from widget appearance
- [x] Works for multiple waiting visitors
- [x] Proper pool-based routing is respected (visitor only gets agents from matching pools)

---

#### ✅ P1-002: Widget Should Hide Completely When No Agents (COMPLETED)

**Priority:** P1 - High  
**Type:** Bug Fix  
**Estimated Effort:** 30 minutes
**Status:** ✅ Completed

**Description:**  
When all agents become unavailable (go away/offline), visitors who were watching the simulation should see the widget hide completely.

**Files Modified:**
- `apps/widget/src/Widget.tsx`

**Solution:**
The widget already handled AGENT_UNAVAILABLE by setting `setState("hidden")`, which causes the component to return `null` (line 942). Enhanced the handler to also:
1. Clean up any active camera/mic preview streams
2. Reset camera/mic state flags
3. Store widget settings for potential reappearance (P1-001)

The socket connection is maintained because hooks execute before the early return, allowing the widget to reappear when an agent becomes available.

**Acceptance Criteria:**
- [x] Widget hides when AGENT_UNAVAILABLE received (`setState("hidden")` → `return null`)
- [x] No error messages or broken UI (just disappears)
- [x] Socket connection maintained (hooks run before early return)
- [x] Camera/mic preview cleaned up if visitor was starting a call
- [x] Widget can reappear per P1-001 (now completed)

---

#### ✅ P1-003: Catch-All Pool Validation - Prevent Rules (COMPLETED)

**Priority:** P1 - High  
**Type:** Feature  
**Estimated Effort:** 30 minutes
**Status:** ✅ Completed

**Description:**  
Catch-all pools should not have routing rules. The purpose of a catch-all is to receive all traffic that doesn't match other pools. Having rules on a catch-all is contradictory.

**Files Modified:**
- `apps/dashboard/src/app/(app)/admin/pools/pools-client.tsx` - Added validation + improved UI messaging
- `supabase/migrations/20251203100000_catch_all_pool_validation.sql` - Database trigger + cleanup

**Solution:**
1. **Improved UI messaging** - Catch-all pools now show:
   - Amber "Catch-All" badge with "No Rules Allowed" sub-badge
   - Clear explanation that it receives all visitors not matching other pools
   - Helpful tip: "Want to route specific pages? Create a new pool with routing rules"
   - Quick "Create a New Pool" button that opens the create pool form
2. **Handler validation** - Added checks in `handleAddRoutingRule` and `handleUpdateRoutingRule` to prevent programmatic rule additions
3. **Database trigger** - Created a trigger that raises an exception if anyone tries to insert rules into catch-all pools (defense in depth)
4. **Data cleanup** - Migration also deletes any existing rules from catch-all pools

**Acceptance Criteria:**
- [x] Cannot add rules to catch-all pool in UI
- [x] Clear badge showing "Catch-All" + "No Rules Allowed"
- [x] Guidance to create new pool if they need rules
- [x] Handler functions reject rule creation for catch-all pools
- [x] Database trigger prevents rules at DB level
- [x] Existing rules deleted from catch-all pools (migration cleanup)

---

#### ✅ P1-004: Call Persistence - Survive Page Navigation & Server Restarts (COMPLETED)

**Priority:** P1 - High  
**Type:** Feature  
**Estimated Effort:** 4-6 hours
**Status:** ✅ Completed (page navigation), 🔜 Server restart pending

**Description:**  
Calls should persist across:
1. **Visitor page navigation** - Visitor navigates to ANY page with widget installed, call continues ✅
2. **Server restarts** - Both parties reconnect automatically (infrastructure in place, handler pending)

**Files Modified:**
- `supabase/migrations/20251203200000_call_recovery.sql` - DB schema for reconnect tokens
- `apps/server/src/lib/call-logger.ts` - Reconnect token generation, heartbeat tracking, orphaned call lookup
- `packages/domain/src/constants.ts` - New socket events (CALL_RECONNECT, CALL_RECONNECTED, etc.)
- `packages/domain/src/types.ts` - New payload types for reconnection
- `apps/server/src/features/signaling/socket-handlers.ts` - CALL_RECONNECT handler
- `apps/server/src/features/routing/pool-manager.ts` - `reconnectVisitorToCall()` method
- `apps/widget/src/features/signaling/useSignaling.ts` - localStorage token storage & reconnection
- `apps/widget/src/Widget.tsx` - Reconnection callbacks
- `apps/dashboard/src/features/signaling/use-signaling.ts` - CALL_RECONNECTED handler

**How It Works (Page Navigation):**
1. When call is accepted, visitor receives `reconnectToken` and stores it in localStorage
2. Visitor navigates to new page → widget unmounts, socket disconnects
3. New page loads → widget mounts, checks localStorage for active call
4. If token found + not expired (5 min), widget sends `CALL_RECONNECT` event
5. Server looks up call by token, reconnects visitor to their active call
6. Both parties receive `CALL_RECONNECTED` event
7. WebRTC is re-established automatically
8. Token is cleared when call ends normally

**Files to Modify:**
- `apps/server/src/features/signaling/socket-handlers.ts`
- `apps/server/src/lib/call-logger.ts`
- `packages/domain/src/database.types.ts`
- Database migration for new columns

**Database Migration:**
```sql
-- Add columns for call recovery
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS reconnect_token TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS reconnect_eligible BOOLEAN DEFAULT false;

-- Index for finding orphaned calls
CREATE INDEX IF NOT EXISTS idx_call_logs_reconnect 
  ON call_logs(status, reconnect_eligible, last_heartbeat_at);
```

**Implementation Overview:**

1. **On call accept:** Generate `reconnect_token`, set `reconnect_eligible = true`
2. **During call:** Update `last_heartbeat_at` every 10 seconds
3. **On server start:** Query for orphaned calls (accepted, no ended_at, recent heartbeat)
4. **On agent reconnect:** Check if they have an orphaned call, emit "call:reconnecting"
5. **On visitor reconnect:** Check if they have an orphaned call, emit "call:reconnecting"
6. **When both reconnected:** Emit "call:resumed", re-initiate WebRTC
7. **Timeout (30s):** If one party doesn't reconnect, end call with reason "reconnect_timeout"

**Acceptance Criteria:**
- [x] Calls survive visitor page navigation (ANY page with widget)
- [x] Widget stores reconnect token in localStorage on call start
- [x] Widget auto-reconnects when loading new page during active call
- [x] Server matches visitor to active call via reconnect token
- [x] Both parties receive CALL_RECONNECTED and re-establish WebRTC
- [x] Token cleared when call ends normally
- [x] Token expires after 5 minutes (prevents stale reconnections)
- [ ] Active calls survive server restart (infrastructure ready, handler pending)

---

### P2 - Medium Priority

---

#### ✅ P2-000: Preview Videos Not Playable in Agent Recording Flow (COMPLETED)

**Priority:** P2 - Medium  
**Type:** Bug Fix  
**Estimated Effort:** 30 minutes - 1 hour
**Status:** ✅ Completed

**Description:**  
When agents are setting up their videos (wave, intro, connect, loop), they should be able to preview the example videos to see what they're about to record. Currently, the example videos don't play.

**Current Behavior:**  
- Agent goes to record their videos
- Example video is displayed but cannot be played
- Agent has no reference for what they should record

**Expected Behavior:**  
- Example videos should be playable
- Agent can watch the example before recording their own
- Play button and video controls work correctly

**Files Modified:**
- `apps/dashboard/src/app/(app)/dashboard/videos/page.tsx`

**Solution:**
1. Added `isExamplePlaying` state to track playback status
2. Added `toggleExampleVideo` function to play/pause video on click
3. Added click-to-play overlay with play button when paused
4. Added hover-to-show pause button when playing
5. Reset playback state when navigating between stages
6. Applied to both Wave (mimic) and Smile (loop) example videos

**Acceptance Criteria:**
- [x] Example videos play when clicked
- [x] Video controls (play/pause) work correctly
- [x] Works across all video types (wave and loop examples)
- [x] Works on both desktop and mobile

---

#### ✅ P2-001: Investigate Billing Frequency Pricing (COMPLETED)

**Priority:** P2 - Medium  
**Type:** Investigation / Bug Fix  
**Estimated Effort:** 1-2 hours
**Status:** ✅ Completed

**Description:**  
The codebase was using the same `SEAT_PRICE_ID` for all billing frequencies (monthly, annual, six-month). This meant all plans were charging the monthly rate regardless of what the user selected.

**Root Cause:**  
- Only one Stripe price ID was configured (`STRIPE_SEAT_PRICE_ID`)
- The code used this single price for monthly, annual, and six-month plans
- Users selecting annual or six-month were being charged at the wrong rate

**Solution Implemented:**
1. **Updated `stripe.ts`** to support separate price IDs per billing frequency:
   - `STRIPE_MONTHLY_PRICE_ID` - $297/seat/month
   - `STRIPE_ANNUAL_PRICE_ID` - $2,316/seat/year ($193/mo equivalent)
   - `STRIPE_SIX_MONTH_PRICE_ID` - $1,068/seat/6mo ($178/mo equivalent)
   - Added `getPriceIdForFrequency()` helper function with fallback to monthly

2. **Updated `create-subscription/route.ts`** to use the correct price ID based on user's selected billing frequency

3. **Updated `update-settings/route.ts`** to swap Stripe subscription to the new price ID when user changes billing frequency

4. **Updated documentation** (`env.example`, `DEPLOYMENT.md`, `TODO.md` Launch Checklist)

**Files Modified:**
- `apps/dashboard/src/lib/stripe.ts`
- `apps/dashboard/src/app/api/billing/create-subscription/route.ts`
- `apps/dashboard/src/app/api/billing/update-settings/route.ts`
- `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts`
- `apps/dashboard/env.example`
- `DEPLOYMENT.md`

**Acceptance Criteria:**
- [x] Separate price IDs now used for each billing frequency
- [x] `create-subscription` uses correct price based on `billingPreference`
- [x] `update-settings` swaps Stripe price when frequency changes
- [x] Backwards compatible with `STRIPE_SEAT_PRICE_ID` for existing deployments
- [x] Documentation updated

---

#### ✅ P2-002: Verify Admin-Agent Seat Counting (COMPLETED)

**Priority:** P2 - Medium  
**Type:** Bug Fix (if broken) / Verification  
**Estimated Effort:** 1 hour
**Status:** ✅ Completed

**Description:**  
Admins who choose to take calls (and thus have an agent profile) should count toward seat limits. Need to verify the current seat counting logic correctly includes these admin-agents.

**Investigation Results:**

1. **Seat counting query is CORRECT** - The `/api/billing/seats` endpoint correctly counts ALL `agent_profiles` with `is_active = true`, regardless of user role. Admin-agents ARE counted.

2. **BUG FOUND**: The `handleAddMyself` function in `agents-client.tsx` was missing the billing API call!
   - When an admin added themselves as an agent via the UI, it created the agent profile but NEVER called `/api/billing/seats`
   - This meant Stripe was never charged if billing expansion was needed
   - The database `seat_count` was never updated
   - Only the local UI state was updated (which would reset on page refresh)

**Flows Verified:**
- ✅ Agent invites: Correctly charges seat at invite time via `/api/invites/send`
- ✅ Admin invites accepting with "Take Calls": Correctly charges seat at accept time via `accept-invite` page
- ❌ **Admin adding themselves via UI**: Was missing billing API call (NOW FIXED)

**Files Modified:**
- `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` - Fixed `handleAddMyself` to call `/api/billing/seats`

**Solution:**
Added billing API call to `handleAddMyself`:
1. Check if we need a new seat (only if profile doesn't exist OR is inactive)
2. Call `/api/billing/seats` FIRST before creating/activating profile
3. If billing fails, show error and don't create the profile
4. Update local state from the API response for consistency

**Acceptance Criteria:**
- [x] Confirm admin-agents ARE being counted in seat usage (VERIFIED - query is correct)
- [x] If not, fix the query to include them (N/A - query was correct)
- [x] Fixed missing billing call in `handleAddMyself`
- [x] Verify UI shows correct seat count (uses API response now)

---

#### P2-003: Agent Page Navigation - Widget Persistence

**Priority:** P2 - Medium  
**Type:** Bug Fix / Clarification  
**Estimated Effort:** 1-2 hours

**Description:**  
When a visitor navigates between pages, the widget behavior needs to be consistent based on whether the same agent is assigned to the new page.

**Expected Behavior (per product spec):**
- If SAME agent assigned to new page: Widget persists, plays new loop video if different
- If DIFFERENT agent assigned: Widget resets, plays intro for new agent
- If NO agent on new page: Widget hides

**Files to Modify:**
- `apps/widget/src/Widget.tsx`
- `apps/server/src/features/signaling/socket-handlers.ts`

**Implementation:**
Need to track current agent ID and compare on page navigation. If same agent, just update videos. If different, reset widget state.

**Acceptance Criteria:**
- [ ] Same agent on new page = widget persists
- [ ] Different agent on new page = widget resets with new intro
- [ ] No agent on new page = widget hides
- [ ] Loop video updates if different for new page

---

#### ✅ P2-004: Show Available Invite Seats in Agent Tab (COMPLETED)

**Priority:** P2 - Medium  
**Type:** Feature  
**Estimated Effort:** 1 hour
**Status:** ✅ Completed

**Description:**  
When an admin revokes an invite, the seat is still being paid for but can be reused. The UI should show how many "available" invite slots the admin has.

**Solution Implemented:**

1. **Main Seat Info Banner** - Updated to show detailed breakdown:
   - "X seats purchased • Y active • Z pending • W available"
   - Green "Invite without extra cost" badge when seats are available
   - Amber "0 available" when all seats in use

2. **Add Agent Modal** - Enhanced seat summary:
   - Shows full breakdown: purchased, active, pending, available
   - Clear billing info displayed

3. **Add Agent Row** - Updated messaging:
   - Shows "X of Y seats available — no extra cost" when seats available
   - Shows "All X seats in use — +$Y/mo per additional seat" when full

4. **Remove Agent Confirmation** - Enhanced "Seat freed up" message:
   - Shows exactly how many seats will be available after removal

**Files Modified:**
- `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx`

**Acceptance Criteria:**
- [x] Shows purchased, active, pending, available counts
- [x] Available calculated correctly
- [x] Messaging guides admin to use available seats or go to billing to reduce

---

#### P2-005: Input Validation - Trigger Delay and Max Simulations

**Priority:** P2 - Medium  
**Type:** Bug Fix  
**Estimated Effort:** 1 hour

**Description:**  
Several numeric inputs lack proper validation, which could cause unexpected behavior.

**Fields to Validate:**
- `trigger_delay`: Min 0, Max 300 (5 minutes), integer only
- `auto_hide_delay`: Min 0, Max 300, integer only, or null
- `max_simultaneous_simulations`: Min 1, Max 100, integer only
- `priority_rank`: Min 1, Max 99, integer only

**Files to Modify:**
- Widget settings forms
- Pool member priority forms
- API validation on relevant endpoints

**Acceptance Criteria:**
- [ ] All numeric fields have min/max validation
- [ ] Invalid inputs show clear error message
- [ ] API rejects invalid values
- [ ] Existing data with invalid values handled gracefully

---

### P3 - Lower Priority

---

#### P3-001: Rate Limiting on Key Endpoints

**Priority:** P3 - Lower  
**Type:** Security  
**Estimated Effort:** 2-4 hours

**Description:**  
Several endpoints lack rate limiting, which could allow abuse.

**Endpoints to Rate Limit:**
- `/api/invites/send` - Max 10/minute per org
- `/api/billing/*` - Max 5/minute per org
- `/api/funnel/track` - Max 100/minute per IP
- Socket events - Max 60 events/minute per socket

**Files to Modify:**
- Create rate limiting middleware
- Apply to relevant API routes
- Apply to socket event handlers

**Acceptance Criteria:**
- [ ] Rate limits enforced on key endpoints
- [ ] Clear error message when rate limited
- [ ] Limits are reasonable for normal usage
- [ ] Logging for rate limit violations

---

#### P3-002: Email Case Sensitivity Handling

**Priority:** P3 - Lower  
**Type:** Bug Fix  
**Estimated Effort:** 30 minutes

**Description:**  
Email addresses should be case-insensitive for matching. USER@EMAIL.COM and user@email.com should be treated as the same user.

**Current Behavior:**  
- Emails stored as entered
- Matching may be case-sensitive depending on query

**Expected Behavior:**  
- Emails normalized to lowercase on input
- All email comparisons case-insensitive

**Files to Modify:**
- Signup flow
- Invite flow
- Login flow
- Any email lookup queries

**Acceptance Criteria:**
- [ ] Emails stored lowercase
- [ ] USER@EMAIL.COM logs in as user@email.com
- [ ] Invite to USER@EMAIL.COM matches existing user@email.com
- [ ] No duplicate users from case differences

---

---

## Autonomous Workflow Improvements

> Future enhancements for the autonomous agent workflow system.

---

### WORKFLOW-002: Preview System Architecture Decision

**Priority:** P1 - High  
**Type:** Architecture Decision  
**Estimated Effort:** TBD based on chosen approach

**Goal:**  
Enable PMs to preview UI changes from multiple branches simultaneously via magic links, with future support for:
- Embedded iframe previews (no new tab)
- Click-to-comment on specific UI elements

**Options Evaluated:**

#### Option A: Vercel Preview Deployments (Recommended for MVP)

Each branch auto-deploys to a unique URL like `tkt-005b.preview.greetnow.vercel.app`.

| Pros | Cons |
|------|------|
| ✅ Zero infrastructure to build | ❌ 1-2 min deploy time per branch |
| ✅ Works remotely (PM doesn't need local setup) | ❌ Platform lock-in (Vercel) |
| ✅ Scales infinitely | ❌ Click-to-comment requires injected script |
| ✅ Already using Vercel | ❌ Cross-origin iframe restrictions |

**Click-to-comment:** Requires adding a script to the app (Option C below).

---

#### Option B: WebContainers (Best for instant previews + click-to-comment)

Run the Next.js app entirely in the browser using StackBlitz WebContainers (WASM-based).

| Pros | Cons |
|------|------|
| ✅ Instant (0 cold start) | ❌ No direct database connections (HTTP only) |
| ✅ Same-origin = full DOM access for click-to-comment | ❌ Server secrets exposed in browser |
| ✅ No server costs for previews | ❌ Native Node modules won't work |
| ✅ Works offline | ❌ Memory limits (~1-2GB per preview) |
| ✅ This is what Bolt.new and Lovable use | ❌ Need to audit app for compatibility |

**Supabase:** ✅ Works (HTTP-based JS client)  
**Click-to-comment:** ✅ Easy (same origin, full DOM access)

---

#### Option C: Injected Script for Click-to-Comment

Add a small SDK to the app that enables element selection when in preview mode.

```jsx
// User adds to their app once
import { PreviewTools } from '@workflow-product/preview-sdk'
<PreviewTools projectId="..." />
```

| Pros | Cons |
|------|------|
| ✅ Works with ANY hosting (Vercel, local, etc.) | ❌ Requires script in every app |
| ✅ No infrastructure cost | ❌ Cross-origin postMessage communication |
| ✅ Scales infinitely | ❌ CSP conflicts possible |
| ✅ Industry standard (how Vercel Comments works) | |

**Since we control user codebases via agents, we can auto-inject this script.**

---

#### Option D: Replit-Style Server Containers

Run user code in our own containers, inject scripts when serving.

| Pros | Cons |
|------|------|
| ✅ Full control over runtime | ❌ High infrastructure cost |
| ✅ Works with any app | ❌ 1-3s cold start |
| ✅ Can inject scripts at serve time | ❌ Complex to build and maintain |

---

#### Option E: Multiple Local Ports (Current approach)

Each QA agent runs on a unique port (3101, 3102, etc.).

| Pros | Cons |
|------|------|
| ✅ Already implemented | ❌ Only works locally |
| ✅ Instant (dev server) | ❌ PM must start servers manually |
| ✅ No deploy wait | ❌ Doesn't scale to real product |

---

**Recommendation:**

| Phase | Approach | Why |
|-------|----------|-----|
| **Now (MVP)** | Vercel Previews + local ports | Simple, unblocks workflow |
| **V2** | Vercel + Injected Script (Option C) | Embedded iframe + basic click-to-comment |
| **V3** | WebContainers (Option B) | Instant previews, full click-to-comment, best UX |

**Decision Needed:**
- [ ] Confirm Vercel preview approach for MVP
- [ ] Audit Next.js app for WebContainer compatibility
- [ ] Design click-to-comment SDK interface

**Files to Create/Modify:**
- `packages/preview-sdk/` - New package for click-to-comment script
- `scripts/launch-qa-agents.sh` - Use Vercel preview URLs instead of localhost
- `docs/workflow/UI_TICKET_QA_WORKFLOW.md` - Update preview instructions

---

### WORKFLOW-001: Sync Feature Branches with Main Before QA/Preview

**Priority:** P1 - High  
**Type:** Feature  
**Estimated Effort:** 1-2 hours

**Problem:**  
When a PM previews a UI change via magic link, the preview may be missing recent commits to `main` that were merged AFTER the feature branch was created. This makes it look like previously approved changes have been "reverted".

```
main:     A ─── B ─── C ─── D ─── E (PM approves TKT-006, merged!)
                │
TKT-007:        └─── X ─── Y (branched from C, missing D and E!)

PM previews TKT-007 → doesn't see changes from D & E → confused!
```

**Solution Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **Merge main into branch** | `git merge origin/main` before QA | Safe, preserves history | Creates merge commits |
| **Rebase on main** | `git rebase origin/main` before QA | Clean history | Rewrites commits, needs force push |
| **Temporary merge preview** | Merge without committing for preview only | Best UX, no history changes | Complex infrastructure |
| **Vercel merge previews** | Use platform's merge preview feature | Zero custom code | Platform lock-in |

**Recommended Implementation:**  
Add a "sync with main" step to `scripts/launch-qa-agents.sh`:

```bash
# After creating worktree, before QA agent runs:
echo "Syncing branch with latest main..."
git fetch origin main
git merge origin/main --no-edit || {
    echo "Merge conflict detected - needs manual resolution"
    # Create blocker file for human resolution
}
```

**Files to Modify:**
- `scripts/launch-qa-agents.sh` - Add sync step after worktree creation
- `docs/workflow/QA_REVIEW_AGENT_SOP.md` - Document the sync behavior

**Acceptance Criteria:**
- [ ] Feature branches are synced with latest main before QA testing
- [ ] Merge conflicts create a blocker for human resolution
- [ ] PM previews show all recent changes from main
- [ ] QA agent is aware of the sync and tests the merged state

---

## Test Coverage Tickets

> These tickets track automated test creation for the above fixes.

---

#### TEST-001: Auth Flow Integration Tests

**Scope:** Signup, Login, Invite, Accept Invite  
**Framework:** Playwright E2E

**Test Cases:**
- [ ] New user signup happy path
- [ ] Signup with existing email (error)
- [ ] Login happy path
- [ ] Login with wrong password (error)
- [ ] Admin invites agent
- [ ] Agent accepts invite
- [ ] Expired invite link
- [ ] Already accepted invite link

---

#### TEST-002: Billing Flow Integration Tests

**Scope:** Subscription, Seats, Pause, Cancel  
**Framework:** Vitest + Stripe Test Mode

**Test Cases:**
- [ ] Create subscription with trial
- [ ] Add seat (under purchased limit)
- [ ] Add seat (over purchased limit - expansion)
- [ ] Cancelled user re-subscribes
- [ ] Pause subscription
- [ ] Resume subscription
- [ ] Cancel subscription

---

#### TEST-003: Signaling Server Unit Tests

**Scope:** Socket handlers, Pool manager  
**Framework:** Vitest

**Test Cases:**
- [ ] Agent login/logout
- [ ] Visitor join/leave
- [ ] Call request/accept/reject/end
- [ ] RNA timeout behavior
- [ ] Agent rejection routes to new agent
- [ ] Pool routing with conditions
- [ ] Tiered priority routing

---

#### TEST-004: Widget Integration Tests

**Scope:** Widget lifecycle  
**Framework:** Playwright

**Test Cases:**
- [ ] Widget shows after trigger delay
- [ ] Widget hides when no agents
- [ ] Widget reappears when agent available
- [ ] Video playback sequence
- [ ] Call request from widget
- [ ] Call ends, widget returns to loop

