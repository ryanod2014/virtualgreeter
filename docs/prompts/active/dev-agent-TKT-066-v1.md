# Dev Agent: TKT-066 - Facebook Events Silent Failure on Invalid Credentials

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-066-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-066: Facebook Events Silent Failure on Invalid Credentials**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-066
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-066-facebook-events-silent-failure`
**Version:** v1

---

## The Problem

There is no error handling or admin notification when Facebook access tokens expire or are revoked. Admins may think their conversion tracking is working when events are silently failing, leading to incorrect analytics and wasted ad spend.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/organization/page.tsx` | Implement required changes |
| `apps/server/src/features/facebook-events/send.ts` | Implement required changes |

**Feature Documentation:**
- `docs/features/admin/organization-settings.md`

---

## What to Implement

1. Add credential validation when admin saves FB settings
2. Track FB API call failures in database (add failed_at timestamp)
3. Display warning in organization settings UI when credentials are invalid
4. Add email notification when FB events start failing (after 3 consecutive failures)

---

## Acceptance Criteria

- [ ] When admin saves invalid FB credentials, show immediate error
- [ ] When FB API calls fail, track failures in database
- [ ] Organization settings page shows warning banner if FB credentials are failing
- [ ] Admin receives email notification after 3 consecutive FB event failures
- [ ] Test with expired/invalid token to verify all alerts work

---

## Out of Scope

- ❌ Do NOT change Facebook API integration logic
- ❌ Do NOT add retry mechanisms - focus on notification only

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't over-notify - only alert after multiple failures to avoid false alarms | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Test with expired FB token. Verify validation on save and email notification after failures.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-066 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-066.md` then `./scripts/agent-cli.sh update-ticket TKT-066 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

