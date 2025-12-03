# Review Agent 9: STRIPE-003

You are a Review Agent. Review **STRIPE-003: Fix Pause/Resume to Update Stripe**.

**Branch:** `fix/STRIPE-003-pause-resume`

## Review Checklist

### 1. Pause Implementation
- [ ] Calls `stripe.subscriptions.update()` with `pause_collection`
- [ ] Correct subscription ID used
- [ ] Error handling for API failure

### 2. Resume Implementation
- [ ] Removes `pause_collection` from subscription
- [ ] Correct subscription ID used
- [ ] Error handling for API failure

### 3. Existing Functionality
- [ ] Database status still updated
- [ ] User flow unchanged
- [ ] Both pause and resume tested

## How to Review
```bash
git checkout fix/STRIPE-003-pause-resume
git diff main...fix/STRIPE-003-pause-resume
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 9
- **Ticket:** STRIPE-003
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/STRIPE-003-pause-resume
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

