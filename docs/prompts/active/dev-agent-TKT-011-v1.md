# Dev Agent: TKT-011 - Email Invite Retry Mechanism

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-011-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-011: Email Invite Retry Mechanism**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-011
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-011-email-invite-retry-mechanism`
**Version:** v1

---

## The Problem

If Resend API fails to send invite email, invite is still created in DB. Admin has no visibility. Invitee waits for email that never arrives.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/agents/actions.ts` | Implement required changes |
| `apps/dashboard/src/lib/email.ts` | Implement required changes |
| `apps/dashboard/src/app/(dashboard)/agents/page.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/agent-management.md`
- `docs/features/api/invites-api.md`



**Similar Code:**
- apps/dashboard/src/lib/email.ts - existing email functions


---

## What to Implement

1. Wrap email send in retry logic (up to 3 attempts)
2. Track email status on invite record (sent/pending/failed)
3. Add 'Resend Invite' button for failed invites
4. Show toast notification on failure

---

## Acceptance Criteria

- [ ] Failed email triggers automatic retry (up to 3 attempts)
- [ ] Admin sees status of invite (sent/pending/failed) in UI
- [ ] After all retries fail, admin gets clear notification
- [ ] 'Resend Invite' button available for failed invites

---

## Out of Scope

- ❌ Do NOT modify invite creation logic beyond retry
- ❌ Do NOT change invite acceptance flow
- ❌ Do NOT modify seat billing logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't retry infinitely - cap at 3 attempts | Follow existing patterns |
| Clear error messaging so admin knows what to do | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Simulate email failure, verify retry and UI feedback

---

## QA Notes

Test by temporarily breaking email config. Verify retry behavior and admin notifications.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-011-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-011-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-011-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-011-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
