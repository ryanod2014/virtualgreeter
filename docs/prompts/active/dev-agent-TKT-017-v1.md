# Dev Agent: TKT-017 - Enforce Pool Routing on Visitor Reassignment

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-017-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-017: Enforce Pool Routing on Visitor Reassignment**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-017
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/tkt-017-enforce-pool-routing-on-visito`
**Version:** v1

---

## The Problem

When a visitor is reassigned, findBestAgent() is called WITHOUT the pool ID. A visitor from 'Sales Pool' could be reassigned to 'Support Pool' agent. This defeats pool-based routing.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/reassignment/reassignVisitors.ts` | Implement required changes |
| `apps/server/src/lib/agentSelection.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/platform/visitor-reassignment.md`
- `docs/features/admin/pool-management.md`



**Similar Code:**
- apps/server/src/lib/agentSelection.ts - see findBestAgent function signature


---

## What to Implement

1. Pass pool_id to findBestAgent() during reassignment
2. Modify findBestAgent to accept optional pool_id parameter
3. Filter agents by pool when pool_id is provided

---

## Acceptance Criteria

- [ ] Reassigned visitor stays in original pool
- [ ] findBestAgent accepts pool_id parameter
- [ ] If no agents in pool, logs warning and returns null (no cross-pool assignment)
- [ ] Unit tests cover pool-aware reassignment

---

## Out of Scope

- ❌ Do NOT modify initial call routing logic
- ❌ Do NOT change pool management UI
- ❌ Do NOT add new pool features

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| If pool has no available agents, need clear fallback behavior | Follow existing patterns |
| Race condition possible if agent goes unavailable mid-reassignment | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Unit tests pass for agentSelection.ts

---

## QA Notes

Test with multi-pool organization. Create Sales and Support pools, verify reassignment respects pools.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-017 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-017.md` then `./scripts/agent-cli.sh update-ticket TKT-017 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

