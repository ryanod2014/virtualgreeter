# Dev Agent: TKT-052 - Add Loading State for Co-Browse Viewer

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-052-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-052: Add Loading State for Co-Browse Viewer**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-052
**Priority:** Low
**Difficulty:** Easy
**Branch:** `agent/tkt-052-add-loading-state-for-co-brows`
**Version:** v1

---

## The Problem

Agent sees blank or stale view with no indication that co-browse is initializing. Creates confusion about whether feature is working.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/cobrowse-viewer.md`



**Similar Code:**
- apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx - existing viewer component


---

## What to Implement

1. Add 'Loading visitor's screen...' placeholder with spinner while waiting for first snapshot
2. Show 'Updating...' indicator during subsequent refreshes

---

## Acceptance Criteria

- [ ] Loading spinner shows while waiting for first snapshot
- [ ] Spinner includes 'Loading visitor's screen...' text
- [ ] After first snapshot, subtle 'Updating...' indicator on refreshes
- [ ] No flicker or blank states

---

## Out of Scope

- ❌ Do NOT modify snapshot transmission
- ❌ Do NOT add reconnection logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Simple UI change - low risk | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Start co-browse, verify loading state displays

---

## QA Notes

Test on slow connections to verify loading state is visible.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-052 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-052.md` then `./scripts/agent-cli.sh update-ticket TKT-052 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

