# Review Agent 7: STRIPE-001

You are a Review Agent. Review **STRIPE-001: Implement Stripe Webhook Handler**.

**Branch:** `fix/STRIPE-001-webhook-handler`

## Review Checklist

### 1. Security
- [ ] Webhook signature verified with STRIPE_WEBHOOK_SECRET
- [ ] Raw body used for signature verification
- [ ] Invalid signatures return 400

### 2. Event Handling
- [ ] `invoice.paid` updates subscription_status
- [ ] `invoice.payment_failed` handled appropriately
- [ ] `customer.subscription.updated` syncs status
- [ ] `customer.subscription.deleted` handles cancellation

### 3. Robustness
- [ ] Handlers are idempotent (safe to replay)
- [ ] Database updates use correct org matching
- [ ] Errors logged appropriately
- [ ] Returns 200 after processing

## How to Review
```bash
git checkout fix/STRIPE-001-webhook-handler
git diff main...fix/STRIPE-001-webhook-handler
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 7
- **Ticket:** STRIPE-001
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/STRIPE-001-webhook-handler
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

