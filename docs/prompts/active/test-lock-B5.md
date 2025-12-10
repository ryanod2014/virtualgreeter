# TEST LOCK Agent: B5

> **Feature:** Cancel Subscription
> **Priority:** Critical
> **Doc:** `docs/features/billing/cancel-subscription.md`

---

## Your Task

Lock in current behavior for all code in the Cancel Subscription feature by writing behavior-level tests.

---

## Feature Overview

Cancel Subscription allows admins to cancel their paid subscription. Access should continue until the end of the billing period, then downgrade to free.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | `cancelSubscription` | High |
| `apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx` | Cancellation UI | Medium |
| `apps/server/src/features/webhooks/stripe.ts` | `subscription.deleted` handler | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `cancelSubscription` | 1. Updates org plan (current behavior), 2. Stores subscription_ends_at if implemented |

### CancelModal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows cancellation warning, 2. Shows data retention policy |
| **Actions** | 3. Confirm calls cancelSubscription, 4. Cancel closes modal |

### stripe.ts (webhooks)

| Handler | Behaviors to Test |
|---------|-------------------|
| `subscription.deleted` | 1. Updates org plan to "free", 2. Clears subscription_id |

---

## Output

- `apps/dashboard/src/app/(dashboard)/settings/actions.test.ts` (cancel tests)
- `apps/dashboard/src/app/(dashboard)/settings/CancelModal.test.tsx`
- `apps/server/src/features/webhooks/stripe.test.ts`
- Completion report: `docs/agent-output/test-lock/B5-[TIMESTAMP].md`



