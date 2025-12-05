# TEST LOCK Agent: B2

> **Feature:** Seat Management
> **Priority:** Critical
> **Doc:** `docs/features/billing/seat-management.md`

---

## Your Task

Lock in current behavior for all code in the Seat Management feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Seat management enables admins to add and remove agent seats with automatic Stripe proration. It uses a pre-paid seats model where the billing floor is set during initial setup, and billing auto-expands when usage exceeds purchased seats.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/api/billing/seats/route.ts` | `POST`, `PATCH` handlers | High |
| `apps/dashboard/src/app/api/billing/update-settings/route.ts` | `POST` handler | High |
| `apps/dashboard/src/lib/plan-limits.ts` | Plan limit checking functions | High |

---

## Behaviors to Capture

### billing/seats/route.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Get Current Seats** | 1. Returns current seat count, 2. Returns usage (active + pending invites) |
| **Add Seats** | 3. Increases seat count, 4. Calls Stripe with proration, 5. Updates database |
| **Remove Seats** | 6. Decreases seat count, 7. Blocks if new count < usage, 8. Calls Stripe with proration |
| **Auto-Expansion** | 9. When invite exceeds seats → auto-expands billing |
| **Validation** | 10. Cannot go below 1 seat, 11. Cannot exceed max seats |
| **Auth** | 12. Returns 401 if not authenticated, 13. Returns 403 if not admin |

### update-settings/route.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Billing Frequency Change** | 1. Updates subscription in Stripe, 2. Updates database |
| **Error Handling** | 3. Handles Stripe API errors, 4. Handles DB errors |

### plan-limits.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `checkPlanLimits` | 1. Free plan limits enforced, 2. Paid plan limits enforced, 3. Returns limit info |
| `canAddSeat` | 4. Returns true if under limit, 5. Returns false if at limit |
| `getUsedSeats` | 6. Counts active agents, 7. Counts pending invites, 8. Returns total usage |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/billing/seat-management.md`
3. Read each source file listed above
4. Read existing test patterns: `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts`
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/B2-[TIMESTAMP].md`

---

## Mocking Notes

- Follow Stripe mocking patterns from create-subscription tests
- Mock `stripe.subscriptions.update` for proration calls
- Mock Supabase for user/org queries
- Mock invite count queries

---

## Output

- `apps/dashboard/src/app/api/billing/seats/route.test.ts`
- `apps/dashboard/src/app/api/billing/update-settings/route.test.ts`
- `apps/dashboard/src/lib/plan-limits.test.ts`
- Completion report: `docs/agent-output/test-lock/B2-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (add, remove, auto-expand, errors)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")
