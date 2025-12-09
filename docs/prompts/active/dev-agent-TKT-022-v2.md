# Dev Agent Continuation: TKT-022-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-022
> **Branch:** `agent/tkt-022-enforce-seat-limit-in-api` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Critical security vulnerabilities and zero test coverage - negative quantities bypass validation, no tests for new 50-seat limit

**Failures Found:**

1. **SECURITY CRITICAL** - Negative quantities bypass validation
   - **Expected:** All attempts to exceed 50 seats should be blocked with validation errors
   - **Actual:** Negative quantities bypass validation entirely - can manipulate seat counts with `{ action: 'add', quantity: -10 }`
   - **Evidence:** Code at route.ts:66-73 - `newUsedSeats = currentUsedSeats + quantity` allows negative values. No validation for `quantity > 0`. Example: 60 seats + (-10) = 50 bypasses all checks.

2. **SECURITY CRITICAL** - Invalid action strings treated as 'remove'
   - **Expected:** Invalid action strings should return 400 error
   - **Actual:** Invalid action strings are treated as 'remove' action instead of being rejected
   - **Evidence:** Code at route.ts:66-68 uses ternary: `action === 'add' ? ... : remove_logic`. No validation that action is 'add' or 'remove'. Example: `{ action: 'hack', quantity: 10 }` is treated as remove.

3. **TEST COVERAGE** - Zero tests for 50-seat limit
   - **Expected:** New 50-seat limit validation should have comprehensive test coverage
   - **Actual:** ZERO tests for the new limit validation - test file exists (route.test.ts) with 35 tests but none cover the 50-seat limit
   - **Evidence:** Searched route.test.ts for '50', 'MAX_SEAT_LIMIT', 'Maximum seat' - no tests found.

4. **VALIDATION** - Accepts decimal and zero quantities
   - **Expected:** Should reject decimal quantities and zero
   - **Actual:** Accepts decimal quantities (e.g., 1.5) and zero quantities
   - **Evidence:** Code at route.ts:38-40 only validates `typeof quantity !== 'number'` but doesn't check `Number.isInteger()` or `quantity > 0`

**What You Must Fix:**

1. Add validation: `quantity` must be positive integer (`quantity > 0 && Number.isInteger(quantity)`)
2. Add validation: `action` must be 'add' or 'remove' (reject invalid actions)
3. Add test cases for:
   - Seats exceeding 50
   - Boundary at 50
   - Grandfathered orgs
   - Negative quantities
   - Decimal quantities
   - Invalid actions
4. Clarify with PM: Should `/api/billing/update-settings` also enforce 50-seat limit (potential bypass)?
5. Run all tests and verify validation blocks exploits

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-022-enforce-seat-limit-in-api`
2. Pull latest: `git pull origin agent/tkt-022-enforce-seat-limit-in-api`
3. Read the QA failure report carefully
4. Fix ALL security issues identified by QA
5. Add comprehensive test coverage
6. Verify with grep/code inspection BEFORE claiming completion
7. Run `pnpm test` to ensure all tests pass
8. Push for re-QA

---

## Original Acceptance Criteria

1. API rejects seat count > 50 with clear error
2. Error response includes message explaining limit
3. Existing orgs over 50 seats continue working

---

## Files in Scope

- `apps/dashboard/src/app/api/billing/seats/route.ts`
- `apps/dashboard/src/app/api/billing/seats/route.test.ts` (add tests)
