# Feature: Billing API (API2)

## Quick Summary
REST API endpoints for all billing operations including subscription management, seat changes, payment method setup, billing settings updates, and webhook processing for Stripe subscription lifecycle events.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Billing API provides programmatic access to all subscription and payment management operations. It enables:
- Creating new Stripe subscriptions with configurable seat counts and billing frequencies
- Managing seats (auto-expanding billing when exceeding purchased seats)
- Setting up payment methods via Stripe SetupIntents
- Updating billing settings (seat count, billing frequency)
- Processing Stripe webhook events to keep subscription status in sync

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Subscribe to the service | `POST /api/billing/create-subscription` creates subscription with trial |
| Admin | Add team members | `POST /api/billing/seats` auto-expands billing when needed |
| Admin | Change billing plan | `POST /api/billing/update-settings` switches between monthly/annual/6-month |
| Admin | Update payment method | `POST /api/billing/setup-intent` provides Stripe client secret |
| Platform | Keep subscription in sync | Stripe webhooks update status on payment events |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)

**Initial Subscription:**
1. User completes signup funnel
2. Frontend calls `POST /api/billing/setup-intent` to get client secret
3. User enters card details in Stripe Elements
4. Frontend calls `POST /api/billing/create-subscription` with seat count + billing preference
5. Server creates Stripe subscription with 7-day trial
6. Organization updated with subscription IDs and status = "trialing"

**Seat Management:**
1. Admin invites agent → triggers `POST /api/billing/seats` with `action: "add"`
2. If new total exceeds purchased seats, Stripe subscription quantity updated
3. Admin removes agent → triggers `POST /api/billing/seats` with `action: "remove"`
4. Billing NOT reduced (pre-paid seats model) - only expands when exceeded

**Webhook Processing:**
1. Stripe sends event to `POST /api/webhooks/stripe`
2. Server verifies webhook signature
3. Handler updates organization subscription_status based on event type

### State Machine

```
                    ┌─────────────┐
                    │   (none)    │
                    └──────┬──────┘
                           │ create-subscription
                           ▼
                    ┌─────────────┐
       ┌───────────►│  trialing   │◄──────────────┐
       │            └──────┬──────┘               │
       │                   │ invoice.paid         │ re-subscribe
       │                   ▼                      │ (after cancelled)
       │            ┌─────────────┐               │
       │  ┌────────►│   active    │───────────────┤
       │  │         └──────┬──────┘               │
       │  │ invoice.paid   │ invoice.payment_failed
       │  │                ▼                      │
       │  │         ┌─────────────┐               │
       │  └─────────│  past_due   │               │
       │            └──────┬──────┘               │
       │                   │ subscription.deleted │
       │                   ▼                      │
       │            ┌─────────────┐               │
       │            │  cancelled  │───────────────┘
       │            └─────────────┘
       │ subscription.updated (trialing)
       └───────────────────────────────
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `(none)` | No subscription exists | Initial state | Create subscription |
| `trialing` | 7-day free trial period | subscription.created, re-subscribe | Trial ends (invoice.paid) |
| `active` | Subscription is paid and current | invoice.paid | Payment fails, cancellation |
| `past_due` | Payment failed, grace period | invoice.payment_failed | invoice.paid, cancellation |
| `paused` | Account paused by admin | Admin action (not via API) | Unpause action |
| `cancelled` | Subscription terminated | subscription.deleted | Re-subscribe (new subscription) |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| `POST /api/billing/setup-intent` | Dashboard | Creates Stripe SetupIntent | Creates customer if not exists |
| `POST /api/billing/create-subscription` | Dashboard | Creates Stripe subscription | DB: updates org with subscription IDs |
| `POST /api/billing/seats` | Dashboard (via invites/agents) | Updates seat usage tracking | May expand Stripe subscription |
| `POST /api/billing/update-settings` | Admin settings | Changes seat count or frequency | Stripe: updates subscription item |
| Stripe `invoice.paid` | Webhook | Marks org as active | DB: subscription_status = 'active' |
| Stripe `invoice.payment_failed` | Webhook | Marks org as past_due | DB: subscription_status = 'past_due' |
| Stripe `subscription.updated` | Webhook | Syncs status from Stripe | DB: updates subscription_status |
| Stripe `subscription.deleted` | Webhook | Marks org as cancelled | DB: subscription_status = 'cancelled' |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `POST /api/billing/setup-intent` | `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | Create Stripe SetupIntent for card collection |
| `POST /api/billing/create-subscription` | `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | Create subscription with trial |
| `POST /api/billing/seats` | `apps/dashboard/src/app/api/billing/seats/route.ts` | Update seat usage and billing |
| `POST /api/billing/update-settings` | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | Change seat count or billing frequency |
| `handleStripeWebhook` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Process Stripe webhook events |
| `stripe` | `apps/dashboard/src/lib/stripe.ts` | Dashboard Stripe client |
| `getPriceIdForFrequency` | `apps/dashboard/src/lib/stripe.ts` | Get price ID for billing frequency |
| `mapStripeStatusToDbStatus` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Map Stripe status to DB enum |

### Data Flow

```
SETUP PAYMENT METHOD
    │
    ├─► POST /api/billing/setup-intent
    │   │
    │   ├─► Verify user authentication
    │   │
    │   ├─► Get org from users table
    │   │
    │   ├─► If no stripe_customer_id:
    │   │   └─► stripe.customers.create() → save to org
    │   │
    │   └─► stripe.setupIntents.create()
    │       └─► Return { clientSecret }

