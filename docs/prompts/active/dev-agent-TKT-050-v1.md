# Dev Agent: TKT-050 - Unknown Stripe Status Should Default to Cancelled (Fail-Safe)

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-050-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-050: Unknown Stripe Status Should Default to Cancelled (Fail-Safe)**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-050
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-050-unknown-stripe-status-should-d`
**Version:** v1

---

## The Problem

Unknown Stripe status defaults to 'active' - this grants access when status is uncertain. Should fail-safe to cancelled.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/webhooks/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/api/billing-api.md`



**Similar Code:**
- apps/server/src/features/webhooks/stripe.ts - status mapping


---

## What to Implement

1. Change default case from 'active' to 'cancelled'
2. Log warning when unknown status encountered
3. Alert ops team about unknown status

---

## Acceptance Criteria

- [ ] Unknown Stripe status maps to 'cancelled'
- [ ] Warning logged with full Stripe event for debugging
- [ ] Known statuses work as before

---

## Out of Scope

- ❌ Do NOT modify other webhook handlers
- ❌ Do NOT add new status types

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| New Stripe statuses may incorrectly get cancelled - but that's safer than granting access | Follow existing patterns |
| Monitor logs for unknown statuses and update mapping | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Send webhook with unknown status, verify cancelled result

---

## QA Notes

Test with mock Stripe webhook containing unknown status.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-050 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-050.md` then `./scripts/agent-cli.sh update-ticket TKT-050 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

