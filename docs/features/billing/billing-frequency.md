# Feature: Billing Frequency (B3)

## Quick Summary
Billing Frequency allows admins to switch between monthly ($297/seat), annual ($193/seat - 35% off), and 6-month ($178/seat - 40% off) billing cycles. The 6-month offer is a one-time signup perk that is permanently lost if the customer switches away from it.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Billing Frequency gives organizations flexibility in how they pay for the service while incentivizing longer commitments with significant discounts. It manages:
- Selection of billing cycle (monthly, annual, 6-month)
- Application of discounts for longer terms
- Protection of the exclusive 6-month offer
- Scheduling changes for next renewal
- Stripe subscription price ID swaps

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Lower monthly costs | Annual (35% off) and 6-month (40% off) options |
| Admin | Commitment flexibility | Can switch to monthly anytime (at renewal) |
| Admin | Understand pricing impact | Clear cost breakdowns in confirmation modal |
| Business Owner | Predictable expenses | Upfront billing for annual/6-month terms |
| Finance Team | Cost optimization | Significant savings on longer commitments |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path - Monthly → Annual)
1. Admin navigates to Admin → Settings → Billing
2. Admin sees current billing frequency with three radio options
3. Admin clicks "Annual" option
4. Confirmation modal appears with pricing breakdown
5. Admin reviews terms: change takes effect at renewal
6. Admin clicks "Confirm Change"
7. API updates `billing_frequency` in database
8. API swaps Stripe subscription item to annual price ID
9. Until renewal: any new seats are charged at current rate
10. At renewal: all seats switch to annual billing together

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILLING FREQUENCY STATES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐                     ┌─────────┐                    │
│   │ Monthly │ ←─ Downgrade ────── │ Annual  │                    │
│   │  $297   │ ────────────────► │  $193   │                      │
│   └────┬────┘     Upgrade         └────┬────┘                    │
│        │                               │                         │
│        │ ↑                             │ ↑                       │
│        │ │ Downgrade                   │ │ Switch                │
│        │ │ (loses offer)               │ │ (loses offer)         │
│        │ │                             │ │                       │
│        ↓ │                             ↓ │                       │
│   ┌─────────────────────────────────────────┐                    │
│   │          6-Month (Special Offer)         │                   │
│   │      $178 (40% off) - ONE-TIME ONLY      │                   │
│   │                                          │                   │
│   │  ⚠️ Only available if:                   │                   │
│   │     • has_six_month_offer = true         │                   │
│   │     • Set during signup ONLY             │                   │
│   │     • LOST FOREVER if you leave          │                   │
│   └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `monthly` | Pay month-to-month at $297/seat | Default for new orgs, downgrade from annual/6-mo | Upgrade to annual or 6-month |
| `annual` | Annual billing at $193/seat (35% off) | Upgrade from monthly/6-month | Downgrade to monthly |
| `six_month` | 6-month billing at $178/seat (40% off) | Select during signup only | Switch to monthly or annual (loses offer) |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Click frequency radio | Billing settings UI | Opens confirmation modal | Shows pricing breakdown |
| Confirm frequency change | Confirmation modal | Calls `/api/billing/update-settings` | Updates DB + Stripe |
| six_month → any other | API | Sets `has_six_month_offer = false` | Offer permanently lost |
| Stripe webhook | Server | Syncs status on `subscription.updated` | Keeps DB in sync |
| New subscription | Funnel step 3 | Sets initial frequency + 6-mo offer flag | Creates Stripe subscription |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `BillingSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | Main billing settings UI |
| `handleFrequencyChange` | Same file | Shows confirmation modal |
| `confirmFrequencyChange` | Same file | Calls API to update frequency |
| `getFrequencyChangeExplanation` | Same file | Generates pricing breakdown for modal |
| `POST /api/billing/update-settings` | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | API to change frequency |
| `getPriceIdForFrequency` | `apps/dashboard/src/lib/stripe.ts` | Maps frequency to Stripe Price ID |
| `PRICING` | `apps/dashboard/src/lib/stripe.ts` | Centralized pricing constants |
| `PaywallStep3` | `apps/dashboard/src/app/paywall/billing/page.tsx` | Signup flow frequency selection |
| `handleStripeWebhook` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Syncs subscription changes |

### Data Flow

```
ADMIN CHANGES BILLING FREQUENCY (Monthly → Annual)
    │
    ├─► UI: Admin clicks "Annual" radio button
    │   └─► handleFrequencyChange('annual')
    │       └─► Sets pendingFrequency, shows confirmation modal
    │
    ├─► UI: Admin clicks "Confirm Change"
    │   └─► confirmFrequencyChange()
    │       └─► POST /api/billing/update-settings
    │           Body: { billingFrequency: 'annual' }
    │
    ├─► API: Validates request
    │   ├─► Verify user is authenticated
    │   ├─► Verify user has admin role
    │   ├─► Validate frequency is valid ('monthly' | 'annual' | 'six_month')
    │   └─► Check if six_month is allowed (has_six_month_offer = true)
    │
    ├─► API: Check if leaving six_month
    │   └─► If org.billing_frequency === 'six_month' && newFreq !== 'six_month'
    │       └─► updates.has_six_month_offer = false  ⚠️ PERMANENT
    │
    ├─► API: Update Stripe subscription
    │   ├─► getPriceIdForFrequency('annual') → price_xxx
    │   └─► stripe.subscriptionItems.update(itemId, {
    │           price: newPriceId,
    │           proration_behavior: 'create_prorations'
    │       })
    │
    ├─► API: Update database
    │   └─► supabase.update('organizations', {
    │           billing_frequency: 'annual',
    │           has_six_month_offer: false  // if applicable
    │       })
    │
    └─► UI: Response handling
        ├─► Success: setBillingFrequency('annual'), router.refresh()
        └─► Error: setFrequencyError(error.message)


