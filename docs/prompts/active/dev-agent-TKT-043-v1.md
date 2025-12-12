# Dev Agent: TKT-043 - Add Save/Error Notifications for Pool Management

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-043-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-043: Add Save/Error Notifications for Pool Management**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-043
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-043-add-save/error-notifications-f`
**Version:** v1

---

## The Problem

Database save failures, server sync failures, and RLS permission denied all fail silently. Admins have no feedback when operations fail.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/pools/PoolCard.tsx` | Implement required changes |
| `apps/dashboard/src/features/pools/actions.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/pool-management.md`



**Similar Code:**
- apps/dashboard/src/components/ui/toast.tsx - if exists


---

## What to Implement

1. Add toast notifications for save success
2. Add error toast for save failures with clear message
3. Ensure UI reverts to previous state on error

---

## Acceptance Criteria

- [ ] Successful save shows success toast
- [ ] Failed save shows error toast with message
- [ ] UI reverts to previous state on failure
- [ ] Network errors show 'Connection error' message

---

## Out of Scope

- ❌ Do NOT add retry logic
- ❌ Do NOT modify pool data structure

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't spam toasts - debounce if needed | Follow existing patterns |
| Ensure error messages are user-friendly | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Save pool, verify success toast. Disconnect network, save, verify error toast.

---

## QA Notes

Test with network disconnection. Verify error handling.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-043 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-043.md` then `./scripts/agent-cli.sh update-ticket TKT-043 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

