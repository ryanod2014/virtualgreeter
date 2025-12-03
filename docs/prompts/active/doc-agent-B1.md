# Doc Agent: B1 - Subscription Creation

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B1.md`

---

You are a Documentation Agent. Your job is to document **B1: Subscription Creation** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** B1
**Feature Name:** Subscription Creation
**Category:** billing
**Output File:** `docs/features/billing/subscription-creation.md`

---

## Feature Description

The flow from new signup through paywall, payment entry, trial start, and subscription activation. Includes Stripe integration for payment processing.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/paywall/page.tsx` | Main paywall UI |
| `apps/dashboard/src/app/paywall/billing/page.tsx` | Payment entry step |
| `apps/dashboard/src/app/paywall/seats/page.tsx` | Seat selection step |
| `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | Subscription creation API |
| `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | Payment method setup |
| `apps/dashboard/src/lib/stripe.ts` | Stripe configuration and helpers |
| `apps/server/src/features/billing/stripe-webhook-handler.ts` | Webhook handling |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What is the paywall flow sequence? (seats → billing → dashboard)
2. How is the 7-day trial configured?
3. What happens when user enters payment info?
4. When is the Stripe subscription actually created?
5. What data is stored in the organizations table?
6. How are the three billing frequencies handled (monthly/annual/6-month)?
7. What happens if Stripe API call fails?
8. What happens if user abandons paywall mid-flow?
9. How does re-subscription work for cancelled users?
10. What webhooks are involved in subscription creation?

---

## Specific Edge Cases to Document

- User tries to create subscription with existing active subscription
- User with cancelled subscription wants to re-subscribe
- Card declined during subscription creation
- User selects 6-month plan (special offer handling)
- User changes seat count on paywall before submitting
- Browser closes during payment processing
- Stripe webhook arrives before API response
- User navigates away from paywall and returns

---

## Output Requirements

1. Create: `docs/features/billing/subscription-creation.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

