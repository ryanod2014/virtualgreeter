# Dev Agent: TKT-081 - Add Pagination to Agent Stats Call List

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-081-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-081: Add Pagination to Agent Stats Call List**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-081
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-081-add-pagination-to-agent-stats`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/dashboard/stats/page.tsx` | Implement required changes |
| `apps/dashboard/src/lib/stats/agent-stats.ts` | Implement required changes |
| `apps/server/src/app/api/agents/stats/route.ts` | Implement required changes |

---

## What to Implement

1. Implement pagination for call list (50-100 calls per page)
2. Add separate stats-only endpoint that calculates across ALL calls (not limited to 500)
3. Update UI to show accurate stats even when call list is paginated
4. Remove or clarify '(limit reached)' message with pagination

---

## Acceptance Criteria

- [ ] Agents can access all their calls via pagination
- [ ] Statistics are accurate across all calls regardless of pagination
- [ ] UI clearly indicates pagination state
- [ ] F-184 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-081 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-081.md` then `./scripts/agent-cli.sh update-ticket TKT-081 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

