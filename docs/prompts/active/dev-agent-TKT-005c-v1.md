# Dev Agent: TKT-005c - Handle Payment Failed Webhook

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-005c-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-005c: Handle Payment Failed Webhook**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-005c
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/tkt-005c-handle-payment-failed-webhook`
**Version:** v1

---

## The Problem

No webhook handler for invoice.payment_failed - system doesn't know when payments fail.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/webhooks/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/payment-failure.md`
- `docs/features/api/billing-api.md`



**Similar Code:**
- apps/server/src/features/webhooks/stripe.ts - existing webhook handlers


---

## What to Implement

1. Add handler for invoice.payment_failed webhook
2. Update org status to 'past_due' in database
3. Add handler for invoice.paid to clear past_due status

---

## Acceptance Criteria

- [ ] invoice.payment_failed sets org to 'past_due'
- [ ] invoice.paid clears 'past_due' and sets to 'active'
- [ ] Webhook signature verification works
- [ ] Idempotent handling of duplicate webhooks

---

## Out of Scope

- ❌ Do NOT modify payment blocker UI (TKT-005b)
- ❌ Do NOT send email notifications (TKT-005d)
- ❌ Do NOT modify agent status (TKT-005e)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Webhook signature must be verified | Follow existing patterns |
| Handle multiple failure events gracefully | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Test with Stripe CLI: stripe trigger invoice.payment_failed

---

## QA Notes

Use Stripe CLI to forward webhooks. Verify DB state changes correctly.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-005c --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-005c.md` then `./scripts/agent-cli.sh update-ticket TKT-005c --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

