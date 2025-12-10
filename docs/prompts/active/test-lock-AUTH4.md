# TEST LOCK Agent: AUTH4

> **Feature:** Password Reset
> **Priority:** High
> **Doc:** `docs/features/auth/password-reset.md`

---

## Your Task

Lock in current behavior for all code in the Password Reset feature by writing behavior-level tests.

---

## Feature Overview

Password Reset allows users to reset their password via email. Includes request flow (enter email) and reset flow (set new password via link).

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(auth)/forgot-password/page.tsx` | Request reset page | High |
| `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | Set new password page | High |
| `apps/dashboard/src/lib/auth/actions.ts` | `requestPasswordReset`, `resetPassword` | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `requestPasswordReset` | 1. Sends reset email via Supabase, 2. Returns success even for non-existent email (security) |
| `resetPassword` | 3. Updates password via Supabase, 4. Returns error for invalid/expired token |

### forgot-password/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Form** | 1. Email input validation |
| **Submit** | 2. Calls requestPasswordReset, 3. Shows success message |

### reset-password/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Form** | 1. Password input, 2. Confirm password match |
| **Submit** | 3. Calls resetPassword, 4. Redirects on success |

---

## Output

- `apps/dashboard/src/lib/auth/actions.test.ts`
- `apps/dashboard/src/app/(auth)/forgot-password/page.test.tsx`
- `apps/dashboard/src/app/(auth)/reset-password/page.test.tsx`
- Completion report: `docs/agent-output/test-lock/AUTH4-[TIMESTAMP].md`



