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

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-010 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-010.md` then `./scripts/agent-cli.sh update-ticket TKT-010 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

