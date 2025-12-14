# Feature: Cancel Subscription (B5)

## Quick Summary
The Cancel Subscription feature allows admins to terminate their GreetNow subscription through a multi-step feedback collection process. A "pause account" downsell is offered first, and upon confirmation, the organization retains access until the end of the current billing period (grace period), then automatically downgrades to a free plan with feedback data preserved for analytics.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [x] Platform Admin (views analytics)

---

## 1. WHAT IT DOES

### Purpose
Enables subscription cancellation while maximizing feedback collection for product improvement. The flow attempts to retain customers by offering a free pause option before final cancellation.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Cancel subscription | Multi-step wizard to end billing |
| Admin | Avoid commitment temporarily | Pause downsell offers 1-3 month free freeze |
| Admin | Explain why they're leaving | Structured feedback collection |
| Platform Admin | Understand churn reasons | Analytics dashboard with MRR-weighted insights |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Settings → Billing
2. Admin clicks "Cancel Subscription" button
3. **Pause Modal** appears first (downsell) offering free 1-3 month pause
4. Admin clicks "No, cancel and delete all my data"
5. **Cancel Modal Step 1**: Select primary cancellation reason (required)
6. **Cancel Modal Step 2**: Provide additional details (detailed feedback required)
7. **Cancel Modal Step 3**: Review summary and confirm deletion warning
8. Admin clicks "Cancel Subscription"
9. System saves feedback to `cancellation_feedback` table
10. System sets `pause_ends_at` to current billing period end date
11. Organization maintains current plan until period ends (grace period)
12. Confirmation screen shown
13. When billing period ends, Stripe webhook downgrades plan to "free"

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                        BILLING PAGE                              │
│                    (subscription_status: active)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                   [Click "Cancel Subscription"]
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PAUSE MODAL (Downsell)                      │
│        Offers free 1-3 month pause to retain customer            │
└───────────────────┬─────────────────────────┬───────────────────┘
                    │                         │
          [Click "Pause"]           [Click "No, cancel..."]
                    │                         │
                    ▼                         ▼
┌───────────────────────────┐    ┌────────────────────────────────┐
│   ACCOUNT PAUSED          │    │   CANCEL MODAL - STEP 1        │
│ (subscription_status:     │    │   Select Primary Reason        │
│  paused)                  │    │   (11 options, 1 required)     │
└───────────────────────────┘    └──────────────┬─────────────────┘
                                                │
                                       [Click "Continue"]
                                                │
                                                ▼
                                 ┌────────────────────────────────┐
                                 │   CANCEL MODAL - STEP 2        │
                                 │   Details & Feedback           │
                                 │   (detailed_feedback required) │
                                 └──────────────┬─────────────────┘
                                                │
                                       [Click "Continue"]
                                                │
                                                ▼
                                 ┌────────────────────────────────┐
                                 │   CANCEL MODAL - STEP 3        │
                                 │   Confirm (deletion warning)   │
                                 └──────────────┬─────────────────┘
                                                │
                                  [Click "Cancel Subscription"]
                                                │
                                                ▼
                                 ┌────────────────────────────────┐
                                 │   CONFIRMATION SCREEN          │
                                 │   "Subscription Cancelled"     │
                                 │   (Grace period active)        │
                                 │   Access until: [date]         │
                                 └──────────────┬─────────────────┘
                                                │
                                      [Billing period ends]
                                                │
                                                ▼
                                 ┌────────────────────────────────┐
                                 │   DOWNGRADED TO FREE           │
                                 │   (plan: free)                 │
                                 │   (pause_ends_at: null)        │
                                 └────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Active Subscription | Normal paid subscription | Signup, resume from pause | Cancel, pause |
