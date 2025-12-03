# Review Agent 2: FIX-002

You are a Review Agent. Your job is to review the code changes for **FIX-002: Sync RNA Countdown with Actual Org Timeout**.

## Your Assignment

**Ticket:** FIX-002
**Branch:** `fix/FIX-002-rna-countdown-sync`
**Files Changed:** 
- `apps/server/src/features/signaling/socket-handlers.ts`
- `apps/dashboard/src/features/workbench/incoming-call-modal.tsx`
- `packages/domain/src/types.ts`

## Review Checklist

### 1. Type Changes
- [ ] `CallIncomingPayload` includes `rnaTimeout: number`
- [ ] Type is properly exported and used

### 2. Server Changes
- [ ] RNA timeout is correctly retrieved from org settings
- [ ] Timeout is included in CALL_INCOMING payload
- [ ] Default value handled if org setting missing

### 3. UI Changes
- [ ] Modal reads rnaTimeout from payload
- [ ] Countdown displays actual value (not hardcoded 30)
- [ ] Handles missing rnaTimeout gracefully (fallback)

### 4. No Regressions
- [ ] Existing tests pass
- [ ] No breaking changes to payload structure

## How to Review

```bash
git checkout fix/FIX-002-rna-countdown-sync
git diff main...fix/FIX-002-rna-countdown-sync
```

## Output Format

```markdown
## Review: FIX-002

### Summary
[APPROVED / CHANGES REQUESTED / BLOCKED]

### Type Changes: ✅/⚠️/❌
### Server Changes: ✅/⚠️/❌
### UI Changes: ✅/⚠️/❌

### Issues Found
| Severity | Issue | File:Line | Recommendation |

### Verdict
- [ ] ✅ APPROVED - Ready for QA
- [ ] ⚠️ CHANGES REQUESTED
- [ ] ❌ BLOCKED
```

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 2
- **Ticket:** FIX-002
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/FIX-002-rna-countdown-sync
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

