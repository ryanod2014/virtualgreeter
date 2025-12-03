# Review Agent: FIX-002

You are a Code Review Agent. Your job is to review the code changes for **FIX-002: Sync RNA Countdown with Actual Org Timeout**.

## Your Assignment

**Ticket:** FIX-002
**Branch:** `fix/FIX-002-rna-countdown-sync`

**Files Changed:**
- `apps/server/src/features/signaling/socket-handlers.ts`
- `apps/dashboard/src/features/workbench/incoming-call-modal.tsx`
- `packages/domain/src/types.ts`

**What Was Changed:**
The incoming call modal showed a hardcoded 30s countdown, but RNA timeout is configurable per-org (defaults to 15s). The fix:
1. Added `rnaTimeout` to `CallIncomingPayload` type
2. Server now sends org's actual RNA timeout in the payload
3. Modal reads the timeout from payload and displays accurate countdown

## Review Checklist

### 1. Type Changes (`packages/domain/src/types.ts`)
- [ ] `rnaTimeout: number` added to `CallIncomingPayload`
- [ ] Type is correct (number, not string)
- [ ] Optional vs required - is it correct?

### 2. Server Changes (`socket-handlers.ts`)
- [ ] `rnaTimeout` included when emitting `CALL_INCOMING`
- [ ] Value comes from org settings (not hardcoded)
- [ ] Fallback to default if org setting is missing
- [ ] No breaking changes to existing payload fields

### 3. Dashboard Changes (`incoming-call-modal.tsx`)
- [ ] Reads `rnaTimeout` from incoming call payload
- [ ] Uses actual value instead of hardcoded 30
- [ ] Handles case where `rnaTimeout` might be undefined
- [ ] Countdown display updates correctly

### 4. Code Quality
- [ ] No hardcoded values (use constants where appropriate)
- [ ] Follows existing patterns in the codebase
- [ ] Clear variable names
- [ ] No dead code or debug statements

### 5. Consistency
- [ ] TypeScript types used correctly
- [ ] Matches existing naming conventions
- [ ] Socket event payload structure consistent

### 6. Security
- [ ] No sensitive data exposure
- [ ] User input not involved (server-side config only)

## Your SOP

### Step 0: Signal Start (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent FIX-002
- **Ticket:** FIX-002
- **Status:** STARTED
- **Branch:** fix/FIX-002-rna-countdown-sync
- **Files Locking:** N/A (review only)
- **Notes:** Beginning code review
```

### Step 1: Get the Code

```bash
git fetch origin
git checkout fix/FIX-002-rna-countdown-sync
git diff main..fix/FIX-002-rna-countdown-sync
```

### Step 2: Review Each File

Read each changed file and check against the checklist above.

### Step 3: Generate Review Report

```markdown
# Code Review: FIX-002 - RNA Countdown Sync

## Summary
[One sentence: Approve / Request Changes]

## Checklist Results

| Category | Status | Notes |
|----------|--------|-------|
| Type Changes | ✅/❌ | |
| Server Changes | ✅/❌ | |
| Dashboard Changes | ✅/❌ | |
| Code Quality | ✅/❌ | |
| Consistency | ✅/❌ | |
| Security | ✅/❌ | |

## Files Reviewed

### `packages/domain/src/types.ts`
**Status:** ✅/❌
**Changes:**
- [describe changes]
**Issues:** [if any]

### `apps/server/src/features/signaling/socket-handlers.ts`
**Status:** ✅/❌
**Changes:**
- [describe changes]
**Issues:** [if any]

### `apps/dashboard/src/features/workbench/incoming-call-modal.tsx`
**Status:** ✅/❌
**Changes:**
- [describe changes]
**Issues:** [if any]

## Issues Found

### Issue 1: [Title] (if any)
**Severity:** 🔴 Must Fix / 🟡 Should Fix / 🟢 Suggestion
**File:** `path:line`
**Problem:** 
**Suggestion:**

## Positive Notes
- [Good things about the code]

## Verdict

- [ ] ✅ **APPROVE** - Ready for QA
- [ ] 🔄 **REQUEST CHANGES** - Fix issues first
- [ ] 💬 **NEEDS DISCUSSION** - Unclear on: [what]
```

### Step 4: Notify PM (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent FIX-002
- **Ticket:** FIX-002
- **Status:** APPROVED / CHANGES_REQUESTED
- **Branch:** fix/FIX-002-rna-countdown-sync
- **Output:** Review report above
- **Notes:** [Summary]
```

## Rules

1. **Check actual diff** - Don't assume, verify
2. **Focus on the 3 files** - Stay in scope
3. **Be constructive** - Suggest fixes for issues
4. **Always notify PM** via completions.md