SIGNUP: SELECTING 6-MONTH OFFER
    │
    ├─► UI: User sees exit popup when choosing monthly
    │   └─► 6-month offer presented as downsell
    │
    ├─► UI: User clicks "Start Trial with 6-Month Plan"
    │   └─► createSubscriptionAndContinue('six_month')
    │
    ├─► API: POST /api/billing/create-subscription
    │   Body: { seatCount, billingPreference: 'six_month' }
    │
    └─► API: Creates subscription with 6-month offer
        ├─► stripe.subscriptions.create({
        │       price: PRICE_IDS.six_month,
        │       trial_end: 7_days_from_now
        │   })
        └─► supabase.update('organizations', {
                billing_frequency: 'six_month',
                has_six_month_offer: true  ← Only set here!
            })
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Monthly → Annual upgrade | Click Annual | Shows confirmation modal with savings | ✅ | Change at renewal |
| 2 | Annual → Monthly downgrade | Click Monthly | Shows warning about price increase | ✅ | No refund |
| 3 | Monthly → 6-month (has offer) | Click 6-month | Upgrades with 40% discount | ✅ | Rare - usually from signup |
| 4 | 6-month → Monthly downgrade | Click Monthly | Warning: loses offer forever | ✅ | Permanent loss |
| 5 | 6-month → Annual | Click Annual | Warning: loses 6-month offer | ✅ | Still loses 40% rate |
| 6 | 6-month option not visible | No offer flag | 6-month radio button hidden | ✅ | UI shows only if `hasSixMonthOffer` |
| 7 | Try 6-month without offer | API call | Returns 400 error | ✅ | Backend validation |
| 8 | Frequency change during trial | Normal flow | Works - subscription still created | ✅ | Trial continues |
| 9 | Frequency change while paused | Normal flow | Works - frequency stored | ⚠️ | Takes effect when resumed |
| 10 | Multiple changes in same session | Rapid clicks | Each confirmed change updates | ✅ | Modal prevents rapid changes |
| 11 | Stripe price ID not configured | Missing env var | Falls back to monthly price ID | ⚠️ | Logs warning |
| 12 | Change near billing date | Normal flow | Proration calculated by Stripe | ✅ | create_prorations behavior |
| 13 | Add seats after frequency change | Add seat | Seats charged at current (old) rate | ✅ | Until renewal |
| 14 | Cancel modal mid-change | Click Cancel | No change made, modal closes | ✅ | Discards pending change |
| 15 | Network error during change | API failure | Error message shown, retry possible | ✅ | Graceful failure |
| 16 | Existing 6-month customer revisits | Return visit | 6-month option visible if on plan | ✅ | `billingFrequency === 'six_month'` check |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| "Invalid billing frequency" | Unknown frequency value | Error toast | Select valid option |
| "6-month pricing not available" | No `has_six_month_offer` flag | Error toast | Choose monthly or annual |
| "Price not configured for [freq] billing" | Missing Stripe Price ID | Error toast | Contact support |
| "Failed to update settings" | Database update error | Error toast | Retry later |
| "Admin access required" | Non-admin user | 403 response | Must be admin |
| "Unauthorized" | Not logged in | 401 response | Log in again |

