# Dev Agent: TKT-030 - No Grace Period Implementation

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-030-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-030: No Grace Period Implementation**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-030
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-030-no-grace-period-implementation`
**Version:** v1

---

## The Problem

The UI mentions 'access continues until end of billing period' but there is no implementation: no subscription_ends_at field tracked, no access gating based on billing period end, and immediate downgrade to 'free' plan occurs.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | Implement required changes |
| `apps/server/src/features/webhooks/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/cancel-subscription.md`



**Similar Code:**
- apps/dashboard/src/app/(dashboard)/settings/actions.ts - cancel flow


---

## What to Implement

1. Store subscription_ends_at (current_period_end) from Stripe on cancel
2. Keep plan as 'active' until subscription_ends_at passes
3. Webhook for subscription.deleted triggers actual downgrade to 'free'

---

## Acceptance Criteria

- [ ] subscription_ends_at is stored when user cancels
- [ ] User retains access until subscription_ends_at
- [ ] After period ends, webhook triggers downgrade to free
- [ ] No immediate loss of access on cancel click

---

## Out of Scope

- ❌ Do NOT modify cancel modal UI (TKT-003)
- ❌ Do NOT add pause functionality (TKT-004)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| This overlaps with TKT-002 - may need to combine or sequence | Follow existing patterns |
| Ensure webhook handling is idempotent | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Test with Stripe test mode - verify grace period works

---

## QA Notes

Verify user can access dashboard after canceling until period ends.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-030 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-030.md` then `./scripts/agent-cli.sh update-ticket TKT-030 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

