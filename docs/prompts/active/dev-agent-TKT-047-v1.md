# Dev Agent: TKT-047 - Handle Missing User Profile Row

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-047-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-047: Handle Missing User Profile Row**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-047
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-047-handle-missing-user-profile-ro`
**Version:** v1

---

## The Problem

When user has auth.users record but no corresponding users table row, role query returns null and redirect logic fails. Users get stranded.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/middleware.ts` | Implement required changes |
| `apps/dashboard/src/lib/auth.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/auth/login-flow.md`



**Similar Code:**
- apps/dashboard/middleware.ts - role check logic


---

## What to Implement

1. Add defensive check after role query
2. If no profile row, redirect to error page with 'Contact support' message
3. Log the orphaned auth user for debugging

---

## Acceptance Criteria

- [ ] User with no profile row sees clear error message
- [ ] Error suggests contacting support
- [ ] Orphaned user is logged for admin investigation
- [ ] Normal users unaffected

---

## Out of Scope

- ❌ Do NOT add user profile creation (that's signup flow)
- ❌ Do NOT modify signup flow

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| This shouldn't happen normally - indicates data issue | Follow existing patterns |
| Consider adding Supabase trigger to ensure profile creation | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Delete user profile row, try to log in, verify error handling

---

## QA Notes

Test with intentionally orphaned user. Verify error experience is clear.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-047 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-047.md` then `./scripts/agent-cli.sh update-ticket TKT-047 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

