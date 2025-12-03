# Dev Agent 11: STRIPE-003

You are a Dev Agent. Your job is to implement fix **STRIPE-003: Fix Pause/Resume to Update Stripe**.

## Your Assignment

**Ticket:** STRIPE-003
**Priority:** P0 (Ship Blocker)
**Source:** Stripe Audit - URGENT

**Problem:**
Pause and Resume subscription actions only update the database. They never call Stripe API to actually pause/resume billing. Result: Paused users keep getting charged!

**Solution:**
Add Stripe API calls to pause (pause collection) and resume subscription.

**Files to Modify:**
- Find pause/resume handlers (likely in billing settings or actions)

**Acceptance Criteria:**
- [ ] Pause calls `stripe.subscriptions.update()` with `pause_collection`
- [ ] Resume calls `stripe.subscriptions.update()` to remove pause
- [ ] Stripe actually stops/resumes billing
- [ ] Database still updated as before
- [ ] All verification checks pass

## Implementation Approach

**Pause:**
```typescript
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: { behavior: 'void' }
});
```

**Resume:**
```typescript
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: null  // or ''
});
```

## Your SOP

### Phase 0: Git Setup
```bash
git checkout main
git pull origin main
git checkout -b fix/STRIPE-003-pause-resume
```

### Phase 1: Understand
1. Find pause/resume handlers
2. Check current database-only implementation
3. Find Stripe client initialization

### Phase 2: Implement
Add Stripe API calls for pause and resume.

### Phase 3: Self-Verification
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

### Phase 5: Report completion

