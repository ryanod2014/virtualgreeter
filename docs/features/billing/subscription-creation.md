# Feature: Subscription Creation (B1)

## Quick Summary
The Subscription Creation flow guides new users through a 3-step paywall funnel: card entry → seat selection → billing preference, ultimately creating a Stripe subscription with a 7-day free trial.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Converts signup completions into paying customers by collecting payment information upfront (with a 7-day trial), allowing users to select team size, and choosing their preferred billing frequency. This establishes the subscription that will power their organization's access to the platform.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Start using the platform immediately | 7-day free trial starts instantly after completing funnel |
| Admin | Understand pricing before committing | Clear pricing display ($297/seat/mo) with discount options |
| Admin | Flexibility in team size | Seat selector (1-50) with ability to adjust later |
| Admin | Save money on longer commitments | Annual (35% off) and 6-month (40% off) billing options |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. User completes signup and is redirected to `/paywall`
2. System creates Stripe SetupIntent on page load
3. User enters credit card information (card number, expiry, CVC, ZIP)
4. User agrees to billing terms checkbox
5. System confirms card setup with Stripe
6. User navigates to `/paywall/seats`
7. User selects seat count (1-50), stored in localStorage
8. User navigates to `/paywall/billing`
9. User selects billing frequency (monthly/annual)
10. If monthly selected, downsell popup offers 6-month plan (one-time)
11. System creates Stripe subscription with 7-day trial
12. User redirected to `/admin` dashboard

### State Machine

```
┌──────────────┐
│   SIGNUP     │
│  COMPLETED   │
└──────┬───────┘
       │
       ▼
┌──────────────┐  SetupIntent    ┌──────────────┐
│   PAYWALL    │◄───created──────│ Loading Card │
│  (Step 1)    │                 │   Elements   │
└──────┬───────┘                 └──────────────┘
       │ confirmCardSetup()
       ▼
┌──────────────┐
│    SEATS     │ localStorage.setItem('trial_seats')
│  (Step 2)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   BILLING    │
│  (Step 3)    │
└──────┬───────┘
       │ POST /api/billing/create-subscription
       │
       ├────────────────────────────────────┐
       │                                    │
       ▼                                    ▼
┌──────────────┐                    ┌──────────────┐
│  TRIALING    │                    │    ERROR     │
│ (Dashboard)  │                    │   (Retry)    │
└──────────────┘                    └──────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `paywall` | Entering payment info | Complete signup | Card setup succeeds |
| `seats` | Selecting team size | Card setup succeeds | Continue clicked |
| `billing` | Choosing billing frequency | Seats selected | Subscription created |
| `trialing` | Active trial period | Subscription created | Trial ends (7 days) |
| `active` | Paid subscription | First invoice paid | Cancel/pause |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load (`/paywall`) | PaywallForm useEffect | Creates SetupIntent | Stripe customer created if none exists |
| Card form submit | handleContinue() | Confirms card with Stripe | Payment method saved to customer |
| Seats continue | PaywallStep2 handleContinue | Stores seat count | localStorage: `trial_seats` |
| Billing submit | createSubscriptionAndContinue() | Creates subscription | DB: organization updated, Stripe subscription created |
| Monthly selection (first time) | handleContinue() | Shows 6-month downsell | exitPopupShown ref set true |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `PaywallForm` | `apps/dashboard/src/app/paywall/page.tsx` | Card entry UI with Stripe Elements |
| `PaywallStep2` | `apps/dashboard/src/app/paywall/seats/page.tsx` | Seat count selector |
| `PaywallStep3` | `apps/dashboard/src/app/paywall/billing/page.tsx` | Billing frequency selection + downsell |
| `POST /api/billing/setup-intent` | `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | Creates Stripe SetupIntent |
| `POST /api/billing/create-subscription` | `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | Creates Stripe subscription |
| `getPriceIdForFrequency` | `apps/dashboard/src/lib/stripe.ts` | Maps billing frequency to Stripe Price ID (no fallback) |
| `isPriceIdConfigured` | `apps/dashboard/src/lib/stripe.ts` | Checks if a billing frequency has configured price ID |
| `getAvailableBillingFrequencies` | `apps/dashboard/src/lib/stripe.ts` | Returns list of frequencies with configured price IDs |
| `trackFunnelEvent` | `apps/dashboard/src/lib/funnel-tracking.ts` | Tracks conversion funnel analytics |

### Data Flow

```
STEP 1: CARD ENTRY (/paywall)
    │
    ├─► Page Load
    │   └─► POST /api/billing/setup-intent
    │       ├─► Check authentication (Supabase)
    │       ├─► Get user's organization_id
    │       ├─► If no stripe_customer_id:
    │       │   └─► stripe.customers.create()
    │       │       └─► DB: organizations.stripe_customer_id = customer.id
    │       └─► stripe.setupIntents.create()
    │           └─► Return: { clientSecret }
    │
    ├─► User enters card + ZIP + agrees to terms
    │
    └─► Submit
        └─► stripe.confirmCardSetup(clientSecret, payment_method)
            ├─► Success: payment method attached to customer
            ├─► stripe.customers.update(invoice_settings.default_payment_method)
            ├─► Track: FUNNEL_STEPS.PAYWALL_COMPLETE
            └─► router.push('/paywall/seats')

