# TEST LOCK Agent: STATS1

> **Feature:** Agent Stats
> **Priority:** Medium
> **Doc:** `docs/features/stats/agent-stats.md`

---

## Your Task

Lock in current behavior for all code in the Agent Stats feature by writing behavior-level tests.

---

## Feature Overview

Agent Stats displays individual agent performance metrics including calls handled, average duration, availability time, and response rates.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/lib/stats/agent-stats.ts` | Stats calculation functions | High |
| `apps/dashboard/src/app/(dashboard)/stats/agents/page.tsx` | Agent stats page | Medium |

---

## Behaviors to Capture

### agent-stats.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `getAgentStats` | 1. Calculates total calls, 2. Calculates average duration, 3. Calculates availability percentage, 4. Filters by date range |
| `getAgentCallMetrics` | 5. Returns calls per day/week/month |

---

## Output

- `apps/dashboard/src/lib/stats/agent-stats.test.ts`
- Completion report: `docs/agent-output/test-lock/STATS1-[TIMESTAMP].md`
