# Feature: Payment Failure (B6)

## Quick Summary
Payment failure handling receives Stripe webhook events for failed payments and updates the organization's subscription status to `past_due`. Currently, only the database status update is implemented — no UI indicators, dunning emails, service restrictions, or payment method update flows exist.

## Affected Users
- [x] Admin
- [ ] Website Visitor
- [ ] Agent
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Handles failed subscription payments by updating organization status so the system can track payment issues. This enables future features like:
- Displaying past-due warnings to admins
- Sending dunning emails
- Restricting service access
- Allowing payment method updates

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Know when payment fails | Status updated to `past_due` (but no UI notification yet) |
| Admin | Update payment method | ❌ NOT IMPLEMENTED - No self-service flow |
| Admin | Continue using service during payment issue | ✅ No restrictions currently enforced |
| Platform Admin | Track past-due organizations | Can query `subscription_status = 'past_due'` |

---

## 2. HOW IT WORKS

### High-Level Flow (Current Implementation)

1. Payment fails in Stripe (card declined, insufficient funds, etc.)
2. Stripe sends `invoice.payment_failed` webhook to server
3. Server verifies webhook signature
4. Server looks up organization by `stripe_customer_id`
5. Server updates `subscription_status` to `past_due`
6. Server logs the failure to console
7. **END** — No further action taken

### State Machine

```
                            ┌──────────────┐
                            │              │
┌─────────────┐   invoice.paid    │    active    │
│             │◄─────────────────│              │
│             │                  └──────────────┘
│   trialing  │                        │
│             │                        │
└─────────────┘            invoice.payment_failed
      │                                │
      │                                ▼
      │                  ┌──────────────────────┐
      │   trial_end      │                      │
      │   payment_fails  │      past_due        │
      └─────────────────►│                      │
                         │  (NO UI INDICATOR)   │
                         │  (NO RESTRICTIONS)   │
                         │  (NO EMAIL SENT)     │
                         └──────────────────────┘
                                   │
                         subscription.deleted
                         (after Stripe retries)
                                   │
                                   ▼
                         ┌──────────────────────┐
                         │                      │
                         │     cancelled        │
                         │                      │
                         └──────────────────────┘
```

### State Definitions

| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `active` | Subscription is current and paid | `invoice.paid` webhook | Payment fails, admin cancels |
| `trialing` | 7-day free trial period | Subscription created | Trial ends, payment processed |
| `past_due` | Payment has failed | `invoice.payment_failed` webhook | Payment succeeds (`invoice.paid`) |
| `cancelled` | Subscription terminated | `subscription.deleted` webhook, admin cancels | Resubscribe (new subscription) |
| `paused` | Admin paused subscription | Admin clicks "Pause" | Admin resumes, pause period ends |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| `invoice.payment_failed` | Stripe → Server webhook | Updates `subscription_status` to `past_due` | Console log only |
| `invoice.paid` | Stripe → Server webhook | Updates `subscription_status` to `active` | Clears `past_due` state |
| `customer.subscription.updated` | Stripe → Server webhook | Syncs status from Stripe (`past_due`, `unpaid`, etc. → `past_due`) | None |
| `customer.subscription.deleted` | Stripe → Server webhook | Updates `subscription_status` to `cancelled` | None |

### Key Functions/Components

| Function/Component | File | Purpose |
|-------------------|------|---------|
| `handleStripeWebhook` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Main webhook router |
| `handleInvoicePaymentFailed` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Handles failed payment events |
| `mapStripeStatusToDbStatus` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Maps Stripe statuses to DB enum |
| `updateOrgSubscriptionStatus` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Idempotent status updater |
| `getOrgByStripeCustomerId` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Looks up org from Stripe customer |

### Data Flow

```
PAYMENT FAILS IN STRIPE
    │
    ├─► Stripe: Creates invoice.payment_failed event
    │
    ├─► Stripe: POSTs to /api/webhooks/stripe
    │
    ├─► Server: handleStripeWebhook()
    │   ├─► Verify signature with webhookSecret
    │   └─► Route to handleInvoicePaymentFailed()
    │
    ├─► Server: handleInvoicePaymentFailed(invoice)
    │   ├─► Extract customer ID from invoice
    │   ├─► getOrgByStripeCustomerId(customerId)
    │   │   └─► SELECT from organizations WHERE stripe_customer_id = ?
    │   ├─► console.warn("Payment failed for org...")
    │   └─► updateOrgSubscriptionStatus(orgId, "past_due", currentStatus, "invoice.payment_failed")
    │
    └─► Server: updateOrgSubscriptionStatus()
        ├─► Idempotent check (skip if already past_due)
        ├─► UPDATE organizations SET subscription_status = 'past_due' WHERE id = ?
        └─► console.log("Updated org status: X → past_due")

NOTHING ELSE HAPPENS
    │
    └─► ❌ No email sent
    └─► ❌ No UI banner shown
    └─► ❌ No service restrictions applied
    └─► ❌ No in-app notification
```

