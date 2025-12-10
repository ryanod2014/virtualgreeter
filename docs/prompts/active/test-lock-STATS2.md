# TEST LOCK Agent: STATS2

> **Feature:** Coverage Stats
> **Priority:** Medium
> **Doc:** `docs/features/stats/coverage-stats.md`

---

## Your Task

Lock in current behavior for all code in the Coverage Stats feature by writing behavior-level tests.

---

## Feature Overview

Coverage Stats shows when agents are available throughout the day/week, helping admins optimize scheduling.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/lib/stats/coverage-stats.ts` | Coverage calculation | High |
| `apps/dashboard/src/app/(dashboard)/stats/coverage/page.tsx` | Coverage page | Medium |

---

## Behaviors to Capture

### coverage-stats.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `getCoverageStats` | 1. Calculates coverage by hour, 2. Calculates coverage by day of week, 3. Identifies coverage gaps |

---

## Output

- `apps/dashboard/src/lib/stats/coverage-stats.test.ts`
- Completion report: `docs/agent-output/test-lock/STATS2-[TIMESTAMP].md`



