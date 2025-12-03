# Doc Agent: B2 - Seat Management

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B2.md`

---

You are a Documentation Agent. Your job is to document **B2: Seat Management** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** B2
**Feature Name:** Seat Management
**Category:** billing
**Output File:** `docs/features/billing/seat-management.md`

---

## Feature Description

Adding and removing agent seats with automatic proration. Handles Stripe subscription item updates, billing adjustments, and seat limit enforcement.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/billing/seats/route.ts` | Seat update API |
| `apps/server/src/features/billing/seat-management.ts` | Seat logic |
| `apps/dashboard/src/app/admin/billing/seats-section.tsx` | Seat management UI |
| `apps/server/src/features/billing/proration.ts` | Proration calculations |
| `apps/server/src/features/billing/stripe-webhook-handler.ts` | Webhook handling |
| `apps/server/src/db/schema/organizations.ts` | Org schema with seat fields |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How does an admin add seats?
2. How does an admin remove seats?
3. How is proration calculated?
4. When is the Stripe subscription updated?
5. What happens if seat reduction is below current usage?
6. How are seat limits enforced?
7. What's the minimum/maximum seat count?
8. How do seat changes appear on invoice?
9. Is there immediate vs next-cycle billing?
10. How are seat changes during trial handled?

---

## Specific Edge Cases to Document

- Reducing seats below current agent count
- Adding seats during past-due status
- Seat change at end of billing cycle
- Multiple rapid seat changes
- Seat change during subscription pause
- Proration calculation across timezone boundaries
- Refund handling for seat reduction
- Free seats or promotional seats

---

## Output Requirements

1. Create: `docs/features/billing/seat-management.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