| Pause Modal | Downsell retention offer | Click "Cancel Subscription" | Choose pause or continue to cancel |
| Cancel Step 1 | Primary reason selection | Click "No, cancel..." in pause modal | Select reason and continue, or close |
| Cancel Step 2 | Details and feedback | Complete step 1 | Provide feedback and continue, or back |
| Cancel Step 3 | Final confirmation | Complete step 2 | Confirm cancellation, or back |
| Grace Period | Active plan with end date set | Complete cancellation | Wait for period end or re-subscribe |
| Cancelled (Free) | Downgraded plan | Billing period ends (webhook) | Re-subscribe |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Click "Cancel Subscription" | Billing page | Opens pause modal | None |
| Select pause duration | Pause modal | Updates `selectedMonths` state | None |
| Confirm pause | Pause modal | Calls `pauseAccount()` | Updates org status to "paused", records in `pause_history` |
| Click "No, cancel..." | Pause modal | Opens cancel modal | Closes pause modal |
| Select primary reason | Cancel step 1 | Updates `primaryReason` state | Enables continue button |
| Toggle additional reasons | Cancel step 2 | Updates `additionalReasons` array | None |
| Submit cancellation | Cancel step 3 | Calls `submitCancellationFeedback()` | Inserts to `cancellation_feedback`, stores `pause_ends_at` with billing period end, keeps current plan |
| Webhook: `customer.subscription.deleted` | Stripe → Server | Updates org status to "cancelled", plan to "free", clears `pause_ends_at` | DB update |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `BillingSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | Main billing UI with cancel button |
| `PauseAccountModal` | `apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.tsx` | Downsell retention modal |
| `CancelSubscriptionModal` | `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx` | Multi-step cancellation wizard |
| `submitCancellationFeedback` | `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` | Server action to save feedback and downgrade plan |
| `handleSubscriptionDeleted` | `apps/server/src/features/billing/stripe-webhook-handler.ts` | Webhook handler for Stripe cancellation events |
| `CancellationsClient` | `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | Platform admin analytics dashboard |
| `CancellationReason` | `packages/domain/src/database.types.ts` | Type definition for 11 reason options |

### Data Flow

