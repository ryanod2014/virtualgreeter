# Dev Agent Continuation: TKT-006-v2

> **Type:** Continuation (CI failed)
> **Original Ticket:** TKT-006
> **Branch:** `agent/TKT-006-middleware-redirect` (ALREADY EXISTS - do NOT create new branch)

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-006-v2.md`

---

## 🔧 CI Fix Required

**What happened:**
CI tests failed after implementing the middleware redirect fix. 7 tests failed out of 176 total.

**Test Results:**
- ✅ Passed: 169
- ❌ Failed: 7
- Total: 176

**Your task:**
1. Checkout existing branch: `git checkout agent/TKT-006-middleware-redirect`
2. Pull latest: `git pull origin agent/TKT-006-middleware-redirect`
3. Run tests locally: `pnpm test`
4. Fix the failing tests
5. Do NOT break your original feature (middleware redirect must still work)
6. Push and CI will re-run automatically

---

## Original Ticket Context

**Ticket:** TKT-006 - Fix Middleware Redirect for Unauthenticated Users  
**Priority:** Critical  
**Difficulty:** Easy  
**Feature:** Login Flow / Authentication

**Problem:** Middleware code for protected routes had `if (isProtectedPath && !user) { return }` but no redirect to login page. Unauthenticated users got blank/error page.

**Fix Implemented:** Added redirect to `/login` with `?next=` parameter for unauthenticated users on protected paths.

---

## Files in Scope

| File | Status |
|------|--------|
| `apps/dashboard/middleware.ts` | Already modified |
| `apps/dashboard/src/lib/supabase/middleware.ts` | Already modified - contains redirect logic |
| `apps/dashboard/middleware.test.ts` | May need updates if testing redirect behavior |
| Any other test files that broke | Investigate and fix |

---

## Debugging Steps

1. **Run tests locally** to see which 7 tests are failing:
   ```bash
   cd apps/dashboard
   pnpm test
   ```

2. **Check test output** for failure messages

3. **Common causes:**
   - Tests may not be mocking the auth correctly
   - Tests may expect different behavior from protected routes
   - Tests may need to handle the redirect response

4. **Fix strategy:**
   - If tests are wrong: Update tests to match new correct behavior
   - If code regression: Fix the code while keeping redirect functionality

---

## Acceptance Criteria (Original + New)

**Original (must still pass):**
- [ ] Visiting `/dashboard` while logged out redirects to `/login`
- [ ] Redirect URL includes `?next=/dashboard` parameter
- [ ] Logged-in users can access protected paths normally
- [ ] No redirect loops occur

**New for v2:**
- [ ] All 7 previously failing tests now pass
- [ ] No new test failures introduced
- [ ] `pnpm test` passes with 0 failures
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes

---

## Out of Scope

- ❌ Do NOT modify auth callback handling
- ❌ Do NOT add new protected paths  
- ❌ Do NOT change session/cookie logic
- ❌ Do NOT create a new branch - use existing `agent/TKT-006-middleware-redirect`

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
pnpm test       # Must pass with 0 failures
```

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-006 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-006.md` then `./scripts/agent-cli.sh update-ticket TKT-006 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

