# Dev Agent 2: FIX-002

You are a Dev Agent. Your job is to implement fix **FIX-002: Sync RNA Countdown with Actual Org Timeout**.

## Your Assignment

**Ticket:** FIX-002
**Priority:** P2 (Medium)
**Source:** Q3 Decision - UI countdown should match actual timeout

**Problem:**
The incoming call modal displays "Request expires in 30s" with a hardcoded countdown, but the actual RNA (Ring-No-Answer) timeout:
- Defaults to 15 seconds
- Is configurable per-org via `recording_settings.rna_timeout_seconds`

This means agents see "Request expires in 25s" on screen, but RNA actually fires at 15s (or earlier), confusing agents.

**Solution:**
1. Include `rnaTimeout` in the `CallIncomingPayload` when server emits the incoming call event
2. Update the incoming call modal to read this value from the payload
3. Display the actual timeout value in the countdown

**Files to Modify:**
- `apps/server/src/features/signaling/socket-handlers.ts` - Add rnaTimeout to CallIncomingPayload
- `apps/dashboard/src/features/workbench/incoming-call-modal.tsx` - Read rnaTimeout from payload, use in countdown
- `packages/domain/src/types.ts` - Update CallIncomingPayload type

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] `CallIncomingPayload` type includes `rnaTimeout: number`
- [ ] Server sends org's actual RNA timeout in the payload
- [ ] Modal reads the timeout from payload and displays it
- [ ] If org has 20s timeout, modal shows "20s" countdown
- [ ] All verification checks pass (typecheck, lint, test, build)

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup (REQUIRED FIRST!)

**Before writing ANY code:**

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create your feature branch
git checkout -b fix/FIX-002-rna-countdown-sync
```

### Phase 1: Understand (5 min)

1. **Read** `packages/domain/src/types.ts` - Find `CallIncomingPayload`
2. **Read** `apps/server/src/features/signaling/socket-handlers.ts` - Find where CALL_INCOMING is emitted
3. **Read** `apps/dashboard/src/features/workbench/incoming-call-modal.tsx` - Find the hardcoded 30s (line ~131)
4. **Trace** how RNA timeout is retrieved from org settings

### Phase 2: Implement

**Step 1: Update the type** (`packages/domain/src/types.ts`)
```typescript
// Add rnaTimeout to CallIncomingPayload
export interface CallIncomingPayload {
  // ... existing fields
  rnaTimeout: number; // Add this
}
```

**Step 2: Update the server** (`socket-handlers.ts`)
- Find where `CALL_INCOMING` event is emitted
- Include the org's RNA timeout in the payload
- The timeout should come from org settings (check how other handlers get it)

**Step 3: Update the modal** (`incoming-call-modal.tsx`)
- Read `rnaTimeout` from the incoming call payload
- Replace hardcoded `30` with the actual value
- Update the countdown display

### Phase 3: Self-Verification (Required!)

Run ALL of these and they must ALL pass:

```bash
pnpm typecheck    # TypeScript compilation
pnpm lint         # ESLint checks
pnpm test         # Unit tests
pnpm build        # Full build
```

If ANY fail, fix them before proceeding.

### Phase 4: Git Commit

**After all checks pass:**

```bash
git add .
git commit -m "fix(FIX-002): sync RNA countdown with actual org timeout

- Added rnaTimeout to CallIncomingPayload type
- Server now sends org's configured RNA timeout in payload
- Modal reads and displays actual timeout value
- Agents now see accurate countdown

Closes FIX-002"

git push origin fix/FIX-002-rna-countdown-sync
```

### Phase 5: Completion Report

When done, report:

```markdown
## Fix Complete: FIX-002 - Sync RNA Countdown

### Git
**Branch:** `fix/FIX-002-rna-countdown-sync`
**Commit:** [commit hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `packages/domain/src/types.ts` | Added rnaTimeout to CallIncomingPayload |
| `apps/server/src/features/signaling/socket-handlers.ts` | Include rnaTimeout in CALL_INCOMING emit |
| `apps/dashboard/src/features/workbench/incoming-call-modal.tsx` | Read and display actual timeout |

### Verification Results
- [ ] `pnpm typecheck`: ✅ PASSED / ❌ FAILED
- [ ] `pnpm lint`: ✅ PASSED / ❌ FAILED
- [ ] `pnpm test`: ✅ PASSED / ❌ FAILED
- [ ] `pnpm build`: ✅ PASSED / ❌ FAILED

### Human Review Required?
- [ ] None - countdown text change only, no visual redesign

### Acceptance Criteria Check
- [ ] Type updated - ✅ Met / ❌ Not Met
- [ ] Server sends timeout - ✅ Met / ❌ Not Met
- [ ] Modal displays actual value - ✅ Met / ❌ Not Met
- [ ] All checks pass - ✅ Met / ❌ Not Met

### Questions/Concerns
[Any edge cases found, assumptions made, or concerns]

### Status: READY FOR REVIEW
```

## Rules

1. **Stay in scope** - Only modify the 3 listed files
2. **Match existing style** - Don't introduce new patterns
3. **All checks must pass** - No exceptions
4. **Be honest** - If something doesn't work, say so

## If You Have Questions

Add to `docs/findings/session-2024-12-02.md` under Questions section.
Then note that you're blocked and what you need.

