# Dev Agent: TKT-002 - Complete Stripe Subscription Cancellation

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-002-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-002: Complete Stripe Subscription Cancellation**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-002
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/tkt-002-complete-stripe-subscription-c`
**Version:** v1

---

## The Problem

When users cancel their subscription: 1) Code only sets plan='free' in Supabase, 2) Does NOT call Stripe API to cancel, 3) UI says 'access until end of billing period' but access is removed immediately. Customers may continue being charged by Stripe.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | Implement required changes |
| `apps/dashboard/src/lib/stripe.ts` | Implement required changes |
| `apps/server/src/features/webhooks/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/cancel-subscription.md`
- `docs/features/admin/organization-settings.md`



**Similar Code:**
- apps/dashboard/src/lib/stripe.ts - existing Stripe helper functions
- apps/server/src/features/webhooks/stripe.ts - existing webhook handlers


---

## What to Implement

1. Call stripe.subscriptions.update({ cancel_at_period_end: true }) when user cancels
2. Store current_period_end from Stripe response in database
3. Add webhook handler for customer.subscription.deleted to finalize downgrade

---

## Acceptance Criteria

- [ ] Clicking 'Cancel' calls Stripe API with cancel_at_period_end: true
- [ ] User retains access until their paid period ends (stored in DB)
- [ ] After period ends, plan automatically becomes 'free' via webhook
- [ ] Stripe dashboard shows subscription as 'canceling'
- [ ] Webhook properly handles the final cancellation event

---

## Out of Scope

- ❌ Do NOT modify the cancel modal UI (TKT-003 handles copy)
- ❌ Do NOT add pause functionality (separate ticket TKT-004)
- ❌ Do NOT change database schema

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| If Stripe call fails but DB updates → subscription cancelled locally but still billed | Follow existing patterns |
| Need idempotency → user might click cancel multiple times | Follow existing patterns |
| Webhook must be verified to prevent spoofing | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Test with Stripe test mode: cancel subscription, verify Stripe dashboard shows 'canceling'

---

## QA Notes

Use Stripe test mode. Verify webhook fires correctly using Stripe CLI: stripe listen --forward-to localhost:3001/webhooks/stripe

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-002-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-002-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-002-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-002-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
