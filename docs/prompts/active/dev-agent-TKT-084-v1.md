# Dev Agent: TKT-084 - Add Reactivation Flow for Non-Admin Users

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-084-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-084: Add Reactivation Flow for Non-Admin Users**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-084
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-084-add-reactivation-flow-for-non`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Implement required changes |
| `apps/dashboard/src/features/admin/components/ReactivateAgentModal.tsx` | Implement required changes |
| `apps/dashboard/src/app/api/agents/reactivate/route.ts` | Implement required changes |

---

## What to Implement

1. Add "Reactivate" button for inactive agents in agents list
2. Create ReactivateAgentModal component
3. Implement reactivation API endpoint that handles billing seat addition
4. Add audit logging for reactivation events

---

## Acceptance Criteria

- [ ] Admins can reactivate any inactive agent via UI
- [ ] Reactivation flow properly handles billing seats
- [ ] Reactivated agents can immediately log in and work
- [ ] F-016 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-084 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-084.md` then `./scripts/agent-cli.sh update-ticket TKT-084 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

