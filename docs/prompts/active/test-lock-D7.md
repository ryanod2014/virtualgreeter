# TEST LOCK Agent: D7

> **Feature:** Call Logs
> **Priority:** High
> **Doc:** `docs/features/admin/call-logs.md`

---

## Your Task

Lock in current behavior for all code in the Call Logs feature by writing behavior-level tests.

---

## Feature Overview

Call Logs displays a filterable, paginated list of all calls for the organization. Includes filters by date, agent, status, and URL. Supports CSV export.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/call-logs/page.tsx` | Call logs page | High |
| `apps/dashboard/src/features/call-logs/CallLogsTable.tsx` | Table with filters | High |
| `apps/dashboard/src/features/call-logs/exportCSV.ts` | CSV export function | Medium |
| `apps/dashboard/src/app/api/call-logs/route.ts` | API route for call logs | High |

---

## Behaviors to Capture

### API route.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Query** | 1. Filters by date range, 2. Filters by agent, 3. Filters by status, 4. Paginates results |

### CallLogsTable.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows call date/time, 2. Shows agent name, 3. Shows duration, 4. Shows status |
| **Filters** | 5. Date picker filters, 6. Agent dropdown filters, 7. Status dropdown filters |

### exportCSV.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `exportCSV` | 1. Generates valid CSV, 2. Includes all columns, 3. Handles special characters |

---

## Output

- `apps/dashboard/src/app/api/call-logs/route.test.ts`
- `apps/dashboard/src/features/call-logs/CallLogsTable.test.tsx`
- `apps/dashboard/src/features/call-logs/exportCSV.test.ts`
- Completion report: `docs/agent-output/test-lock/D7-[TIMESTAMP].md`




