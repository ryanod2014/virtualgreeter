# Dev Agent: TKT-097 - Define and Implement Data Retention Policy

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-097-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-097: Define and Implement Data Retention Policy**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-097
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-097-define-and-implement-data-rete`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/lib/data-retention.ts` | Implement required changes |
| `apps/dashboard/src/app/api/calls/route.ts` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/settings/data-retention/page.tsx` | Implement required changes |

---

## What to Implement

1. Define data retention policy with configurable periods
2. Implement automatic archival/deletion of old call logs
3. Add admin UI for retention period configuration
4. Add database migrations for retention metadata
5. Document retention policy in admin settings

---

## Acceptance Criteria

- [ ] Admin can configure call log retention period
- [ ] Old calls are automatically archived/deleted per policy
- [ ] Retention policy is documented and accessible
- [ ] Retention complies with GDPR requirements
- [ ] F-072 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-097 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-097.md` then `./scripts/agent-cli.sh update-ticket TKT-097 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

