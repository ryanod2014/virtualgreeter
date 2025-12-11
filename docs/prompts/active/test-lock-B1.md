# TEST LOCK Agent: B1

> **Feature:** Subscription Creation
> **Priority:** Critical
> **Doc:** `docs/features/billing/subscription-creation.md`

---

## Your Task

Lock in current behavior for all code in the Subscription Creation flow by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Subscription Creation flow guides new users through a 3-step paywall funnel: card entry → seat selection → billing preference, ultimately creating a Stripe subscription with a 7-day free trial.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/api/billing/create-subscription/route.ts` | `POST` handler | High |
| `apps/dashboard/src/app/api/billing/setup-intent/route.ts` | `POST` handler | High |
| `apps/dashboard/src/app/paywall/page.tsx` | Card entry step | Medium |
| `apps/dashboard/src/app/paywall/seats/page.tsx` | Seat selection step | Medium |
| `apps/dashboard/src/app/paywall/billing/page.tsx` | Billing selection step | Medium |

**Note:** `create-subscription/route.test.ts` already exists! Read it first, then expand coverage if needed.

---

## Behaviors to Capture

### create-subscription/route.ts (EXPAND EXISTING TESTS)

Check existing tests in `route.test.ts`. Add any missing behaviors:

| Area | Behaviors to Test |
|------|-------------------|
| **Subscription States** | ✓ Cancelled user can re-subscribe, ✓ Active user blocked, ✓ Trialing user blocked, ✓ No subscription user allowed |
| **Billing Frequencies** | Annual uses correct price ID, 6-month uses correct price ID |
| **Stripe Integration** | Customer retrieval, subscription creation params |
| **Database Updates** | Subscription ID stored, status updated |
| **Error Cases** | Stripe API failure handled, DB error handled |

### setup-intent/route.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `POST` | 1. Creates SetupIntent for authenticated user, 2. Returns client secret, 3. Returns 401 for unauthenticated, 4. Handles Stripe error |

### paywall/page.tsx (Card Entry)

| Area | Behaviors to Test |
|------|-------------------|
| **UI State** | 1. Shows loading while SetupIntent created, 2. Shows card elements after load |
| **Card Confirmation** | 3. Calls confirmCardSetup with correct params, 4. Shows error on invalid card |
| **Navigation** | 5. Success → navigates to /paywall/seats |

### paywall/seats/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Seat Selection** | 1. Default seat count, 2. +/- buttons update count, 3. Quick select buttons work |
| **Validation** | 4. Minimum seat count enforced, 5. Maximum seat count enforced |
| **Storage** | 6. Stores seat count in localStorage |
| **Navigation** | 7. Continue → navigates to /paywall/billing |

### paywall/billing/page.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Billing Options** | 1. Shows monthly/annual options, 2. Shows correct pricing |
| **Downsell** | 3. Monthly selection shows 6-month popup (once), 4. Popup dismissal works |
| **Submission** | 5. Calls create-subscription API, 6. Shows loading during submission |
| **Success** | 7. Redirects to /admin on success |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/billing/subscription-creation.md`
3. **Read existing test first:** `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts`
4. Read each source file listed above
5. Write tests for missing behaviors (don't duplicate existing tests)
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/B1-[TIMESTAMP].md`

---

## Mocking Notes

- Stripe mocking patterns already established in existing route.test.ts
- Mock `@stripe/react-stripe-js` for frontend Stripe Elements
- Mock localStorage for seat storage
- Mock next/navigation for redirects

---

## Output

- Expand `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts` if gaps exist
- `apps/dashboard/src/app/api/billing/setup-intent/route.test.ts`
- `apps/dashboard/src/app/paywall/page.test.tsx`
- `apps/dashboard/src/app/paywall/seats/page.test.tsx`
- `apps/dashboard/src/app/paywall/billing/page.test.tsx`
- Completion report: `docs/agent-output/test-lock/B1-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] Don't duplicate existing tests - expand them
- [ ] One behavior per `it()` block
- [ ] All code paths covered
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns from route.test.ts




