# QA Report: TKT-045 - Exclude Dismissed Surveys from PMF Calculation

**Status:** ❌ **FAILED**
**Branch:** `agent/TKT-045-exclude-dismissed-pmf` (current worktree branch)
**Tested:** 2025-12-07
**QA Agent:** QA Review Agent
**Ticket:** TKT-045

---

## Executive Summary

**VERDICT: BLOCKED - TypeScript Compilation Errors**

The implementation correctly implements the core logic for excluding dismissed surveys from PMF calculations. However, there is a **critical TypeScript compilation error** in `feedback-client.tsx` that prevents the dashboard from building. The type change adding `| null` to `disappointment_level` was not properly handled in the platform feedback UI code.

---

## Testing Methodology

Per the QA Agent SOP, this ticket was tested through:
1. **Build Verification** - typecheck, lint, build, test
2. **Code Inspection** - Primary method for data layer changes
3. **Edge Case Analysis** - Verification of all code paths

Since this ticket involves database schema and data handling changes with NO visible UI changes to end users, **code inspection** was the primary testing approach.

---

## Build Verification Results

### ✅ Domain Package (Core Changes)
```
✓ typecheck: PASS
✓ build: PASS
```
- The `@ghost-greeter/domain` package (containing the DisappointmentLevel type change) builds successfully
- Type definitions correctly export `DisappointmentLevel = "very_disappointed" | "somewhat_disappointed" | "not_disappointed" | null`

### ❌ Dashboard Package (TypeScript Errors)
```
✗ typecheck: FAIL
Location: apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx
Errors:
  - Line 317: Type 'null' cannot be used as an index type
  - Line 636: Type 'null' cannot be used as an index type
```

**Root Cause:**
The `PmfSurvey` interface was updated to allow `disappointment_level: ... | null` (line 64), but the rendering code attempts to use this nullable value as an index into the `levelConfigs` object:

```typescript
// Line 317
const levelConfig = levelConfigs[survey.disappointment_level] ?? levelConfigs.not_disappointed;

// Line 636
const lc = levelConfigs[selectedSurvey.disappointment_level] ?? levelConfigs.not_disappointed;
```

TypeScript correctly rejects this because `null` cannot be used as an object index.

**Why This Happens:**
- The type system now knows `disappointment_level` can be `null`
- The runtime query filters out null values (line 47 of platform/page.tsx)
- But TypeScript doesn't know about the runtime filter
- Result: Type-level error even though runtime would work

### ⚠️ Pre-Existing Errors (Not Related to TKT-045)
- Widget package: ~150 test-related TypeScript errors (pre-existing)
- Dashboard package: ~50 test-related errors in other files (pre-existing)
- These errors exist on main branch and are NOT introduced by this ticket

---

## Acceptance Criteria Verification

| Criterion | Code Status | Runtime Status | Type Safety | Overall |
|-----------|-------------|----------------|-------------|---------|
| **AC1:** Dismissed surveys have `disappointment_level: null` | ✅ Implemented correctly (ellis-survey-modal.tsx:126) | ✅ Would work | ✅ Types correct | ✅ PASS |
| **AC2:** PMF calculation excludes null responses | ✅ Implemented correctly (platform/page.tsx:47) | ✅ Would work | ✅ Types correct | ✅ PASS |
| **AC3:** Submitted responses work as before | ✅ handleSubmit() unchanged | ✅ Would work | ✅ Types correct | ✅ PASS |
| **Type Safety:** UI handles nullable type correctly | ❌ Not handled | N/A | ❌ Compilation error | ❌ **FAIL** |

---

## Detailed Code Inspection

### 1. Database Migration ✅ PASS
**File:** `supabase/migrations/20251206030000_allow_null_disappointment_level.sql`

```sql
ALTER TABLE pmf_surveys
ALTER COLUMN disappointment_level DROP NOT NULL;
```

**Verification:**
- ✅ Correct SQL syntax
- ✅ Drops NOT NULL constraint on `disappointment_level` column
- ✅ Includes clear comment explaining when NULL is used
- ✅ Migration name follows naming convention

