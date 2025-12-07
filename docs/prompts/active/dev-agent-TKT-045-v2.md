# Dev Agent Continuation: TKT-045-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-045
> **Branch:** `agent/TKT-045-exclude-dismissed-pmf` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
TypeScript compilation errors prevent dashboard from building. The DisappointmentLevel type was updated to include `| null`, but the UI code in feedback-client.tsx attempts to use disappointment_level (which can now be null) as an index into the levelConfigs object. TypeScript correctly rejects this.

**Failures Found:**

### BLOCKER-1: Type 'null' cannot be used as an index type (CRITICAL)
- **File:** apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx
- **Lines:** 317, 636
- **Error:** `error TS2538: Type 'null' cannot be used as an index type`
- **Root Cause:** Type change propagated to PmfSurvey interface but UI code was not updated to handle nullable values
- **Impact:** Dashboard package fails typecheck and cannot build, blocking all deployments

**What You Must Fix:**

Apply nullish coalescing to handle null disappointment_level values:

**Line 317:**
```typescript
// CURRENT (BROKEN):
const levelConfig = levelConfigs[survey.disappointment_level] ?? levelConfigs.not_disappointed;

// FIX TO:
const levelConfig = levelConfigs[survey.disappointment_level ?? "not_disappointed"] ?? levelConfigs.not_disappointed;
```

**Line 636:**
```typescript
// CURRENT (BROKEN):
const lc = levelConfigs[selectedSurvey.disappointment_level] ?? levelConfigs.not_disappointed;

// FIX TO:
const lc = levelConfigs[selectedSurvey.disappointment_level ?? "not_disappointed"] ?? levelConfigs.not_disappointed;
```

**Estimated Fix Time:** 5 minutes

---

## Your Task

1. Checkout existing branch: `git checkout agent/TKT-045-exclude-dismissed-pmf`
2. Pull latest: `git pull origin agent/TKT-045-exclude-dismissed-pmf`
3. Read the QA failure report at: `docs/agent-output/qa-results/QA-TKT-045-RETEST-BATCH.md`
4. Fix line 317: Add `?? "not_disappointed"` inside the array index
5. Fix line 636: Add `?? "not_disappointed"` inside the array index
6. Verify: Run `pnpm typecheck` from project root
7. Verify: Run `pnpm build` to ensure full build succeeds
8. Push for re-QA

**Reproduction Steps:**
```bash
cd apps/dashboard
pnpm typecheck
# Observe errors on lines 317 and 636 of feedback-client.tsx
```

---

## Original Acceptance Criteria Status

- ✅ AC1 (Dismissed surveys have null): PASS - ellis-survey-modal.tsx:126 sets disappointment_level: null
- ✅ AC2 (PMF excludes null): PASS - platform/page.tsx:47 filters `.not('disappointment_level', 'is', null)`
- ✅ AC3 (Submitted responses work): PASS - handleSubmit() not modified, still works correctly
- ❌ Type safety: FAIL - TypeScript errors on feedback-client.tsx:317,636

**What Works:**
- Database migration correctly allows NULL values ✅
- Dismiss handler stores NULL correctly ✅
- PMF calculation query correctly excludes NULL values ✅
- Submit handler unchanged - no regression risk ✅
- Domain package builds successfully ✅
- Core logic is functionally correct ✅

**What Is Broken:**
- TypeScript compilation fails in dashboard package ❌
- Build fails, blocking deployment ❌
- Cannot merge to main until fixed ❌

---

## Original Acceptance Criteria

- Dismissed surveys have null disappointment_level
- PMF calculation excludes null responses
- Submitted responses work as before

---

## Files in Scope

- `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` (lines 317, 636)

---

## Notes

- The implementation is functionally correct and would work at runtime
- TypeScript errors are the only blocker
- Fix is simple (one-line change per error)
- No regression risks identified in core functionality
- Domain package (containing type change) builds successfully
- Pre-existing widget/dashboard test errors are unrelated
- Developer likely only ran domain package build, not full monorepo typecheck

**Confidence Level:** HIGH - TypeScript errors are clear, reproducible, and isolated. Root cause is well-understood. Fix is straightforward and low-risk.