---

## 4. EDGE CASES

### Complete Scenario Matrix

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | First payment fails after trial | `invoice.payment_failed` | Status → `past_due` | ⚠️ | No user notification |
| 2 | Card expired between cycles | `invoice.payment_failed` | Status → `past_due` | ⚠️ | No prompt to update card |
| 3 | Insufficient funds | `invoice.payment_failed` | Status → `past_due` | ⚠️ | Stripe will auto-retry |
| 4 | Card declined | `invoice.payment_failed` | Status → `past_due` | ⚠️ | Stripe will auto-retry |
| 5 | Stripe retries and succeeds | `invoice.paid` | Status → `active` | ✅ | Auto-recovery works |
| 6 | Multiple failures, Stripe cancels | `subscription.deleted` | Status → `cancelled` | ✅ | Final cancellation works |
| 7 | Admin wants to update payment method | N/A | ❌ No self-service flow | ❌ | Must contact support or use Stripe portal |
| 8 | Payment fails during seat addition | `invoice.payment_failed` | Status → `past_due`, seats still added in DB | ⚠️ | Seats may be inconsistent with Stripe |
| 9 | Service access during `past_due` | Login, widget | Full access continues | ⚠️ | No restrictions enforced |
| 10 | Duplicate webhook received | Stripe retry | Idempotent - skips if already `past_due` | ✅ | |
| 11 | Organization not found for customer | `invoice.payment_failed` | Returns false, logs error, returns 500 | ✅ | Stripe will retry |
| 12 | Webhook signature invalid | POST to webhook | 400 error, logged | ✅ | Security check works |
| 13 | Past-due cleared by manual Stripe payment | `invoice.paid` | Status → `active` | ✅ | Works correctly |
| 14 | Subscription cancelled then payment succeeds | `invoice.paid` after `subscription.deleted` | Depends on timing | ⚠️ | Edge case not explicitly handled |

### Error States

| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Payment declined | Card issue | **NOTHING** - no notification | Wait for Stripe retry or manual intervention |
| Subscription past_due | After payment failure | **NOTHING** - no UI indicator | Unknown to user unless they check Stripe directly |
| Subscription cancelled | After max Stripe retries | **NOTHING** - status in DB changes | Must resubscribe from scratch |

---

## 5. UI/UX REVIEW

### User Experience Audit

| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Payment fails | Nothing visible | ❌ | No notification, email, or banner |
| 2 | Admin logs in | Normal dashboard | ❌ | No indication of `past_due` status |
| 3 | Admin tries to add seats | Works normally | ⚠️ | Should probably be blocked |
| 4 | Admin wants to update card | No option available | ❌ | Must use Stripe billing portal |
| 5 | Stripe retries successfully | Status quietly updates to active | ⚠️ | User never knew there was an issue |
| 6 | Stripe gives up and cancels | Status → cancelled | ❌ | User may not realize until locked out |

### Accessibility
- Keyboard navigation: N/A - no UI implemented
- Screen reader support: N/A - no UI implemented
- Color contrast: N/A - no UI implemented
- Loading states: N/A - no UI implemented

---

## 6. TECHNICAL CONCERNS

### Performance

| Concern | Implementation | Status |
|---------|----------------|--------|
| Webhook processing time | Single DB update, idempotent | ✅ Fast |
| Database query | Single SELECT by indexed `stripe_customer_id` | ✅ Efficient |
| No async side effects | No emails, no notifications | ✅ Quick response |

### Security

| Concern | Mitigation |
|---------|------------|
| Webhook authenticity | Stripe signature verification using `webhookSecret` |
| Replay attacks | Idempotent handler - same status won't re-update |
| Unauthorized status changes | Only Stripe webhooks can set `past_due` |

### Reliability

