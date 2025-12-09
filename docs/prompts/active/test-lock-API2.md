# TEST LOCK Agent: API2

> **Feature:** Billing API
> **Priority:** High
> **Doc:** `docs/features/api/billing-api.md`

---

## Your Task

Lock in current behavior for all code in the Billing API feature by writing behavior-level tests.

---

## Feature Overview

Billing API provides endpoints for subscription management, seat updates, and Stripe webhook handling.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | Create subscription | High |
| `apps/dashboard/src/app/api/billing/seats/route.ts` | Update seat count | High |
| `apps/server/src/features/webhooks/stripe.ts` | Stripe webhook handlers | High |

---

## Behaviors to Capture

### create-subscription/route.ts

| Method | Behaviors to Test |
|--------|-------------------|
| POST | 1. Creates Stripe subscription, 2. Updates org with subscription ID, 3. Returns client secret for payment |

### seats/route.ts

| Method | Behaviors to Test |
|--------|-------------------|
| PATCH | 1. Updates seat quantity in Stripe, 2. Updates org seat count, 3. Validates max seat limit |

### stripe.ts (webhooks)

| Handler | Behaviors to Test |
|---------|-------------------|
| Event verification | 1. Verifies webhook signature |
| Status mapping | 2. Maps Stripe status to org status, 3. Unknown status defaults correctly |

---

## Output

- `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts`
- `apps/dashboard/src/app/api/billing/seats/route.test.ts`
- `apps/server/src/features/webhooks/stripe.test.ts`
- Completion report: `docs/agent-output/test-lock/API2-[TIMESTAMP].md`