CREATE SUBSCRIPTION
    │
    ├─► POST /api/billing/create-subscription
    │   ├─► Body: { seatCount, billingPreference }
    │   │
    │   ├─► Verify user authentication
    │   │
    │   ├─► Get org, check subscription_status
    │   │   ├─► If active/trialing with subscription_id → 400 "already exists"
    │   │   └─► If cancelled → clear old subscription IDs first
    │   │
    │   ├─► Dev mode (no stripe): update org only
    │   │   └─► Set seat_count, subscription_status="trialing"
    │   │
    │   └─► Production:
    │       ├─► Verify customer has default payment method
    │       ├─► getPriceIdForFrequency(billingPreference)
    │       ├─► stripe.subscriptions.create({
    │       │     customer, items, trial_end (7 days), metadata
    │       │   })
    │       └─► Update org with subscription_id, item_id, seat_count

UPDATE SEATS
    │
    ├─► POST /api/billing/seats
    │   ├─► Body: { action: "add"|"remove", quantity }
    │   │
    │   ├─► Count: activeAgentCount + pendingInviteCount (agent role only)
    │   │
    │   ├─► Calculate newUsedSeats based on action
    │   │
    │   ├─► needsExpansion = newUsedSeats > purchasedSeats?
    │   │   ├─► Yes: Expand billing (Stripe + DB)
    │   │   └─► No: Do NOT reduce billing (pre-paid model)
    │   │
    │   └─► Return { usedSeats, purchasedSeats, availableSeats, billingExpanded }

UPDATE SETTINGS
    │
    ├─► POST /api/billing/update-settings
    │   ├─► Body: { seatCount?, billingFrequency? }
    │   │
    │   ├─► Verify admin role
    │   │
    │   ├─► Seat count change:
    │   │   ├─► Cannot reduce below current usage
    │   │   └─► Update Stripe subscription item quantity
    │   │
    │   └─► Billing frequency change:
    │       ├─► Validate: monthly | annual | six_month
    │       ├─► six_month requires has_six_month_offer = true
    │       ├─► Switching away from six_month → lose offer forever
    │       └─► stripe.subscriptionItems.update({ price: newPriceId })

