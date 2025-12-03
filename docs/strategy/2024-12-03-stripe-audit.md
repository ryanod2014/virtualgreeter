# Strategy Report: Stripe & Payments Audit
**Date:** 2024-12-03
**Agent:** Strategy Agent 2
**Focus:** Payment Infrastructure

---

## TL;DR for PM (Pre-Triaged)

🔴 **URGENT:**
1. **NO WEBHOOK HANDLER EXISTS** - Subscription status changes, payment failures, trial expirations will NOT sync to database. Revenue at risk.
2. **Cancellation doesn't cancel in Stripe** - Users who cancel via UI will continue being charged! (`actions.ts` only updates DB, never calls Stripe)
3. **Pause/Resume don't update Stripe** - Paused users keep getting charged!

🟡 **IMPORTANT:**
1. No trial end handling - Trial → Paid transition not tracked via webhooks
2. No payment failure handling - `invoice.payment_failed` not handled, no dunning logic
3. No idempotency checks ready for when webhooks are added
4. Seat sync relies on success without webhook confirmation

🟢 **ROUTINE:**
1. Billing frequency pricing correctly uses separate price IDs (fixed in P2-001)
2. Dev mode fallbacks exist for all billing routes

📝 **NOTED:**
1. Good architecture with `getPriceIdForFrequency()` helper
2. Subscription metadata includes `organization_id` for webhook correlation
3. `STRIPE_WEBHOOK_SECRET` env var defined but unused

---

## Payment Flow Traced

### Complete Flow: Signup → Checkout → Subscription → Renewal

```
STEP 1: User Signs Up
└── Creates user + organization in Supabase (no Stripe yet)

STEP 2: Paywall - Payment Method Collection  
└── /api/billing/setup-intent
    ├── Creates Stripe Customer (if none exists)
    ├── Saves stripe_customer_id to organizations table
    └── Returns SetupIntent client_secret for frontend

STEP 3: Paywall - Billing Selection
└── /paywall/billing/page.tsx
    ├── User selects monthly/annual/six_month
    └── Stores in localStorage: billing_preference, trial_seats

STEP 4: Subscription Creation
└── /api/billing/create-subscription
    ├── Gets price ID via getPriceIdForFrequency()
    ├── Creates Stripe subscription with:
    │   - 7-day trial
    │   - Selected seat count & billing frequency
    │   - Metadata: organization_id, billing_preference
    ├── Updates organizations table:
    │   - stripe_subscription_id
    │   - stripe_subscription_item_id
    │   - seat_count, billing_frequency
    │   - subscription_status = "trialing"
    └── User redirected to /admin dashboard

STEP 5: Trial Period (7 days)
└── ⚠️ NO HANDLING - Nothing checks trial expiration
    └── User uses product, status stays "trialing" forever in DB

STEP 6: Trial Ends → First Charge (Stripe side only)
└── ⚠️ NO WEBHOOK HANDLER
    ├── Stripe charges card automatically
    ├── Subscription becomes "active" in Stripe
    └── Database NEVER updated (still shows "trialing")

STEP 7: Renewal (monthly/6-month/annual)
└── ⚠️ NO WEBHOOK HANDLER  
    ├── Stripe auto-renews
    └── Database unaware of renewal/payment status

STEP 8: Payment Failure
└── ⚠️ NO HANDLER
    ├── Stripe marks subscription "past_due"
    ├── Stripe retries per Smart Retries settings
    └── Database never knows - user keeps full access

STEP 9: Cancellation (User-initiated)
└── /admin/settings/billing → actions.ts → submitCancellationFeedback()
    ├── ✅ Records cancellation_feedback in database
    ├── ✅ Sets plan = "free" in database
    └── ❌ NEVER CALLS stripe.subscriptions.cancel() 
        └── USER CONTINUES BEING CHARGED!
```

---

## Webhook Analysis

| Event | Handled? | Idempotent? | Notes |
|-------|----------|-------------|-------|
| `checkout.session.completed` | ❌ N/A | N/A | Not using Checkout Sessions |
| `invoice.paid` | ❌ NO | N/A | **CRITICAL:** DB doesn't know about payments |
| `invoice.payment_failed` | ❌ NO | N/A | **CRITICAL:** No dunning/retry awareness |
| `customer.subscription.created` | ❌ NO | N/A | Created manually via API |
| `customer.subscription.updated` | ❌ NO | N/A | **CRITICAL:** Status/quantity changes lost |
| `customer.subscription.deleted` | ❌ NO | N/A | **CRITICAL:** Cancelled subs unknown |
| `customer.subscription.trial_will_end` | ❌ NO | N/A | No trial ending notification |
| `payment_intent.succeeded` | ❌ NO | N/A | Not tracking payments |
| `customer.dispute.created` | ❌ NO | N/A | Disputes not tracked |

### Webhook Handler Location
- **Expected:** `/apps/dashboard/src/app/api/stripe/webhook/route.ts`
- **Actual:** Does not exist
- **Evidence:** `TODO.md` line 10: `- [ ] Create Stripe webhook handler (/api/stripe/webhook)`

---

## Detailed Findings

