# Dev Agent: TKT-034 - Call Logs Pagination for Performance

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-034-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-034: Call Logs Pagination for Performance**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-034
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-034-call-logs-pagination-for-perfo`
**Version:** v1

---

## The Problem

All call logs/feedback fetched at once with no pagination. Orgs will have 10,000s of call logs - will cause increasing latency and memory pressure.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/call-logs/CallLogsTable.tsx` | Implement required changes |
| `apps/dashboard/src/app/api/call-logs/route.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/call-logs.md`
- `docs/features/superadmin/feedback-dashboard.md`



**Similar Code:**
- apps/dashboard/src/features/agents/page.tsx - see if any existing pagination patterns


---

## What to Implement

1. Add server-side pagination with limit/offset
2. Default to 50 items per page
3. Add pagination controls to UI
4. Preserve filters across pagination

---

## Acceptance Criteria

- [ ] API accepts page and limit parameters
- [ ] Default page size is 50
- [ ] UI shows pagination controls (prev/next, page numbers)
- [ ] Filters work correctly with pagination

---

## Out of Scope

- ❌ Do NOT add virtualization (separate enhancement)
- ❌ Do NOT modify call log data structure

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Ensure filters are preserved across page changes | Follow existing patterns |
| Consider cursor-based pagination for better performance | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Load call logs, verify pagination works

---

## QA Notes

Test with org that has many call logs. Verify performance improvement.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-034 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-034.md` then `./scripts/agent-cli.sh update-ticket TKT-034 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

