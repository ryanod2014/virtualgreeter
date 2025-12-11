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

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-066-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-066-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-066-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-066-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
