# Dev Agent: TKT-NaN - Algorithm May Select Busy Agent Over Idle Agent

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-NaN-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-NaN: Algorithm May Select Busy Agent Over Idle Agent**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-NaN
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-nan-algorithm-may-select-busy-agen`
**Version:** v1

---

## The Problem

The pseudocode shows two selection strategies: round-robin for idle agents (via `oldestOrder`) and least-connections for busy agents (via `lowestLoad`). However, both paths update the same `bestAgent` variable. If an idle agent is processed first (updating `bestAgent`), then a busy agent with `load=1` is processed later, the condition `load < lowestLoad` (1 < Infinity) is true and overwrites `bestAgent` with the busy agent. This means an idle agent could lose to a busy agent despite being preferable.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| (see ticket for files) | |

---

## What to Implement

1. Prefer idle agents by only entering the least-connections path if no idle agents were found: `if (!bestAgent && load < lowestLoad)` or track `hasIdleCandidate` flag.

---

## Acceptance Criteria

- [ ] Issue described in F-088 is resolved
- [ ] Change is tested and verified

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-NaN --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-NaN.md` then `./scripts/agent-cli.sh update-ticket TKT-NaN --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

