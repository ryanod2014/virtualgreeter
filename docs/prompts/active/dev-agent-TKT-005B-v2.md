# Dev Agent Continuation: TKT-005B-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-005B (TKT-005b)
> **Branch:** `agent/tkt-005b` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
TypeScript compilation failures: missing 'past_due' property in SubscriptionStatus mappings. The 'past_due' status was added to the SubscriptionStatus type but the STATUS_COLORS objects in two files were not updated to include this new status value, causing build failures.

**Failures Found:**

1. **CRITICAL** - Property 'past_due' is missing in type at organizations-client.tsx:88
   - File: `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx`
   - Error: Property 'past_due' is missing in type '{ active: string; trialing: string; paused: string; cancelled: string; }' but required in type 'Record<SubscriptionStatus, string>'

2. **CRITICAL** - Property 'past_due' is missing in type at retargeting-client.tsx:39
   - File: `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx`
   - Error: Property 'past_due' is missing in type '{ active: string; trialing: string; paused: string; cancelled: string; }' but required in type 'Record<SubscriptionStatus, string>'

**What You Must Fix:**

Add 'past_due' property to STATUS_COLORS constants in organizations-client.tsx and retargeting-client.tsx to match the updated SubscriptionStatus type definition.

**Suggested Implementation:**

For `organizations-client.tsx` (lines 88-93):
```typescript
const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  past_due: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};
```

For `retargeting-client.tsx` (lines 39-44):
```typescript
const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: "bg-green-500/10 text-green-500",
  trialing: "bg-blue-500/10 text-blue-500",
  paused: "bg-amber-500/10 text-amber-500",
  cancelled: "bg-red-500/10 text-red-500",
  past_due: "bg-orange-500/10 text-orange-500",
};
```

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-005b`
2. Pull latest: `git pull origin agent/tkt-005b`
3. Add 'past_due' to STATUS_COLORS in organizations-client.tsx (line 88-93)
4. Add 'past_due' to STATUS_COLORS in retargeting-client.tsx (line 39-44)
5. Run 'pnpm build' and verify it completes successfully
6. Optional: Search for other potential usages with `grep -r 'Record<SubscriptionStatus' apps/ packages/`
7. Commit fixes and push for re-QA

---

## Original Acceptance Criteria

- Full-screen modal appears when org status is 'past_due'
- Admins see 'Update Payment Method' button
- Agents see read-only message directing them to contact admin
- Modal cannot be dismissed without resolving payment

---

## Files in Scope

- `apps/dashboard/src/components/PaymentBlocker.tsx` (already implemented correctly)
- `apps/dashboard/src/app/(dashboard)/layout.tsx` (already implemented correctly)
- `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` (NEEDS FIX)
- `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx` (NEEDS FIX)

---

## Notes

- The core PaymentBlocker implementation is excellent and working correctly
- This is a simple fix: add 2 lines of code total (one in each file)
- The TypeScript compiler caught this at build time - no runtime issues
- Estimated fix time: 5-10 minutes
