# Dev Agent: TKT-004c - Handle Stripe Pause/Resume Webhooks

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-004c-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-004c: Handle Stripe Pause/Resume Webhooks**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-004c
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/tkt-004c-handle-stripe-pause/resume-web`
**Version:** v1

---

## The Problem

No webhook handlers for Stripe pause/resume events - DB may get out of sync.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/webhooks/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/api/billing-api.md`



**Similar Code:**
- apps/server/src/features/webhooks/stripe.ts - existing webhook handlers


---

## What to Implement

1. Add handler for customer.subscription.paused webhook
2. Add handler for customer.subscription.resumed webhook
3. Update org status in DB based on webhook events

---

## Acceptance Criteria

- [ ] customer.subscription.paused webhook updates org to 'paused'
- [ ] customer.subscription.resumed webhook updates org to 'active'
- [ ] Webhook signature verification works correctly
- [ ] Idempotent - duplicate webhooks don't cause issues

---

## Out of Scope

- ❌ Do NOT modify Stripe API calls (TKT-004a)
- ❌ Do NOT modify scheduler (TKT-004b)
- ❌ Do NOT modify widget/agent status (TKT-004d)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Webhook signature must be verified to prevent spoofing | Follow existing patterns |
| Handle out-of-order webhooks gracefully | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Test with Stripe CLI: stripe trigger customer.subscription.paused

---

## QA Notes

Use Stripe CLI to forward webhooks: stripe listen --forward-to localhost:3001/webhooks/stripe

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-004c --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-004c.md` then `./scripts/agent-cli.sh update-ticket TKT-004c --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

