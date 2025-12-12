# Dev Agent: TKT-076 - Handle No Catch-All Pool Gracefully

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-076-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-076: Handle No Catch-All Pool Gracefully**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-076
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-076-handle-no-catch-all-pool-grace`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/pools/poolMatcher.ts` | Implement required changes |

---

## What to Implement

1. Return meaningful error or default pool when no match found
2. Log warning when no catch-all pool exists
3. Add validation in pool configuration UI

---

## Acceptance Criteria

- [ ] No crashes when catch-all pool missing
- [ ] Clear error message for admins
- [ ] F-110 is resolved

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| (Low risk) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-076 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-076.md` then `./scripts/agent-cli.sh update-ticket TKT-076 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

