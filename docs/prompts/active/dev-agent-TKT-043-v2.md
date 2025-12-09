# Dev Agent Continuation: TKT-043-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-043
> **Branch:** `agent/tkt-043` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Pre-existing TypeScript errors in widget and server packages block build verification

**Failures Found:**

1. **Build Failure** - 38 TypeScript errors in @ghost-greeter/widget test files (unrelated to TKT-043)
2. **Build Failure** - 25 TypeScript errors in @ghost-greeter/server test files (unrelated to TKT-043)

**What You Must Fix:**

These are **pre-existing issues** not introduced by TKT-043. The TKT-043 changes themselves are correctly implemented and meet all acceptance criteria.

**Your options:**

1. **Fix pre-existing TypeScript errors** in widget and server test files
2. **Implement selective typecheck/build** for only affected packages (dashboard)
   - Update CI to allow selective package builds
   - Or add `--filter=@ghost-greeter/dashboard` to typecheck/build commands

**Recommendation:** Since TKT-043 only touches dashboard code, implement selective typecheck for the dashboard package to unblock this ticket. The pre-existing errors should be tracked in a separate cleanup ticket.

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-043`
2. Pull latest: `git pull origin agent/tkt-043`
3. Choose approach:
   - **Option A:** Fix all pre-existing TypeScript errors in widget and server test files
   - **Option B:** Implement selective package build/typecheck for dashboard only
4. Verify with `pnpm typecheck` and `pnpm build` BEFORE claiming completion
5. Push for re-QA

---

## Original Acceptance Criteria

1. Successful save shows success toast
2. Failed save shows error toast with message
3. UI reverts to previous state on failure
4. Network errors show 'Connection error' message

---

## Files in Scope (TKT-043)

- `apps/dashboard/src/features/pools/PoolCard.tsx`
- `apps/dashboard/src/features/pools/actions.ts`

## Files with Pre-existing Errors

- `apps/widget/**/*.test.ts` (38 errors)
- `apps/server/**/*.test.ts` (25 errors)
