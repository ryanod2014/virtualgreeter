# TEST LOCK Agent: AUTH3

> **Feature:** Invite Accept
> **Priority:** High
> **Doc:** `docs/features/auth/invite-accept.md`

---

## Your Task

Lock in current behavior for all code in the Invite Accept feature by writing behavior-level tests.

---

## Feature Overview

Invite Accept handles the flow when an invited user clicks their invite link and completes account setup to join an organization.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(auth)/invite/[token]/page.tsx` | Invite accept page | High |
| `apps/dashboard/src/app/(auth)/invite/actions.ts` | `acceptInvite` | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `acceptInvite` | 1. Validates invite token, 2. Returns error for expired token, 3. Returns error for already-used token, 4. Creates user account, 5. Associates user with organization, 6. Sets user role from invite, 7. Marks invite as used |

### page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows invite details (org name), 2. Shows password creation form |
| **Validation** | 3. Validates password requirements, 4. Confirms password match |
| **Submit** | 5. Calls acceptInvite on submit, 6. Redirects to dashboard on success |

---

## Output

- `apps/dashboard/src/app/(auth)/invite/actions.test.ts`
- `apps/dashboard/src/app/(auth)/invite/[token]/page.test.tsx`
- Completion report: `docs/agent-output/test-lock/AUTH3-[TIMESTAMP].md`