**Result:** Database will correctly accept NULL values for dismissed surveys.

---

### 2. Type Definition Update ✅ PASS
**File:** `packages/domain/src/database.types.ts:37`

**Change:**
```typescript
// Before
export type DisappointmentLevel = "very_disappointed" | "somewhat_disappointed" | "not_disappointed";

// After
export type DisappointmentLevel = "very_disappointed" | "somewhat_disappointed" | "not_disappointed" | null;
```

**Verification:**
- ✅ Type correctly allows null
- ✅ Package builds successfully
- ✅ Type exports correctly

**Result:** Type system correctly represents that disappointment_level can be null.

---

### 3. Dismiss Handler ✅ PASS
**File:** `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx:126`

**Implementation:**
```typescript
const handleDismiss = async () => {
  try {
    await supabase.from("pmf_surveys").insert({
      organization_id: organizationId,
      user_id: userId,
      user_role: userRole,
      disappointment_level: null, // ✅ NULL for dismissed
      follow_up_text: null,
      triggered_by: triggeredBy,
      page_url: pageUrl,
      dismissed: true, // ✅ Marked as dismissed
    });

    // Update cooldown even for dismissals
    await supabase.from("survey_cooldowns").upsert(
      {
        user_id: userId,
        last_survey_at: new Date().toISOString(),
        total_surveys: 1,
      },
      { onConflict: "user_id" }
    );
  } catch (error) {
    console.error("Dismiss tracking error:", error);
  }

  onClose();
};
```

**Verification:**
- ✅ Sets `disappointment_level: null` instead of `"not_disappointed"`
- ✅ Sets `dismissed: true` flag
- ✅ Updates cooldown even for dismissals (prevents re-surveying)
- ✅ Error handling with console.error
- ✅ Fire-and-forget pattern (modal closes even if insert fails)

**Edge Cases Covered:**
- Dismiss via X button → calls handleDismiss()
- Dismiss via Skip button → calls handleDismiss()
- Dismiss via backdrop → calls handleDismiss() (only after selection made)
- All paths correctly store `null` for disappointment_level

**Result:** Dismissed surveys will correctly store `null` in database.

---

### 4. PMF Calculation Query ✅ PASS
**File:** `apps/dashboard/src/app/(app)/platform/page.tsx:47`

**Implementation:**
```typescript
supabase
  .from("pmf_surveys")
  .select("*")
  .eq("dismissed", false)              // ✅ Exclude dismissed
  .not("disappointment_level", "is", null)  // ✅ Exclude null values
```

**Verification:**
- ✅ Uses `.eq("dismissed", false)` to exclude dismissed surveys
- ✅ Uses `.not("disappointment_level", "is", null)` to exclude null values
- ✅ Defense in depth: Both filters present (handles old dismissed records with "not_disappointed" AND new ones with null)
- ✅ Correct Supabase query syntax

**PMF Calculation Logic:**
The query is used to calculate PMF percentage:
```typescript
const veryDisappointedCount = pmfSurveys.data?.filter(
  s => s.disappointment_level === "very_disappointed"
).length ?? 0;

const pmfPercentage = pmfSurveys.data?.length
  ? Math.round((veryDisappointedCount / pmfSurveys.data.length) * 100)
  : 0;
```

**Verification:**
- ✅ Only non-dismissed, non-null surveys are counted in denominator
- ✅ PMF calculation will be accurate (dismissed surveys excluded)
- ✅ Handles edge case of zero surveys (returns 0%)

**Result:** PMF calculation correctly excludes dismissed surveys.

---

### 5. Submit Handler (No Changes) ✅ PASS
**File:** `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx:73-117`

