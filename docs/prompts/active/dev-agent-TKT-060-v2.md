# Dev Agent Continuation: TKT-060-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-060
> **Branch:** `de6f037` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Documentation contains incorrect line number references (3 inaccuracies found)

**Failures Found:**
1. **Inaccurate Line Reference (funnel_events)**: Expected line reference 38-48 to point to RLS policy checking platform admin. Actual: Lines 38-48 are CREATE INDEX statements. Actual RLS policy is at lines 54-64 in supabase/migrations/20251201000001_add_funnel_events.sql.

2. **Inaccurate Line Reference (organizations)**: Expected line reference 23-28 to point to organizations RLS policy creation. Actual: Lines 23-28 are DROP POLICY statements. Actual policy creation is at lines 40-44 in supabase/migrations/20251129400000_fix_platform_admin_rls.sql.

3. **Inconsistent Implementation**: Documentation claims both policies use is_platform_admin() function. Actual: funnel_events policy uses direct column check (users.is_platform_admin = true) at line 62 of 20251201000001_add_funnel_events.sql, only organizations policy uses the function at line 44 of 20251129400000_fix_platform_admin_rls.sql.

**What You Must Fix:**
Correct line number references: (1) Change 38-48 to 54-64 for funnel_events policy reference, (2) Change 23-28 to 40-44 for organizations policy reference, (3) Clarify function usage claim or standardize RLS pattern between the two policies.

**Note:** Security mechanisms work correctly - only documentation accuracy is the issue. Not critical but fails 'tested and verified' acceptance criterion.

---

## Your Task

1. Checkout existing branch: `git checkout de6f037`
2. Pull latest: `git pull origin de6f037`
3. Read the QA failure report carefully
4. Fix ALL issues identified by QA:
   - Correct the line number references in the documentation
   - Clarify the inconsistency in RLS implementation approach
5. Verify with grep/code inspection BEFORE claiming completion
6. Push for re-QA

---

## Original Acceptance Criteria

- Issue described in F-368 is resolved
- Change is tested and verified

---

## Files in Scope

- Documentation file(s) related to TKT-060 (likely in docs/features/ or similar)
