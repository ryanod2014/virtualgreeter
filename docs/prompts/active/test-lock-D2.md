# TEST LOCK Agent: D2

> **Feature:** Routing Rules
> **Priority:** High
> **Doc:** `docs/features/admin/routing-rules.md`

---

## Your Task

Lock in current behavior for all code in the Routing Rules feature by writing behavior-level tests.

---

## Feature Overview

Routing Rules allow admins to configure URL-based routing to direct visitors to specific pools. Rules have conditions (path matches, query params) and priorities.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/routing/page.tsx` | Routing rules page | High |
| `apps/dashboard/src/app/(dashboard)/routing/actions.ts` | CRUD for routing rules | High |
| `apps/server/src/features/routing/pool-manager.ts` | `matchPathToPool`, `matchConditions` | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `createRule` | 1. Creates rule with conditions, 2. Sets priority |
| `updateRule` | 3. Updates conditions, 4. Updates pool assignment |
| `deleteRule` | 5. Removes rule |
| `reorderRules` | 6. Updates priority order |

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `matchPathToPool` | 1. Matches path pattern, 2. Returns highest priority match, 3. Falls back to default pool |
| `matchConditions` | 4. AND logic for multiple conditions, 5. Path matching, 6. Query param matching |

---

## Output

- `apps/dashboard/src/app/(dashboard)/routing/actions.test.ts`
- `apps/server/src/features/routing/pool-manager.test.ts` (routing tests)
- Completion report: `docs/agent-output/test-lock/D2-[TIMESTAMP].md`




