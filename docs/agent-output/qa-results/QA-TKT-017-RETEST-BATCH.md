# QA Report: TKT-017 - FAILED ❌

**Ticket:** TKT-017 - Enforce Pool Routing on Visitor Reassignment
**Branch:** agent/tkt-017-pool-routing-reassignment
**Tested At:** 2025-12-07T01:35:00Z
**QA Agent:** qa-review-TKT-017

---

## Summary

**BLOCKED** - Critical test coverage lost during merge. Implementation is correct but unit tests that validate pool-aware reassignment were discarded in merge commit 759c23d.

---

## Critical Issues Found

### 1. Test Suite Lost in Merge (BLOCKER)

**Severity:** CRITICAL

The original TKT-017 implementation (commit 8fb6842) included a comprehensive test suite "Pool-Aware Reassignment (TKT-017)" with 5 tests covering:
- ✅ Visitor reassignment within same pool
- ✅ Prevention of cross-pool reassignment
- ✅ Warning when no agents available in pool
- ✅ Excluding visitors from reassignment
- ✅ Multiple visitors reassignment

**However**, merge commit 759c23d explicitly states "merge: take main's pool-manager.test.ts" which **DISCARDED ALL TKT-017 TESTS**.

**Evidence:**
```bash
# Original TKT-017 commit HAD the tests:
$ git show 8fb6842:apps/server/src/features/routing/pool-manager.test.ts | grep "Pool-Aware"
describe("Pool-Aware Reassignment (TKT-017)", () => {

# Current HEAD (after merge) LOST the tests:
$ grep "Pool-Aware" apps/server/src/features/routing/pool-manager.test.ts
(no output - tests are gone)
```

**Impact:** Acceptance Criterion #4 "Unit tests cover pool-aware reassignment" is NOT MET.

---

### 2. Pre-existing Test Now Fails (REGRESSION)

**Test:** "Visitor Reassignment > should reassign some visitors when agent goes away (round-robin behavior)"

**Status:** FAILING

**Root Cause:** This test was added in commit 0c32fb2 (from main branch) and documents BUGGY behavior. The test comment explicitly states:
> "second visitor becomes unassigned (algorithm picks agentA which is rejected)"

TKT-017 **FIXED THIS BUG** by passing `fromAgentId` as `excludeAgentId` to prevent the reassigning agent from being selected. Now both visitors are correctly reassigned (expected behavior), but the old test expects the buggy behavior.

**Test Output:**
```
FAIL  src/features/routing/pool-manager.test.ts > PoolManager > Visitor Reassignment > should reassign some visitors when agent goes away (round-robin behavior)
AssertionError: expected 2 to be 1 // Object.is equality

Expected: 1 visitor reassigned, 1 unassigned (buggy behavior)
Actual: 2 visitors reassigned, 0 unassigned (correct behavior after fix)
```

**Resolution Needed:** Test expectations need to be updated to reflect the fixed behavior.

---

### 3. Minor TypeScript Warning (Non-blocking)

