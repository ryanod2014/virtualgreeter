# Dev Agent Continuation: TKT-004B-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-004B
> **Branch:** `agent/tkt-004b` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Stripe billing integration missing - subscriptions not resumed in Stripe

**Failures Found:**

1. **AC: Stripe billing restarts on auto-resume - FAILED**
   - **Location**: apps/server/src/features/scheduler/resumePausedOrgs.ts:75-78
   - **Issue**: Code contains only a TODO comment for Stripe integration
   - **Missing**: No actual Stripe API call to resume subscriptions

2. **Build Issues** (Pre-existing, unrelated to TKT-004B):
   - TypeScript errors in test files across @ghost-greeter/widget and @ghost-greeter/server packages
   - These are blocking the build but are NOT caused by your work

**What You Must Fix:**

### Primary Fix: Add Stripe Integration

Add Stripe API integration to resume subscriptions when organizations are auto-resumed.

1. Import Stripe helper functions from `apps/dashboard/src/lib/stripe.ts`
2. Replace the TODO comment at lines 75-78 with actual Stripe API call
3. Use `stripe.subscriptions.resume()` or `stripe.subscriptions.update()` to restart billing
4. Handle errors gracefully - log failures but don't crash the scheduler
5. Ensure the Stripe call happens BEFORE updating org status in database

### Secondary Consideration: Build Issues

The build failures are pre-existing test file issues unrelated to your ticket. You may:
- **Option 1**: Ignore them (out of scope for TKT-004B)
- **Option 2**: Fix them as a bonus (exclude test files from build, or fix the TypeScript errors)

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-004b`
2. Pull latest: `git pull origin agent/tkt-004b`
3. Read the QA failure report: `docs/agent-output/qa-results/` (look for TKT-004B)
4. Open `apps/server/src/features/scheduler/resumePausedOrgs.ts`
5. Find the TODO comment around lines 75-78
6. Implement Stripe subscription resume logic
7. Test locally if possible (or document testing approach)
8. Verify with grep that Stripe API call exists
9. Push for re-QA

---

## Verification Commands

Run these to verify your fix:

```bash
# Should find stripe.subscriptions call in your file:
grep -n 'stripe.subscriptions' apps/server/src/features/scheduler/resumePausedOrgs.ts

# Should NOT find TODO anymore:
grep -n 'TODO.*Stripe' apps/server/src/features/scheduler/resumePausedOrgs.ts
```

---

## Original Acceptance Criteria

- Scheduler runs every hour (configurable) ✅
- Orgs with expired pause_ends_at are automatically resumed ✅
- **Stripe billing restarts on auto-resume** ❌ FAILED
- Logs capture all auto-resume events for debugging ✅

---

## Files in Scope

Primary:
- apps/server/src/features/scheduler/resumePausedOrgs.ts

Reference (for Stripe patterns):
- apps/dashboard/src/lib/stripe.ts

Out of scope:
- Test files with build errors (separate issue)
