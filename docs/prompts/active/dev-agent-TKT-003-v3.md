# Dev Agent Continuation: TKT-003-v3

> **Type:** Continuation (QA FAILED - COMPLETE REWORK)
> **Original Ticket:** TKT-003
> **Branch:** `agent/TKT-003-cancel-copy` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - ZERO CHANGES MADE

**QA Summary:**
Dev agent claimed to update modal copy but made ZERO actual changes - all 3 acceptance criteria failed

**Failures Found:**

1. **AC1 FAILED**: Cancel modal does NOT show updated retention language
   - **Expected**: Modal heading "Data Retention Notice" with body "Your data will be retained for 30 days..."
   - **Actual**: Modal STILL shows OLD language "This will permanently delete your data"
   - **Evidence**: File apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx lines 474-475

2. **AC2 FAILED**: Modal STILL mentions 'immediate' and 'permanent' deletion
   - **Actual**: Line 504 contains "Data deletion begins immediately and is irreversible"
   - **Actual**: Line 475 contains "This will permanently delete your data"
   - **Actual**: Line 478 contains "permanently deleted"

3. **AC3 FAILED**: Required copy is completely ABSENT from the file
   - **Expected**: "Your data will be retained for 30 days after cancellation, then may be permanently deleted."
   - **Actual**: This string does NOT exist ANYWHERE in the file
   - **Evidence**: `grep -n 'retained for 30 days'` returns ZERO matches

4. **REGRESSION**: Dev completion report was INACCURATE
   - Report claimed all changes were made
   - Code inspection proves NO changes exist in lines 468-509

**What You Must Fix:**

COMPLETE REWORK REQUIRED. You must ACTUALLY implement the copy changes:

1. **Line 474-475**: Change heading from "This will permanently delete your data" to "Data Retention Notice"
2. **Lines 478-501**: Replace deletion list with retention notice body text
3. **Line 504**: Replace "Data deletion begins immediately and is irreversible" with resubscription message
4. **Color scheme**: Change from red (destructive) to amber (warning)

### CRITICAL: Verify Before Claiming Completion

Run these verification commands and ensure they PASS before creating completion report:

```bash
# This MUST return at least 1 match:
grep -n 'retained for 30 days' apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx

# This MUST return at least 1 match:
grep -n 'Data Retention Notice' apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx

# This MUST return 0 matches (excluding comments):
grep -n 'immediately' apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx | grep -v '//' | wc -l
```

If ANY of these checks fail, your implementation is INCOMPLETE.

---

## Your Task

1. Checkout existing branch: `git checkout agent/TKT-003-cancel-copy`
2. Pull latest: `git pull origin agent/TKT-003-cancel-copy`
3. Read the file: `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx`
4. Find the confirmation screen (Step 3, around lines 468-509)
5. **ACTUALLY MAKE THE CHANGES** listed above
6. Run ALL verification commands above - they MUST pass
7. Run `pnpm typecheck` - must pass
8. Only THEN create completion report
9. Push for re-QA

---

## Original Acceptance Criteria

**AC1**: Cancel modal shows updated retention language (heading: "Data Retention Notice", body: 30-day retention message)
**AC2**: No mention of 'immediate' or 'permanent' deletion without 30-day retention context
**AC3**: Modal text matches exact copy: "Your data will be retained for 30 days after cancellation, then may be permanently deleted."

---

## Files in Scope

- apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx

---

## Success Criteria (Run These Commands)

```bash
# Test 1: retention language present
grep 'retained for 30 days' apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx
# Expected: at least 1 match

# Test 2: new heading present
grep 'Data Retention Notice' apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx
# Expected: at least 1 match

# Test 3: no immediate deletion language
grep 'immediately' apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx | grep -v '//'
# Expected: 0 matches
```

ALL THREE TESTS MUST PASS.