| Concern | Mitigation |
|---------|------------|
| Webhook delivery failure | Stripe auto-retries with exponential backoff |
| Handler failure | Returns 500, Stripe retries |
| Database failure | Handler returns false, webhook returns 500, Stripe retries |
| Server restart during processing | Stripe will retry unacknowledged webhooks |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ❌ No - Users have no idea their payment failed
2. **Is the control intuitive?** ❌ No - No self-service to fix payment issues
3. **Is feedback immediate?** ❌ No - Zero feedback to users
4. **Is the flow reversible?** ⚠️ Partially - Stripe auto-retry can recover, but user can't self-recover
5. **Are errors recoverable?** ❌ No - No recovery path available to users
6. **Is the complexity justified?** ✅ Yes - What exists is minimal and appropriate

### Identified Issues

| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No past-due banner in dashboard | Admin unaware of payment issue | 🔴 High | Add banner component checking `subscription_status` |
| No dunning emails | User never notified of failure | 🔴 High | Implement email on `invoice.payment_failed` |
| No payment method update flow | User can't self-serve recovery | 🔴 High | Add Stripe Customer Portal or custom update flow |
| No service restrictions | Revenue loss continues | 🟡 Medium | Add graceful restrictions (e.g., can't add seats, warning on widget) |
| TypeScript type mismatch | `SubscriptionStatus` type doesn't include `past_due` | 🟡 Medium | Update `packages/domain/src/database.types.ts` line 39 |
| No in-app notification | Admin may miss the issue | 🟡 Medium | Add toast/alert on login when `past_due` |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main webhook handler | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 215-289 | Entry point for all Stripe webhooks |
| Payment failure handler | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 168-185 | `handleInvoicePaymentFailed()` |
| Status mapping | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 32-54 | `mapStripeStatusToDbStatus()` - maps `incomplete`, `unpaid` → `past_due` |
| Idempotent update | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 106-135 | `updateOrgSubscriptionStatus()` |
| Database migration | `supabase/migrations/20251204200000_expand_subscription_status.sql` | 1-20 | Adds `past_due` to constraint |
| TypeScript types | `packages/domain/src/database.types.ts` | 39 | ⚠️ Missing `past_due` in `SubscriptionStatus` type |
| Billing settings UI | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | 1-951 | No `past_due` handling present |

---

## 9. RELATED FEATURES
- [Subscription Creation](./subscription-creation.md) - Initial subscription setup (NOT YET DOCUMENTED)
- [Subscription Cancellation](./subscription-cancellation.md) - How cancellations work (NOT YET DOCUMENTED)
- [Account Pause](./account-pause.md) - Pause functionality vs past-due (NOT YET DOCUMENTED)

---

## 10. OPEN QUESTIONS

1. **What is the Stripe retry schedule?** — Stripe Smart Retries handles this automatically. Default is typically 4 attempts over ~3 weeks, but varies based on Stripe's ML model.

2. **What is the intended grace period?** — Not defined. Currently no restrictions during `past_due` at all.

3. **What service restrictions should apply during past_due?**
   - Option A: Block new seat additions only
   - Option B: Block widget entirely (aggressive)
   - Option C: Show warning but allow full access (current behavior, unintentionally)

4. **Should we send emails or rely on Stripe emails?** — Stripe can send automated emails via their settings. Decision needed on whether to supplement with custom dunning sequence.

5. **How many failed attempts before cancellation?** — Stripe decides this based on Smart Retries settings. We receive `subscription.deleted` when Stripe gives up.

6. **Should the TypeScript `SubscriptionStatus` type be updated?** — Yes, `packages/domain/src/database.types.ts` line 39 should add `past_due`:
   ```typescript
   export type SubscriptionStatus = "active" | "paused" | "cancelled" | "trialing" | "past_due";
   ```

7. **What happens if payment fails during seat addition?** — Currently, seats are added to DB optimistically via `update-settings` API before Stripe processes. If invoice fails, there may be inconsistency between DB `seat_count` and Stripe quantity. This needs investigation.

---

## IMPLEMENTATION STATUS

| Component | Status | File/Location |
|-----------|--------|---------------|
| Webhook handler for `invoice.payment_failed` | ✅ Implemented | `stripe-webhook-handler.ts` |
| Database status `past_due` | ✅ Implemented | Migration `20251204200000` |
| TypeScript type for `past_due` | ❌ Missing | `database.types.ts:39` |
| Past-due UI banner | ❌ Not Implemented | — |
| Dunning emails | ❌ Not Implemented | — |
| Service restrictions | ❌ Not Implemented | — |
| Payment method update flow | ❌ Not Implemented | — |
| In-app notification | ❌ Not Implemented | — |

---

*Documentation generated by analyzing actual codebase implementation. Many features listed in the original prompt specification do not exist in the current codebase.*



