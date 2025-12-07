# Dev Agent Continuation: TKT-011-v2

> **Type:** Continuation (QA FAILED - Build Errors)
> **Original Ticket:** TKT-011
> **Branch:** `agent/tkt-011` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Build Verification Required

**QA Summary:**
Build verification failed - TypeScript errors in widget and server packages. QA could not proceed with functional testing due to pre-existing test file issues that should have been caught during development.

**Failures Found:**

1. **Widget TypeScript Errors (52+ errors)**
   - Property 'style' does not exist on type 'Element'
   - Object is possibly 'undefined' errors
   - Unused variable declarations
   - Type conversion errors in test files

2. **Server Build Errors**
   - Build failed in @ghost-greeter/server package
   - Unused variables in test files
   - Type mismatches in test files
   - Missing properties in mock types

**What You Must Fix:**

Dev agent needs to fix all TypeScript errors before QA can proceed. These are pre-existing test file issues that should have been caught during dev.

Run these commands to identify and fix ALL errors:
```bash
pnpm typecheck
pnpm build
```

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-011`
2. Pull latest: `git pull origin agent/tkt-011`
3. Run `pnpm typecheck` and fix ALL TypeScript errors
4. Run `pnpm build` and ensure it completes successfully
5. Verify with grep/code inspection BEFORE claiming completion
6. Push for re-QA

**CRITICAL:** Do NOT claim completion until BOTH `pnpm typecheck` and `pnpm build` pass with ZERO errors.

---

## Original Acceptance Criteria

From TKT-011: Email Invite Retry Mechanism

1. Failed email triggers automatic retry (up to 3 attempts)
2. Admin sees status of invite (sent/pending/failed) in UI
3. After all retries fail, admin gets clear notification
4. 'Resend Invite' button available for failed invites

---

## Files in Scope

Original files_to_modify:
- apps/dashboard/src/app/(dashboard)/agents/actions.ts
- apps/dashboard/src/lib/email.ts
- apps/dashboard/src/app/(dashboard)/agents/page.tsx

Plus any test files causing TypeScript/build errors.

---

## Dev Checks

- [ ] `pnpm typecheck` passes with ZERO errors
- [ ] `pnpm build` completes successfully
- [ ] All original acceptance criteria still met
- [ ] Push to branch triggers successful build
