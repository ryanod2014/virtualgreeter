# QA Agent: STRIPE-001

You are a QA Agent. Your job is to verify that **STRIPE-001: Add Stripe Webhook Handler** works correctly.

## Your Assignment

**Ticket:** STRIPE-001
**Branch:** `fix/STRIPE-001-webhook-handler`
**Files Changed:**
- `apps/server/src/features/billing/stripe-webhook-handler.ts` (new file)
- `apps/server/src/index.ts` (webhook route added)

**What Was Fixed:**
The server had no Stripe webhook handler. This meant subscription events from Stripe (new subscriptions, cancellations, payment failures) were never processed. The new handler:
- Verifies Stripe webhook signatures
- Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Updates organization subscription status in database

**Acceptance Criteria:**
- [ ] Webhook route exists at `/api/webhooks/stripe`
- [ ] Signature verification using `stripe.webhooks.constructEvent()`
- [ ] Raw body parsing (required for Stripe signature verification)
- [ ] Handlers for key subscription events
- [ ] Database updates on subscription changes
- [ ] Proper error handling and status codes
- [ ] All build checks pass

## Test Scenarios

### Scenario 1: Code Structure Verification
**Type:** Code inspection
**Steps:**
1. Read `apps/server/src/features/billing/stripe-webhook-handler.ts`
2. Verify signature verification exists
3. Verify event handlers for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Verify database update calls
**Expected:** All handlers present with proper signature verification

### Scenario 2: Route Registration
**Type:** Code inspection
**Steps:**
1. Read `apps/server/src/index.ts`
2. Find webhook route registration
3. Verify raw body parser is used (not JSON parser)
**Expected:** Route at `/api/webhooks/stripe` with raw body handling

### Scenario 3: Security Verification
**Type:** Code inspection
**Steps:**
1. Verify `STRIPE_WEBHOOK_SECRET` environment variable is used
2. Verify signature verification happens BEFORE processing
3. Verify proper error handling for invalid signatures
**Expected:** Secure implementation following Stripe best practices

### Scenario 4: Build Verification
**Type:** Build test
**Steps:**
```bash
pnpm typecheck
pnpm lint
pnpm build
```
**Expected:** All pass

## Your SOP

### Phase 0: Signal Start (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent STRIPE-001
- **Ticket:** STRIPE-001
- **Status:** STARTED
- **Branch:** fix/STRIPE-001-webhook-handler
- **Files Locking:** N/A (testing only)
- **Notes:** Beginning QA testing for webhook handler
```

### Phase 1: Environment Check

```bash
git fetch origin
git checkout fix/STRIPE-001-webhook-handler
```

### Phase 2: Code Review

1. Read the webhook handler file
2. Verify all required patterns:
   - Signature verification
   - Event type switching
   - Database updates
   - Error handling

### Phase 3: Build Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
```

### Phase 4: Generate Report

```markdown
# QA Report: STRIPE-001 - Stripe Webhook Handler

## Summary

| Category | Result |
|----------|--------|
| Code Structure | X/4 Passed |
| Security | ✅/❌ |
| Build Verification | ✅/❌ |
| Human Review | Not Required (backend only) |

## Test Results

### Scenario 1: Code Structure
**Status:** ✅ PASSED / ❌ FAILED
**Handlers Found:**
- [ ] checkout.session.completed
- [ ] customer.subscription.updated
- [ ] customer.subscription.deleted
**Notes:**

### Scenario 2: Route Registration
**Status:** ✅ PASSED / ❌ FAILED
**Route Path:** [found path]
**Raw Body:** ✅/❌
**Notes:**

### Scenario 3: Security
**Status:** ✅ PASSED / ❌ FAILED
**Signature Verification:** ✅/❌
**Env Var Used:** ✅/❌
**Notes:**

### Scenario 4: Build
**Status:** ✅ PASSED / ❌ FAILED
- typecheck: ✅/❌
- lint: ✅/❌
- build: ✅/❌

## Human QA Required?
No - backend webhook handler with no UI. 

**Note:** Full integration testing requires actual Stripe webhooks which should be tested in staging with Stripe test mode.

## Recommendation
- [ ] ✅ **APPROVE** - Code review passed, ready to merge
- [ ] ❌ **REJECT** - Issues found: [details]
```

### Phase 5: Notify PM (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent STRIPE-001
- **Ticket:** STRIPE-001
- **Status:** APPROVED / REJECTED
- **Branch:** fix/STRIPE-001-webhook-handler
- **Output:** QA report above
- **Notes:** [Summary]
```

## Rules

1. **Check security patterns** - Webhook signature verification is critical
2. **Verify raw body handling** - JSON parsing breaks Stripe signatures
3. **No UI = No human review needed**
4. **Integration testing is separate** - This QA covers code correctness
5. **Always notify PM** via completions.md

