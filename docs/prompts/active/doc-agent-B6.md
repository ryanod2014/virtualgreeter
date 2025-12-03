# Doc Agent: B6 - Payment Failure

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B6.md`

---

You are a Documentation Agent. Your job is to document **B6: Payment Failure** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** B6
**Feature Name:** Payment Failure
**Category:** billing
**Output File:** `docs/features/billing/payment-failure.md`

---

## Feature Description

Handling failed payments including past-due status, retry logic, dunning emails, service restrictions, and payment method update flows.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/server/src/features/billing/stripe-webhook-handler.ts` | Payment failure webhooks |
| `apps/dashboard/src/app/admin/billing/past-due-banner.tsx` | Past due UI warning |
| `apps/dashboard/src/app/api/billing/update-payment/route.ts` | Update payment method |
| `apps/server/src/features/billing/dunning.ts` | Dunning email logic |
| `apps/server/src/features/billing/service-restrictions.ts` | Access restrictions |
| `apps/server/src/db/schema/organizations.ts` | Billing status fields |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What happens when a payment fails?
2. How many retry attempts does Stripe make?
3. What is the past-due grace period?
4. What service restrictions apply during past-due?
5. How does the user update their payment method?
6. What dunning emails are sent?
7. When is the subscription cancelled for non-payment?
8. What UI indicators show past-due status?
9. How is the user notified of payment failure?
10. Can they continue service during past-due?

---

## Specific Edge Cases to Document

- Payment fails during trial-to-paid transition
- Card expires between billing cycles
- Insufficient funds vs card declined
- Payment method update while retry pending
- Multiple failed payments in sequence
- Subscription cancelled then payment succeeds
- Past-due status cleared by manual payment
- Payment failure during seat addition

---

## Output Requirements

1. Create: `docs/features/billing/payment-failure.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

