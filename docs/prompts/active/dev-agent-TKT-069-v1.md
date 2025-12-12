# Dev Agent: TKT-069 - Add Drag-and-Drop Rule Priority Reordering

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-069-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-069: Add Drag-and-Drop Rule Priority Reordering**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-069
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-069-add-drag-and-drop-rule-priorit`
**Version:** v1

---

## The Problem

Admins cannot reorder routing rules through the UI despite priority being critical for rule matching. Documentation states: 'Admin reorders rules | Not supported | ❌ | Priority is set but manual reorder isn't exposed'. Admins must manually edit priority numbers which is error-prone.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/routing/rules-list.tsx` | Implement required changes |
| `apps/dashboard/src/features/routing/update-rule-priority.ts` | Implement required changes |

**Feature Documentation:**
- `docs/features/admin/routing-rules.md`

**Similar Code:**
- Look for drag-and-drop implementations in the codebase (use @dnd-kit or similar)

---

## What to Implement

1. Add drag-and-drop UI for rule list using @dnd-kit or similar library
2. On drop, recalculate all rule priorities to maintain order
3. Add API endpoint to bulk update rule priorities
4. Show visual feedback during drag (highlight drop zones)
5. Maintain current manual priority number editing as fallback

---

## Acceptance Criteria

- [ ] Admin can drag rules to reorder them
- [ ] Priority numbers update automatically after drag-and-drop
- [ ] Rule order persists after page refresh
- [ ] Visual feedback shows where rule will be dropped
- [ ] Manual priority editing still works as before
- [ ] All rules maintain unique priority numbers

---

## Out of Scope

- ❌ Do NOT change rule matching logic
- ❌ Do NOT modify how priority numbers work - just expose reordering

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Concurrent rule edits could cause priority conflicts | Follow existing patterns |
| Ensure drag-and-drop works on mobile/tablet | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Create multiple routing rules. Drag to reorder and verify priorities update correctly. Test on mobile.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-069 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-069.md` then `./scripts/agent-cli.sh update-ticket TKT-069 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

