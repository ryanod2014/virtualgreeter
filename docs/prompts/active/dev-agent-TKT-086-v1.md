# Dev Agent: TKT-086 - Implement Server-Side Pagination for Call Logs

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-086-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-086: Implement Server-Side Pagination for Call Logs**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-086
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-086-implement-server-side-paginati`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Implement required changes |
| `apps/server/src/app/api/calls/route.ts` | Implement required changes |
| `apps/dashboard/src/lib/hooks/useCalls.ts` | Implement required changes |

---

## What to Implement

1. Implement cursor-based pagination on server API endpoint
2. Update client to handle paginated call data
3. Add "Load More" or infinite scroll UI
4. Remove arbitrary 500 record limit
5. Add pagination controls and status indicators

---

## Acceptance Criteria

- [ ] Users can access all historical calls via pagination
- [ ] No arbitrary record limit prevents data access
- [ ] Pagination is performant with large datasets
- [ ] F-021 is resolved

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| (Low risk) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-086 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-086.md` then `./scripts/agent-cli.sh update-ticket TKT-086 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

