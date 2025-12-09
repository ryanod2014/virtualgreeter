# Dev Agent Continuation: TKT-017-v2

> **Type:** Continuation (QA FAILED - Test Coverage Lost in Merge)
> **Original Ticket:** TKT-017
> **Branch:** `agent/tkt-017-pool-routing-reassignment` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Test Suite Discarded & Test Regression

**QA Summary:**
Test coverage lost in merge - TKT-017 test suite was discarded in commit 759c23d. Additionally, 1 pre-existing test now fails because it expects buggy behavior that TKT-017 correctly fixed.

**Implementation Quality:** ✅ EXCELLENT - The actual pool routing fix is correct and production-ready

**Test Quality:** ❌ CRITICAL FAILURE - Tests were lost and need restoration

---

## Failures Found:

### 1. Lost Test Suite (AC4 Failure)
- **Expected:** Test suite 'Pool-Aware Reassignment (TKT-017)' with 5 tests
- **Actual:** Test suite completely absent
- **Evidence:** Commit 8fb6842 had the tests, but merge commit 759c23d explicitly took main's version: `'merge: take main's pool-manager.test.ts'`
- **Impact:** No coverage for pool-aware reassignment functionality

### 2. Regression Test Failure
- **Test:** 'should reassign some visitors when agent goes away'
- **Error:** `expected 2 to be 1 at pool-manager.test.ts:473:38`
- **Root Cause:** Test expects buggy behavior (1 reassigned, 1 unassigned), but TKT-017 fixed the bug so actual behavior is correct (2 reassigned, 0 unassigned)
- **Location:** Test was added in commit 0c32fb2 documenting buggy behavior before TKT-017 fix

### 3. TypeScript Error
- **Error:** `TS6133: 'afterEach' is declared but its value is never read`
- **Location:** pool-manager.test.ts line 1
- **Cause:** Introduced by merge commit 759c23d

---

## Your Task

### Step 1: Checkout and Pull
```bash
git checkout agent/tkt-017-pool-routing-reassignment
git pull origin agent/tkt-017-pool-routing-reassignment
```

### Step 2: Cherry-Pick Lost Tests
```bash
# View the lost test suite
git show 8fb6842:apps/server/src/features/routing/pool-manager.test.ts

# Cherry-pick JUST the TKT-017 test suite additions from commit 8fb6842
# Look for the section: "Pool-Aware Reassignment (TKT-017)"
```

Restore the 5 tests that cover:
1. Reassignment within same pool
2. No cross-pool reassignment
3. Pool filtering during findBestAgent
4. Null return when no agents in pool
5. Warning logged when pool has no agents

### Step 3: Fix Regression Test
Update the test `'should reassign some visitors when agent goes away'`:

**Current (expects buggy behavior):**
```typescript
expect(reassignedCount).toBe(1);
expect(unassignedCount).toBe(1);
```

**Fixed (expects correct behavior after TKT-017):**
```typescript
expect(reassignedCount).toBe(2);
expect(unassignedCount).toBe(0);
```

**Also update test comments** to reflect that this is the FIXED behavior, not buggy behavior.

### Step 4: Remove Unused Import
Remove `afterEach` from line 1 imports if it's not used:
```typescript
// Before
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// After
import { describe, it, expect, beforeEach } from 'vitest';
```

### Step 5: Verify All Tests Pass
```bash
pnpm test pool-manager.test.ts
```

All 26 tests (21 original + 5 TKT-017) should pass.

### Step 6: Verify Build
```bash
pnpm typecheck
pnpm build
```

### Step 7: Push for Re-QA
```bash
git add apps/server/src/features/routing/pool-manager.test.ts
git commit -m "test: Restore TKT-017 test suite and fix regression test expectations"
git push origin agent/tkt-017-pool-routing-reassignment
```

---

## Original Acceptance Criteria

From TKT-017: Enforce Pool Routing on Visitor Reassignment

1. ✅ Reassigned visitor stays in original pool
2. ✅ findBestAgent accepts pool_id parameter
3. ✅ If no agents in pool, logs warning and returns null
4. ❌ Unit tests cover pool-aware reassignment ← RESTORE THIS

**Implementation:** ✅ Production-ready
**Tests:** ❌ Need restoration

---

## Files in Scope

Original files_to_modify:
- apps/server/src/features/reassignment/reassignVisitors.ts ← ✅ Implementation correct
- apps/server/src/lib/agentSelection.ts ← ✅ Implementation correct
- apps/server/src/features/routing/pool-manager.test.ts ← ❌ Fix tests here

---

## Dev Checks

- [ ] TKT-017 test suite (5 tests) restored from commit 8fb6842
- [ ] Regression test updated: expects (2,0) instead of (1,1)
- [ ] Test comments updated to reflect fixed behavior
- [ ] Unused 'afterEach' import removed
- [ ] `pnpm test pool-manager.test.ts` - all 26 tests pass
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Push to branch

---

## Context

**Estimated Effort:** 30 minutes

The implementation is excellent. This is purely a test restoration task. The merge conflict resolution chose main's version of the test file, discarding your TKT-017 tests.

**Reference Commit:** 8fb6842 contains the complete test suite you need to restore.
