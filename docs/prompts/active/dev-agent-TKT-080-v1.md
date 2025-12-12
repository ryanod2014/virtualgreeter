# Dev Agent: TKT-080 - Unify Pool Routing Logic Across All Reassignment Triggers

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-080-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-080: Unify Pool Routing Logic Across All Reassignment Triggers**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-080
**Priority:** Medium
**Difficulty:** Hard
**Branch:** `agent/tkt-080-unify-pool-routing-logic-acros`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/reassignment/reassignmentManager.ts` | Implement required changes |
| `apps/server/src/features/pools/poolMatcher.ts` | Implement required changes |

---

## What to Implement

1. Audit all reassignment trigger paths
2. Ensure all triggers consistently respect pool routing rules
3. Add integration tests for each trigger type with pool routing
4. Document unified routing behavior

---

## Acceptance Criteria

- [ ] All reassignment triggers respect pool routing consistently
- [ ] Integration tests verify behavior for all trigger types
- [ ] Documentation updated with unified behavior
- [ ] F-173 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-080 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-080.md` then `./scripts/agent-cli.sh update-ticket TKT-080 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

