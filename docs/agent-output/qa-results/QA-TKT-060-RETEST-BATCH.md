# QA Report: TKT-060 - FAILED ❌

**Ticket:** TKT-060 - Platform Admin Route Protection Only "Assumed"
**Branch:** de6f037 (detached HEAD)
**Tested At:** 2025-12-07T02:03:12Z
**QA Agent:** qa-review-TKT-060

---

## Summary

**BLOCKED** - Documentation contains incorrect line number references and misleading claims about implementation details. While the security mechanisms themselves exist and function correctly, the documentation accuracy does not meet the "tested and verified" acceptance criterion.

---

## Test Protocol

This is a **documentation verification ticket**, not a code implementation ticket. Testing focused on:
1. Verifying all file path references are correct
2. Verifying all line number references are accurate
3. Verifying all claims about code behavior are true
4. Confirming security mechanisms actually exist as documented

**Testing approach:** Code inspection of all referenced files and line numbers.

**Why no browser testing:** This ticket only changes documentation, not code. Browser testing would verify the security mechanisms work (which they do), but would not catch documentation inaccuracies (which exist).

---

## Build Verification

Not applicable - this ticket only modifies documentation file:
- `docs/features/superadmin/funnel-analytics.md`

No code changes, therefore no build/test/typecheck needed.

---

## Acceptance Criteria Results

| # | Criterion | Status | Details |
|---|-----------|--------|---------|
| 1 | Issue described in F-368 is resolved | ⚠️ PARTIAL | Security mechanisms exist, but documentation is inaccurate |
| 2 | Change is tested and verified | ❌ FAILED | Documentation contains incorrect line numbers and misleading claims |

---

## Failures

### Failure 1: Incorrect Line Numbers for funnel_events.sql

**Category:** accuracy
**Criterion:** AC2 - Change is tested and verified

