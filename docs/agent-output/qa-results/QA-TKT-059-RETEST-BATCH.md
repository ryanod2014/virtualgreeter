# QA Report: TKT-059 - FAILED ❌

**Ticket:** TKT-059 - Cancelled Calls Have No Audit Trail
**Branch:** agent/tkt-059
**Tested At:** 2025-12-07T01:56:22Z
**QA Agent:** qa-review-TKT-059

---

## Summary

**BLOCKED** - Critical runtime failure: Code change requires database migration that is missing.

The TypeScript code was correctly modified to set `status="cancelled"` instead of deleting records, but the database schema CHECK constraint still only allows: `('pending', 'accepted', 'rejected', 'completed', 'missed')`. When the code attempts to UPDATE a record with status='cancelled', the database will **reject it with a constraint violation**.

---

## Critical Finding

### Database Schema Constraint Violation

**Location:** `supabase/migrations/20251125200000_initial_schema.sql:107`

**Current Constraint:**
```sql
status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'missed')),
```

**Problem:** The constraint does NOT include 'cancelled', so any attempt to set status='cancelled' will fail with:
```
ERROR: new row for relation "call_logs" violates check constraint "call_logs_status_check"
DETAIL: Failing row contains (..., cancelled, ...)
```

**Required Fix:** A migration must be created to update the CHECK constraint:
```sql
-- Migration: supabase/migrations/YYYYMMDDHHMMSS_add_cancelled_status.sql
ALTER TABLE public.call_logs
DROP CONSTRAINT IF EXISTS call_logs_status_check;

ALTER TABLE public.call_logs
ADD CONSTRAINT call_logs_status_check
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'missed', 'cancelled'));

COMMENT ON COLUMN public.call_logs.status IS 'Call status: pending (ringing), accepted (in progress), rejected (agent declined), completed (ended normally), missed (RNA timeout), cancelled (visitor cancelled during ring)';
```

---

## Build Verification

| Check | Status | Notes |
|-------|--------|-------|
| pnpm install | ✅ PASS | Dependencies installed |
| pnpm typecheck | ⚠️ PRE-EXISTING ERRORS | 39 widget test errors (exist on main branch, not caused by TKT-059) |
| pnpm lint | ⚠️ NOT RUN | Pre-existing errors make this moot |
| pnpm build | ⚠️ NOT RUN | Pre-existing errors make this moot |
| pnpm test | ⚠️ NO TESTS | No unit tests exist for call-logger.ts |

**TypeCheck Status:** The call-logger.ts file itself has **zero type errors**. All 39 typecheck errors are in unrelated widget test files and are pre-existing on main branch.

---

## Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Issue described in F-025 is resolved | ❌ **FAIL** | Code change is correct but will fail at runtime due to missing database migration |
| 2 | Change is tested and verified | ❌ **FAIL** | Cannot test without database migration; no unit tests written |

---

## Code Inspection Results

### ✅ Code Changes Are Correct (in isolation)

The TypeScript implementation is exactly right:

**File: `apps/server/src/lib/call-logger.ts`**

1. **Line 11** - ✅ Added "cancelled" to CallLogEntry type:
   ```typescript
   status: "pending" | "accepted" | "rejected" | "completed" | "missed" | "cancelled";
   ```

2. **Lines 308-334** - ✅ Changed markCallCancelled from DELETE to UPDATE:
   ```typescript
   // OLD: .delete()
   // NEW: .update({ status: "cancelled", ended_at: ... })
   ```

3. **Pattern Consistency** - ✅ Follows exact same pattern as:
   - `markCallMissed()` (line 242-270)
   - `markCallRejected()` (line 275-303)

4. **Memory Cleanup** - ✅ Still calls `callLogIds.delete(requestId)` correctly

5. **Error Handling** - ✅ Preserved from original implementation

6. **Logging** - ✅ Updated appropriately

### ❌ Missing Required Migration

**No database migration file exists** to add "cancelled" to the CHECK constraint. This causes:

