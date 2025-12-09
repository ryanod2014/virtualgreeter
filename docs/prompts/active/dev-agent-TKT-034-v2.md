# Dev Agent Continuation: TKT-034-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-034
> **Branch:** `agent/tkt-034` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Total count query does not apply active filters, causing incorrect pagination display when filters are used

**Failures Found:**

1. **AC4 - Filters work correctly with pagination**
   - **Expected:** Total count should reflect the filtered result set. When filters are active (agent, status, disposition, pool, duration, country), pagination should show the count of filtered results, not all results.
   - **Actual:** Total count query (page.tsx:128-133) only filters by organization_id and created_at. It does NOT apply the agent, status, disposition, pool, minDuration, maxDuration, or country filters that are applied to the main data query (lines 83-120). This causes pagination UI to show incorrect totals like 'Showing 1 to 50 of 500 calls' when only 75 calls match the filters.
   - **Evidence:** Code inspection: Total count query at page.tsx:128-133 missing all filter parameters that main query has at lines 83-120. Filters include: params.agent (line 83), params.status (line 89), params.disposition (line 95), params.pool (line 101), params.minDuration (line 108), params.maxDuration (line 111), params.country (line 114).

2. **Edge case handling - input validation**
   - **Expected:** Page and limit parameters should be validated to ensure page >= 1 and limit > 0. Non-numeric inputs should be handled gracefully.
   - **Actual:** No validation exists. Negative page numbers result in negative offsets (e.g., page=-1 → offset=-100). Zero limit results in invalid range queries (e.g., limit=0 → range(0,-1)). Non-numeric inputs cause NaN propagation (e.g., page=abc → offset=NaN).
   - **Evidence:** Code inspection: page.tsx:123-125 parses params but has no validation checks. parseInt can return NaN, negative values, or zero without any handling.

**What You Must Fix:**

1. Apply all filters (agent, status, disposition, pool, duration, country) to the total count query at page.tsx:128-133
2. Add input validation:
   - `if (isNaN(page) || page < 1) page = 1;`
   - `if (isNaN(limit) || limit <= 0) limit = 50;`

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-034`
2. Pull latest: `git pull origin agent/tkt-034`
3. Read the QA failure report carefully
4. Apply ALL active filters to the total count query
5. Add input validation for page and limit parameters
6. Verify with grep/code inspection BEFORE claiming completion
7. Test manually with filters active
8. Push for re-QA

---

## Original Acceptance Criteria

1. API accepts page and limit parameters
2. Default page size is 50
3. UI shows pagination controls (prev/next, page numbers)
4. Filters work correctly with pagination

---

## Files in Scope

- `apps/dashboard/src/features/call-logs/CallLogsTable.tsx`
- `apps/dashboard/src/app/api/call-logs/route.ts`
