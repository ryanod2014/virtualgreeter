# Test Protocol for TKT-002: Complete Stripe Subscription Cancellation

**Ticket:** TKT-002 - Complete Stripe Subscription Cancellation
**Branch:** agent/tkt-002
**QA Agent:** qa-review-TKT-002
**Created:** 2025-12-07T01:12:37Z

---

## What I'm Testing

This ticket fixes a critical billing bug where:
1. Users clicking "Cancel" only updated local DB (plan='free')
2. Did NOT call Stripe API to actually cancel subscription
3. Users still got charged by Stripe despite UI saying cancelled
4. UI promised "access until end of period" but removed access immediately

**The Fix:**
- Call `stripe.subscriptions.update({ cancel_at_period_end: true })` when user cancels
- Store `current_period_end` date in DB (using `pause_ends_at` field)
- Add webhook handler for `customer.subscription.deleted` to finalize downgrade to 'free' plan

---

## Files Modified (Actual vs Expected)

**Ticket Expected (INCORRECT PATHS):**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts` ❌ (doesn't exist)
- `apps/dashboard/src/lib/stripe.ts` ❌ (not modified, just imported)
- `apps/server/src/features/webhooks/stripe.ts` ❌ (doesn't exist)

**Actually Modified (CORRECT):**
- `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` ✅
- `apps/server/src/features/billing/stripe-webhook-handler.ts` ✅

**Assessment:** Ticket had wrong paths. Dev agent found correct files. Not a blocker.

---

## Available Testing Tools

| Tool | Available? | Reason |
|------|-----------|---------|
| `pnpm test` | ✅ | Always available |
| `pnpm typecheck` | ✅ | Always available |
| `pnpm build` | ⚠️ | Need to check for pre-existing failures |
| `pnpm dev` | ⚠️ | Depends on build + env setup |
| Playwright MCP | ⚠️ | Depends on dev server + auth |
| Code inspection | ✅ | Always available |
| Stripe test mode | ❌ | Requires STRIPE_SECRET_KEY env var |
| Stripe CLI webhook | ❌ | Requires local Stripe CLI + webhook endpoint |

**Likely Reality:** This is a billing/backend feature. Browser testing may be blocked by:
- Missing Stripe API keys in test environment
- Auth requirements
- Pre-existing build failures

**Fallback Plan:** If browser/Stripe testing blocked, use thorough code inspection to verify logic.

---

## Acceptance Criteria Test Matrix

### AC1: Clicking 'Cancel' calls Stripe API with cancel_at_period_end: true

**How I will verify:**
1. **Primary:** Code inspection - verify `stripe.subscriptions.update()` is called with correct parameters
2. **Fallback:** Check error handling for Stripe API failures
3. **Evidence:** Code snippet showing the Stripe API call

**Happy path test:**
- User action: Click cancel button in settings/billing
- Code path: `submitCancellationFeedback()` → Stripe API call
- Expected: `stripe.subscriptions.update(sub_id, { cancel_at_period_end: true })`
- Verify: Function throws error if Stripe call fails (doesn't silently continue)

**Edge cases:**
1. No `stripe_subscription_id` in DB → Should log warning and skip Stripe call
2. Stripe API returns error → Should throw error, prevent feedback save
3. Stripe not configured (null) → Should log warning and skip
4. Multiple rapid clicks → Should be idempotent (safe to call multiple times)

**Adversarial tests:**
1. Invalid subscription ID → Stripe API should return error, caught and thrown
2. Network timeout → Should throw error, not leave inconsistent state

---

### AC2: User retains access until their paid period ends (stored in DB)

**How I will verify:**
1. **Primary:** Code inspection - verify `current_period_end` is extracted and stored
2. **Fallback:** Check DB field used for storage
3. **Evidence:** Code snippet showing period_end extraction and storage

**Happy path test:**
- After Stripe API call succeeds
- Expected: Extract `subscription.current_period_end` (Unix timestamp)
- Expected: Convert to ISO date string
- Expected: Store in `organizations.pause_ends_at` field
- Verify: Error handling if DB update fails (log but don't throw - Stripe call succeeded)

**Edge cases:**
1. DB update fails after Stripe succeeds → Should log error but not throw
2. Timestamp conversion edge cases → Check for correct Unix→ISO conversion (* 1000)
3. Field already populated → Should overwrite with new date

**Adversarial tests:**
1. Malformed subscription object → Should have TypeScript types, but check runtime safety

---

### AC3: After period ends, plan automatically becomes 'free' via webhook

**How I will verify:**
1. **Primary:** Code inspection - verify webhook handler updates both status and plan
2. **Fallback:** Check webhook routing and idempotency
3. **Evidence:** Webhook handler code snippet

**Happy path test:**
- Webhook event: `customer.subscription.deleted`
- Handler: `handleSubscriptionDeleted()`
- Expected: Update both `subscription_status='cancelled'` AND `plan='free'`
- Verify: Single atomic DB update (both fields in one query)

**Edge cases:**
1. Organization not found by subscription ID → Should return false, log error
2. Webhook replayed (same event twice) → Should be idempotent (safe to run multiple times)
3. Supabase not configured → Should log error and return false

**Adversarial tests:**
1. Malicious webhook (no signature verification) → Check signature verification in main handler
2. Wrong subscription ID → Should return false, not crash

---

### AC4: Stripe dashboard shows subscription as 'canceling'

**How I will verify:**
1. **Primary:** Code review - verify `cancel_at_period_end: true` is correct Stripe parameter
2. **Fallback:** Check Stripe API documentation reference
3. **Evidence:** Code snippet + note on Stripe behavior

**Reality Check:**
- Cannot actually verify Stripe dashboard without real API keys
- Stripe behavior: When `cancel_at_period_end: true`, Stripe dashboard shows status as "canceling"
- Verification: Confirm correct API parameter is used in code

**Edge cases:**
N/A - This is Stripe's behavior, not our code

---

### AC5: Webhook properly handles the final cancellation event

**How I will verify:**
1. **Primary:** Code inspection - verify webhook signature verification
2. **Fallback:** Check error handling and idempotency
3. **Evidence:** Webhook main handler code

**Happy path test:**
- Webhook arrives with `stripe-signature` header
- Handler verifies signature with `stripe.webhooks.constructEvent()`
- Routes to `handleSubscriptionDeleted()`
- Returns 200 on success

**Edge cases:**
1. Missing signature header → Returns 400 error
2. Invalid signature → Returns 400 error, logs error
3. Handler fails → Returns 500 (triggers Stripe retry)
4. Unhandled event type → Returns 200 (don't fail for unknown events)

**Adversarial tests:**
1. Spoofed webhook (bad signature) → Should reject with 400
2. Malformed event object → Should catch error and return 500

---

## Build Verification Strategy

### Step 1: Check feature branch
```bash
pnpm install
pnpm typecheck 2>&1 | tee /tmp/feature-typecheck.log
pnpm build 2>&1 | tee /tmp/feature-build.log
pnpm test 2>&1 | tee /tmp/feature-test.log
```

### Step 2: If failures, compare with main
```bash
git stash
git checkout main
pnpm typecheck 2>&1 | tee /tmp/main-typecheck.log
git checkout agent/tkt-002
git stash pop
diff /tmp/main-typecheck.log /tmp/feature-typecheck.log
```

### Step 3: Assess blame
| Scenario | Action |
|----------|--------|
| Same errors on both | ✅ PRE-EXISTING - Proceed with code inspection |
| New errors on feature | ❌ FAIL - Ticket introduced errors |
| Fewer errors on feature | ✅ Ticket improved things |

---

## Code Review Checklist

- [ ] Changes are within actual scope (billing actions + webhook handler)
- [ ] No changes to out_of_scope files (cancel modal UI, pause functionality, schema)
- [ ] Follows existing patterns (error handling, logging, idempotency)
- [ ] No hardcoded values (Stripe IDs, dates, etc.)
- [ ] Error handling: Stripe failures throw errors (don't continue with partial state)
- [ ] Error handling: DB failures after Stripe success are logged but not thrown
- [ ] Idempotency: Safe to call multiple times (user double-clicking)
- [ ] Security: Webhook signature verification present
- [ ] Types: Proper TypeScript types used

---

## Edge Case Testing Matrix

### Input Validation
| Test | Expected Behavior |
|------|-------------------|
| No stripe_subscription_id | Log warning, skip Stripe call, continue |
| Stripe not configured (null) | Log warning, skip Stripe call |
| Invalid subscription ID | Stripe API error, caught and thrown |

### User Interaction
| Test | Expected Behavior |
|------|-------------------|
| Rapid clicks (5+ times) | Idempotent - multiple calls safe |
| Network timeout | Error thrown, transaction rolled back |

### Authorization
| Test | Expected Behavior |
|------|-------------------|
| Webhook without signature | Return 400 error |
| Webhook with bad signature | Return 400 error |
| Webhook with valid signature | Process and return 200 |

### Data Integrity
| Test | Expected Behavior |
|------|-------------------|
| Stripe succeeds, DB fails | Log error but don't throw (Stripe is critical) |
| Stripe fails, DB succeeds | Throw error (feedback save fails) |
| Webhook replayed | Idempotent - safe to replay |

---

## Pass/Fail Criteria

### ✅ PASS if:
1. All build checks pass OR same failures as main (pre-existing)
2. Code inspection confirms all 5 acceptance criteria are met
3. Stripe API is called with correct parameters
4. Period end date is stored in DB
5. Webhook updates both status and plan
6. Webhook signature verification is present
7. Error handling prevents inconsistent state
8. Code is idempotent (safe to retry)
9. No security vulnerabilities introduced
10. Edge cases are handled appropriately

### ❌ FAIL if:
1. NEW build errors introduced (not on main)
2. Stripe API not called with cancel_at_period_end
3. Period end date not stored in DB
4. Webhook doesn't update plan to 'free'
5. No webhook signature verification
6. Error handling allows inconsistent state
7. Not idempotent (dangerous for retries)
8. Security vulnerabilities present
9. Changes outside of scope
10. Critical edge cases not handled

---

## Blocked Path Plan

**If browser testing is blocked:**
- ✅ Proceed with comprehensive code inspection
- ✅ Verify logic flow through function calls
- ✅ Check error handling patterns
- ✅ Confirm Stripe API parameters match documentation
- ✅ Verify webhook signature verification
- ✅ Test idempotency logic by tracing code paths

**Documentation in report:**
"Browser testing was blocked due to [reason]. Conducted thorough code inspection as alternative verification method. All acceptance criteria verified through code review."

---

## Evidence Collection Plan

For each AC, collect:
1. **Code snippets** showing the implementation
2. **Line numbers** for easy reference (file:line)
3. **Logic flow** diagrams if complex
4. **Error messages** if build issues found
5. **Comparison** with main branch if failures present

---

## Security Checks

- [ ] Webhook signature verification present
- [ ] No SQL injection vectors
- [ ] No hardcoded secrets
- [ ] Error messages don't leak sensitive data
- [ ] Stripe API calls use environment variables
- [ ] DB queries use parameterized values

---

## Timeline

- **Start:** 2025-12-07T01:12:37Z
- **Protocol Design:** ~15 minutes
- **Build Verification:** ~10 minutes
- **Code Inspection:** ~30 minutes
- **Edge Case Analysis:** ~20 minutes
- **Report Writing:** ~20 minutes
- **Total Estimate:** ~95 minutes (~1.5 hours)

This is a medium-difficulty backend ticket with critical security and billing implications. Thorough testing is essential.
