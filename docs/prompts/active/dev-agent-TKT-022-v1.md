# Dev Agent: TKT-022 - Enforce Seat Limit in API

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-022-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-022: Enforce Seat Limit in API**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-022
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-022-enforce-seat-limit-in-api`
**Version:** v1

---

## The Problem

UI caps seats at 50, but API has no validation. Direct API calls could set arbitrarily high seat counts, causing billing issues or system strain.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/api/billing/seats/route.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/seat-management.md`



**Similar Code:**
- apps/dashboard/src/app/api/billing/seats/route.ts - existing API route


---

## What to Implement

1. Add validation: if seats > 50, return 400 error
2. Clear error message: 'Maximum seat limit is 50'
3. Ensure existing orgs over limit aren't broken (grandfathered)

---

## Acceptance Criteria

- [ ] API rejects seat count > 50 with clear error
- [ ] Error response includes message explaining limit
- [ ] Existing orgs over 50 seats continue working

---

## Out of Scope

- ❌ Do NOT modify UI seat selection
- ❌ Do NOT add plan-specific limits (future feature)
- ❌ Do NOT change Stripe integration

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't break existing orgs with more seats | Follow existing patterns |
| Consider future enterprise plans with higher limits | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Call API with seats=100, verify 400 error

---

## QA Notes

Test API directly with curl. Verify error message is clear.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-022 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-022.md` then `./scripts/agent-cli.sh update-ticket TKT-022 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

