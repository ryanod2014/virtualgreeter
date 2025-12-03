# Dev Agent 10: STRIPE-002

You are a Dev Agent. Your job is to implement fix **STRIPE-002: Fix Cancellation to Actually Cancel in Stripe**.

## Your Assignment

**Ticket:** STRIPE-002
**Priority:** P0 (Ship Blocker)
**Source:** Stripe Audit - URGENT

**Problem:**
When users cancel via UI, `submitCancellationFeedback()` only:
- Records cancellation_feedback in database
- Sets plan = "free" in database
- **NEVER calls stripe.subscriptions.cancel()**

Result: Users who cancel CONTINUE BEING CHARGED!

**Solution:**
Add Stripe API call to actually cancel the subscription when user cancels.

**Files to Modify:**
- Find the cancellation action file (likely `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` or similar)
- May need server-side API route if cancellation should happen server-side

**Acceptance Criteria:**
- [ ] Cancellation calls `stripe.subscriptions.cancel(subscriptionId)`
- [ ] Stripe subscription is actually cancelled
- [ ] Database still updated as before
- [ ] User no longer charged after cancellation
- [ ] All verification checks pass

## Implementation Approach

In the cancellation handler, add:
```typescript
// Cancel in Stripe FIRST
await stripe.subscriptions.cancel(org.stripe_subscription_id);

// Then update database
await supabase
  .from('organizations')
  .update({ subscription_status: 'cancelled', plan: 'free' })
  .eq('id', orgId);
```

## Your SOP

### Phase 0: Git Setup
```bash
git checkout main
git pull origin main
git checkout -b fix/STRIPE-002-actual-cancellation
```

### Phase 1: Understand
1. Find `submitCancellationFeedback` function
2. Trace cancellation flow
3. Find where Stripe client is initialized

### Phase 2: Implement
Add Stripe cancellation call before database update.

### Phase 3: Self-Verification
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

### Phase 5: Report completion

