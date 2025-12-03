# Dev Agent 9: STRIPE-001

You are a Dev Agent. Your job is to implement fix **STRIPE-001: Implement Stripe Webhook Handler**.

## Your Assignment

**Ticket:** STRIPE-001
**Priority:** P0 (Ship Blocker)
**Source:** Stripe Audit - URGENT

**Problem:**
NO webhook handler exists. This means:
- Trial → Paid transition never syncs to database
- Payment failures not detected
- Subscription status changes lost
- Revenue at risk

**Solution:**
Implement webhook handler for critical Stripe events:
- `invoice.paid` - Update subscription status to active
- `invoice.payment_failed` - Handle payment failure
- `customer.subscription.updated` - Sync status changes
- `customer.subscription.deleted` - Handle cancellation

**Files to Modify:**
- `apps/server/src/index.ts` - Add webhook endpoint
- May need new file for webhook handlers

**Acceptance Criteria:**
- [ ] `/api/webhooks/stripe` endpoint exists
- [ ] Webhook signature verified using STRIPE_WEBHOOK_SECRET
- [ ] `invoice.paid` updates org subscription_status
- [ ] `invoice.payment_failed` logged/handled
- [ ] `customer.subscription.deleted` updates org status
- [ ] Handlers are idempotent (safe to replay)
- [ ] All verification checks pass

## Implementation Approach

```typescript
import Stripe from 'stripe';

app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.paid':
      // Update subscription_status = 'active'
      break;
    case 'invoice.payment_failed':
      // Log, potentially notify
      break;
    case 'customer.subscription.deleted':
      // Update subscription_status = 'cancelled'
      break;
  }

  res.json({ received: true });
});
```

## Your SOP

### Phase 0: Git Setup
```bash
git checkout main
git pull origin main
git checkout -b fix/STRIPE-001-webhook-handler
```

### Phase 1: Understand
1. Read existing Stripe integration code
2. Find organization table schema for subscription fields
3. Check STRIPE_WEBHOOK_SECRET env var usage

### Phase 2: Implement
1. Add webhook endpoint with signature verification
2. Handle each critical event type
3. Update database with correct status

### Phase 3: Self-Verification
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

### Phase 5: Report completion

