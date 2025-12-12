# Dev Agent: TKT-019 - Sync Incoming Call Countdown with RNA Timeout

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-019-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-019: Sync Incoming Call Countdown with RNA Timeout**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-019
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-019-sync-incoming-call-countdown-w`
**Version:** v1

---

## The Problem

Incoming call modal shows hardcoded 30-second countdown, but RNA timeout fires at 15 seconds (org-configured). Agents think they have more time and get unexpectedly marked away.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/incoming-call/incoming-call-modal.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/incoming-call.md`
- `docs/features/agent/rna-timeout.md`



**Similar Code:**
- apps/dashboard/src/features/incoming-call/incoming-call-modal.tsx - current modal


---

## What to Implement

1. Fetch org's RNA timeout value when call comes in
2. Use org timeout value for countdown display instead of hardcoded 30s

---

## Acceptance Criteria

- [ ] Countdown matches org's RNA timeout setting
- [ ] Countdown and RNA timeout fire at the same moment
- [ ] Works correctly for different org configurations (15s, 25s, 30s)

---

## Out of Scope

- ❌ Do NOT modify RNA timeout logic on server
- ❌ Do NOT change org settings for timeout
- ❌ Do NOT add countdown customization UI

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Simple fix - just syncing UI with existing server value | Follow existing patterns |
| Ensure countdown starts at correct value | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Set org timeout to 15s, verify countdown shows 15s

---

## QA Notes

Test with various org timeout settings (15s, 20s, 30s). Verify countdown accuracy.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-019 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-019.md` then `./scripts/agent-cli.sh update-ticket TKT-019 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

