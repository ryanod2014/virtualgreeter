# Code Review Agent: STRIPE-002 - Stripe Cancellation Fix

> **One-liner to launch:**
> `Read and execute docs/prompts/active/review-agent-STRIPE002.md`

---

You are a Code Review Agent. Your job is to review the code changes for **STRIPE-002: Fix Cancellation to Actually Cancel in Stripe** before it goes to QA.

## Your Assignment

**Ticket:** STRIPE-002
**Priority:** P0 (Ship Blocker - Users being charged after cancellation!)
**Dev Agent:** Dev Agent STRIPE-002
**Branch:** `fix/STRIPE-002-actual-cancellation`

**Files Changed:**
- `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`

**What Was Changed:**
The `submitCancellationFeedback()` function was updated to actually cancel the Stripe subscription. Previously it only saved feedback and updated the DB plan to "free" without calling Stripe. Now it:
1. Fetches the org's `stripe_subscription_id`
2. Calls `stripe.subscriptions.cancel()` BEFORE updating the database
3. Clears `stripe_subscription_id` after successful cancellation
4. Has proper error handling with user-friendly message

## Review Checklist

### 1. Critical - Billing Logic
- [ ] Stripe is called BEFORE database update (correct order for data consistency)
- [ ] `stripe_subscription_id` is properly checked before API call
- [ ] Error from Stripe prevents DB update (no half-cancelled state)
- [ ] Subscription ID is cleared after successful cancellation

### 2. Security
- [ ] No hardcoded API keys or secrets
- [ ] Error messages don't leak internal details
- [ ] Authorization context is preserved (not bypassing auth)

### 3. Error Handling
- [ ] Stripe errors are caught and logged
- [ ] User gets actionable error message
- [ ] DB errors after Stripe success are logged but don't throw (Stripe is the critical part)

### 4. Code Quality
- [ ] Follows existing patterns in the codebase
- [ ] Matches the pattern used in `pauseAccount()` (same file)
- [ ] Import added correctly
- [ ] No dead code or debug statements

## Your SOP

### Step 0: Signal Start (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent STRIPE-002
- **Ticket:** STRIPE-002
- **Status:** STARTED
- **Branch:** `fix/STRIPE-002-actual-cancellation`
- **Files Locking:** N/A (review only)
- **Notes:** Beginning code review of P0 billing fix
```

### Step 1: Get the Diff

```bash
git fetch origin
git diff main..fix/STRIPE-002-actual-cancellation -- apps/dashboard/src/app/\(app\)/admin/settings/billing/actions.ts
```

### Step 2: Review the Changes

Check against the checklist above. Focus especially on:
1. **Order of operations** - Stripe MUST be called before DB update
2. **Error handling** - What happens if Stripe fails?
3. **Edge cases** - What if `stripe_subscription_id` is null?

### Step 3: Check Context

Read the full `actions.ts` file and compare with `pauseAccount()` to ensure patterns are consistent.

### Step 4: Generate Review Report

```markdown
# Code Review: STRIPE-002 - Stripe Cancellation Fix

## Summary
[Approve / Request Changes / Needs Discussion]

## Checklist Results

| Category | Status | Notes |
|----------|--------|-------|
| Billing Logic | ✅/⚠️/❌ | [notes] |
| Security | ✅/⚠️/❌ | [notes] |
| Error Handling | ✅/⚠️/❌ | [notes] |
| Code Quality | ✅/⚠️/❌ | [notes] |

## Issues Found

[List any issues with severity and fix suggestions]

## Verdict

- [ ] ✅ **APPROVE** - Ready for QA
- [ ] 🔄 **REQUEST CHANGES** - Fix issues first
- [ ] 💬 **NEEDS DISCUSSION** - Unclear on: [what]
```

### Step 5: Notify PM (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent STRIPE-002
- **Ticket:** STRIPE-002
- **Status:** APPROVED / CHANGES_REQUESTED
- **Branch:** `fix/STRIPE-002-actual-cancellation`
- **Output:** Review report above
- **Notes:** [One line summary]
```

---

## Rules

1. **This is a P0 billing bug** - Be thorough but efficient
2. **Focus on correctness** - The order of Stripe vs DB operations is critical
3. **Check error paths** - Users must not be left in a broken state
4. **Don't block on minor style issues** - This needs to ship ASAP

---



