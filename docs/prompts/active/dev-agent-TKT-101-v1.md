# Dev Agent: TKT-101 - Empty Pool Falls Back to Any Agent - May Violate Pool Intent

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-101-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-101: Empty Pool Falls Back to Any Agent - May Violate Pool Intent**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-101
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-101-empty-pool-falls-back-to-any-a`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/routing/poolAssignment.ts` | Implement required changes |
| `apps/server/src/features/agents/agentStatus.ts` | Implement required changes |

---

## What to Implement

1. Either (a) show "no agents available" for strict routing, or (b) add admin toggle for "strict pool routing" vs "fallback allowed", or (c) at minimum log when cross-pool fallback occurs for audit purposes

---

## Acceptance Criteria

- [ ] Pool routing behavior is configurable or clearly logged
- [ ] Cross-pool fallback is tracked for audit purposes
- [ ] F-089 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-101 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-101.md` then `./scripts/agent-cli.sh update-ticket TKT-101 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

