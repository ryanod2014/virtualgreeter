# Test Plan for TKT-030
## TICKET TYPE: hybrid

**Ticket:** TKT-030 - No Grace Period Implementation
**Branch:** agent/tkt-030
**Test Port:** 3130
**Tunnel URL:** (if available)

---

## ACCEPTANCE CRITERIA

From ticket:
1. subscription_ends_at is stored when user cancels
2. User retains access until subscription_ends_at
3. After period ends, webhook triggers downgrade to free
4. No immediate loss of access on cancel click

---

## API/BACKEND TESTS (Minimum 5)

| # | Endpoint/Operation | Method | Input | Expected |
|---|-------------------|--------|-------|----------|
| 1 | submitCancellationFeedback (with Stripe sub) | POST | Valid org with stripe_subscription_id | Calls Stripe API to cancel at period end, stores subscription_ends_at, plan stays active |
| 2 | submitCancellationFeedback (without Stripe sub) | POST | Valid org without stripe_subscription_id | Skips Stripe, sets plan='free' immediately, backward compatible |
| 3 | handleSubscriptionDeleted webhook | POST | Valid subscription.deleted event | Sets plan='free', subscription_status='cancelled', clears subscription_ends_at |
| 4 | Database: subscription_ends_at column | SQL | Check migration applied | Column exists, is TIMESTAMPTZ, has index |
| 5 | Access during grace period | GET | Request from org with subscription_ends_at in future | User still has access (plan is still active, not 'free') |

---

## UI TESTS - ROLES TO TEST

| Role | User Email | Tests | Magic Link? |
|------|-----------|-------|-------------|
| Admin | qa-admin-TKT-030@greetnow.test | Full cancellation flow, verify grace period UI messaging | Yes |

Note: This is a backend-heavy ticket, but UI testing is needed to verify:
- Cancel flow triggers the new backend logic
- No immediate access loss
- User sees appropriate messaging about continued access

---

## UI TESTS - SCENARIOS

| # | Scenario | User Action | Expected Result |
|---|----------|-------------|-----------------|
| 1 | Happy path: Cancel with Stripe sub | Navigate to billing, click cancel, complete feedback flow | subscription_ends_at stored, plan still active, user sees grace period message |
| 2 | Verify grace period message | After canceling, check billing page | Should show "Your subscription ends on [date]" or similar |
| 3 | Verify continued access | After canceling, navigate to features | Should still have access (plan is active, not downgraded yet) |
| 4 | Cancel without Stripe sub | Cancel on org without stripe_subscription_id | Immediate downgrade to free (backward compatible) |

---

## ARTIFACT TRACKING

| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| Build verification | Build | ☐ | pnpm output | [pending] |
| Database migration check | API | ☐ | SQL query result | [pending] |
| Cancel with Stripe (API) | API | ☐ | curl response | [pending] |
| Cancel without Stripe (API) | API | ☐ | curl response | [pending] |
| Webhook handler | API | ☐ | curl response | [pending] |
| Admin cancel flow | UI | ☐ | Screenshots | [pending] |
| Grace period UI | UI | ☐ | Screenshots | [pending] |
| Continued access | UI | ☐ | Screenshots | [pending] |

---

## RISK MITIGATION CHECKS

From ticket risks:
- [ ] Verified overlap with TKT-002 is handled (dev says TKT-002 already done)
- [ ] Webhook handling is idempotent (verify multiple calls don't corrupt state)

---

## EDGE CASES TO TEST

1. **Multiple webhook deliveries** - Stripe retries webhooks; verify idempotency
2. **Cancel during grace period** - What if user cancels again while already in grace period?
3. **Resubscribe during grace period** - Can user change their mind?
4. **Grace period expires** - Verify access actually stops after subscription_ends_at
5. **Missing Stripe subscription** - Backward compatibility for orgs without Stripe setup

---

## EVIDENCE COLLECTION PLAN

### API Evidence
- Database query showing subscription_ends_at field exists
- curl response from submitCancellationFeedback showing Stripe API call
- Database query showing org still has active plan after cancel
- curl response from webhook handler
- Database query showing org downgraded to free after webhook

### UI Evidence
- Screenshot: Billing page before cancel
- Screenshot: Cancel modal flow completion
- Screenshot: Billing page after cancel showing grace period message
- Screenshot: Feature access still working during grace period
- Screenshot: Billing page after webhook (downgraded to free)

---

## NOTES

This is a hybrid ticket focusing heavily on backend logic. The UI tests are primarily to verify that:
1. The cancel flow correctly triggers the new backend logic
2. Users see appropriate messaging about grace period
3. Access is not immediately lost

The bulk of testing will be API/backend verification with curl and database queries.