**Issue:** Unused import `afterEach` in pool-manager.test.ts line 1

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
//                                                ^^^^^^^^^ unused
```

**Severity:** MINOR - This is a linting warning, not a blocker. However, it was introduced by the merge commit 759c23d.

---

### 4. Scope Violation (Documentation vs Implementation)

**Issue:** Files modified don't match ticket specification

**Ticket specified:**
- `apps/server/src/features/reassignment/reassignVisitors.ts`
- `apps/server/src/lib/agentSelection.ts`

**Actually modified:**
- `apps/server/src/features/routing/pool-manager.ts`
- `apps/server/src/features/routing/pool-manager.test.ts`
- `docs/data/decisions.json`

**Analysis:** The ticket specification was WRONG. The files `reassignVisitors.ts` and `agentSelection.ts` don't exist in the codebase. The actual implementation correctly modified `pool-manager.ts` which contains the reassignment logic. This is a **spec issue, not an implementation issue**.

**Recommendation:** Update ticket spec to reflect actual codebase structure.

---

## Build Verification

| Check | Status | Notes |
|-------|--------|-------|
| pnpm install | ✅ PASS | Dependencies installed successfully |
| pnpm typecheck | ⚠️ PARTIAL | 4 errors (3 pre-existing, 1 new unused import) |
| pnpm lint | ⏭️ SKIPPED | Based on typecheck results |
| pnpm build | ⏭️ SKIPPED | Based on test failures |
| pnpm test | ❌ FAIL | 1 test failing (pre-existing test needs update) |

### TypeCheck Errors

**New Error (from this branch):**
```
src/features/routing/pool-manager.test.ts(1,48): error TS6133: 'afterEach' is declared but its value is never read.
```

**Pre-existing Errors (exist on main):**
```
src/features/signaling/socket-handlers.test.ts(437,29): error TS6196: 'CallRequest' is declared but never used.
src/features/signaling/socket-handlers.test.ts(437,42): error TS6196: 'ActiveCall' is declared but never used.
src/features/signaling/socket-handlers.test.ts(438,1): error TS6133: 'TIMING' is declared but its value is never read.
```

---

## Acceptance Criteria Analysis

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Reassigned visitor stays in original pool | ✅ VERIFIED | Code inspection: pool-manager.ts:788-791 |
| 2 | findBestAgent accepts pool_id parameter | ✅ VERIFIED | Code inspection: pool-manager.ts:597 signature |
| 3 | If no agents in pool, logs warning and returns null | ✅ VERIFIED | Code inspection: pool-manager.ts:798-803 |
| 4 | Unit tests cover pool-aware reassignment | ❌ FAILED | Tests were discarded in merge commit 759c23d |

### AC1: Reassigned visitor stays in original pool ✅

**Implementation:** pool-manager.ts:781-807

```typescript
for (const visitorId of visitorsToReassign) {
  const visitor = this.visitors.get(visitorId);
  if (!visitor) continue;

  // Get the visitor's pool based on their org and page URL
  const poolId = this.matchPathToPool(visitor.orgId, visitor.pageUrl);

  // Find best agent within the same pool (pass fromAgentId as excludeAgentId)
  const newAgent = this.findBestAgent(poolId, fromAgentId);

  if (newAgent) {
    this.assignVisitorToAgent(visitorId, newAgent.agentId);
    reassigned.set(visitorId, newAgent.agentId);
  } else {
    // No agent available in pool - do NOT fall back to cross-pool assignment
    visitor.assignedAgentId = null;
    unassigned.push(visitorId);
  }
}
```

**Verification:**
- ✅ Retrieves visitor's pool ID based on org and page URL
- ✅ Passes pool ID to findBestAgent()
- ✅ Does NOT fall back to cross-pool assignment when no agents available
- ✅ Excludes the departing agent from consideration

### AC2: findBestAgent accepts pool_id parameter ✅

**Implementation:** pool-manager.ts:597

```typescript
findBestAgent(poolId?: string | null, excludeAgentId?: string): AgentState | undefined {
  // Get candidate agents - either from a specific pool or all agents
  let candidates = poolId
    ? this.getAgentsInPool(poolId)
    : Array.from(this.agents.values());

  // Filter out excluded agent if specified
  if (excludeAgentId) {
    candidates = candidates.filter(a => a.agentId !== excludeAgentId);
  }
  // ... rest of implementation
}
```

**Verification:**
- ✅ Accepts optional `poolId` parameter
- ✅ Accepts optional `excludeAgentId` parameter
- ✅ Filters agents by pool when pool_id is provided
- ✅ Falls back to all agents when poolId is null

### AC3: If no agents in pool, logs warning and returns null ✅

**Implementation:** pool-manager.ts:797-806

```typescript
} else {
  // No agent available in pool - do NOT fall back to cross-pool assignment
  if (poolId) {
    console.warn(
      `[PoolManager] No available agents in pool ${poolId} for visitor ${visitorId}. ` +
      `Visitor will be unassigned (no cross-pool reassignment).`
    );
  }
  visitor.assignedAgentId = null;
  unassigned.push(visitorId);
}
```

**Verification:**
- ✅ Logs warning when no agents available in pool
- ✅ Sets visitor.assignedAgentId to null
- ✅ Adds visitor to unassigned array
- ✅ Does NOT perform cross-pool assignment

### AC4: Unit tests cover pool-aware reassignment ❌

**Status:** FAILED - Tests were present in commit 8fb6842 but lost in merge 759c23d

**Missing Tests:**
1. should reassign visitor to agent in the same pool
2. should NOT reassign visitor to agent in a different pool
3. should log warning when no agents available in pool
4. should exclude specified visitor from reassignment
5. should handle multiple visitors in same pool reassignment

**Evidence:** Original commit 8fb6842 added 181 lines of tests, merge commit 759c23d discarded them.

---

## Code Quality Assessment

### Implementation Quality: EXCELLENT ✅

The actual implementation in `pool-manager.ts` is well-crafted:

**Strengths:**
- ✅ Clear separation of concerns (pool lookup → agent selection → reassignment)
- ✅ Proper error handling (null checks, edge cases)
- ✅ Informative logging (warnings when no agents available)
- ✅ Maintains visitor state consistency
- ✅ Prevents cross-pool assignment (as required)
- ✅ Excludes departing agent from selection
- ✅ Follows existing code patterns in the codebase

**Code Review Observations:**
- Uses `matchPathToPool()` to determine visitor's pool (correct approach)
- Passes both `poolId` and `fromAgentId` (as excludeAgentId) to findBestAgent
- Properly handles the case where no agents are available (logs warning, unassigns visitor)
- Clean implementation that doesn't introduce technical debt

### Test Quality: CRITICAL FAILURE ❌

**Problem:** All TKT-017 tests were discarded during merge.

**Impact:**
- No automated verification of pool-aware reassignment behavior
- Risk of regression in future changes
- Acceptance criteria #4 not met

---

## Edge Cases Analysis

Based on code inspection, the implementation handles:

| Edge Case | Handled? | Evidence |
|-----------|----------|----------|
| Visitor's pool has no available agents | ✅ YES | Logs warning, unassigns visitor (no cross-pool) |
| Departing agent is the only agent in pool | ✅ YES | Excluded via excludeAgentId parameter |
| Visitor data missing from state | ✅ YES | `if (!visitor) continue` check on line 783 |
| Multiple visitors need reassignment | ✅ YES | Loop processes all visitors on line 781 |
| Visitor in active call excluded | ✅ YES | excludeVisitorId parameter filters them out |
| Pool ID is null (no pool routing) | ✅ YES | findBestAgent handles null poolId gracefully |

---

## Risk Assessment

### HIGH RISK: Missing Test Coverage

**Risk:** Without the TKT-017 test suite, there's no automated way to verify:
- Visitors stay within their original pool during reassignment
- Cross-pool assignment is prevented
- Warning is logged when no agents available

**Mitigation Required:** Restore the 5 TKT-017 tests from commit 8fb6842.

### MEDIUM RISK: Test Suite Inconsistency

**Risk:** The pre-existing "Visitor Reassignment" test now documents incorrect behavior and fails.

**Impact:** Developers may be confused about expected behavior.

**Mitigation Required:** Update test expectations to match fixed behavior.

### LOW RISK: Scope Mismatch

**Risk:** Ticket specification doesn't match actual codebase structure.

**Impact:** Future developers may be confused looking for non-existent files.

**Mitigation Required:** Update ticket documentation.

---

## Failures Summary

### Failure 1: Missing Test Coverage (BLOCKER)

**Category:** acceptance
**Criterion:** AC4 - "Unit tests cover pool-aware reassignment"

**Expected:**
- Test suite "Pool-Aware Reassignment (TKT-017)" present in pool-manager.test.ts
- 5 tests covering reassignment scenarios
- All tests passing

**Actual:**
- Test suite completely absent (lost in merge commit 759c23d)
- 0 tests for TKT-017 functionality
- AC4 not met

**Evidence:**
```bash
# Check for TKT-017 tests
$ grep -n "Pool-Aware Reassignment" apps/server/src/features/routing/pool-manager.test.ts
(no output - tests are missing)

