# Dev Agent: TKT-013 - Retention Policy Retroactive Deletion Warning

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-013-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-013: Retention Policy Retroactive Deletion Warning**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-013
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-013-retention-policy-retroactive-d`
**Version:** v1

---

## The Problem

When admin reduces retention from 90→30 days, behavior is unclear. Should be retroactive (delete old recordings) with clear warning.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | Implement required changes |
| `apps/dashboard/src/app/(dashboard)/settings/RetentionWarningModal.tsx` | Implement required changes |
| `apps/dashboard/src/app/(dashboard)/settings/page.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/organization-settings.md`
- `docs/features/admin/recording-settings.md`



**Similar Code:**
- apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx - confirmation modal pattern


---

## What to Implement

1. Count recordings that would be deleted when retention reduced
2. Show confirmation modal with exact count
3. Require user to type 'DELETE' to confirm
4. Trigger deletion job on confirmation

---

## Acceptance Criteria

- [ ] Reducing retention triggers confirmation modal
- [ ] Modal shows exact count of recordings to be deleted
- [ ] User must type 'DELETE' to confirm
- [ ] Deletion is logged for audit
- [ ] Recordings older than new retention are deleted

---

## Out of Scope

- ❌ Do NOT implement the actual deletion job (that runs server-side)
- ❌ Do NOT modify other org settings
- ❌ Do NOT change recording upload logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Deletion is IRREVERSIBLE - confirmation must be very clear | Follow existing patterns |
| Count affected recordings accurately before showing warning | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Reduce retention, verify modal shows correct count

---

## QA Notes

Test with org that has recordings. Verify count is accurate. Verify deletion happens after confirmation.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-013 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-013.md` then `./scripts/agent-cli.sh update-ticket TKT-013 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

