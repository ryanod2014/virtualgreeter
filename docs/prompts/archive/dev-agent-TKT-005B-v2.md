# Dev Agent: TKT-005b-v2 - Fix PaymentBlocker Integration

> **Type:** Continuation/Fix
> **Original Ticket:** TKT-005b
> **Priority:** Critical
> **Branch:** `agent/tkt-005b` (continue on existing branch)

---

## QA Failure Summary

The PaymentBlocker component exists but is only integrated into the `/dashboard` layout, NOT the `/admin` layout. When admins navigate to `/admin/*` routes with a `past_due` org status, they see the normal dashboard without any payment blocker modal.

---

## What Needs to be Fixed

1. **Add PaymentBlocker to admin layout**
   - File: `apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx`
   - Import the PaymentBlocker component
   - Add org status check (`subscription_status === "past_due"`)
   - Conditionally render PaymentBlocker

2. **Ensure consistency**
   - Both `/dashboard/*` and `/admin/*` routes must show the PaymentBlocker when org is `past_due`

---

## Files to Modify

- `apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx`

## Reference Implementation

Look at how it's done in `dashboard-layout-client.tsx`:

```tsx
import { PaymentBlocker } from "@/components/PaymentBlocker";

// In the component:
const isPastDue = organization.subscription_status === "past_due";

// In the return:
{isPastDue && <PaymentBlocker isAdmin={isAdmin} />}
```

---

## Acceptance Criteria

- [ ] PaymentBlocker appears on `/admin/*` routes when org is `past_due`
- [ ] PaymentBlocker appears on `/dashboard/*` routes when org is `past_due` (already done)
- [ ] Admin users see "Update Payment Method" button
- [ ] Non-admin users see "Contact admin" message

---

## Instructions

1. Checkout the existing branch: `agent/tkt-005b`
2. Add PaymentBlocker integration to `admin-layout-client.tsx`
3. Test locally: set org to `past_due`, verify modal appears on both `/admin` and `/dashboard`
4. Commit and push
5. Write completion report to `docs/agent-output/completions/TKT-005b-v2-*.md`