### Finding 1: No Webhook Handler Exists

**Severity:** 🔴 CRITICAL
**Evidence:** 
- `apps/dashboard/src/app/api/` directory - No `/stripe/webhook` folder exists
- `TODO.md` line 10: `- [ ] Create Stripe webhook handler (/api/stripe/webhook)`
- `apps/dashboard/env.example` line 43: `STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret` (defined but unused)

**Risk:** 
- Subscription status changes in Stripe won't reflect in database
- Trial expirations go untracked
- Payment failures invisible to application
- Users could lose access without warning, or keep access despite non-payment
- Revenue leakage if cancellations in Stripe aren't synced

**Recommendation:**
Create webhook handler at `/api/stripe/webhook/route.ts` that handles:
1. `invoice.paid` → Set `subscription_status = 'active'`
2. `invoice.payment_failed` → Set `subscription_status = 'past_due'`
3. `customer.subscription.updated` → Sync `status`, `quantity`
4. `customer.subscription.deleted` → Set `subscription_status = 'cancelled'`
5. Verify webhook signature using `STRIPE_WEBHOOK_SECRET`

---

### Finding 2: Cancellation Doesn't Actually Cancel in Stripe

**Severity:** 🔴 CRITICAL
**Evidence:**

```typescript:48:68:apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts
// In production, you would also:
// 1. Call Stripe to cancel the subscription
// 2. Update the organization's plan to 'free' or mark as cancelled
// 3. Send a confirmation email
// 4. Schedule data retention/deletion

// For now, we'll just downgrade to free plan
const { error: updateError } = await supabase
  .from("organizations")
  .update({ plan: "free" })
  .eq("id", params.organizationId);
```

**Risk:**
- Users who cancel through the UI will continue to be charged by Stripe
- Legal/compliance issues (FTC rules on subscription cancellation)
- Customer complaints, chargebacks, loss of trust

**Recommendation:**
```typescript
import { stripe } from "@/lib/stripe";

// Get subscription ID from org
const { data: org } = await supabase
  .from("organizations")
  .select("stripe_subscription_id")
  .eq("id", params.organizationId)
  .single();

// Cancel in Stripe
if (stripe && org?.stripe_subscription_id) {
  await stripe.subscriptions.cancel(org.stripe_subscription_id);
}
```

---

### Finding 3: Pause/Resume Don't Update Stripe

**Severity:** 🔴 CRITICAL
**Evidence:**

```typescript:127:131:apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts
// In production, you would also:
// 1. Update Stripe subscription (pause or swap to pause price)
// 2. Send confirmation email
// 3. Schedule reminder email for 7 days before resume
// 4. Disable the widget on all sites
```

```typescript:186:189:apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts
// In production, you would also:
// 1. Resume Stripe subscription or swap back to full price
// 2. Send confirmation email
// 3. Re-enable widgets on all sites
```

**Risk:**
- Paused users continue being charged
- Resumed users might not be charged if we ever implement pause properly

**Recommendation:**
```typescript
// Pause
if (stripe && org?.stripe_subscription_id) {
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    pause_collection: { behavior: 'void' }
  });
}

// Resume
if (stripe && org?.stripe_subscription_id) {
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    pause_collection: null
  });
}
```

---

### Finding 4: No Stripe Portal Integration

**Severity:** 🟡 IMPORTANT
**Evidence:**

```typescript:97:104:apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx
const handleManageBilling = async () => {
  setIsManaging(true);
  // In production, this would redirect to Stripe Customer Portal
  setTimeout(() => {
    setIsManaging(false);
    alert("Stripe billing portal integration coming soon!");
  }, 1000);
};
```

**Risk:**
- Users can't update payment method
- Users can't view invoices/receipts
- Users can't download receipts for accounting