STEP 2: SEAT SELECTION (/paywall/seats)
    │
    ├─► Track: FUNNEL_STEPS.SEATS
    │
    ├─► User selects seats (1-50)
    │
    └─► Continue
        ├─► localStorage.setItem('trial_seats', seatCount)
        ├─► Track: FUNNEL_STEPS.SEATS_COMPLETE
        └─► router.push('/paywall/billing')

STEP 3: BILLING PREFERENCE (/paywall/billing)
    │
    ├─► Page Load
    │   ├─► Check isPriceIdConfigured() for each billing option
    │   ├─► Hide billing options without configured price IDs
    │   └─► Show configuration error if no options available
    │
    ├─► Load seatCount from localStorage
    │
    ├─► User selects: monthly | annual (only if configured)
    │
    ├─► If monthly & !exitPopupShown & hasSixMonth:
    │   └─► Show 6-month downsell popup
    │       ├─► Accept 6-month → createSubscriptionAndContinue('six_month')
    │       └─► Decline → createSubscriptionAndContinue('monthly')
    │
    └─► createSubscriptionAndContinue(billingPreference)
        └─► POST /api/billing/create-subscription
            ├─► Validate: authenticated, seatCount >= 1
            ├─► Get organization with stripe_customer_id
            │
            ├─► If subscription exists & status !== 'cancelled':
            │   └─► Return error (already subscribed)
            │
            ├─► If status === 'cancelled':
            │   └─► Clear old stripe_subscription_id, stripe_subscription_item_id
            │
            ├─► DEV MODE (no Stripe):
            │   └─► DB: seat_count, subscription_status='trialing', billing_frequency
            │
            ├─► PRODUCTION:
            │   ├─► Verify customer has default_payment_method
            │   ├─► Calculate trial_end (7 days from now)
            │   ├─► getPriceIdForFrequency(billingPreference)
            │   ├─► If priceId empty: return error with env var name
            │   └─► stripe.subscriptions.create({
            │       │   customer, items: [{ price, quantity: seatCount }],
            │       │   trial_end, default_payment_method, metadata
            │       │ })
            │       │
            │       └─► DB: stripe_subscription_id, stripe_subscription_item_id,
            │             seat_count, subscription_status='trialing',
            │             billing_frequency, has_six_month_offer
            │
            └─► Track: FUNNEL_STEPS.BILLING_[ANNUAL|MONTHLY|6MONTH]
                └─► router.push('/admin')
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - monthly | Complete all steps, choose monthly | Subscription created with 7-day trial | ✅ | |
| 2 | Happy path - annual | Complete all steps, choose annual | Subscription created with annual pricing | ✅ | 35% discount |
| 3 | Accept 6-month downsell | Choose monthly, accept popup offer | Subscription with 6-month billing | ✅ | 40% discount |
| 4 | Decline 6-month downsell | Choose monthly, decline popup | Monthly subscription created | ✅ | Popup only shown once |
| 5 | User has active subscription | Try to create second subscription | Error returned, existing sub ID provided | ✅ | Prevents duplicates |
| 6 | Re-subscribe after cancel | Cancelled user completes funnel | Old sub IDs cleared, new subscription created | ✅ | Clean slate |
| 7 | Card declined during setup | Invalid card entered | Stripe error shown, can retry | ✅ | |
| 8 | No payment method saved | API called without card | Error: "No payment method on file" | ✅ | |
| 9 | Stripe customer deleted | Customer removed from Stripe | Error: "Customer not found" | ✅ | |
| 10 | Change seats before submit | Adjust counter multiple times | Final value used from localStorage | ✅ | |
| 11 | Browser refresh on step 2/3 | Reload page | Seat count preserved in localStorage | ✅ | |
| 12 | Navigate away from paywall | Leave `/paywall` mid-flow | Progress lost, must re-enter card | ⚠️ | SetupIntent may be orphaned |
| 13 | Back button from seats | Browser back | Returns to paywall, card already saved | ✅ | Can proceed again |
| 14 | Stripe API failure | Network/Stripe outage | Generic error, can retry | ✅ | |
| 15 | Invalid billing preference | Tampered request | Defaults to 'monthly' | ✅ | Server validates |
| 16 | Seat count = 0 | Tampered request | Error: "Invalid seat count" | ✅ | |
| 17 | Dev mode (no Stripe keys) | STRIPE_SECRET_KEY not set | DB updated without Stripe call | ✅ | For local dev |
| 18 | Missing price ID for frequency | Price not configured in env | Error shown, billing option hidden | ✅ | No fallback to prevent billing disputes |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| "Not authenticated" | Session expired | Error message | Re-login, restart flow |
| "User not found" | User record missing | Error message | Contact support |
| "Organization not found" | Org record missing | Error message | Contact support |
| "Subscription already exists" | Active sub exists | Error (with sub ID) | Redirect to admin |
| "No payment method on file" | Card not saved | Error message | Go back to step 1 |
| "Customer not found" | Stripe customer deleted | Error message | Contact support |
| "Failed to create subscription" | Stripe API error | Generic error | Retry |
| Card validation errors | Invalid card data | Stripe-specific message | Fix card info, retry |
| "Billing configuration error" | Required price ID not configured | Clear error with env var name | Admin must configure environment |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Step 1 - Card Entry:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Land on page | SetupIntent loading spinner | ✅ | "Initializing secure payment..." |
| 2 | Enter card number | Real-time validation, card icon | ✅ | |
| 3 | Enter expiry/CVC/ZIP | Fields validate independently | ✅ | |
| 4 | Check billing terms | Checkbox enables button | ✅ | FTC-compliant text |
| 5 | Click "Next" | Loading state, then redirect | ✅ | |
| 6 | Card error | Red error box with message | ✅ | Stripe provides clear messages |

