# Dev Agent: TKT-006 - Fix Middleware Redirect for Unauthenticated Users

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-006-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-006: Fix Middleware Redirect for Unauthenticated Users**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-006
**Priority:** Critical
**Difficulty:** Easy
**Branch:** `agent/TKT-006-middleware-redirect`
**Version:** v1

---

## The Problem

Middleware code for protected routes has `if (isProtectedPath && !user) { return }` but no redirect to login page. Unauthenticated users get a blank/error page instead of being redirected to login.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/middleware.ts` | Add redirect to /login for unauthenticated users |

**Files to Read (for context):**
- `apps/dashboard/src/lib/supabase.ts`

**Feature Documentation:**
- `docs/features/auth/login-flow.md`

**Similar Code:**
- See existing path matching logic in `apps/dashboard/middleware.ts` around line 15-30

---

## What to Implement

1. **Change the early return** - Replace `return` with `return NextResponse.redirect(new URL('/login', request.url))`
2. **Preserve original URL** - Add `?next=` parameter so user returns to their intended destination after login

**Example fix:**
```typescript
if (isProtectedPath && !user) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
```

---

## Acceptance Criteria

- [ ] Visiting `/dashboard` while logged out redirects to `/login`
- [ ] Redirect URL includes `?next=/dashboard` parameter
- [ ] Logged-in users can access protected paths normally
- [ ] No redirect loops occur

---

## Out of Scope

- ❌ Do NOT modify auth callback handling
- ❌ Do NOT add new protected paths
- ❌ Do NOT change session/cookie logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Infinite redirect loop | Ensure `/login` is NOT in protected paths list |
| Breaking callback URLs | Don't touch auth callback handling |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

**Manual Test:**
1. Log out of the dashboard
2. Visit `/dashboard` directly
3. Verify redirect to `/login?next=/dashboard`

---

## QA Notes

Test various protected paths. Verify `?next=` parameter works for deep links like `/dashboard/settings`.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-006 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-006.md` then `./scripts/agent-cli.sh update-ticket TKT-006 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

