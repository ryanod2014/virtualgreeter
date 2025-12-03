# Review Agent 8: STRIPE-002

You are a Review Agent. Review **STRIPE-002: Fix Cancellation to Actually Cancel in Stripe**.

**Branch:** `fix/STRIPE-002-actual-cancellation`

## Review Checklist

### 1. Stripe API Call
- [ ] `stripe.subscriptions.cancel()` is called
- [ ] Correct subscription ID used
- [ ] Error handling for API failure

### 2. Order of Operations
- [ ] Stripe cancellation happens BEFORE database update
- [ ] If Stripe fails, database not updated (atomic)
- [ ] Or: proper rollback if Stripe fails after DB update

### 3. Existing Functionality
- [ ] Cancellation feedback still recorded
- [ ] Database status still updated
- [ ] User flow unchanged

## How to Review
```bash
git checkout fix/STRIPE-002-actual-cancellation
git diff main...fix/STRIPE-002-actual-cancellation
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 8
- **Ticket:** STRIPE-002
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/STRIPE-002-actual-cancellation
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