# Verify they existed in original commit
$ git show 8fb6842:apps/server/src/features/routing/pool-manager.test.ts | grep "Pool-Aware"
describe("Pool-Aware Reassignment (TKT-017)", () => {
```

**Files Affected:**
- apps/server/src/features/routing/pool-manager.test.ts

---

### Failure 2: Regression in Pre-existing Test

**Category:** regression
**Criterion:** Existing tests should pass

**Expected:**
- Test "should reassign some visitors when agent goes away" should pass
- All 26 tests in pool-manager.test.ts should pass

**Actual:**
- 1 test failing: "should reassign some visitors when agent goes away"
- Test expects buggy behavior (1 reassigned, 1 unassigned)
- Implementation now has correct behavior (2 reassigned, 0 unassigned)

**Evidence:**
```
FAIL  src/features/routing/pool-manager.test.ts > PoolManager > Visitor Reassignment > should reassign some visitors when agent goes away (round-robin behavior)
AssertionError: expected 2 to be 1 // Object.is equality

Expected: 1
Received: 2

❯ src/features/routing/pool-manager.test.ts:473:38
```

**Root Cause:** TKT-017 fixed a bug where the departing agent could be selected during reassignment. The old test was documenting this buggy behavior. Now that the bug is fixed, the test fails.

**Files Affected:**
- apps/server/src/features/routing/pool-manager.test.ts (line 473)

---

### Failure 3: Unused Import (MINOR)

**Category:** build
**Criterion:** pnpm typecheck should pass

**Expected:**
- 0 new TypeScript errors

**Actual:**
- 1 new error: unused `afterEach` import

**Evidence:**
```
src/features/routing/pool-manager.test.ts(1,48): error TS6133: 'afterEach' is declared but its value is never read.
```

**Files Affected:**
- apps/server/src/features/routing/pool-manager.test.ts (line 1)

---

## Recommendation for Dispatch

This ticket has **correct implementation** but **insufficient test coverage** due to merge issues.

**Required Actions:**

1. **CRITICAL: Restore TKT-017 Test Suite**
   - Cherry-pick test additions from commit 8fb6842
   - Ensure all 5 "Pool-Aware Reassignment" tests are present
   - Verify tests pass

2. **IMPORTANT: Fix Regression Test**
   - Update test expectations in "should reassign some visitors when agent goes away"
   - Change from: `expect(result.reassigned.size).toBe(1)`
   - Change to: `expect(result.reassigned.size).toBe(2)`
   - Update comment to reflect fixed behavior

3. **MINOR: Remove Unused Import**
   - Remove `afterEach` from import statement on line 1

**Suggested Continuation Ticket Focus:**
1. Restore lost TKT-017 test suite from commit 8fb6842
2. Update failing pre-existing test to reflect fixed behavior
3. Remove unused `afterEach` import
4. Verify all pool-manager.test.ts tests pass

**Estimated Effort:** 30 minutes (simple cherry-pick and test update)

---

## Technical Details

### Commits Analyzed

- `8fb6842` - TKT-017: Enforce pool routing on visitor reassignment (original implementation + tests)
- `0c32fb2` - test: add baseline regression tests (added test with buggy behavior expectations)
- `759c23d` - merge: take main's pool-manager.test.ts (LOST TKT-017 tests)

### Files Changed (Current Branch vs Main)

```
apps/server/src/features/routing/pool-manager.ts       | +27 -0
docs/data/decisions.json                               | +328 (unrelated decision updates)
```

**Note:** pool-manager.test.ts shows changes in diff but TKT-017 tests were net removed.

---

## Conclusion

**DO NOT MERGE** - While the implementation is excellent and meets 3 out of 4 acceptance criteria, the missing test coverage (AC4) is a blocker. The tests were accidentally discarded during a merge and must be restored before this ticket can be considered complete.

**Implementation Status:** ✅ EXCELLENT
**Test Coverage Status:** ❌ CRITICAL FAILURE
**Overall Status:** ❌ BLOCKED

The code does exactly what it should, but without tests to prove it works and prevent future regressions, it cannot be merged.

---

## Next Steps

1. Create continuation ticket to restore TKT-017 tests
2. Update failing regression test
3. Re-run QA after fixes applied
4. Only merge after all tests pass and coverage is restored
