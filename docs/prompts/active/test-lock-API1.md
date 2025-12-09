# TEST LOCK Agent: API1

> **Feature:** Agent API
> **Priority:** Medium
> **Doc:** `docs/features/api/agent-api.md`

---

## Your Task

Lock in current behavior for all code in the Agent API feature by writing behavior-level tests.

---

## Feature Overview

Agent API provides endpoints for agent-related operations like updating profiles, managing availability, and fetching agent data.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/api/agents/route.ts` | GET agents list | High |
| `apps/dashboard/src/app/api/agents/[id]/route.ts` | GET/PATCH/DELETE agent | High |
| `apps/server/src/features/agents/agentStatus.ts` | Agent status management | Medium |

---

## Behaviors to Capture

### route.ts (list)

| Method | Behaviors to Test |
|--------|-------------------|
| GET | 1. Returns agents for org, 2. Filters by pool if specified, 3. Requires authentication |

### [id]/route.ts

| Method | Behaviors to Test |
|--------|-------------------|
| GET | 1. Returns single agent, 2. 404 for non-existent |
| PATCH | 3. Updates agent profile, 4. Updates pool memberships |
| DELETE | 5. Removes agent from org |

---

## Output

- `apps/dashboard/src/app/api/agents/route.test.ts`
- `apps/dashboard/src/app/api/agents/[id]/route.test.ts`
- Completion report: `docs/agent-output/test-lock/API1-[TIMESTAMP].md`


