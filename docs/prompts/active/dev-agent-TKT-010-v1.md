# Dev Agent: TKT-010 - Graceful Call End on Agent Removal

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-010-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-010: Graceful Call End on Agent Removal**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-010
**Priority:** Low
**Difficulty:** Medium
**Branch:** `agent/tkt-010-graceful-call-end-on-agent-rem`
**Version:** v1

---

## The Problem

When admin removes an agent who's in an active call, the call continues. Creates confusing state - agent marked as 'removed' but still serving visitor.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/agents/actions.ts` | Implement required changes |
| `apps/server/src/features/agents/removeAgent.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/agent-management.md`
- `docs/features/agent/agent-active-call.md`



**Similar Code:**
- apps/server/src/features/agents/removeAgent.ts - current removal logic


---

## What to Implement

1. Check if agent is in_call before removal
2. If in_call, emit call:end event before removing
3. Visitor sees graceful 'Agent has ended the call' message

---

## Acceptance Criteria

- [ ] Removing in-call agent triggers graceful call end
- [ ] Visitor sees 'Agent has ended the call' message
- [ ] Call is properly logged/ended in database
- [ ] If agent not in call, removal proceeds normally

---

## Out of Scope

- ❌ Do NOT add warning dialog (just handle gracefully)
- ❌ Do NOT modify other agent actions

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Visitor should see friendly message, not abrupt disconnect | Follow existing patterns |
| Log the forced call end for audit | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Start call, remove agent via admin, verify graceful end

---

## QA Notes

Test removal during active call. Verify visitor experience is smooth.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-010-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-010-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-010-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-010-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