**Step 2 - Seats:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View seat selector | Default 1 seat shown | ✅ | |
| 2 | Use +/- buttons | Count updates, price recalculates | ✅ | |
| 3 | Use quick-select | Jumps to 1/2/5/10/20 | ✅ | Nice shortcut |
| 4 | View pricing | $0 during trial, $X/mo after | ✅ | Clear breakdown |

**Step 3 - Billing:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 0 | Page load (missing config) | Red error banner, button disabled | ✅ | Clear admin guidance |
| 1 | View plan options | Only configured options shown | ✅ | Prevents invalid selections |
| 2 | Select annual | Green savings callout | ✅ | |
| 3 | Select monthly | Red "overpaying" callout | ⚠️ | Slightly aggressive |
| 4 | Click continue (monthly) | 6-month popup appears (if configured) | ✅ | One-time offer |
| 5 | Accept/decline popup | Subscription created | ✅ | |

### Accessibility
- Keyboard navigation: ✅ All form fields keyboard accessible
- Screen reader support: ⚠️ Not fully verified for Stripe Elements
- Color contrast: ✅ Dark theme with high contrast
- Loading states: ✅ Spinner and button text updates

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Stripe SDK load time | Async load with `loadStripe()` | ✅ Non-blocking |
| SetupIntent creation | Created on page mount | ✅ Parallel with user reading |
| API response time | Single subscription.create call | ✅ ~1-2 seconds |
| localStorage usage | Only stores seat count (small) | ✅ Minimal |