**Recommendation:**
Create Stripe Customer Portal session:
```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: org.stripe_customer_id,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/settings/billing`,
});
return { url: session.url };
```

---

### Finding 5: Trial Period Not Tracked

**Severity:** 🟡 IMPORTANT
**Evidence:**
- `create-subscription/route.ts` line 118-138: Creates subscription with `trial_end`
- No webhook to handle `customer.subscription.trial_will_end`
- Database `subscription_status` will stay "trialing" forever

**Risk:**
- Can't send trial ending reminders
- Can't detect when trial converts to paid
- Analytics on trial → paid conversion broken

**Recommendation:**
1. Handle `customer.subscription.trial_will_end` (3 days before) - send email
2. Handle `invoice.paid` after trial - update status to "active"

---

### Finding 6: Seat/Quantity Sync Vulnerability

**Severity:** 🟡 IMPORTANT
**Evidence:**

```typescript:84:90:apps/dashboard/src/app/api/billing/update-settings/route.ts
// Update Stripe if in production and expanding
if (stripe && org.stripe_subscription_item_id && newSeatCount !== org.seat_count) {
  await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
    quantity: newSeatCount,
    proration_behavior: "create_prorations",
  });
  response.stripeUpdated = true;
}
```

**Risk:**
- If Stripe update fails but DB update succeeds, they're out of sync
- No webhook confirms the quantity change
- Could lead to billing discrepancies

**Recommendation:**
- Wrap in transaction (DB + Stripe)
- Add `customer.subscription.updated` webhook handler to confirm quantity
- Add reconciliation check to compare DB vs Stripe periodically

---

### Finding 7: Good - Pricing Architecture

**Severity:** 🟢 ROUTINE (Positive)
**Evidence:**

```typescript:17:24:apps/dashboard/src/lib/stripe.ts
export const PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_SEAT_PRICE_ID || "",
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || "",
  six_month: process.env.STRIPE_SIX_MONTH_PRICE_ID || "",
} as const;
```

```typescript:30:42:apps/dashboard/src/lib/stripe.ts
export function getPriceIdForFrequency(frequency: "monthly" | "annual" | "six_month"): string {
  const priceId = PRICE_IDS[frequency];
  if (priceId) return priceId;
  
  // Fallback: if specific price not configured, use monthly price
  if (PRICE_IDS.monthly) {
    console.warn(`STRIPE_${frequency.toUpperCase()}_PRICE_ID not set, falling back to monthly price ID`);
    return PRICE_IDS.monthly;
  }
  
  return "";
}
```

**Notes:**
- Well-architected price ID selection
- Backwards compatible with `STRIPE_SEAT_PRICE_ID`
- Clear fallback logic with warnings

---

### Finding 8: Dev Mode Security

**Severity:** 📝 NOTED
**Evidence:**

```typescript:3:11:apps/dashboard/src/lib/stripe.ts
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set - billing features will run in dev mode");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
    })
  : null;
```

All billing routes check `if (!stripe)` and return dev mode responses.

**Notes:**
- Good for development
- Ensure production ALWAYS has `STRIPE_SECRET_KEY` set
- Consider adding startup check that fails if missing in production

---

## Edge Cases Not Handled

| Scenario | Current Behavior | Risk |
|----------|-----------------|------|
| Stripe is down | API calls fail, error returned | Users can't subscribe/modify |
| Webhook delayed 5+ minutes | N/A (no webhooks) | N/A currently |
| Customer disputes charge | Unknown | Chargebacks, lost revenue |
| Trial → Paid transition | DB stays "trialing" | Access confusion |
| Card expiry | No notification | Payment fails silently |
| Duplicate webhook delivery | N/A | Need idempotency when added |

---

## Questions Generated

1. **Product Decision:** Should cancelled users get a new trial when re-subscribing? (Current code allows this)
2. **Product Decision:** What access should users have during `past_due` status?
3. **Infrastructure:** Is there a staging environment to test webhooks safely?
4. **Legal:** Are we compliant with auto-renewal disclosure laws (FTC)?
5. **Operations:** How will we handle the backlog of users whose status is stale once webhooks are added?

---

## Immediate Action Items (Priority Order)

### 1. 🔴 CRITICAL - Create Webhook Handler (Est: 2-3 hours)
```
Location: /apps/dashboard/src/app/api/stripe/webhook/route.ts
Events to handle:
- invoice.paid
- invoice.payment_failed  
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.trial_will_end

Include:
- Signature verification with STRIPE_WEBHOOK_SECRET
- Idempotency checks (store event IDs)
- Error handling with logging
```

### 2. 🔴 CRITICAL - Fix Cancellation (Est: 30 min)
```
File: /apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts
Function: submitCancellationFeedback
Add: stripe.subscriptions.cancel(org.stripe_subscription_id)
```

### 3. 🔴 CRITICAL - Fix Pause/Resume (Est: 30 min)
```
File: /apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts
Functions: pauseAccount, resumeAccount
Add: stripe.subscriptions.update() with pause_collection
```

### 4. 🟡 IMPORTANT - Add Stripe Customer Portal (Est: 1 hour)
```
New file: /apps/dashboard/src/app/api/billing/portal/route.ts
Creates billing portal session for invoice viewing, payment method updates
```

### 5. 🟡 IMPORTANT - Webhook Configuration in Stripe Dashboard
```
After deploying webhook handler:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: https://[your-domain]/api/stripe/webhook
3. Select events listed above
4. Copy webhook secret to STRIPE_WEBHOOK_SECRET env var
```

---

## Files Referenced

| File | Purpose | Issues Found |
|------|---------|--------------|
| `apps/dashboard/src/lib/stripe.ts` | Stripe client & pricing config | ✅ Good |
| `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | Creates subscriptions | ✅ Good |
| `apps/dashboard/src/app/api/billing/update-settings/route.ts` | Seat/frequency changes | ⚠️ No webhook confirm |
| `apps/dashboard/src/app/api/billing/seats/route.ts` | Seat auto-expansion | ⚠️ No webhook confirm |
| `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | Payment method collection | ✅ Good |
| `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` | Cancel/Pause/Resume | 🔴 Missing Stripe calls |
| `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | Billing UI | ⚠️ Portal placeholder |
| `apps/dashboard/env.example` | Env var documentation | ✅ Good |
| `TODO.md` | Launch checklist | Documents missing webhook |

---

*Report generated by Strategy Agent 2 on 2024-12-03*

