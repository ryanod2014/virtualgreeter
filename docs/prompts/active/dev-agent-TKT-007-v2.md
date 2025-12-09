# Dev Agent Continuation: TKT-007-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-007
> **Branch:** `agent/tkt-007-fix-public-feedback-doc` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
TypeScript errors in test files prevent build verification. The documentation changes are CORRECT and all acceptance criteria are verified in the doc review. However, unused imports in test files are causing TypeScript compilation errors that block the build.

**Failures Found:**

**Build Failure** - 4 TypeScript errors in test files due to unused imports:
- File: `apps/server/src/features/agents/pool-manager.test.ts` - unused imports 'afterEach', 'CallRequest', 'ActiveCall', 'TIMING'
- File: `apps/server/src/features/signaling/socket-handlers.test.ts` - similar unused import issues

**What Worked:**
✅ Documentation changes are CORRECT - all acceptance criteria verified
✅ Feature doc accurately describes the voting/feedback system
✅ No mention of 'visitors' or 'post-call' in incorrect context
✅ Clear that authentication is required

**What You Must Fix:**

Fix unused imports in test files to allow build to pass. This is the SAME issue as SEC-001 (which has already been fixed) - these are pre-existing test file errors that need cleanup.

**Files with errors:**
1. `apps/server/src/features/agents/pool-manager.test.ts`
2. `apps/server/src/features/signaling/socket-handlers.test.ts`

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-007-fix-public-feedback-doc`
2. Pull latest: `git pull origin agent/tkt-007-fix-public-feedback-doc`
3. Fix unused imports in `pool-manager.test.ts`:
   - Remove unused imports: 'afterEach', 'CallRequest', 'ActiveCall', 'TIMING'
4. Fix unused imports in `socket-handlers.test.ts`:
   - Remove any unused imports
5. Run `pnpm typecheck` and verify it passes (or shows only pre-existing errors)
6. Run `pnpm build` and verify it completes successfully
7. Commit fixes and push for re-QA

**Note:** These test file issues are pre-existing codebase problems, NOT related to your documentation changes. Your documentation work is correct and complete. This is just cleanup to get the build passing.

---

## Original Acceptance Criteria

- ✅ Feature doc accurately describes the voting/feedback system
- ✅ No mention of 'visitors' or 'post-call' in context of feedback
- ✅ Clear that authentication is required

All acceptance criteria for the documentation changes are MET. Only build errors need fixing.

---

## Files in Scope

**Original ticket files (DONE - no changes needed):**
- `docs/features/visitor/public-feedback.md` ✅

**New files to fix (test errors):**
- `apps/server/src/features/agents/pool-manager.test.ts` (NEEDS FIX - remove unused imports)
- `apps/server/src/features/signaling/socket-handlers.test.ts` (NEEDS FIX - remove unused imports)

---

## Notes

- This is a simple cleanup task - just remove unused imports from test files
- The documentation changes are correct and complete
- Estimated fix time: 5-10 minutes
- Same issue pattern as SEC-001 (already fixed on that branch)
