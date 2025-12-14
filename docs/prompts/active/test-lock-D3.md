# TEST LOCK Agent: D3

> **Feature:** Tiered Routing
> **Priority:** High
> **Doc:** `docs/features/admin/tiered-routing.md`

---

## Your Task

Lock in current behavior for all code in the Tiered Routing feature by writing behavior-level tests.

---

## Feature Overview

Tiered Routing allows admins to set priority levels for agents within pools. Higher priority agents get calls first; lower priority agents serve as overflow.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/features/pools/AgentTierEditor.tsx` | Tier assignment UI | High |
| `apps/dashboard/src/app/(dashboard)/pools/actions.ts` | `updateAgentPriority` | High |
| `apps/server/src/features/routing/pool-manager.ts` | `getAgentPriorityInPool`, `findBestAgent` | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `updateAgentPriority` | 1. Sets priority_rank in agent_pool_members, 2. Validates rank is positive number |

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `getAgentPriorityInPool` | 1. Returns agent's priority rank for pool, 2. Returns undefined if not in pool |
| `findBestAgent` | 3. Groups agents by priority, 4. Tries lower rank (higher priority) first, 5. Falls through to next tier when at capacity |

---

## Output

- `apps/dashboard/src/features/pools/AgentTierEditor.test.tsx`
- `apps/dashboard/src/app/(dashboard)/pools/actions.test.ts`
- Completion report: `docs/agent-output/test-lock/D3-[TIMESTAMP].md`





