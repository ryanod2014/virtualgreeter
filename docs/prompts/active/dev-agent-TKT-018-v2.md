# Dev Agent Continuation: TKT-018-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-018
> **Branch:** `agent/tkt-018-transcription-auto-retry-with` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
TypeScript compilation error in processTranscription.ts:167 - array access could return undefined

**Failures Found:**
1. **Build Failure** - TypeScript type error at processTranscription.ts:167
   - **Expected:** Code compiles without type errors
   - **Actual:** Type error: Argument of type 'number | undefined' is not assignable to parameter of type 'number' at processTranscription.ts:167
   - **Evidence:** `src/features/transcription/processTranscription.ts(167,19): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'. Type 'undefined' is not assignable to type 'number'.`

**What You Must Fix:**
Fix type error by adding fallback or type assertion: `const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 1000;`

**QA Notes:**
All 5 acceptance criteria are correctly implemented in logic. This is a trivial fix - just needs proper TypeScript type handling. Implementation quality is excellent otherwise.

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-018-transcription-auto-retry-with`
2. Pull latest: `git pull origin agent/tkt-018-transcription-auto-retry-with`
3. Fix the TypeScript type error at line 167 in processTranscription.ts
4. Add fallback value for array access: `const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 1000;`
5. Verify with `pnpm typecheck` BEFORE claiming completion
6. Push for re-QA

---

## Original Acceptance Criteria

1. Failed transcription auto-retries up to 3 times
2. Exponential backoff: 1s, 4s, 16s delays
3. Retry button appears for permanently failed transcriptions
4. Retry attempts are logged with error details
5. Non-retriable errors (audio too short) skip retry logic

---

## Files in Scope

- `apps/server/src/features/transcription/processTranscription.ts`
- `apps/dashboard/src/features/call-logs/CallLogRow.tsx`
- `apps/dashboard/src/app/api/transcription/retry/route.ts`
