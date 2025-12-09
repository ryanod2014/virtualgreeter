# TEST LOCK Agent: B4

> **Feature:** Pause Subscription
> **Priority:** High
> **Doc:** `docs/features/billing/pause-subscription.md`

---

## Your Task

Lock in current behavior for all code in the Pause Subscription feature by writing behavior-level tests.

---

## Feature Overview

Pause Subscription allows admins to temporarily pause their subscription, which should pause Stripe billing and disable the widget/agents until resumed.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | `pauseAccount`, `resumeAccount` | High |
| `apps/dashboard/src/lib/stripe.ts` | Stripe pause/resume functions | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `pauseAccount` | 1. Updates org status to "paused", 2. Sets pause_ends_at if duration specified |
| `resumeAccount` | 3. Updates org status to "active", 4. Clears pause_ends_at |

### stripe.ts (if implemented)

| Function | Behaviors to Test |
|----------|-------------------|
| `pauseSubscription` | 1. Calls Stripe with pause_collection |
| `resumeSubscription` | 2. Resumes Stripe billing |

---

## Output

- `apps/dashboard/src/app/(dashboard)/settings/actions.test.ts` (pause tests)
- `apps/dashboard/src/lib/stripe.test.ts` (pause tests)
- Completion report: `docs/agent-output/test-lock/B4-[TIMESTAMP].md`


