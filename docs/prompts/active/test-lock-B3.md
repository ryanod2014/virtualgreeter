# TEST LOCK Agent: B3

> **Feature:** Billing Frequency
> **Priority:** Medium
> **Doc:** `docs/features/billing/billing-frequency.md`

---

## Your Task

Lock in current behavior for all code in the Billing Frequency feature by writing behavior-level tests.

---

## Feature Overview

Billing Frequency allows users to choose between monthly, 6-month, and annual billing cycles during subscription creation, with appropriate discounts.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(auth)/paywall/page.tsx` | Billing frequency selection | High |
| `apps/dashboard/src/lib/stripe.ts` | Price ID lookup by frequency | High |

---

## Behaviors to Capture

### paywall/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Selection** | 1. Shows monthly/6-month/annual options, 2. Displays price for each, 3. Highlights savings for longer terms |

### stripe.ts

| Function | Behaviors to Test |
|----------|-------------------|
| Price lookup | 1. Returns correct price ID for monthly, 2. Returns correct price ID for 6-month, 3. Returns correct price ID for annual, 4. Handles missing price ID |

---

## Output

- `apps/dashboard/src/app/(auth)/paywall/page.test.tsx`
- `apps/dashboard/src/lib/stripe.test.ts`
- Completion report: `docs/agent-output/test-lock/B3-[TIMESTAMP].md`