**Documentation Claims:**
> RLS policies on `funnel_events` and `organizations` tables use `is_platform_admin()` function (see `supabase/migrations/20251201000001_add_funnel_events.sql:38-48`

**Expected:**
Line reference should point to the RLS policy that checks platform admin access.

**Actual:**
Lines 38-48 in `supabase/migrations/20251201000001_add_funnel_events.sql` contain:
```sql
-- Indexes for efficient querying
CREATE INDEX idx_funnel_events_step ON funnel_events(step);
CREATE INDEX idx_funnel_events_created_at ON funnel_events(created_at);
CREATE INDEX idx_funnel_events_visitor_id ON funnel_events(visitor_id);
CREATE INDEX idx_funnel_events_organization_id ON funnel_events(organization_id);
CREATE INDEX idx_funnel_events_is_conversion ON funnel_events(is_conversion);

-- Allow inserts from anonymous users (public signup funnel)
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
```

The actual RLS policy is at **lines 54-64**, not 38-48.

**Evidence:**
File: `supabase/migrations/20251201000001_add_funnel_events.sql:54-64`

---

### Failure 2: Incorrect Line Numbers for fix_platform_admin_rls.sql

**Category:** accuracy
**Criterion:** AC2 - Change is tested and verified

**Documentation Claims:**
> `20251129400000_fix_platform_admin_rls.sql:23-28`

**Expected:**
Line reference should point to RLS policy creation for organizations table.

**Actual:**
Lines 23-28 in `supabase/migrations/20251129400000_fix_platform_admin_rls.sql` contain:
```sql
-- ============================================================================
-- DROP OLD POLICIES AND RECREATE WITH FUNCTION
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Platform admins can view all organizations" ON organizations;
```

The actual organizations policy creation is at **lines 40-44**, not 23-28.

**Evidence:**
File: `supabase/migrations/20251129400000_fix_platform_admin_rls.sql:40-44`

---

### Failure 3: Misleading Claim About is_platform_admin() Function Usage

**Category:** accuracy
**Criterion:** AC2 - Change is tested and verified

**Documentation Claims:**
> RLS policies on `funnel_events` and `organizations` tables use `is_platform_admin()` function

**Expected:**
Both policies should use the `is_platform_admin()` function for consistency.

**Actual:**
- **funnel_events policy:** Uses direct column check `users.is_platform_admin = true` (line 62)
- **organizations policy:** Uses function `public.is_platform_admin()` (line 44)

The claim that both use the function is **false**. The funnel_events policy uses a direct column check, which is technically correct but inconsistent and makes the documentation claim misleading.

**Evidence:**
- `supabase/migrations/20251201000001_add_funnel_events.sql:58-64`
- `supabase/migrations/20251129400000_fix_platform_admin_rls.sql:40-44`

---

## What Actually Works Correctly

Despite the documentation inaccuracies, I verified that:

✅ **Route-level protection EXISTS and is CORRECT:**
- File: `apps/dashboard/src/app/(app)/platform/layout.tsx:17-20`
- Checks `auth.isPlatformAdmin` and redirects non-admins to `/dashboard`
- Documentation reference is ACCURATE for this layer

✅ **Database-level RLS policies EXIST:**
- `is_platform_admin()` function exists at `20251129400000_fix_platform_admin_rls.sql:12-18`
- Organizations RLS policy exists and uses the function (lines 40-44, NOT 23-28)
- Funnel events RLS policy exists (lines 54-64, NOT 38-48)

✅ **Data-level flag EXISTS:**
- `users.is_platform_admin` column added in `20251129300000_pmf_surveys.sql:9`
- Documentation claim is correct for this layer

**The security mechanisms work correctly.** The problem is **documentation accuracy**.

---

## Impact Assessment

**Severity:** Medium

**Why this matters:**
- Documentation is meant to be a trustworthy reference
- Incorrect line numbers waste developer time during debugging or audits
- Misleading claims erode confidence in documentation accuracy
- Future developers may update code and not realize documentation is already wrong

**Why not critical:**
- The security mechanisms themselves are correctly implemented
- The general description of multi-layer protection is accurate
- Only the specific line number references are wrong

---

## Recommendation for Dispatch

**Action Required:** Fix documentation line number references

**Specific corrections needed:**

1. Change `supabase/migrations/20251201000001_add_funnel_events.sql:38-48` to **54-64**

2. Change `20251129400000_fix_platform_admin_rls.sql:23-28` to **40-44**

3. Clarify the function usage claim:
   - Option A: Update funnel_events policy to use `is_platform_admin()` function for consistency
   - Option B: Revise documentation to note that funnel_events uses direct check while organizations uses function

**Suggested continuation ticket focus:**
1. Correct line number references in funnel-analytics.md
2. Verify accuracy with actual file contents
3. Consider standardizing RLS policy patterns (use function consistently)

---

## Testing Evidence

### Layer 1: Route Protection ✅
```typescript
// apps/dashboard/src/app/(app)/platform/layout.tsx:17-20
// Redirect if not a platform admin
if (!auth.isPlatformAdmin) {
  redirect("/dashboard");
}
```
**Status:** VERIFIED CORRECT

### Layer 2a: Funnel Events RLS ❌
**Documentation claims:** Lines 38-48 with is_platform_admin() function
**Actual:** Lines 54-64 with direct column check
```sql
-- Only platform admins can read funnel events
CREATE POLICY "Platform admins can read funnel events" ON funnel_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_platform_admin = true
    )
  );
```
**Status:** WORKS CORRECTLY, but documentation reference is WRONG

### Layer 2b: Organizations RLS ❌
**Documentation claims:** Lines 23-28
**Actual:** Lines 40-44
```sql
-- Platform admins can view all organizations
CREATE POLICY "Platform admins can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (public.is_platform_admin());
```
**Status:** WORKS CORRECTLY, but documentation reference is WRONG

### Layer 3: Data Flag ✅
```sql
-- supabase/migrations/20251129300000_pmf_surveys.sql:9
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;
```
**Status:** VERIFIED CORRECT

---

## DO NOT MERGE

This branch should NOT be merged until documentation line numbers are corrected.

The security mechanisms work, but documentation accuracy is part of the acceptance criteria ("tested and verified"). Inaccurate documentation fails this criterion.

---

## QA Methodology Notes

**Why I tested this way:**
- This is a documentation ticket, not code implementation
- The test is whether documentation accurately describes existing code
- Code inspection is the appropriate method (not browser testing)
- Each claim in the documentation was verified against actual file contents

**Coverage:**
- ✅ All file paths verified
- ✅ All line numbers checked
- ✅ All security mechanism claims validated
- ✅ Consistency between migrations verified

**Confidence Level:** HIGH
- Direct file inspection leaves no ambiguity
- Line numbers are objectively correct or incorrect
- No interpretation needed
