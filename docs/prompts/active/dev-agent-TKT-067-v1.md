# Dev Agent: TKT-067 - Add Exponential Backoff to Widget Verification Polling

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-067-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-067: Add Exponential Backoff to Widget Verification Polling**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-067
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-067-add-exponential-backoff-to-wid`
**Version:** v1

---

## The Problem

Dashboard polls every 5 seconds indefinitely until widget is verified, causing unnecessary load. Quote: 'Polls forever until verified' with ⚠️ flag. This wastes server resources and creates unnecessary database queries for installations that take hours or days to complete.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/sites/[siteId]/verification-status.tsx` | Implement required changes |

**Feature Documentation:**
- `docs/features/admin/sites-setup.md`

---

## What to Implement

1. Implement exponential backoff: Start at 5s, then 10s, 30s, 60s
2. After 5 minutes of polling, stop automatic polling
3. Show 'Click to check again' button after polling stops
4. Preserve current behavior for first 5 minutes (fast feedback)

---

## Acceptance Criteria

- [ ] Polling starts at 5 second intervals
- [ ] After 1 minute, increases to 10s intervals
- [ ] After 3 minutes, increases to 30s intervals
- [ ] After 5 minutes, increases to 60s intervals
- [ ] After 10 minutes, polling stops and shows manual check button
- [ ] Button click triggers immediate check and resumes polling

---

## Out of Scope

- ❌ Do NOT change the verification endpoint logic
- ❌ Do NOT modify how widget installation works

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't break fast verification UX for quick installations | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Leave widget unverified and monitor polling intervals. Verify button appears and works after timeout.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-067 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-067.md` then `./scripts/agent-cli.sh update-ticket TKT-067 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