**Verification:**
- ✅ handleSubmit() function NOT modified
- ✅ Still stores `selectedLevel` value (user's actual selection)
- ✅ Sets `dismissed: false` for submitted responses
- ✅ No regression risk

**Result:** Normal survey submission flow continues to work correctly.

---

### 6. Platform Feedback UI ❌ FAIL
**File:** `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx`

**Issue 1 - Line 317:**
```typescript
{filteredSurveys.map((survey) => {
  const levelConfig = levelConfigs[survey.disappointment_level] ?? levelConfigs.not_disappointed;
  // ❌ TypeScript error: Type 'null' cannot be used as an index type
```

**Issue 2 - Line 636:**
```typescript
const lc = levelConfigs[selectedSurvey.disappointment_level] ?? levelConfigs.not_disappointed;
// ❌ TypeScript error: Type 'null' cannot be used as an index type
```

**Root Cause:**
- The `PmfSurvey` interface (line 64) was updated to include `| null`
- The `levelConfigs` object only has keys for the three string values, not `null`
- TypeScript correctly identifies that `null` cannot be used as an object key

**Why This Code Exists:**
This code renders the PMF surveys in the platform admin dashboard at `/platform/feedback`

**Why Runtime Would Work:**
The platform/page.tsx query (line 47) explicitly filters out null values, so this UI code would never actually receive a survey with `null` disappointment_level at runtime.

**Why TypeScript Fails:**
TypeScript doesn't track runtime query filters. It only knows that the `PmfSurvey` type allows null, so it requires null handling in the UI code.

**Impact:**
- ❌ Dashboard package fails typecheck
- ❌ Build will fail
- ❌ Cannot deploy to production
- ✅ Runtime behavior would be correct IF it could build

---

## Edge Case Analysis

| # | Scenario | Expected Behavior | Implementation | Status |
|---|----------|-------------------|----------------|--------|
| 1 | User dismisses survey via X button | Store null, dismissed=true | handleDismiss() line 126 | ✅ Correct |
| 2 | User dismisses via Skip button | Store null, dismissed=true | handleDismiss() line 126 | ✅ Correct |
| 3 | User dismisses via backdrop click | Store null, dismissed=true | handleDismiss() line 126 | ✅ Correct |
| 4 | User selects option and submits | Store selected value, dismissed=false | handleSubmit() unchanged | ✅ Correct |
| 5 | PMF calculation on platform page | Exclude null and dismissed=true | Query line 47 | ✅ Correct |
| 6 | Old dismissed records with "not_disappointed" | Excluded from PMF (backward compat) | Both filters present | ✅ Correct |
| 7 | New dismissed records with null | Excluded from PMF | Both filters present | ✅ Correct |
| 8 | Platform feedback UI renders null survey | Should never happen (filtered) | No null handling | ❌ Type error |
| 9 | Survey modal displays to user | No visible changes | UI unchanged | ✅ Correct |
| 10 | Cooldown updated on dismiss | 90-day cooldown set | Line 134-143 | ✅ Correct |

---

## Regression Testing

### Areas Checked for Regression:
- ✅ Survey modal UI: No changes, no regression risk
- ✅ Survey eligibility logic: No changes, no regression risk
- ✅ Survey trigger timing: No changes, no regression risk
- ✅ Submit flow: No changes, no regression risk
- ✅ Cooldown logic: No changes, no regression risk
- ✅ Database RLS policies: No changes, no regression risk

**Result:** No regression risks identified in core survey functionality.

---

## Security Review

### Database Security:
- ✅ Migration only drops NOT NULL constraint (safe operation)
- ✅ No changes to RLS policies (auth still enforced)
- ✅ Query filters properly sanitized (using Supabase client methods)

### Data Integrity:
- ✅ Defense in depth: Both `dismissed=false` AND `disappointment_level IS NOT NULL` filters
- ✅ Backward compatible: Old dismissed records ("not_disappointed") still filtered out
- ✅ Forward compatible: New dismissed records (null) filtered out

**Result:** No security concerns identified.

---

## Performance Review

### Database Impact:
- ✅ Migration is lightweight (single ALTER COLUMN)
- ✅ No new indexes needed
- ✅ Query performance unchanged (already filtering on dismissed column)

### Application Impact:
- ✅ No additional queries added
- ✅ No changes to hot paths (survey display, submission)
- ✅ Platform dashboard query adds one `.not()` filter (negligible overhead)

**Result:** No performance concerns identified.

---

## Issues Found

### 🔴 CRITICAL: TypeScript Compilation Errors

**Location:** `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx`
**Lines:** 317, 636
**Error:** `Type 'null' cannot be used as an index type`

**Reproduction:**
```bash
cd apps/dashboard
pnpm typecheck
# Shows errors on lines 317 and 636
```

**Root Cause:**
The `PmfSurvey` interface was updated to allow `disappointment_level: ... | null`, but the UI code attempts to use this nullable value directly as an object index without null handling.

**Impact:**
- Dashboard package cannot typecheck
- Build fails
- Cannot deploy
- Blocks merge to main

**Suggested Fixes:**

**Option 1: Nullish Coalescing (Recommended)**
```typescript
// Line 317
const levelConfig = levelConfigs[survey.disappointment_level ?? "not_disappointed"] ?? levelConfigs.not_disappointed;

// Line 636
const lc = levelConfigs[selectedSurvey.disappointment_level ?? "not_disappointed"] ?? levelConfigs.not_disappointed;
```

**Option 2: Type Assertion (If confident null never appears)**
```typescript
// Line 317
const levelConfig = levelConfigs[survey.disappointment_level!] ?? levelConfigs.not_disappointed;

// Line 636
const lc = levelConfigs[selectedSurvey.disappointment_level!] ?? levelConfigs.not_disappointed;
```

**Option 3: Narrow the Type (Most Type-Safe)**
```typescript
// Change PmfSurvey interface back to exclude null
interface PmfSurvey {
  // ... other fields
  disappointment_level: "very_disappointed" | "somewhat_disappointed" | "not_disappointed";
  // ... other fields
}

// Since the query filters out null values, the UI will never see them
// This makes the type match runtime reality
```

**Recommendation:** Use Option 1 (nullish coalescing) for defense in depth, even though runtime query filters prevent null values from reaching this code.

---

## Test Coverage Analysis

### What Was Tested:
✅ Database migration syntax and logic
✅ Type definitions build successfully
✅ Dismiss handler stores null correctly
✅ PMF query filters out null values
✅ Submit handler unchanged (no regression)
✅ Defense in depth (both filters present)
✅ Backward compatibility (old dismissed records)
✅ Edge cases (all dismiss paths)
✅ Security (RLS, sanitization)
✅ Performance (negligible impact)

### What Was NOT Tested:
❌ Live database migration (not run on production)
❌ Manual UI testing (no visible changes, TypeScript blocks build)
❌ Integration test with real Supabase instance
❌ Browser testing (cannot build)

### Why Manual Testing Skipped:
- Build fails due to TypeScript errors
- No visible UI changes (data layer only)
- Code inspection sufficient for this ticket type

---

## Comparison with Main Branch

### TypeScript Errors on Main:
- Widget package: ~150 errors (unrelated to PMF)
- Dashboard package: ~50 errors (unrelated to PMF)
- **feedback-client.tsx: 0 errors** ✅

### TypeScript Errors on Feature Branch:
- Widget package: ~150 errors (same as main)
- Dashboard package: ~52 errors (**+2 new errors in feedback-client.tsx**)
- **feedback-client.tsx: 2 errors** ❌

**Conclusion:** The 2 errors in feedback-client.tsx are NEW and directly caused by this ticket.

---

## Developer Completion Report Review

The developer's completion report (TKT-045-2025-12-06T0915.md) states:

> "Pre-existing TypeScript test errors exist in both widget and dashboard packages, but these are unrelated to my changes. The domain package (which contains my type change) builds successfully."

**QA Assessment:**
- ✅ Correct: Domain package does build successfully
- ✅ Correct: Widget errors are pre-existing
- ⚠️ **Incomplete**: Did not mention the NEW errors in feedback-client.tsx
- ❌ **Incorrect inference**: Dashboard "builds successfully" - it does NOT due to feedback-client.tsx errors

**Why This Was Missed:**
The developer likely ran `pnpm build` on the domain package only, not the full monorepo build. The dashboard typecheck errors would only appear when running:
```bash
pnpm typecheck  # Full monorepo typecheck
```

---

## Recommendations

### 🔴 MUST FIX (Blocker):
1. **Fix TypeScript errors in feedback-client.tsx**
   - Add nullish coalescing on lines 317 and 636
   - OR update PmfSurvey interface to exclude null (since query filters it)
   - Verify fix with `pnpm typecheck` before marking complete

### 🟡 SHOULD FIX (Nice to Have):
2. **Update feature documentation**
   - File: `docs/features/feedback/ellis-survey.md`
   - Lines 191-192 document old behavior (dismissed → "not_disappointed")
   - Should reflect new behavior (dismissed → null)
   - Note: Open question #1 on line 331 asked about this exact issue!

3. **Add TypeScript test for feedback-client.tsx**
   - Ensure type safety with nullable disappointment_level
   - Prevent future regression

### ✅ WORKING CORRECTLY (No Action):
4. Core logic is sound
   - Database migration is correct
   - Dismiss handler is correct
   - PMF query is correct
   - No regression risks

---

## Summary

### What Works:
✅ Database migration allows NULL values
✅ Dismiss handler stores NULL correctly
✅ PMF calculation excludes NULL values
✅ Submit flow unchanged (no regression)
✅ Defense in depth (both dismissed and null filters)
✅ Backward compatible with old dismissed records

### What's Broken:
❌ TypeScript compilation errors in feedback-client.tsx (lines 317, 636)
❌ Dashboard package fails typecheck
❌ Build fails
❌ Cannot deploy

### Root Cause:
The type change (`DisappointmentLevel | null`) propagated to the `PmfSurvey` interface in feedback-client.tsx, but the UI code was not updated to handle the nullable type. TypeScript correctly rejects indexing into `levelConfigs` with a potentially-null value.

### Fix Required:
Add null handling to feedback-client.tsx lines 317 and 636 using nullish coalescing operator (`??`).

### Time to Fix:
~5 minutes (one-line change on each of 2 lines)

---

## Conclusion

**FAILED - Blocked by TypeScript Errors**

The implementation is **functionally correct** and would work properly at runtime. The core logic for excluding dismissed surveys from PMF calculations is sound, well-structured, and handles edge cases properly.

However, the changes introduced **TypeScript compilation errors** that prevent the dashboard from building. This is a **hard blocker** that must be fixed before merge.

**Next Steps:**
1. Apply nullish coalescing fix to feedback-client.tsx lines 317 and 636
2. Run `pnpm typecheck` to verify fix
3. Update feature documentation (optional but recommended)
4. Re-run QA to verify TypeScript errors resolved
5. Approve for merge

**Confidence Level:** HIGH
- Code inspection was thorough
- Type errors are clear and reproducible
- Fix is straightforward
- No ambiguity in root cause

---

## Appendix: Test Evidence

### Domain Package Build (Success)
```bash
$ cd packages/domain && pnpm typecheck && pnpm build
✓ tsc --noEmit (no errors)
✓ tsup build (success)
✓ All type definitions generated
```

### Dashboard Package Typecheck (Failure)
```bash
$ cd apps/dashboard && pnpm typecheck
...
src/app/(app)/platform/feedback/feedback-client.tsx(317,50):
  error TS2538: Type 'null' cannot be used as an index type.

src/app/(app)/platform/feedback/feedback-client.tsx(636,45):
  error TS2538: Type 'null' cannot be used as an index type.

ELIFECYCLE  Command failed with exit code 1.
```

### Git Diff of feedback-client.tsx
```diff
@@ -61,7 +61,7 @@ interface PmfSurvey {
   user_email: string;
   user_name: string;
   user_role: string;
-  disappointment_level: "very_disappointed" | "somewhat_disappointed" | "not_disappointed";
+  disappointment_level: "very_disappointed" | "somewhat_disappointed" | "not_disappointed" | null;
   follow_up_text: string | null;
   page_url: string | null;
   dismissed: boolean;
```

---

**QA Agent:** QA Review Agent
**Date:** 2025-12-07
**Report Version:** 1.0
