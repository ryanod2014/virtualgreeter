# Dev Agent Continuation: SEC-001-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** SEC-001
> **Branch:** `agent/SEC-001-api-auth` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
TypeScript errors in test files prevent build verification

**Failures Found:**
1. **Build Error**: 4 errors in test files: unused imports 'afterEach', 'CallRequest', 'ActiveCall', 'TIMING'
   - Test files affected: pool-manager.test.ts and socket-handlers.test.ts

**What You Must Fix:**
Fix unused imports in test files: pool-manager.test.ts and socket-handlers.test.ts. Remove or use the imports 'afterEach', 'CallRequest', 'ActiveCall', 'TIMING' to pass typecheck.

**Implementation Status:**
Implementation is CORRECT - all acceptance criteria verified in code review. This is just a cleanup task for test files.

---

## Your Task

1. Checkout existing branch: `git checkout agent/SEC-001-api-auth`
2. Pull latest: `git pull origin agent/SEC-001-api-auth`
3. Read the QA failure report carefully: `docs/agent-output/qa-results/QA-SEC-001-FAILED-20251206T211532.md`
4. Fix ALL unused imports in test files
5. Verify with `pnpm typecheck` BEFORE claiming completion
6. Push for re-QA

---

## Original Acceptance Criteria

- /metrics requires API key in production (401 without, 403 with wrong key)
- Warning logged if METRICS_API_KEY not set in production
- All agent socket operations verify socket.data.agentId is set
- Security model documented in socket-handlers.ts
- No breaking changes to existing functionality
- Typecheck passes
- Lint passes
- Build passes

---

## Files in Scope

Original files:
- apps/server/src/index.ts
- apps/server/src/lib/auth.ts
- apps/server/src/features/signaling/socket-handlers.ts

Plus test files to fix:
- apps/server/src/features/pools/pool-manager.test.ts
- apps/server/src/features/signaling/socket-handlers.test.ts
