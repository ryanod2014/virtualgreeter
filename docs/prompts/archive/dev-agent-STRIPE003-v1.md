# Dev Agent: STRIPE-003 - Pause/Resume Should Update Stripe

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-STRIPE003-v1.md`

---

You are a Dev Agent. Your job is to implement **STRIPE-003: Fix Pause/Resume to Actually Update Stripe**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** STRIPE-003
**Priority:** P0 (Ship Blocker - Users being charged while paused!)
**Type:** Bug Fix
**Branch:** `fix/STRIPE-003-pause-resume`
**Version:** v1

---

## What Needs to Be Done

The `pauseAccount()` and `resumeAccount()` functions currently only update the database but do NOT call Stripe. This means:
- When users pause their subscription, they keep getting charged by Stripe
- When users resume, Stripe doesn't know and might have different state

**This is the same pattern as STRIPE-002** which fixed cancellation to actually call Stripe.

### Background

From code review of `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`:
- Lines 127-131: Comments say "In production, you would also: 1. Update Stripe subscription"
- Lines 186-189: Same TODO comments for resume

### Requirements

1. **Pause Flow:**
   - Fetch the org's `stripe_subscription_id` before updating DB
   - Call `stripe.subscriptions.update()` with `pause_collection: { behavior: 'void' }` BEFORE DB update
   - Only update DB if Stripe call succeeds
   - Log any errors appropriately

2. **Resume Flow:**
   - Fetch the org's `stripe_subscription_id` before updating DB
   - Call `stripe.subscriptions.update()` with `pause_collection: null` (or `''`) BEFORE DB update
   - Only update DB if Stripe call succeeds
   - Log any errors appropriately

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` | Add Stripe API calls to pauseAccount() and resumeAccount() |

**⚠️ Only modify this file. Check FILE LOCKS in AGENT_TASKS.md before starting.**

---

## Implementation Guide

### Step 1: Add Stripe Import

At the top of the file, add:
```typescript
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
```

### Step 2: Update pauseAccount()

Add before the database update:

```typescript
// Fetch current subscription ID
const { data: org, error: fetchError } = await supabase
  .from("organizations")
  .select("stripe_subscription_id")
  .eq("id", params.organizationId)
  .single();

if (fetchError || !org) {
  throw new Error("Failed to fetch organization");
}

// Pause in Stripe first
if (stripe && org.stripe_subscription_id) {
  try {
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      pause_collection: { behavior: "void" },
    });
    console.log("[Billing] Paused Stripe subscription:", org.stripe_subscription_id);
  } catch (stripeError) {
    console.error("[Billing] Failed to pause Stripe subscription:", stripeError);
    throw new Error("Failed to pause subscription in Stripe. Please try again or contact support.");
  }
}
```

### Step 3: Update resumeAccount()

Add before the database update:

```typescript
// Fetch current subscription ID
const { data: org, error: fetchError } = await supabase
  .from("organizations")
  .select("stripe_subscription_id")
  .eq("id", params.organizationId)
  .single();

if (fetchError || !org) {
  throw new Error("Failed to fetch organization");
}

// Resume in Stripe first
if (stripe && org.stripe_subscription_id) {
  try {
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      pause_collection: null,
    });
    console.log("[Billing] Resumed Stripe subscription:", org.stripe_subscription_id);
  } catch (stripeError) {
    console.error("[Billing] Failed to resume Stripe subscription:", stripeError);
    throw new Error("Failed to resume subscription in Stripe. Please try again or contact support.");
  }
}
```

### Step 4: Verify Build

```bash
cd apps/dashboard
pnpm typecheck
pnpm lint
pnpm build
```

---

## Acceptance Criteria

- [ ] `pauseAccount()` calls Stripe to pause subscription BEFORE updating database
- [ ] `resumeAccount()` calls Stripe to resume subscription BEFORE updating database
- [ ] If Stripe fails, database is NOT updated (data consistency)
- [ ] Errors are logged with useful context
- [ ] User-friendly error messages on failure
- [ ] Works when `stripe_subscription_id` is null (dev mode / free tier)
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build passes

---

## Related Documentation

- Similar fix: STRIPE-002 (cancellation) - can reference pattern
- Feature Doc: Check `TODO.md` → Billing section

---

## ⚠️ REQUIRED: Notify PM When Done

**Append to `docs/agent-inbox/completions.md` when you start AND when you finish.**

See `docs/workflow/DEV_AGENT_SOP.md` for the exact format.

