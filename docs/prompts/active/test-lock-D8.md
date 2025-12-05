# TEST LOCK Agent: D8

> **Feature:** Organization Settings
> **Priority:** High
> **Doc:** `docs/features/admin/organization-settings.md`

---

## Your Task

Lock in current behavior for all code in the Organization Settings feature by writing behavior-level tests.

---

## Feature Overview

Organization Settings allows admins to configure org-wide settings including name, billing, recording retention, and subscription management.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/settings/page.tsx` | Settings page | High |
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | Settings update actions | High |
| `apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx` | Cancel subscription modal | Medium |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `updateOrganization` | 1. Updates org name, 2. Updates timezone |
| `updateRecordingSettings` | 3. Updates retention period, 4. Updates max call duration |
| `cancelSubscription` | 5. Initiates cancellation flow |

### CancelModal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows cancellation message, 2. Shows confirmation button |
| **Actions** | 3. Confirm triggers cancelSubscription, 4. Cancel closes modal |

---

## Output

- `apps/dashboard/src/app/(dashboard)/settings/actions.test.ts`
- `apps/dashboard/src/app/(dashboard)/settings/CancelModal.test.tsx`
- Completion report: `docs/agent-output/test-lock/D8-[TIMESTAMP].md`
