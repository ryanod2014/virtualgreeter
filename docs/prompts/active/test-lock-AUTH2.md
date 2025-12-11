# TEST LOCK Agent: AUTH2

> **Feature:** Login Flow
> **Priority:** Critical
> **Doc:** `docs/features/auth/login-flow.md`

---

## Your Task

Lock in current behavior for all code in the Login Flow by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Email/password login using Supabase authentication, including form validation, session creation via cookies, role-based redirect handling (admin vs agent), and failed login attempt handling.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(auth)/login/page.tsx` | `LoginPage` component, `handleSubmit` | High |
| `apps/dashboard/src/lib/auth/actions.ts` | `signIn` server action | High |
| `apps/dashboard/src/lib/supabase/middleware.ts` | `updateSession` | Medium |
| `apps/dashboard/middleware.ts` | Root middleware | Medium |

---

## Behaviors to Capture

### login/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Form Validation** | 1. Empty email rejected, 2. Empty password rejected, 3. Invalid email format rejected |
| **Form Submission** | 4. Valid credentials call Supabase signInWithPassword, 5. Loading state during submission |
| **Role-Based Redirect** | 6. Admin role → redirects to /admin, 7. Agent role → redirects to /dashboard |
| **Already Authenticated** | 8. User with existing session → auto-redirect |
| **Error Handling** | 9. Invalid credentials show error, 10. Network error handled gracefully |

### auth/actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `signIn` | 1. Calls Supabase with email/password, 2. Returns user on success, 3. Returns error on invalid credentials |

### middleware.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `middleware` | 1. Protected routes redirect to /login when no session, 2. Public routes accessible without session, 3. Session refresh on valid session |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/auth/login-flow.md`
3. Read each source file listed above
4. Read existing test patterns: `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts`
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/AUTH2-[TIMESTAMP].md`

---

## Mocking Notes

- Mock Supabase client (`createClient`, `createServerClient`)
- Mock `next/navigation` for redirect/router
- Mock `cookies()` from next/headers for middleware tests
- For middleware testing, may need NextRequest/NextResponse mocks

---

## Output

- `apps/dashboard/src/app/(auth)/login/page.test.tsx`
- `apps/dashboard/src/lib/auth/actions.test.ts`
- `apps/dashboard/middleware.test.ts`
- Completion report: `docs/agent-output/test-lock/AUTH2-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (roles, errors, redirects)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")




