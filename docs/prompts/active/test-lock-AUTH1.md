# TEST LOCK Agent: AUTH1

> **Feature:** Signup Flow
> **Priority:** Critical
> **Doc:** `docs/features/auth/signup-flow.md`

---

## Your Task

Lock in current behavior for all code in the Signup Flow by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The signup flow enables new users to create an account with email, phone, and password. A database trigger automatically provisions their organization, user record, and inactive agent profile.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(auth)/signup/page.tsx` | `SignupPage` component, form submission handler | High |
| `apps/dashboard/src/lib/auth/actions.ts` | `signUp` server action (if exists) | High |

**Note:** The database trigger `handle_new_user()` is SQL and not unit-testable here. Focus on client-side and server action logic.

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### signup/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Form Validation** | 1. Empty fields show validation errors, 2. Invalid email format rejected, 3. Password too short rejected |
| **Form Submission** | 4. Valid submission calls Supabase signUp, 5. Loading state shown during submission |
| **Success Path** | 6. Successful signup redirects to appropriate page, 7. Funnel tracking event fires on success |
| **Error Handling** | 8. Duplicate email shows error, 9. Supabase error displayed to user, 10. Network error handled |

### auth/actions.ts (if server actions used)

| Function | Behaviors to Test |
|----------|-------------------|
| `signUp` | 1. Calls Supabase with correct params, 2. Returns error on failure, 3. Returns success on completion |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/auth/signup-flow.md`
3. Read each source file listed above
4. Read existing test patterns: `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts`
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/AUTH1-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `@supabase/ssr` or Supabase client
- Mock `next/navigation` for router.push/redirect
- Mock funnel tracking if used
- For React component testing, may need `@testing-library/react`

---

## Output

- `apps/dashboard/src/app/(auth)/signup/page.test.tsx`
- `apps/dashboard/src/lib/auth/actions.test.ts` (if actions exist)
- Completion report: `docs/agent-output/test-lock/AUTH1-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (validation, success, errors)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")
