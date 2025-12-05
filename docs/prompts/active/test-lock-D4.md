# TEST LOCK Agent: D4

> **Feature:** Agent Management
> **Priority:** High
> **Doc:** `docs/features/admin/agent-management.md`

---

## Your Task

Lock in current behavior for all code in the Agent Management feature by writing behavior-level tests.

---

## Feature Overview

Agent Management allows admins to invite, edit, and remove agents from their organization. Includes role assignment and pool membership management.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/agents/page.tsx` | Agents list page | High |
| `apps/dashboard/src/app/(dashboard)/agents/actions.ts` | `inviteAgent`, `removeAgent`, `updateAgentRole` | High |
| `apps/dashboard/src/features/agents/InviteModal.tsx` | Invite form UI | Medium |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `inviteAgent` | 1. Creates invite record, 2. Sends invite email, 3. Returns error if email exists |
| `removeAgent` | 4. Removes user from organization, 5. Clears pool memberships, 6. Handles active call gracefully |
| `updateAgentRole` | 7. Changes role (admin/agent) |
| `resendInvite` | 8. Resends invite email |

### InviteModal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Form** | 1. Validates email format, 2. Validates role selection |
| **Submit** | 3. Calls inviteAgent on submit, 4. Shows success/error feedback |

---

## Output

- `apps/dashboard/src/app/(dashboard)/agents/actions.test.ts`
- `apps/dashboard/src/features/agents/InviteModal.test.tsx`
- Completion report: `docs/agent-output/test-lock/D4-[TIMESTAMP].md`