---

## 5. UI/UX REVIEW

### User Experience Audit (Billing Settings Page)
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Billing | Shows current subscription info | ✅ | |
| 2 | View frequency options | Three radio buttons with pricing | ✅ | Clean layout |
| 3 | Click different frequency | Shows confirmation modal | ✅ | Good friction |
| 4 | Review modal content | Detailed breakdown of changes | ✅ | Comprehensive info |
| 5 | See 6-month warning | Amber warning about permanent loss | ✅ | Very prominent |
| 6 | Confirm change | Loading state, then success | ✅ | Good feedback |
| 7 | See updated frequency | Radio selection updates | ✅ | Instant reflection |

### User Experience Audit (Signup Funnel)
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Arrive at Step 3 | Monthly vs Annual selection | ✅ | Clear comparison |
| 2 | Select Monthly + Continue | Exit popup with 6-month offer | ✅ | Good downsell |
| 3 | View 6-month offer | 40% savings highlighted | ✅ | Attractive offer |
| 4 | Accept 6-month offer | Creates subscription, continues | ✅ | Smooth flow |
| 5 | Decline 6-month | Continues with monthly | ✅ | No pressure |

### Confirmation Modal Analysis
| Element | Purpose | Effectiveness |
|---------|---------|---------------|
| Title | Describes change (e.g., "Switch to Annual Billing") | ✅ Clear |
| Warning icon | Amber for downgrades, green for upgrades | ✅ Visual cue |
| Bullet list | Explains what will happen | ✅ Comprehensive |
| Summary box | Shows total cost after change | ✅ Concrete numbers |
| 6-month warning | Red warning about permanent loss | ✅ Very prominent |
| Billing disclosure | Fine print about terms | ✅ FTC compliant |
| Cancel button | Escape hatch | ✅ Easy to close |

### Accessibility
- Keyboard navigation: ✅ Radio buttons navigable with Tab/Arrow keys
- Screen reader support: ⚠️ Not verified
- Color contrast: ✅ High contrast for pricing
- Loading states: ✅ Loader2 spinner during API calls
- Focus management: ⚠️ Modal should trap focus

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| API latency | Single Stripe API call + single DB update | ✅ Fast |
| UI blocking | `isUpdatingFrequency` state prevents double-submit | ✅ Protected |
| Modal render | Conditional rendering, no lazy load needed | ✅ Instant |

### Security
| Concern | Mitigation |
|---------|------------|
| Admin-only access | Role check: `profile.role !== "admin"` → 403 |
| Offer abuse | `has_six_month_offer` verified server-side |
| Rate limiting | No explicit rate limiting | ⚠️ Could add |
| CSRF protection | Next.js built-in cookies |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Stripe API failure | Error returned to UI, no DB change |
| Partial update | DB updated only after Stripe succeeds |
| Webhook sync | `subscription.updated` event keeps status in sync |
| Price ID missing | Fallback to monthly, warning logged |

### Database Schema
```sql
-- organizations table columns for billing frequency
ALTER TABLE organizations 
ADD COLUMN billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'annual', 'six_month'));

ALTER TABLE organizations 
ADD COLUMN has_six_month_offer BOOLEAN DEFAULT false;
```

### Stripe Configuration Required
| Environment Variable | Value | Purpose |
|---------------------|-------|---------|
| `STRIPE_MONTHLY_PRICE_ID` | `price_xxx` | Monthly seat price |
| `STRIPE_ANNUAL_PRICE_ID` | `price_yyy` | Annual seat price |
| `STRIPE_SIX_MONTH_PRICE_ID` | `price_zzz` | 6-month seat price |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Monthly/Annual/6-month is intuitive. Discounts for longer terms match user expectations.

