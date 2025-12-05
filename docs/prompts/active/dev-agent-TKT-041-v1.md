# Dev Agent: TKT-041 - Verify Session Invalidation on Password Reset

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-041-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-041: Verify Session Invalidation on Password Reset**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-041
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-041-verify-session-invalidation-on`
**Version:** v1

---

## The Problem

If user resets password due to account compromise, existing attacker sessions may remain valid. Supabase behavior not verified.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/auth/password-reset.md`



**Similar Code:**
- apps/dashboard/src/app/(auth)/reset-password/page.tsx - reset flow


---

## What to Implement

1. Test Supabase session behavior on password change
2. If sessions persist, call supabase.auth.signOut({ scope: 'global' }) after password update
3. Document the behavior

---

## Acceptance Criteria

- [ ] Password reset invalidates all other sessions
- [ ] User is logged out of all devices after reset
- [ ] Current session (doing the reset) remains valid
- [ ] Behavior is documented

---

## Out of Scope

- ❌ Do NOT modify password requirements
- ❌ Do NOT add 2FA

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| May need to use Supabase admin API for global signout | Follow existing patterns |
| Test thoroughly - security critical | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Log in on two devices, reset password on one, verify other is logged out

---

## QA Notes

Test with multiple browser sessions. Verify all sessions except current are invalidated.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-041-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-041-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-041-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-041-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
