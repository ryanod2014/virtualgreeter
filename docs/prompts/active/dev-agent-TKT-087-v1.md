# Dev Agent: TKT-087 - Define and Implement Data Retention Policy for Call Logs

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-087-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-087: Define and Implement Data Retention Policy for Call Logs**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-087
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-087-define-and-implement-data-rete`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/app/api/calls/route.ts` | Implement required changes |
| `packages/database/src/schema.ts` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/settings/data-retention/page.tsx` | Implement required changes |

---

## What to Implement

1. Define default data retention policy (e.g., 90 days, 1 year)
2. Add retention_days configuration to organization settings
3. Implement scheduled job to delete calls older than retention period
4. Add admin UI to configure retention period per organization
5. Add warnings before deleting old data

---

## Acceptance Criteria

- [ ] Organizations can configure call log retention period
- [ ] Old call logs are automatically cleaned up based on policy
- [ ] Admins receive notifications before bulk deletions
- [ ] F-023 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-087 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-087.md` then `./scripts/agent-cli.sh update-ticket TKT-087 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

