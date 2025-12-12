# Dev Agent: TKT-005a - Add past_due Status to TypeScript Types

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-005a-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-005a: Add past_due Status to TypeScript Types**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-005a
**Priority:** Critical
**Difficulty:** Easy
**Branch:** `agent/tkt-005a-add-past_due-status-to-typescr`
**Version:** v1

---

## The Problem

TypeScript type SubscriptionStatus missing 'past_due' - needed for payment failure handling.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `packages/domain/src/database.types.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/payment-failure.md`



**Similar Code:**
- packages/domain/src/database.types.ts - see existing SubscriptionStatus type


---

## What to Implement

1. Add 'past_due' to SubscriptionStatus type union

---

## Acceptance Criteria

- [ ] SubscriptionStatus includes 'past_due'
- [ ] Type is: 'active' | 'paused' | 'cancelled' | 'trialing' | 'past_due'
- [ ] pnpm typecheck passes across all packages

---

## Out of Scope

- ❌ Do NOT modify other types in this file
- ❌ Do NOT implement payment failure UI (TKT-005b)
- ❌ Do NOT add webhook handlers (TKT-005c)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Simple type addition - low risk | Follow existing patterns |
| Verify no existing code breaks with new type | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


---

## QA Notes

N/A - type-only change, no runtime behavior.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-005a --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-005a.md` then `./scripts/agent-cli.sh update-ticket TKT-005a --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

