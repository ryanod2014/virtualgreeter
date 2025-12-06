# TEST LOCK Agent: D1

> **Feature:** Pool Management
> **Priority:** High
> **Doc:** `docs/features/admin/pool-management.md`

---

## Your Task

Lock in current behavior for all code in the Pool Management feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Pool Management allows admins to create, edit, and delete agent pools. Pools are used to organize agents by skill/team and route visitors to appropriate agents based on URL matching rules.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/pools/page.tsx` | Pool list page | High |
| `apps/dashboard/src/app/(dashboard)/pools/actions.ts` | `createPool`, `updatePool`, `deletePool` | High |
| `apps/dashboard/src/features/pools/PoolCard.tsx` | Pool editing UI | Medium |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `createPool` | 1. Creates pool in database, 2. Validates pool name required, 3. Returns created pool |
| `updatePool` | 4. Updates pool name, 5. Updates pool settings |
| `deletePool` | 6. Deletes pool from database, 7. Handles cascade (agents, routing rules) |

### PoolCard.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows pool name, 2. Shows agent count |
| **Edit** | 3. Edit mode shows input, 4. Save updates pool |
| **Delete** | 5. Delete button triggers confirmation |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/admin/pool-management.md`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/D1-[TIMESTAMP].md`

---

## Output

- `apps/dashboard/src/app/(dashboard)/pools/actions.test.ts`
- `apps/dashboard/src/features/pools/PoolCard.test.tsx`
- Completion report: `docs/agent-output/test-lock/D1-[TIMESTAMP].md`