### Security
| Concern | Mitigation |
|---------|------------|
| Card data exposure | Stripe Elements - PCI compliant, card never touches server |
| CSRF on API routes | Supabase auth cookies verified server-side |
| Subscription tampering | Server validates all parameters |
| Price manipulation | Price IDs from server environment, not client |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Stripe outage | Error displayed, user can retry |
| Webhook timing | Subscription status set immediately in DB, webhook updates as backup |
| Idempotency | Re-subscribe after cancel clears old IDs |
| Dev environment | Dev mode bypasses Stripe, allows local testing |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - 3-step wizard with progress badges ("Step X of 3")
2. **Is the control intuitive?** ✅ Yes - Standard card form, simple seat counter, clear plan comparison
3. **Is feedback immediate?** ✅ Yes - Real-time validation, loading states, error messages
4. **Is the flow reversible?** ⚠️ Partial - Can go back in browser, but card info must be re-entered if leaving paywall
5. **Are errors recoverable?** ✅ Yes - All errors show retry path, no dead ends
6. **Is the complexity justified?** ✅ Yes - 3 steps balances information gathering with user patience

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| SetupIntent orphaned if user leaves | Minor Stripe cleanup needed | 🟢 Low | Stripe auto-expires unused intents |
| "Overpaying" messaging slightly aggressive | May feel pressured | 🟢 Low | Consider softer language |
| No explicit "back" buttons | Relies on browser back | 🟢 Low | Add navigation arrows |
| localStorage seats lost on clear | Must re-select seats | 🟢 Low | Could use session storage |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Card entry form | `apps/dashboard/src/app/paywall/page.tsx` | 1-386 | Stripe Elements, SetupIntent flow |
| Seat selector | `apps/dashboard/src/app/paywall/seats/page.tsx` | 1-157 | Counter, quick-select, localStorage |
| Billing preference | `apps/dashboard/src/app/paywall/billing/page.tsx` | 1-458 | Plan comparison, 6-month downsell popup |
| Paywall layout | `apps/dashboard/src/app/paywall/layout.tsx` | 1-37 | Shared visual styling |
| SetupIntent API | `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | 1-85 | Customer creation, SetupIntent |
| Subscription API | `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | 1-179 | Main subscription creation logic |
| Stripe config (dashboard) | `apps/dashboard/src/lib/stripe.ts` | 1-55 | Price IDs, pricing constants |
| Stripe config (server) | `apps/server/src/lib/stripe.ts` | 1-30 | Webhook secret, SDK init |
| Webhook handler | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 1-290 | invoice.paid, subscription.* events |
| Funnel tracking | `apps/dashboard/src/lib/funnel-tracking.ts` | 1-101 | Analytics events |

---

## 9. RELATED FEATURES
- [B2 - Seat Management](./seat-management.md) - Changing seat count after subscription
- [B3 - Billing Frequency](./billing-frequency.md) - Changing billing frequency
- [B4 - Pause Subscription](./pause-subscription.md) - Temporarily pausing billing
- [B5 - Cancel Subscription](./cancel-subscription.md) - Ending subscription
- [B6 - Payment Failure](./payment-failure.md) - Handling failed payments
- [AUTH1 - Signup Flow](../auth/signup-flow.md) - Precedes subscription creation

---

## 10. OPEN QUESTIONS

1. **What happens if webhook arrives before API response?** - Currently, API sets status to 'trialing' immediately. Webhook handler is idempotent (won't downgrade trialing to trialing). Should be fine, but worth monitoring.

2. **Should SetupIntent be reused if user returns to Step 1?** - Currently creates new SetupIntent on each page load. Could cache clientSecret in sessionStorage to reuse.

3. **Why is billing Step 3 but seats Step 2?** - Current flow is Card → Seats → Billing. Some funnels do Card → Billing → Seats. Worth A/B testing which converts better.

4. **Should the 6-month offer be shown to annual users who change their mind?** - Currently only shown to monthly users. If user selects annual, changes to monthly, they see the popup. Is this intended?

5. **How long should dev mode be supported?** - Dev mode allows subscription flow without Stripe. Good for local dev but could mask integration issues.

6. **~~Price ID fallback behavior~~** - ✅ RESOLVED (TKT-020): System now throws explicit errors when price IDs are missing instead of silently falling back. Billing options without configured price IDs are hidden from users.



