# Dev Agent: TKT-005b-v4 - Add PaymentBlocker to Admin Layout

> **Type:** QA Continuation Fix
> **Priority:** CRITICAL
> **Branch:** `agent/tkt-005b` (existing branch)
> **Attempt:** v4

---

## 🔴 QA FAILURE - MODAL NOT APPEARING ON /ADMIN ROUTES

**The Problem:**
PaymentBlocker modal works on `/dashboard/*` routes but does NOT appear on `/admin/*` routes.

**Root Cause:**
- PaymentBlocker is integrated into `dashboard-layout-client.tsx` ✓
- PaymentBlocker is NOT integrated into `admin-layout-client.tsx` ✗

**The Fix:**
Add PaymentBlocker to the admin layout file.

---

## YOUR ONE TASK

**Modify this file:**
`apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx`

**Add these changes:**

1. Import PaymentBlocker at the top:
```tsx
import { PaymentBlocker } from "@/components/PaymentBlocker";
```

2. Add the status check (copy from dashboard-layout-client.tsx):
```tsx
const isPastDue = organization.subscription_status === "past_due";
```

3. Add conditional render in the return (before the main content):
```tsx
{isPastDue && <PaymentBlocker isAdmin={isAdmin} />}
```

---

## REFERENCE: How It's Done in Dashboard Layout

Look at `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx`:

```tsx
import { PaymentBlocker } from "@/components/PaymentBlocker";

// Line ~36
const isPastDue = organization.subscription_status === "past_due";

// Line ~41 in the return
{isPastDue && <PaymentBlocker isAdmin={isAdmin} />}
```

**Copy this exact pattern to admin-layout-client.tsx!**

---

## VERIFICATION BEFORE COMPLETION

Run these commands to verify your changes:

```bash
# 1. Verify PaymentBlocker is imported in admin-layout-client.tsx
grep -n "PaymentBlocker" apps/dashboard/src/app/\(app\)/admin/admin-layout-client.tsx

# Expected: Should show import AND usage (2 lines)

# 2. Verify isPastDue check exists
grep -n "isPastDue" apps/dashboard/src/app/\(app\)/admin/admin-layout-client.tsx

# Expected: Should show the check

# 3. Run typecheck
pnpm typecheck
```

**DO NOT claim completion unless grep shows PaymentBlocker in admin-layout-client.tsx!**

---

## FILES

| File | Action |
|------|--------|
| `apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx` | ADD PaymentBlocker integration |
| `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx` | DO NOT TOUCH (already correct) |
| `apps/dashboard/src/components/PaymentBlocker.tsx` | DO NOT TOUCH (already correct) |

---

## ACCEPTANCE CRITERIA

After your fix, QA will verify:
- [ ] Modal appears on `/admin/*` routes when org is `past_due`
- [ ] Modal appears on `/dashboard/*` routes when org is `past_due` (already works)
- [ ] Admin users see "Update Payment Method" button
- [ ] Non-admin users see "Contact admin" message

---

## COMPLETION CHECKLIST

Before writing your completion report:
- [ ] I modified `admin-layout-client.tsx` (NOT layout.tsx, NOT dashboard-layout-client.tsx)
- [ ] grep shows PaymentBlocker is imported in admin-layout-client.tsx
- [ ] grep shows isPastDue check in admin-layout-client.tsx
- [ ] pnpm typecheck passes
- [ ] I committed and pushed my changes