1. **Runtime failure** when visitor cancels a call
2. **Database constraint violation error**
3. **Call record NOT preserved** (original bug persists)
4. **Silent failure** (error logged but user doesn't see it)

---

## Integration Analysis

### Where markCallCancelled Is Called

Verified usage in socket handlers:

1. **`apps/server/src/features/signaling/socket-handlers.ts:391`**
   ```typescript
   socket.on(SOCKET_EVENTS.CALL_CANCEL, async (data: CallCancelPayload) => {
     await clearRNATimeout(data.requestId);
     markCallCancelled(data.requestId);  // ⚠️ Will fail at runtime
     const request = poolManager.cancelCall(data.requestId);
     // ...
   });
   ```

2. **`apps/server/src/features/signaling/redis-socket-handlers.ts:357`**
   ```typescript
   socket.on(SOCKET_EVENTS.CALL_CANCEL, async (data: CallCancelPayload) => {
     await clearRNATimeout(data.requestId);
     markCallCancelled(data.requestId);  // ⚠️ Will fail at runtime
     const request = await poolManager.cancelCall(data.requestId);
     // ...
   });
   ```

Both call sites will trigger the constraint violation when executed.

---

## Edge Case Analysis

| Edge Case | Expected Behavior | Actual Behavior |
|-----------|-------------------|-----------------|
| Visitor cancels during ring | Record preserved with status='cancelled' | ❌ Database rejects UPDATE, record stays as 'pending' or gets no update |
| Supabase not configured | Early return, no DB operation | ✅ Handled correctly in code |
| callLogId doesn't exist | Early return, no error | ✅ Handled correctly in code |
| Network error during UPDATE | Error logged, gracefully handled | ✅ Handled correctly in code |
| Concurrent cancellations | Each handled independently | ✅ No race condition in code |

---

## Adversarial Testing

### SQL Injection Safety
✅ **PASS** - Uses Supabase parameterized queries, no string concatenation

### Type Safety
✅ **PASS** - TypeScript types correctly updated to include "cancelled"

### Database Constraint
❌ **FAIL** - CHECK constraint will reject the new status value

### Memory Leaks
✅ **PASS** - callLogIds.delete() still called correctly

### Error Visibility
⚠️ **CONCERN** - Error is logged but not surfaced to caller. markCallCancelled() returns void, so caller doesn't know if it succeeded.

---

## Test Coverage

**Unit Tests:** ❌ None exist for call-logger.ts
**Integration Tests:** ❌ None verify database schema matches code types
**Manual Testing:** ❌ Cannot test without database migration

**Recommendation:** After fixing the migration, unit tests should be added for:
1. markCallCancelled creates cancelled record
2. cancelled records are preserved in database
3. callLogIds memory map is cleaned up
4. error handling when DB operation fails

---

## What Needs to Be Fixed

### 1. Add Database Migration (REQUIRED)

Create: `supabase/migrations/YYYYMMDDHHMMSS_add_cancelled_status.sql`

```sql
-- ============================================================================
-- Migration: Add 'cancelled' status to call_logs
-- Ticket: TKT-059
-- Description: Allow preserving call records when visitor cancels during ring
--              instead of deleting them
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.call_logs
DROP CONSTRAINT IF EXISTS call_logs_status_check;

-- Add updated constraint with 'cancelled' status
ALTER TABLE public.call_logs
ADD CONSTRAINT call_logs_status_check
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'missed', 'cancelled'));

-- Update column comment to document the new status
COMMENT ON COLUMN public.call_logs.status IS
'Call status: pending (ringing), accepted (in progress), rejected (agent declined), completed (ended normally), missed (RNA timeout), cancelled (visitor cancelled during ring)';
```

### 2. Add Unit Tests (RECOMMENDED)

Create: `apps/server/src/lib/call-logger.test.ts`

Should include tests for:
- markCallCancelled sets status='cancelled' and ended_at
- cancelled records queryable from database
- callLogIds cleaned up after marking cancelled
- graceful handling when Supabase not configured

### 3. Update Feature Documentation (RECOMMENDED)

Files that need updates:
- `docs/features/call-logs/call-state-machine.md` - Add cancelled as terminal state
- `docs/features/call-logs/audit-trail.md` - Document cancelled calls preserved

---

## Reproduction Steps (After Fix)

To verify the fix works:

1. Apply the database migration
2. Start the server with Supabase configured
3. Initiate a call from the widget to an agent
4. Cancel the call from the widget before the agent accepts
5. Query: `SELECT * FROM call_logs WHERE status='cancelled' ORDER BY created_at DESC LIMIT 1`
6. Expected: Call log exists with status='cancelled' and ended_at timestamp set

---

## Files Changed (from git log)

| File | Lines Changed | Description |
|------|---------------|-------------|
| `apps/server/src/lib/call-logger.ts` | +9, -6 | Updated status type and markCallCancelled function |

**Missing Files:**
- ❌ No database migration file
- ❌ No unit tests
- ❌ No integration tests

---

## Recommendation for Dispatch

**DO NOT MERGE** - This will cause production failures.

**Required for continuation ticket:**

1. **Add database migration** to allow status='cancelled'
2. **Add unit tests** for call-logger.ts, specifically markCallCancelled()
3. **Test the full flow** with actual database to verify constraint allows 'cancelled'
4. **Consider error handling improvement** - markCallCancelled should return success/failure so caller can handle errors

**Severity:** CRITICAL - This will break call cancellation functionality in production

**Estimated effort to fix:** 30-60 minutes (migration + tests)

---

## Positive Notes

The code implementation is well-structured and follows existing patterns perfectly. The developer clearly understood the requirements and made the correct changes to the TypeScript code. The only missing piece is the database schema update to match the code changes - a common oversight when working across both application and database layers.

---

## QA Agent Notes

This failure was caught through **systematic code inspection and database schema analysis**. The bug would not have been caught by:
- TypeScript compiler (types match)
- Linting (no style issues)
- Unit tests (none exist)
- Build process (no database validation)

Only runtime testing with an actual database OR thorough schema review would catch this issue.

**Testing method used:** Code inspection + database schema analysis + integration point verification

**Time spent:** 15 minutes to discover, 45 minutes to document thoroughly