```
ADMIN INITIATES CANCELLATION
    │
    ├─► BillingSettingsClient: setShowPauseModal(true)
    │
    ├─► PauseAccountModal displayed
    │   ├─► User selects pause duration (1-3 months)
    │   │   └─► pauseAccount() → DB: updates organization, inserts pause_history
    │   │
    │   └─► User clicks "No, cancel and delete all my data"
    │       └─► setShowPauseModal(false), setShowCancelModal(true)
    │
    └─► CancelSubscriptionModal displayed
        │
        ├─► Step 1: Reason Selection
        │   └─► setPrimaryReason(reason)
        │
        ├─► Step 2: Details
        │   ├─► setAdditionalReasons([...])
        │   ├─► setDetailedFeedback(text) ← REQUIRED
        │   ├─► setCompetitorName(name) ← If switching
        │   ├─► setWouldReturn(bool)
        │   └─► setReturnConditions(text) ← If would return
        │
        └─► Step 3: Confirm
            └─► handleSubmit()
                │
                └─► onSubmit(data)
                    │
                    └─► handleCancelSubscription(data)
                        │
                        └─► submitCancellationFeedback({
                              organizationId,
                              userId,
                              primaryReason,
                              additionalReasons,
                              detailedFeedback,
                              competitorName,
                              wouldReturn,
                              returnConditions,
                              agentCount,
                              monthlyCost,
                              subscriptionDurationDays
                            })
                            │
                            ├─► DB: INSERT INTO cancellation_feedback
                            │
                            └─► DB: UPDATE organizations SET pause_ends_at = current_period_end
                                        (Plan remains active until period ends)

WHEN BILLING PERIOD ENDS
    │
    └─► Stripe webhook: customer.subscription.deleted
        │
        └─► handleSubscriptionDeleted()
            │
            ├─► DB: UPDATE organizations SET plan = 'free'
            ├─► DB: UPDATE organizations SET subscription_status = 'cancelled'
            └─► DB: UPDATE organizations SET pause_ends_at = null
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path cancellation | Complete all steps | Feedback saved, plan → free | ✅ | |
| 2 | Choose pause instead | Click pause button | Account paused, no cancellation | ✅ | Good retention mechanism |
| 3 | Close modal mid-flow | Click X or backdrop | Modal closes, state reset, no changes | ✅ | |
| 4 | Back navigation in modal | Click "Back" buttons | Returns to previous step | ✅ | |
| 5 | Click "Keep Subscription" | Click button in footer | Modal closes, no changes | ✅ | |
| 6 | Skip detailed feedback | Try to continue without text | Continue button disabled | ✅ | Required field |
| 7 | Skip primary reason | Try to continue without selection | Continue button disabled | ✅ | Required field |
| 8 | Cancel during trial | Same flow | Same behavior (no proration logic) | ⚠️ | No special trial handling visible |
| 9 | Cancel while already paused | N/A | Cancel button not shown when paused | ✅ | Shows "Resume" instead |
| 10 | Stripe subscription not set up | No stripe_subscription_id | Still downgrades to free | ⚠️ | Stripe call is TODO |
| 11 | Network error during submission | API failure | Toast error, modal stays open | ✅ | Can retry |
| 12 | Select "switched_to_competitor" | Select this reason | Competitor name input appears | ✅ | Conditional UI |
| 13 | Select "would return" = yes | Select this option | Return conditions input appears | ✅ | Conditional UI |
| 14 | Re-open cancel modal after error | Click cancel again | Fresh state, no pre-filled data | ⚠️ | Could preserve partial input |
| 15 | Cancel with active agents | Agents still online | No special handling | ⚠️ | Agents not notified/logged out |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Feedback save fails | DB error on insert | Console error, throws exception | Modal stays open, can retry |
| Plan update fails | DB error on organization update | Logged but not thrown | Feedback is saved, plan update may fail silently |
| Webhook verification fails | Invalid Stripe signature | 400 error to Stripe | Stripe will retry |
| Org not found for webhook | Subscription ID mismatch | 500 error | Stripe will retry |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Pause Modal (Downsell) Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click "Cancel Subscription" | Pause modal opens (not cancel modal) | ⚠️ | May confuse users expecting cancel flow |
| 2 | Select pause duration | Radio buttons update | ✅ | |
| 3 | See resume date | Calculated date shown | ✅ | Clear date display |
| 4 | Click "Pause" | Account frozen | ✅ | Confirmation shown |
| 5 | OR click "No, cancel..." | Cancel modal opens | ✅ | Clear path forward |

**Cancel Modal Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Select primary reason | Card highlights, radio selected | ✅ | Good visual feedback |
| 2 | Click continue | Progress to step 2 | ✅ | Progress indicator shows |
| 3 | Select additional reasons | Pill toggles | ✅ | Clear multi-select |
| 4 | Enter feedback | Text area fills | ✅ | Required field marked |
| 5 | Select would return | Button highlights | ✅ | Binary choice clear |
| 6 | Click continue | Progress to step 3 | ✅ | |
| 7 | Review warning | Amber retention notice shown with 30-day policy | ✅ | Clear, accurate warning (updated TKT-003) |
| 8 | Click cancel button | Loading state, then confirmation | ✅ | |

### Accessibility
- Keyboard navigation: ⚠️ Not explicitly tested
- Screen reader support: ⚠️ Not explicitly tested
- Color contrast: ✅ Good contrast in warning states (red on light)
- Loading states: ✅ Loader shown during submission
- Focus management: ⚠️ Modal trapping not verified

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Modal rendering | Client-side, conditional render | ✅ No issues |
| Feedback submission | Server action, single DB insert | ✅ Fast |
| Analytics loading | Platform page, batch query | ✅ Reasonable |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized cancellation | Server action validates user session |
| Cross-org cancellation | `organizationId` passed from session context |
| Data exposure | Cancellation feedback only accessible to platform admins |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Partial failure | Feedback saved first, plan update second (feedback prioritized) |
| Webhook replay | Handler is idempotent (checks current status before update) |
| Stripe sync | Webhook handler handles `customer.subscription.deleted` |

### Potential Issues Found

#### ⚠️ Issue 1: Stripe Integration Incomplete
The code contains TODO comments indicating Stripe cancellation is not fully implemented:

```typescript
// In production, you would also:
// 1. Call Stripe to cancel the subscription
// 2. Update the organization's plan to 'free' or mark as cancelled
// 3. Send a confirmation email
// 4. Schedule data retention/deletion
```

**Current behavior:** Only downgrades plan to "free", does NOT call Stripe API.
**Impact:** Stripe subscription may continue billing.

#### ✅ Issue 2: Data Retention Language (Fixed in TKT-003)
The UI now accurately communicates data retention policy:
- Header changed from "This will permanently delete your data" → "Data Retention Notice"
- Copy updated to: "Your data will be retained for 30 days after cancellation, then may be permanently deleted."
- Visual styling changed from red (urgent danger) → amber (warning/notice)
- Added notice: "You can resubscribe within 30 days to retain your data."

**Previous behavior:** Misleading "immediate permanent deletion" language.
**Current behavior:** Accurate 30-day retention policy communicated clearly.
**Fixed:** TKT-003 (2025-12-04)

#### ⚠️ Issue 3: No Notification System
No emails or in-app notifications are sent:
- No cancellation confirmation email
- No agents notified
- No reminder emails

#### ✅ Issue 4: Grace Period Logic (Fixed in TKT-030-V2)
The grace period is now properly implemented:
- `pause_ends_at` field stores the `current_period_end` date when subscription is cancelled
- Plan remains active (not downgraded to "free") until billing period ends
- When Stripe webhook fires `customer.subscription.deleted`, the plan is downgraded to "free" and `pause_ends_at` is cleared
- UI can show "Access until [date]" using the `pause_ends_at` field

**Previous behavior:** Immediate downgrade to "free" plan on cancellation.
**Current behavior:** Access continues until end of billing period, proper grace period enforcement.
**Fixed:** TKT-030-V2 (2025-12-13)

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Cancel → Feedback → Confirm is standard
2. **Is the control intuitive?** ⚠️ Mostly - Pause downsell first may confuse
3. **Is feedback immediate?** ✅ Yes - Progress indicator, button states clear
4. **Is the flow reversible?** ⚠️ No - But re-subscription is possible (separate flow)
5. **Are errors recoverable?** ⚠️ Partially - Modal stays open on error but no retry UI
6. **Is the complexity justified?** ✅ Yes - Feedback collection valuable for product

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Stripe not actually cancelled | Continued billing | 🔴 High | Implement Stripe API call |
| ~~Data not deleted despite UI claim~~ | ~~Trust issue, compliance~~ | ✅ **FIXED** | **TKT-003: Copy updated to accurate 30-day retention** |
| No confirmation email | Poor UX | 🟡 Medium | Add email notification |
| ~~No grace period enforcement~~ | ~~Immediate access loss~~ | ✅ **FIXED** | **TKT-030-V2: Grace period now tracked via pause_ends_at** |
| Pause modal first may confuse | UX friction | 🟢 Low | Consider flow order |
| No agent notification | Agents confused when widget stops | 🟢 Low | Add notification system |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main billing UI | `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | 813-837 | Cancel button, modal triggers |
| Pause modal (downsell) | `apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.tsx` | 1-317 | Full retention offer flow |
| Cancel modal wizard | `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx` | 1-623 | 3-step wizard |
| Server actions | `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` | 21-68 | `submitCancellationFeedback` |
| Webhook handler | `apps/server/src/features/billing/stripe-webhook-handler.ts` | 204-263 | `handleSubscriptionDeleted` - clears `pause_ends_at` on deletion |
| Analytics dashboard | `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | 1-891 | MRR-weighted analytics |
| Analytics data fetch | `apps/dashboard/src/app/(app)/platform/cancellations/page.tsx` | 1-81 | Server-side data loading |
| DB schema | `supabase/migrations/20251127700000_cancellation_feedback.sql` | 1-44 | Table definition, RLS |
| Type definitions | `packages/domain/src/database.types.ts` | 19-30, 410-428 | `CancellationReason`, `CancellationFeedback` |

---

## 9. RELATED FEATURES
- [Pause Subscription (B4)](./pause-subscription.md) - Alternative to cancellation (documented in same files)
- [Subscription Creation (B1)](./subscription-creation.md) - Reverse flow for re-subscription
- [Stripe Webhook Handler](../../platform/stripe-webhooks.md) - Handles `customer.subscription.deleted`

---

## 10. OPEN QUESTIONS

1. **When will Stripe integration be completed?** Current code only downgrades plan, doesn't cancel Stripe subscription.

2. ~~**Should data actually be deleted?**~~ **RESOLVED (TKT-003):** UI now correctly states 30-day retention policy. Data retention policy clarified:
   - Data retained for 30 days after cancellation
   - May be permanently deleted after 30 days
   - User can resubscribe within 30 days to retain data
   - This aligns with actual behavior (no immediate deletion)

3. **What about prorated refunds?** Code doesn't handle:
   - Mid-period cancellations
   - Unused time credits
   - Annual plan partial refunds

4. **Should cancelled users retain read-only access?** Current behavior is unclear on what "free" plan includes.

5. ~~**How is "end of billing period" enforced?**~~ **RESOLVED (TKT-030-V2):** Grace period is now properly enforced:
   - `pause_ends_at` stores the billing period end date when user cancels
   - Plan remains active until that date
   - Stripe webhook `customer.subscription.deleted` triggers the actual downgrade to "free"
   - `pause_ends_at` is cleared when subscription finally ends

6. **Should there be a reactivation flow?** No dedicated reactivation path documented.

7. **What happens to in-progress calls during cancellation?** No handling for agents mid-call.

8. **Should cancellation feedback be anonymizable?** For GDPR compliance, might need to handle user_id in feedback after full account deletion.

---

## Cancellation Reasons Reference

The system collects feedback using these 11 predefined reasons:

| Reason Code | Display Label | Description |
|-------------|--------------|-------------|
| `reps_not_using` | Reps Aren't Using It | Our team isn't adopting the tool |
| `not_enough_reps` | Not Enough Reps | We don't have staff to answer calls |
| `low_website_traffic` | Low Website Traffic | Not enough visitors to justify the cost |
| `low_roi_per_call` | Low ROI Per Call | Calls don't generate enough revenue |
| `too_expensive` | Too Expensive | The pricing doesn't fit our budget |
| `not_enough_features` | Missing Features | It doesn't have features we need |
| `switched_to_competitor` | Switching to Competitor | We found a better alternative |
| `technical_issues` | Technical Issues | We experienced bugs or performance problems |
| `difficult_to_use` | Difficult to Use | The product was too complex or confusing |
| `business_closed` | Business Closed | We're shutting down or restructuring |
| `other` | Other Reason | Something else not listed here |

---

## Analytics Dashboard (Platform Admin)

Platform admins have access to a comprehensive cancellation analytics dashboard at `/platform/cancellations` featuring:

### Views
1. **Overview** - Reason breakdown by MRR impact (not just count)
2. **Exit Survey Responses** - Full-text feedback quotes, return conditions, competitor mentions
3. **Cohort Analysis** - Churn patterns by signup month
4. **All Cancellations** - Searchable list with detail modals

### Key Metrics
- Churn Rate (percentage of total orgs)
- Would Return percentage
- Competitor mentions count
- Total Lost MRR
- Avg Time to Churn (days)
- Retention Rate

### Filtering
- Date range picker (default: 90 days)
- All data filtered by selected range