2. **Is the control intuitive?** ✅ Yes - Radio buttons for selection, confirmation before change. Standard billing UX pattern.

3. **Is feedback immediate?** ✅ Yes - Confirmation modal shows exact impact. Loading state during change. Success reflected immediately.

4. **Is the flow reversible?** ⚠️ Partially - Can switch between monthly and annual. But 6-month offer loss is PERMANENT and clearly warned.

5. **Are errors recoverable?** ✅ Yes - Failed changes show error, can retry. No partial states.

6. **Is the complexity justified?** ✅ Yes - The 6-month offer complexity supports business goals (retention). Multiple warnings prevent accidental loss.

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No rate limiting | Could spam frequency changes | 🟢 Low | Add cooldown between changes |
| Focus trap missing | Modal doesn't trap keyboard focus | 🟢 Low | Add focus trap hook |
| 6-month always downsell | May feel pushy | 🟢 Low | Could make optional |
| No undo period | Accidental 6-mo loss permanent | 🟡 Medium | Could add 24hr grace period |
| No email notification | Change not confirmed via email | 🟢 Low | Add confirmation email |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main billing UI | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | 1-950 | Complete billing settings |
| Frequency state management | Same file | 63-69 | billingFrequency state |
| Frequency radio buttons | Same file | 483-578 | Three frequency options |
| Confirmation modal | Same file | 839-926 | Detailed change preview |
| getFrequencyChangeExplanation | Same file | 246-327 | Generates modal content |
| Frequency update API | `apps/dashboard/src/app/api/billing/update-settings/route.ts` | 93-138 | billingFrequency handling |
| 6-month offer check | Same file | 103-108 | Validates offer flag |
| Lose 6-month offer | Same file | 110-114 | Sets has_six_month_offer = false |
| Stripe price swap | Same file | 119-137 | Updates subscription item |
| Price ID mapping | `apps/dashboard/src/lib/stripe.ts` | 17-42 | PRICE_IDS + getPriceIdForFrequency |
| Centralized pricing | Same file | 44-49 | PRICING constant |
| Signup funnel | `apps/dashboard/src/app/paywall/billing/page.tsx` | 1-457 | Initial frequency selection |
| 6-month downsell popup | Same file | 331-455 | Exit popup with offer |
| Create subscription API | `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | 1-180 | Initial subscription |
| Database migration | `supabase/migrations/20251201100000_billing_frequency.sql` | 1-29 | Schema additions |
| TypeScript types | `packages/domain/src/database.types.ts` | 41 | BillingFrequency type |
| Organization type | Same file | 209-210 | billing_frequency + has_six_month_offer |
| Stripe webhook handler | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 191-198 | subscription.updated handling |

---

## 9. RELATED FEATURES
- [B1 - Subscription Creation](./subscription-creation.md) - Initial subscription setup during onboarding
- [B2 - Seat Management](./seat-management.md) - Changing seat count (uses same API endpoint)
- [B4 - Pause Subscription](./pause-subscription.md) - Pausing affects frequency change timing
- [B5 - Cancel Subscription](./cancel-subscription.md) - Cancellation preserves frequency for re-subscribe
- Stripe Customer Portal - External billing management

---

## 10. OPEN QUESTIONS

1. **Should there be a grace period for 6-month offer loss?** Currently permanent immediately. Could add 24-48 hour window to revert.

2. **What happens if Stripe price IDs change?** Currently hardcoded in environment. Would need deployment to update.

3. **Should frequency changes trigger email notifications?** Currently no email sent. Good for audit trail.

4. **How does frequency change interact with seat changes?** Both use same API endpoint. Seats added before renewal use current rate - is this documented clearly enough in UI?

5. **Should paused accounts be able to change frequency?** Currently works, but takes effect at resume. Is this expected behavior?

6. **Is the 6-month offer available for re-subscribers?** Currently: No. Once cancelled and re-subscribed, they don't get the offer. Is this intentional?

