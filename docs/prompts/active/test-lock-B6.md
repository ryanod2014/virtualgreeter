# TEST LOCK Agent: B6

> **Feature:** Payment Failure
> **Priority:** Critical
> **Doc:** `docs/features/billing/payment-failure.md`

---

## Your Task

Lock in current behavior for all code in the Payment Failure feature by writing behavior-level tests.

---

## Feature Overview

Payment Failure handles what happens when a customer's payment fails. The system should mark the org as past_due, show a blocking modal, and force agents offline.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/features/webhooks/stripe.ts` | `invoice.payment_failed` handler | High |
| `apps/dashboard/src/components/PaymentBlocker.tsx` | Blocking modal (if exists) | High |
| `apps/dashboard/src/app/(dashboard)/layout.tsx` | Past due checking | Medium |

---

## Behaviors to Capture

### stripe.ts (webhooks)

| Handler | Behaviors to Test |
|---------|-------------------|
| `invoice.payment_failed` | 1. Updates org status to "past_due" |
| `invoice.paid` | 2. Clears "past_due" status, 3. Sets status to "active" |

### PaymentBlocker.tsx (if exists)

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows blocking modal for past_due orgs, 2. Shows "Update Payment" for admins, 3. Shows "Contact admin" for agents |

---

## Output

- `apps/server/src/features/webhooks/stripe.test.ts` (payment failure tests)
- `apps/dashboard/src/components/PaymentBlocker.test.tsx` (if exists)
- Completion report: `docs/agent-output/test-lock/B6-[TIMESTAMP].md`


