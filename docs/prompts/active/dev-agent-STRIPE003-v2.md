# Dev Agent: STRIPE-003 v2

> **⚠️ CRITICAL: This is a P0 Ship Blocker!**
> **Paused users are currently getting charged because Stripe is never notified!**

You are a Dev Agent. Your job is to implement fix **STRIPE-003: Fix Pause/Resume to Update Stripe**.

## ⚠️ IMPORTANT: Branch Exists But Is Empty

A previous agent created the branch but never implemented the fix. You need to:
1. Check out the existing branch (don't create new)
2. Actually implement the fix
3. Commit and push

## Your Assignment

**Ticket:** STRIPE-003
**Priority:** P0 (Ship Blocker)
**Source:** Stripe Audit - URGENT

**Problem:**
`pauseAccount()` and `resumeAccount()` in `/apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` only update the database. They have explicit TODO comments saying Stripe integration is missing. Result: **Paused users keep getting charged!**

**Current Code Has This TODO:**
```typescript
// In production, you would also:
// 1. Update Stripe subscription (pause or swap to pause price)
```

**Solution:**
Add Stripe API calls to actually pause/resume the subscription.

**Files to Modify:**
- `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`

**Files NOT to Modify:**
- Everything else

**Acceptance Criteria:**
- [ ] Pause calls `stripe.subscriptions.update()` with `pause_collection: { behavior: 'void' }`
- [ ] Resume calls `stripe.subscriptions.update()` with `pause_collection: null`
- [ ] Stripe actually stops/resumes billing
- [ ] Database still updated as before (don't break existing logic)
- [ ] Error handling for Stripe API failures
- [ ] All verification checks pass

## Exact Implementation

### For Pause:
```typescript
// After getting org data, before/after database update:
if (stripe && org.stripe_subscription_id) {
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    pause_collection: { behavior: 'void' }
  });
}
```

### For Resume:
```typescript
// After getting org data, before/after database update:
if (stripe && org.stripe_subscription_id) {
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    pause_collection: null
  });
}
```

## Your SOP (Follow Exactly)

### Phase 0: Git Setup

```bash
# Fetch all branches
git fetch origin

# Check out the EXISTING branch (it exists but is empty)
git checkout fix/STRIPE-003-pause-resume

# Make sure you're up to date with main
git merge main
```

### Phase 0.5: Signal Start (REQUIRED!)

**Immediately after git setup, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent STRIPE-003-v2
- **Ticket:** STRIPE-003
- **Status:** STARTED
- **Branch:** fix/STRIPE-003-pause-resume
- **Files Locking:** `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`
- **Notes:** Beginning Stripe pause/resume implementation
```

**This signals to PM that you're live and which files to lock.**

### Phase 1: Understand (5 min)

1. **Read** `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`
2. **Find** `pauseAccount()` and `resumeAccount()` functions
3. **Check** how Stripe client is initialized (look for imports)
4. **Understand** the database update flow (don't break it)

### Phase 2: Implement

1. Find where Stripe client is available or import it
2. In `pauseAccount()`: Add Stripe API call BEFORE database update
3. In `resumeAccount()`: Add Stripe API call BEFORE database update
4. Add try/catch for Stripe errors
5. Remove or update the TODO comments

### Phase 3: Self-Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

**All must pass before proceeding.**

### Phase 4: Git Commit & Push

```bash
git add .
git commit -m "fix(STRIPE-003): actually pause/resume Stripe subscriptions

- Added stripe.subscriptions.update() call to pauseAccount()
- Added stripe.subscriptions.update() call to resumeAccount()
- Paused accounts now stop billing at Stripe level
- Removed TODO comments about Stripe integration

Closes STRIPE-003"

git push origin fix/STRIPE-003-pause-resume
```

### Phase 5: Completion Report

```markdown
## Fix Complete: STRIPE-003 - Pause/Resume Stripe Integration

### Git
**Branch:** `fix/STRIPE-003-pause-resume`
**Commit:** [commit hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `actions.ts` | Added Stripe API calls to pauseAccount() and resumeAccount() |

### Verification Results
- [ ] `pnpm typecheck`: ✅/❌
- [ ] `pnpm lint`: ✅/❌
- [ ] `pnpm test`: ✅/❌
- [ ] `pnpm build`: ✅/❌

### Human Review Required?
- [ ] None - backend billing logic only

### Status: READY FOR REVIEW
```

### Phase 6: Notify PM (REQUIRED!)

**Append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent STRIPE-003-v2
- **Ticket:** STRIPE-003
- **Status:** COMPLETE
- **Branch:** fix/STRIPE-003-pause-resume
- **Output:** Branch pushed
- **Notes:** Stripe pause/resume now implemented. P0 ship blocker resolved.
```

## Rules

1. **Stay in scope** - Only modify the billing actions file
2. **Don't break existing logic** - Database updates should still work
3. **Handle errors** - Stripe API can fail
4. **All checks must pass**

## If You Have Questions

Add to findings file and notify via completions.md with status BLOCKED.

