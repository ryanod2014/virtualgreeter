# Dev Agent Continuation: TKT-013-v2

> **Type:** Continuation (retry from blocker)
> **Original Ticket:** TKT-013
> **Branch:** `agent/tkt-013` (ALREADY EXISTS)
> **Attempt:** v2

---

## PREVIOUS ATTEMPT FAILED

The QA agent found 2 critical issues:

1. **Build Failure**: 27 new type errors (39 total vs 12 on main)
   - Duplicate state declarations in CobrowseViewer.tsx (hasReceivedFirstSnapshot, setHasReceivedFirstSnapshot, isUpdating, setIsUpdating)
   - Type errors in multiple admin components

2. **Modal Not Appearing**: The retention warning modal doesn't show because no test recordings exist
   - The feature was implemented but couldn't be verified without test data
   - Need to ensure modal appears when there ARE recordings that would be deleted

---

## YOUR TASK

1. **Fix Build Errors**:
   - Remove duplicate state declarations in `src/features/cobrowse/CobrowseViewer.tsx`
   - Fix remaining type errors to get count back to baseline (≤12)
   - Focus on: cobrowse_enabled missing in WidgetSettings, null index types in feedback-client

2. **Ensure Modal Works with Test Data**:
   - Verify the retention modal logic in `recording-settings-client.tsx`
   - Check that `affectedCount` is calculated correctly when recordings exist
   - The modal should ONLY appear when reducing retention AND recordings would be deleted

3. Verify with: `pnpm typecheck && pnpm build`

4. Commit and push to `origin/agent/tkt-013`

---

## Verification

After fixes:
```bash
curl -X PUT http://localhost:3456/api/v2/tickets/TKT-013 \
  -H 'Content-Type: application/json' \
  -d '{"status": "dev_complete"}'
```

---

## Key Files to Focus On

- `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx` - Remove duplicate state
- `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` - Verify modal logic
- `apps/dashboard/src/app/(app)/admin/settings/recordings/RetentionWarningModal.tsx` - Already implemented
- Various admin components with type errors

---

## Expected Outcome

- Type errors back to ≤12 (baseline from main)
- Build completes successfully
- Retention modal appears when:
  - User reduces retention period
  - AND there are recordings that would be affected
- Modal shows exact count of recordings to be deleted
- User must type "DELETE" to confirm