# Dev Agent Continuation: TKT-038-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-038
> **Branch:** `agent/tkt-038` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Build fails due to pre-existing type error in workbench-client.tsx

**Failures Found:**

1. **Build Failure** - Type error in workbench-client.tsx:38:81
   - **Error:** RecordingSettings type missing rna_timeout_seconds and max_call_duration_minutes properties

**What You Must Fix:**

This is a **pre-existing issue** not introduced by TKT-038. The TKT-038 implementation (DeletePoolModal and pools-client changes) is correct and meets all acceptance criteria.

**Your options:**

1. **Fix the pre-existing type error** in workbench-client.tsx
   - Add the missing properties to RecordingSettings type OR
   - Fix the type usage at line 38:81
2. **Alternative:** Use selective merge to cherry-pick only TKT-038 files

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-038`
2. Pull latest: `git pull origin agent/tkt-038`
3. Investigate the type error in workbench-client.tsx:38:81
4. Fix the RecordingSettings type mismatch
5. Verify with `pnpm typecheck` and `pnpm build` BEFORE claiming completion
6. Push for re-QA

---

## Original Acceptance Criteria

1. Delete button opens confirmation modal
2. Modal shows: pool name, X agents will be unassigned, Y routing rules will be deleted
3. User must type pool name to confirm
4. Cancel closes modal without deleting

---

## Files in Scope (TKT-038)

- `apps/dashboard/src/features/pools/PoolCard.tsx`
- `apps/dashboard/src/features/pools/DeletePoolModal.tsx`

## File to Fix (Pre-existing issue)

- `apps/dashboard/src/features/workbench/workbench-client.tsx` (line 38:81)
- Possibly: `packages/domain/src/database.types.ts` (RecordingSettings type)
