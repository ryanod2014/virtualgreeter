# Doc Agent: API2 - Billing API

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-API2.md`

---

You are a Documentation Agent. Your job is to document **API2: Billing API** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** API2
**Feature Name:** Billing API
**Category:** api
**Output File:** `docs/features/api/billing-api.md`

---

## Feature Description

REST API endpoints for all billing operations including subscription management, seat changes, payment methods, and billing status queries.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/billing/` | All billing API routes |
| `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | Create subscription |
| `apps/dashboard/src/app/api/billing/seats/route.ts` | Seat management |
| `apps/dashboard/src/app/api/billing/update-payment/route.ts` | Payment method update |
| `apps/dashboard/src/app/api/billing/status/route.ts` | Billing status |
| `apps/server/src/features/billing/billing-service.ts` | Billing business logic |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What billing endpoints exist?
2. What is the request/response format for each?
3. How are Stripe errors handled?
4. What permissions control billing access?
5. How is idempotency handled?
6. What webhook endpoints exist?
7. How are billing actions logged?
8. What rate limiting exists?
9. How is sensitive data (card numbers) handled?
10. What billing states block certain operations?

---

## Specific Edge Cases to Document

- API call during Stripe outage
- Concurrent billing modification requests
- Invalid Stripe customer ID
- Expired payment method in request
- Subscription state mismatch with Stripe
- Webhook replay/duplicate handling
- Billing API during subscription pause
- Cross-organization billing attempt

---

## Output Requirements

1. Create: `docs/features/api/billing-api.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

