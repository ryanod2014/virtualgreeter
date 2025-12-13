# Dev Agent Continuation: TKT-093-v2

> **Type:** Continuation (infrastructure blocker - pre-existing build errors)
> **Original Ticket:** TKT-093
> **Branch:** `agent/tkt-093` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2

---

## PREVIOUS ATTEMPT STATUS

**TKT-093 code changes are CORRECT** - QA verified via code inspection:
- ✅ `formatDateWithTimezone` function added to both billing files
- ✅ Timezone abbreviation displayed with dates
- ✅ Help text added: "All times shown in your local timezone"

**BUT QA could not run browser tests because of pre-existing build errors.**

---

## YOUR TASK: Fix Pre-existing Build Errors

The branch has duplicate variable declarations in a file **NOT modified by TKT-093**:

**File:** `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx`

**Problem:** Variables declared twice (merge conflict artifact from TKT-052):

Lines 32-33 (KEEP THESE):
```typescript
const [hasReceivedFirstSnapshot, setHasReceivedFirstSnapshot] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);
```

Lines 39-45 (DELETE THESE - DUPLICATES):
```typescript
const [hasReceivedFirstSnapshot, setHasReceivedFirstSnapshot] = useState(false);
const [isUpdating, setIsUpdating] = useState(false);
```

**Fix:**
1. Delete lines 39-45 (the duplicate declarations and their comments)
2. Keep lines 32-33 (the original declarations)
3. Run `pnpm typecheck` and `pnpm build` to verify fix

---

## Verification Steps

1. Checkout the branch: `git checkout agent/tkt-093`
2. Fix CobrowseViewer.tsx (remove duplicate useState on lines 39-45)
3. Verify build passes: `pnpm install && pnpm typecheck && pnpm build`
4. Commit: `git commit -am "fix: Remove duplicate useState in CobrowseViewer.tsx"`
5. Push: `git push origin agent/tkt-093`

---

## After Build Passes

Signal completion so QA can retry:
```bash
curl -X PUT http://localhost:3456/api/v2/tickets/TKT-093 \
  -H 'Content-Type: application/json' \
  -d '{"status": "dev_complete"}'
```

---

## DO NOT MODIFY

- TKT-093 billing files (already correct)
- Any other files except CobrowseViewer.tsx

