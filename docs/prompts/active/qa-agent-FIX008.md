# QA Agent: FIX-008

You are a QA Agent. Your job is to verify that **FIX-008: Sync localStorage Reconnect Token Expiry to 30s** works correctly.

## Your Assignment

**Ticket:** FIX-008
**Branch:** `fix/FIX-008-reconnect-expiry-sync`
**Files Changed:**
- `apps/widget/src/features/signaling/useSignaling.ts`

**What Was Fixed:**
The widget's localStorage token expiry was 5 minutes, but the server's `CALL_RECONNECT_TIMEOUT` is only 30 seconds. This caused confusion when visitors tried to reconnect after 30s - their client "thought" reconnection was possible but the server had already timed out.

**The Fix:**
Changed `CALL_EXPIRY_MS` from `5 * 60 * 1000` (5 minutes) to `30 * 1000` (30 seconds) to match the server timeout.

**Acceptance Criteria:**
- [ ] `CALL_EXPIRY_MS` is now 30 seconds (30000ms)
- [ ] localStorage token expires after 30 seconds
- [ ] Reconnection works within 30 seconds
- [ ] Reconnection fails gracefully after 30 seconds

## Test Scenarios

### Scenario 1: Verify Constant Value
**Type:** Code inspection
**Steps:**
1. Read `apps/widget/src/features/signaling/useSignaling.ts`
2. Find `CALL_EXPIRY_MS` constant
3. Verify value is `30 * 1000` (30000)
**Expected:** Constant equals 30000ms with comment about matching server timeout

### Scenario 2: Verify Server Constant Match
**Type:** Code inspection  
**Steps:**
1. Read `packages/domain/src/constants.ts`
2. Find `CALL_RECONNECT_TIMEOUT`
3. Verify widget constant matches server constant
**Expected:** Both are 30 seconds

### Scenario 3: Build Verification
**Type:** Build test
**Steps:**
1. Run `pnpm typecheck`
2. Run `pnpm lint`
3. Run `pnpm build`
**Expected:** All pass without errors

## Your SOP

### Phase 0: Signal Start (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent FIX-008
- **Ticket:** FIX-008
- **Status:** STARTED
- **Branch:** fix/FIX-008-reconnect-expiry-sync
- **Files Locking:** N/A (testing only)
- **Notes:** Beginning QA testing
```

### Phase 1: Environment Check

```bash
cd /path/to/project
git fetch origin
git checkout fix/FIX-008-reconnect-expiry-sync
```

### Phase 2: Code Verification

1. Read the changed file and verify the constant value
2. Cross-reference with server constant
3. Run build verification commands

### Phase 3: Generate Report

```markdown
# QA Report: FIX-008 - Reconnect Token Expiry Sync

## Summary

| Category | Result |
|----------|--------|
| Code Inspection | X/2 Passed |
| Build Verification | ✅/❌ |
| Human Review | Not Required (no UI changes) |

## Test Results

### Scenario 1: Constant Value
**Status:** ✅ PASSED / ❌ FAILED
**Value Found:** [actual value]
**Notes:**

### Scenario 2: Server Match
**Status:** ✅ PASSED / ❌ FAILED
**Widget Value:** [value]
**Server Value:** [value]
**Notes:**

### Scenario 3: Build
**Status:** ✅ PASSED / ❌ FAILED
- typecheck: ✅/❌
- lint: ✅/❌
- build: ✅/❌

## Human QA Required?
No - this is a backend timing constant change with no UI impact.

## Recommendation
- [ ] ✅ **APPROVE** - Ready to merge
- [ ] ❌ **REJECT** - Issues found: [details]
```

### Phase 4: Notify PM (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent FIX-008
- **Ticket:** FIX-008
- **Status:** APPROVED / REJECTED
- **Branch:** fix/FIX-008-reconnect-expiry-sync
- **Output:** QA report above
- **Notes:** [Summary]
```

## Rules

1. **Verify the actual values** - Don't assume
2. **Run build checks** - Ensure nothing broke
3. **No UI = No human review needed**
4. **Always notify PM** via completions.md

