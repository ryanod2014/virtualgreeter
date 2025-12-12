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

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-041 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-041.md` then `./scripts/agent-cli.sh update-ticket TKT-041 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