STRIPE WEBHOOK
    │
    ├─► POST /api/webhooks/stripe (Server)
    │   │
    │   ├─► Verify stripe-signature header
    │   │
    │   ├─► stripe.webhooks.constructEvent() → verify signature
    │   │
    │   ├─► Route by event.type:
    │   │   ├─► invoice.paid → handleInvoicePaid()
    │   │   │   └─► Skip $0 invoices, set status = "active"
    │   │   │
    │   │   ├─► invoice.payment_failed → handleInvoicePaymentFailed()
    │   │   │   └─► Set status = "past_due", log warning
    │   │   │
    │   │   ├─► subscription.updated → handleSubscriptionUpdated()
    │   │   │   └─► Map Stripe status → DB status
    │   │   │
    │   │   └─► subscription.deleted → handleSubscriptionDeleted()
    │   │       └─► Set status = "cancelled"
    │   │
    │   └─► Return 200 if success, 500 to trigger Stripe retry
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path subscription | Normal flow | 7-day trial, then active | ✅ | |
| 2 | Re-subscribe after cancellation | Create subscription with cancelled status | Clears old IDs, creates new subscription | ✅ | |
| 3 | Create subscription when already active | POST create-subscription | 400 "Subscription already exists" | ✅ | |
| 4 | Create subscription when trialing | POST create-subscription | 400 "Subscription already exists" | ✅ | |
| 5 | No payment method on file | POST create-subscription | 400 "No payment method on file" | ✅ | |
| 6 | Deleted Stripe customer | POST create-subscription | 404 "Customer not found" | ✅ | |
| 7 | Add seat exceeding purchased | POST seats action=add | Stripe expanded, DB updated | ✅ | Pre-paid model |
| 8 | Remove seat (don't reduce billing) | POST seats action=remove | Billing NOT reduced | ✅ | Intentional - manual downgrade required |
| 9 | Reduce seats below usage | POST update-settings | 400 "Cannot reduce below current usage" | ✅ | |
| 10 | Request six_month without offer | POST update-settings | 400 "not available for your account" | ✅ | |
| 11 | Switch away from six_month | POST update-settings | has_six_month_offer = false forever | ✅ | Documented behavior |
| 12 | Invalid billing frequency | POST update-settings | 400 "Invalid billing frequency" | ✅ | |
| 13 | Non-admin tries update-settings | POST update-settings | 403 "Admin access required" | ✅ | |
| 14 | Dev mode (no Stripe) | Any billing endpoint | Updates DB only, returns devMode: true | ✅ | |
| 15 | Webhook without signature | POST webhook | 400 "Missing stripe-signature header" | ✅ | |
| 16 | Invalid webhook signature | POST webhook | 400 "Webhook signature verification failed" | ✅ | |
| 17 | Webhook for unknown org | Stripe event | Logs error, returns false (500 → retry) | ✅ | |
| 18 | $0 invoice (trial) | invoice.paid webhook | Skipped, no status change | ✅ | |
| 19 | Duplicate webhook event | Stripe retry | Idempotent - skips if status same | ✅ | |
| 20 | Unknown Stripe status | subscription.updated | Defaults to "active", logs warning | ⚠️ | Conservative fallback |
| 21 | Stripe outage during subscription | POST create-subscription | 500 "Failed to create subscription" | ✅ | Generic error |
| 22 | Missing price ID for frequency | POST create/update | 500 "Price not configured" | ✅ | |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| 401 Unauthorized | No auth token / invalid session | "Not authenticated" | Re-login |
| 403 Forbidden | Non-admin accessing admin endpoint | "Admin access required" | Contact admin |
| 400 Invalid seat count | seatCount < 1 | "Invalid seat count" | Provide valid count |
| 400 Subscription exists | Already subscribed | "Subscription already exists" | Use update-settings |
| 400 No payment method | No card on file | "No payment method on file" | Add card first |
| 404 Customer not found | Deleted Stripe customer | "Customer not found" | Contact support |
| 500 Stripe error | API failure | "Failed to create subscription" | Retry later |
| 503 Stripe not configured | Missing STRIPE_SECRET_KEY | "Stripe not configured" | Configure env vars |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Complete funnel, select seats | Setup intent created | ✅ | |
| 2 | Enter card details | Stripe Elements validates | ✅ | |
| 3 | Submit payment | Subscription created | ✅ | |
| 4 | Invite team member | Seat auto-added | ✅ | May trigger billing expansion |
| 5 | Remove team member | Seat freed (no billing change) | ⚠️ | User may expect billing reduction |
| 6 | Change billing frequency | Proration applied | ✅ | |
| 7 | Try to reduce seats below usage | Error shown | ✅ | Clear error message |

### Accessibility
- Keyboard navigation: ✅ Stripe Elements support keyboard
- Screen reader support: ✅ Stripe Elements are accessible
- Color contrast: N/A (API-level feature)
- Loading states: ⚠️ Frontend responsibility

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Stripe API latency | Async calls, no timeout handling | ⚠️ Could add timeouts |
| Database queries | Multiple sequential queries per endpoint | ✅ Acceptable for billing |
| Webhook processing | Single-threaded, returns quickly | ✅ |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Supabase auth + role checks on all endpoints |
| Cross-org billing | Organization ID from user's profile, not request |
| Webhook spoofing | Stripe signature verification required |
| Sensitive data exposure | Card data never touches our servers (Stripe Elements) |
| API key exposure | Server-side only, env vars |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Stripe outage | Dev mode fallback for local testing |
| Webhook failures | Stripe retries on 500 response |
| Duplicate webhooks | Idempotent handlers (check status before update) |
| Database failures | Fire-and-forget pattern NOT used (billing is critical) |
| Missing webhook events | Stripe dashboard shows delivery status |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Pre-paid seats, auto-expand only
2. **Is the control intuitive?** ⚠️ Partial - "Remove doesn't reduce billing" may surprise users
3. **Is feedback immediate?** ✅ Yes - API responses include updated state
4. **Is the flow reversible?** ⚠️ Partial - six_month offer loss is irreversible
5. **Are errors recoverable?** ✅ Yes - All errors include clear messages
6. **Is the complexity justified?** ✅ Yes - Stripe integration requires this complexity

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No explicit timeout on Stripe calls | Long hangs on Stripe issues | 🟡 Medium | Add axios timeout or AbortController |
| six_month offer loss not warned | Users may accidentally lose discount | 🟡 Medium | Add confirmation dialog in UI |
| No rate limiting on billing endpoints | Potential abuse | 🟢 Low | Add rate limiting middleware |
| No audit logging | Can't track billing changes | 🟢 Low | Add billing_events table |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Setup Intent endpoint | `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | 1-86 | Creates Stripe customer if needed |
| Create Subscription endpoint | `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | 1-180 | 7-day trial, billing frequency support |
| Create Subscription tests | `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts` | 1-363 | Re-subscription after cancellation tests |
| Seats endpoint | `apps/dashboard/src/app/api/billing/seats/route.ts` | 1-118 | Pre-paid seats model |
| Update Settings endpoint | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | 1-165 | Seat count + billing frequency changes |
| Stripe client (dashboard) | `apps/dashboard/src/lib/stripe.ts` | 1-55 | Price IDs, pricing constants |
| Stripe webhook handler | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 1-290 | All webhook event handlers |
| Stripe client (server) | `apps/server/src/lib/stripe.ts` | 1-30 | Webhook secret config |
| Webhook route registration | `apps/server/src/index.ts` | 86 | Raw body parser for signature verification |
| Invites - billing integration | `apps/dashboard/src/app/api/invites/send/route.ts` | 82-111 | Calls /api/billing/seats on invite |
| Agent removal - billing | `apps/dashboard/src/app/api/agents/remove/route.ts` | 65-74 | Calls /api/billing/seats on remove |
| Invite revoke - billing | `apps/dashboard/src/app/api/invites/revoke/route.ts` | 54-63 | Credits back seat on revoke |

---

## 9. RELATED FEATURES
- [Subscription Creation (B1)](../billing/subscription-creation.md) - User-facing subscription flow (planned)
- [Seat Management (B2)](../billing/seat-management.md) - Detailed seat tracking (planned)
- [Agent Management (D4)](../admin/agent-management.md) - Team member CRUD (planned)
- [Invites API (API3)](./invites-api.md) - Invite endpoints that trigger billing (planned)

---

## 10. OPEN QUESTIONS

1. **Should failed Stripe operations trigger alerts?** Currently just logged - consider Sentry integration for billing failures
2. **What happens to mid-cycle prorations?** Stripe handles automatically, but not documented for users
3. **Is the 7-day trial period configurable?** Currently hardcoded - should it be per-org?
4. **Should billing endpoints have stricter rate limiting?** Currently uses global rate limiter
5. **What's the expected behavior when Stripe is down long-term?** Dev mode works, but production could be stuck
6. **Should there be a billing audit log?** Currently no historical record of billing changes

---

## API Reference

### POST /api/billing/setup-intent

Creates a Stripe SetupIntent for collecting payment method.

**Auth:** Required (any authenticated user)

**Request:** Empty body (POST)

**Response (200):**
```json
{
  "clientSecret": "seti_xxx_secret_xxx"
}
```

**Errors:**
- 401: Not authenticated
- 404: User not found
- 500: Stripe not configured / Failed to create

---

### POST /api/billing/create-subscription

Creates a new Stripe subscription with trial period.

**Auth:** Required (any authenticated user)

**Request:**
```json
{
  "seatCount": 3,
  "billingPreference": "monthly" | "annual" | "six_month"
}
```

**Response (200):**
```json
{
  "success": true,
  "subscriptionId": "sub_xxx",
  "seatCount": 3,
  "billingFrequency": "monthly",
  "hasSixMonthOffer": false,
  "trialEnd": "2024-01-08T00:00:00.000Z",
  "status": "trialing"
}
```

**Dev Mode Response:**
```json
{
  "success": true,
  "devMode": true,
  "seatCount": 3,
  "billingFrequency": "monthly",
  "hasSixMonthOffer": false,
  "trialEnd": "2024-01-08T00:00:00.000Z"
}
```

**Errors:**
- 400: Invalid seat count / Subscription already exists / No payment method
- 401: Not authenticated
- 404: User/Organization/Customer not found
- 500: Price not configured / Failed to create

---

### POST /api/billing/seats

Updates seat usage for billing purposes.

**Auth:** Required (any authenticated user)

**Request:**
```json
{
  "action": "add" | "remove",
  "quantity": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "usedSeats": 4,
  "purchasedSeats": 5,
  "availableSeats": 1,
  "billingExpanded": false
}
```

**Errors:**
- 400: Invalid request
- 401: Unauthorized
- 403: Profile not found
- 500: Failed to update seats

---

### POST /api/billing/update-settings

Updates billing settings (seat count and/or billing frequency).

**Auth:** Required (admin role only)

**Request:**
```json
{
  "seatCount": 5,
  "billingFrequency": "annual"
}
```

**Response (200):**
```json
{
  "success": true,
  "seatCount": 5,
  "availableSeats": 2,
  "stripeUpdated": true,
  "billingFrequency": "annual",
  "stripePriceUpdated": true,
  "currentUsage": 3
}
```

**Errors:**
- 400: Cannot reduce below usage / Invalid frequency / six_month not available
- 401: Unauthorized
- 403: Admin access required
- 404: Organization not found
- 500: Price not configured / Failed to update

---

### POST /api/webhooks/stripe

Processes Stripe webhook events (server-side only).

**Auth:** Stripe signature verification

**Handled Events:**
- `invoice.paid` → Sets status to "active"
- `invoice.payment_failed` → Sets status to "past_due"
- `customer.subscription.updated` → Syncs status from Stripe
- `customer.subscription.deleted` → Sets status to "cancelled"

**Response (200):**
```json
{
  "received": true
}
```

**Errors:**
- 400: Missing/invalid signature
- 500: Handler failed (triggers Stripe retry)
- 503: Stripe not configured

