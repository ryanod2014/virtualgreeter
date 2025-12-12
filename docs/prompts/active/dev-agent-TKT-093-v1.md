# Dev Agent: TKT-093 - Fix Timezone Display for Pause End Date

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-093-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-093: Fix Timezone Display for Pause End Date**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-093
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-093-fix-timezone-display-for-pause`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.tsx` | Implement required changes |
| `apps/server/src/app/api/billing/update-settings/route.ts` | Implement required changes |

---

## What to Implement

1. Display dates with explicit timezone in UI (e.g., "Dec 15, 2025 at 12:00 AM UTC")
2. OR convert and display dates in user's local timezone with clear indication
3. Ensure date picker behavior matches displayed timezone
4. Add tooltip or help text explaining timezone handling

---

## Acceptance Criteria

- [ ] Users can clearly see what timezone the pause end date uses
- [ ] No confusion about when account will actually resume
- [ ] Date display is consistent across all billing UI
- [ ] F-064 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-093 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-093.md` then `./scripts/agent-cli.sh update-ticket TKT-093 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

