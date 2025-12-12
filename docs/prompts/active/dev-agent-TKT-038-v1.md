# Dev Agent: TKT-038 - Add Delete Confirmation for Pools

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-038-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-038: Add Delete Confirmation for Pools**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-038
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-038-add-delete-confirmation-for-po`
**Version:** v1

---

## The Problem

Pools are deleted immediately without confirmation. Creates risk of accidental data loss - deletion cascades to all pool members and routing rules.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/pools/PoolCard.tsx` | Implement required changes |
| `apps/dashboard/src/features/pools/DeletePoolModal.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/pool-management.md`



**Similar Code:**
- apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx - confirmation pattern


---

## What to Implement

1. Add confirmation modal before pool deletion
2. Modal shows pool name and count of affected items
3. Require typing pool name to confirm

---

## Acceptance Criteria

- [ ] Delete button opens confirmation modal
- [ ] Modal shows: pool name, X agents will be unassigned, Y routing rules will be deleted
- [ ] User must type pool name to confirm
- [ ] Cancel closes modal without deleting

---

## Out of Scope

- ❌ Do NOT add soft delete
- ❌ Do NOT modify pool creation

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Ensure cascade counts are accurate | Follow existing patterns |
| Don't allow bypassing confirmation | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Try to delete pool, verify confirmation required

---

## QA Notes

Test with pool that has agents and routing rules. Verify counts are accurate.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-038 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-038.md` then `./scripts/agent-cli.sh update-ticket TKT-038 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

