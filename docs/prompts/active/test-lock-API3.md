# TEST LOCK Agent: API3

> **Feature:** Invites API
> **Priority:** Medium
> **Doc:** `docs/features/api/invites-api.md`

---

## Your Task

Lock in current behavior for all code in the Invites API feature by writing behavior-level tests.

---

## Feature Overview

Invites API provides endpoints for creating, listing, and managing agent invites.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/api/invites/route.ts` | GET/POST invites | High |
| `apps/dashboard/src/app/api/invites/[id]/route.ts` | DELETE invite | Medium |
| `apps/dashboard/src/app/api/invites/[id]/resend/route.ts` | Resend invite | Medium |

---

## Behaviors to Capture

### route.ts (list/create)

| Method | Behaviors to Test |
|--------|-------------------|
| GET | 1. Returns pending invites for org |
| POST | 2. Creates invite record, 3. Sends invite email, 4. Returns error for duplicate email |

### [id]/route.ts

| Method | Behaviors to Test |
|--------|-------------------|
| DELETE | 1. Deletes pending invite, 2. 404 for non-existent |

### resend/route.ts

| Method | Behaviors to Test |
|--------|-------------------|
| POST | 1. Resends invite email, 2. 404 for non-existent invite |

---

## Output

- `apps/dashboard/src/app/api/invites/route.test.ts`
- `apps/dashboard/src/app/api/invites/[id]/route.test.ts`
- `apps/dashboard/src/app/api/invites/[id]/resend/route.test.ts`
- Completion report: `docs/agent-output/test-lock/API3-[TIMESTAMP].md`
