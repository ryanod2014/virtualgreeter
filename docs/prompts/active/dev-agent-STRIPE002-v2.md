# Dev Agent: STRIPE-002 - Fix Cancellation to Actually Cancel in Stripe

> **One-liner to launch:**
> `Read and execute docs/prompts/active/dev-agent-STRIPE002-v2.md`

---

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

Result: **Users who cancel CONTINUE BEING CHARGED!**

**Your Branch:** `fix/STRIPE-002-actual-cancellation` (EXISTING - checkout, don't create)

**Files to Modify:**
- `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`

**Acceptance Criteria:**
- [ ] Cancellation calls `stripe.subscriptions.cancel(subscriptionId)` 
- [ ] Stripe call happens BEFORE database update (if Stripe fails, don't mark as cancelled in DB)
- [ ] Error handling for Stripe API failures
- [ ] User-friendly error message if Stripe call fails
- [ ] Database still updated as before (after Stripe succeeds)
- [ ] `pnpm typecheck && pnpm lint && pnpm build` all pass

## Reference: How STRIPE-003 Did It

Look at the `pauseAccount()` and `resumeAccount()` functions in the same file - STRIPE-003 was just implemented and shows the pattern:

```typescript
// Get organization to check for Stripe subscription
const { data: org, error: orgError } = await supabase
  .from("organizations")
  .select("stripe_subscription_id")
  .eq("id", params.organizationId)
  .single();

if (orgError) {
  console.error("Failed to fetch organization:", orgError);
  throw new Error("Failed to fetch organization");
}

// Call Stripe FIRST (if Stripe fails, we don't want DB out of sync)
if (stripe && org.stripe_subscription_id) {
  try {
    await stripe.subscriptions.cancel(org.stripe_subscription_id);
  } catch (stripeError) {
    console.error("Failed to cancel Stripe subscription:", stripeError);
    throw new Error("Failed to cancel subscription. Please try again or contact support.");
  }
}

// Then update database...
```

## Your SOP

### Step 0: Signal Start (REQUIRED FIRST!)

**Before starting work, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent STRIPE-002
- **Ticket:** STRIPE-002
- **Status:** STARTED
- **Branch:** `fix/STRIPE-002-actual-cancellation`
- **Files Locking:** `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`
- **Notes:** Beginning Stripe cancellation implementation
```

### Step 1: Git Setup

```bash
# Checkout EXISTING branch (don't create new!)
git checkout main
git pull origin main
git checkout fix/STRIPE-002-actual-cancellation
git rebase main  # Get latest changes including STRIPE-001 and STRIPE-003
```

### Step 2: Understand Current State

Read the `submitCancellationFeedback()` function in `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`

Note:
- The `stripe` client is imported from `@/lib/stripe`
- The function currently only updates the database
- You need to add Stripe API call BEFORE database updates

### Step 3: Implement

Add to `submitCancellationFeedback()`:

1. Fetch organization with `stripe_subscription_id`
2. Call `stripe.subscriptions.cancel(org.stripe_subscription_id)` 
3. Wrap in try-catch with user-friendly error
4. Only update database AFTER Stripe succeeds

### Step 4: Self-Verification

```bash
# Run in monorepo root
pnpm typecheck --filter=@ghost-greeter/dashboard
pnpm lint --filter=@ghost-greeter/dashboard
pnpm build --filter=@ghost-greeter/dashboard
```

All must pass!

### Step 5: Commit & Push

```bash
git add -A
git commit -m "fix(STRIPE-002): actually cancel Stripe subscription on cancellation"
git push origin fix/STRIPE-002-actual-cancellation
```

### Step 6: Report Completion (REQUIRED!)

**After completing work, append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent STRIPE-002
- **Ticket:** STRIPE-002
- **Status:** COMPLETE
- **Branch:** `fix/STRIPE-002-actual-cancellation`
- **Output:** Branch pushed
- **Notes:** Stripe cancellation now implemented. P0 ship blocker resolved.
```

---

## ⚠️ REQUIRED: Notify PM When Done

**After completing your work, append this to `docs/agent-inbox/completions.md`:**

### [Current Date/Time]
- **Agent:** Dev Agent STRIPE-002
- **Ticket:** STRIPE-002
- **Status:** [STARTED/COMPLETE/BLOCKED]
- **Branch:** fix/STRIPE-002-actual-cancellation
- **Output:** [file path]
- **Notes:** [summary]

**This is mandatory. PM checks this file to update the task board.**

