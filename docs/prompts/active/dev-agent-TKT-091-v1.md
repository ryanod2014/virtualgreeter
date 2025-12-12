# Dev Agent: TKT-091 - Implement Cursor-Based Pagination for Agent Stats Call History

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-091-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-091: Implement Cursor-Based Pagination for Agent Stats Call History**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-091
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-091-implement-cursor-based-paginat`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Implement required changes |
| `apps/server/src/app/api/agents/[agentId]/calls/route.ts` | Implement required changes |
| `apps/dashboard/src/lib/hooks/useAgentCalls.ts` | Implement required changes |

---

## What to Implement

1. Implement cursor-based pagination on agent calls API endpoint
2. Update client to handle paginated call data
3. Add "Load More" button or infinite scroll
4. Remove arbitrary 500 call limit
5. Add loading states and pagination status indicators

---

## Acceptance Criteria

- [ ] Agents can access all historical calls via pagination
- [ ] No arbitrary limit prevents data access
- [ ] Pagination performs well with thousands of calls
- [ ] UI clearly indicates when more data is available
- [ ] F-051 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-091 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-091.md` then `./scripts/agent-cli.sh update-ticket TKT-091 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

