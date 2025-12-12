# Dev Agent: TKT-077 - Improve Error Message for Catch-All Pool Routing Rules

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-077-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-077: Improve Error Message for Catch-All Pool Routing Rules**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-077
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-077-improve-error-message-for-catc`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/pools/routing-rules-client.tsx` | Implement required changes |

---

## What to Implement

1. Catch database trigger error when adding rule to catch-all pool
2. Display user-friendly message: 'Routing rules cannot be added to the catch-all pool. This pool automatically receives all visitors not matched by other rules.'
3. Consider disabling 'Add Rule' button for catch-all pools

---

## Acceptance Criteria

- [ ] Error message is clear and actionable
- [ ] User understands why operation failed
- [ ] F-108 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-077 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-077.md` then `./scripts/agent-cli.sh update-ticket TKT-077 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

