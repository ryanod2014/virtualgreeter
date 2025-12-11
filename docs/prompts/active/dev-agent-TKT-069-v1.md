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

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-069-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-069-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-069-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-069-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
