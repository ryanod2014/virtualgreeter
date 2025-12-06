# TEST LOCK Agent: STATS3

> **Feature:** Call Analytics
> **Priority:** Medium
> **Doc:** `docs/features/stats/call-analytics.md`

---

## Your Task

Lock in current behavior for all code in the Call Analytics feature by writing behavior-level tests.

---

## Feature Overview

Call Analytics provides organization-wide call metrics including total calls, conversion rates, average duration, and trends over time.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/stats/page.tsx` | Analytics dashboard | High |
| `apps/dashboard/src/app/api/stats/route.ts` | Stats API endpoint | High |

---

## Behaviors to Capture

### API route.ts

| Method | Behaviors to Test |
|--------|-------------------|
| GET | 1. Returns total calls count, 2. Returns completed/missed breakdown, 3. Returns average duration, 4. Filters by date range |

### page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows key metrics cards, 2. Shows trend chart |
| **Filters** | 3. Date range filter updates data |

---

## Output

- `apps/dashboard/src/app/api/stats/route.test.ts`
- `apps/dashboard/src/app/(dashboard)/stats/page.test.tsx`
- Completion report: `docs/agent-output/test-lock/STATS3-[TIMESTAMP].md`

