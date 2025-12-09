# Dev Agent Continuation: TKT-015-v2

> **Type:** Continuation (QA FAILED - Build Error)
> **Original Ticket:** TKT-015
> **Branch:** `agent/tkt-015` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - TypeScript Import Path Error

**QA Summary:**
Build failure due to missing `.js` extension in TypeScript import paths. TypeScript with ESM module resolution requires explicit file extensions for relative imports.

**Failures Found:**

1. **getRecordingUrl.ts Import Error**
   - Error: `TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'`
   - Location: `src/features/recordings/getRecordingUrl.ts(1,26)`
   - Current: `from "../../lib/supabase"`
   - Required: `from "../../lib/supabase.js"`

2. **uploadRecording.ts Import Error**
   - Error: `TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'`
   - Location: `src/features/recordings/uploadRecording.ts(2,26)`
   - Current: `from "../../lib/supabase"`
   - Required: `from "../../lib/supabase.js"`

**What You Must Fix:**

Fix TypeScript import paths in getRecordingUrl.ts and uploadRecording.ts by adding .js extensions to relative imports.

Change:
```typescript
from "../../lib/supabase"
```

To:
```typescript
from "../../lib/supabase.js"
```

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-015`
2. Pull latest: `git pull origin agent/tkt-015`
3. Fix import in `src/features/recordings/getRecordingUrl.ts` - add `.js` extension
4. Fix import in `src/features/recordings/uploadRecording.ts` - add `.js` extension
5. Run `pnpm typecheck` to verify NO errors
6. Run `pnpm build` to ensure successful build
7. Push for re-QA

**CRITICAL:** This is a simple fix - just add `.js` to the two import statements.

---

## Original Acceptance Criteria

From TKT-015: Secure Recording URLs with Signed Access

1. New recordings go to private bucket
2. Recording URLs are signed with 1-hour expiration
3. URLs contain randomized UUIDs (not predictable org/call pattern)
4. Playback works with signed URLs
5. URL refreshes automatically if user watches longer than 1 hour

---

## Files in Scope

Original files_to_modify:
- apps/server/src/features/recordings/uploadRecording.ts ← Fix import here
- apps/server/src/features/recordings/getRecordingUrl.ts ← Fix import here
- apps/dashboard/src/features/recordings/RecordingPlayer.tsx

---

## Dev Checks

- [ ] Import in getRecordingUrl.ts fixed (add .js extension)
- [ ] Import in uploadRecording.ts fixed (add .js extension)
- [ ] `pnpm typecheck` passes with ZERO errors
- [ ] `pnpm build` completes successfully
- [ ] All original acceptance criteria still met
- [ ] Push to branch

---

## Quick Reference

**Files to fix:**
1. `apps/server/src/features/recordings/getRecordingUrl.ts` line 1
2. `apps/server/src/features/recordings/uploadRecording.ts` line 2

Change `from "../../lib/supabase"` to `from "../../lib/supabase.js"` in both files.
