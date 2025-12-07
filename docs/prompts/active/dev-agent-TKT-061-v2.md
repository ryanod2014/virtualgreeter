# Dev Agent Continuation: TKT-061-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-061
> **Branch:** `agent/tkt-061` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
TypeScript typecheck failed with 41 errors in widget test files

**Failures Found:**
1. **Build Failure**: Command `pnpm typecheck` failed with exit code 1. Multiple TypeScript errors across widget test files:
   - apps/widget/src/features/cobrowse/useCobrowse.test.ts (11 errors)
   - apps/widget/src/features/webrtc/useSignaling.test.ts (5 errors)
   - apps/widget/src/features/simulation/VideoSequencer.test.tsx (3 errors)
   - apps/widget/src/features/webrtc/LiveCallView.test.tsx (2 errors)
   - apps/widget/src/features/webrtc/useWebRTC.test.ts (9 errors)
   - apps/widget/src/main.test.ts (6 errors)
   - apps/widget/src/Widget.test.tsx (5 errors)

**Error Types Include:**
- Timer mock type mismatches
- Possibly undefined objects
- Type conversion errors

**What You Must Fix:**
Fix all TypeScript errors in the widget test files listed above. Ensure `pnpm typecheck` passes before pushing for re-QA.

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-061`
2. Pull latest: `git pull origin agent/tkt-061`
3. Read the QA failure report carefully
4. Run `pnpm typecheck` to see the specific errors
5. Fix ALL TypeScript errors in the widget test files
6. Run `pnpm typecheck` again to verify all errors are resolved
7. Verify with grep/code inspection BEFORE claiming completion
8. Push for re-QA

---

## Original Acceptance Criteria

- Issue described in F-647 is resolved
- Change is tested and verified

---

## Files in Scope

- apps/widget/src/features/cobrowse/useCobrowse.test.ts
- apps/widget/src/features/webrtc/useSignaling.test.ts
- apps/widget/src/features/simulation/VideoSequencer.test.tsx
- apps/widget/src/features/webrtc/LiveCallView.test.tsx
- apps/widget/src/features/webrtc/useWebRTC.test.ts
- apps/widget/src/main.test.ts
- apps/widget/src/Widget.test.tsx
- Plus the original incident response runbook file from TKT-061
