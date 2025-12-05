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

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-043-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-043-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-043-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-043-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
