# Dev Agent Continuation: TKT-005b-v5 - Fix Server-Side Data Caching Bug

> **Type:** Continuation (QA FAILED - Server-Side Caching Issue)
> **Original Ticket:** TKT-005b
> **Branch:** `agent/tkt-005b` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v5 (previous: v1, v2, v3, v4)

---

## 🔴 CRITICAL: NEW FAILURE MODE - Server-Side Caching Bug

**What Changed:**
- v4 PASSED QA at 2025-12-09T22:28:30Z ✅
- v4 FAILED QA at 2025-12-10T06:04:32Z ❌ (same code, different result)

**The Issue:**
The PaymentBlocker modal implementation is correct, but it does NOT appear because `getCurrentUser()` returns **stale/cached organization data**.

---

## ❌ QA FAILED - Server-Side Data Fetching Issue

**QA Summary:**
PaymentBlocker modal does not appear when org status is past_due - server-side data caching issue

**What QA Found:**

1. ✅ **Database shows correct status:** `subscription_status = "past_due"` (confirmed via API)
2. ✅ **Component code is correct:** PaymentBlocker.tsx properly renders when `isPastDue = true`
3. ✅ **Layout integration is correct:** admin-layout-client.tsx checks `organization.subscription_status === "past_due"`
4. ❌ **Server-side data is STALE:** `getCurrentUser()` returns `subscription_status = "active"` even when DB shows "past_due"

**Evidence:**
```bash
# Database (via QA API)
$ curl http://localhost:3456/api/v2/qa/org-by-email/qa-admin@test
{"organization": {"subscription_status": "past_due"}}  ← CORRECT

# Browser receives (via getCurrentUser)
organization.subscription_status === "active"  ← STALE/CACHED
```

---

## 🚨 ROOT CAUSE: getCurrentUser() Returns Stale Data

**File:** `apps/dashboard/src/lib/auth/actions.ts`
**Function:** `getCurrentUser()`

This function either:
1. Has aggressive server-side caching that doesn't invalidate when subscription_status changes
2. Doesn't properly fetch/join the latest organization data from the database
3. Uses a cached session object that was created before the status changed

**The layout receives stale organization objects, so the modal never renders.**

---

## YOUR TASK: Fix Server-Side Data Caching

### Step 1: Understand getCurrentUser()

```bash
# Read the getCurrentUser implementation
cat apps/dashboard/src/lib/auth/actions.ts
```

Look for:
- How does it fetch organization data?
- Is there caching involved? (React cache, Next.js cache, Supabase cache)
- Does it JOIN organization data or rely on session data?

### Step 2: Identify the Caching Issue

Common causes:
- Next.js Route Cache: `export const dynamic = 'force-dynamic'` missing
- React Cache: Using `cache()` wrapper without revalidation
- Supabase: Session object contains stale organization data
- Query caching: Organization query needs `revalidate: 0`

### Step 3: Implement the Fix

**Option A: Force Fresh Organization Data**

If getCurrentUser uses session data, add a fresh DB query for organization:

```typescript
export async function getCurrentUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ❌ OLD: Don't use session/cached org data
  // const organization = user?.organization;

  // ✅ NEW: Fetch fresh organization data
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', user?.organization_id)
    .single();

  return { user, organization };
}
```

**Option B: Disable Server-Side Caching**

If the layout is being cached, add to `apps/dashboard/src/app/(app)/admin/layout.tsx`:

```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCurrentUser(); // Now will fetch fresh data
  // ...
}
```

**Option C: Add Cache Invalidation**

If using React cache, ensure organization data isn't cached:

```typescript
import { unstable_noStore as noStore } from 'next/cache';

export async function getCurrentUser() {
  noStore(); // Opt out of caching
  // ... fetch user and organization
}
```

### Step 4: Test the Fix

```bash
# 1. Start dev server
pnpm dev

# 2. Create test user and set status to past_due
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -d '{"email": "test@test.com", "password": "test123"}'

curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -d '{"user_email": "test@test.com", "subscription_status": "past_due"}'

# 3. Log in to dashboard and verify modal appears
# 4. Change status back to active and verify modal disappears
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -d '{"user_email": "test@test.com", "subscription_status": "active"}'
```

**The modal MUST appear immediately after setting status to past_due.**

---

## VERIFICATION BEFORE COMPLETION

Run these commands to verify your fix:

```bash
# 1. Check if you added cache opt-out
grep -r "force-dynamic\|noStore\|revalidate.*0" apps/dashboard/src/app/\(app\)/admin/layout.tsx apps/dashboard/src/lib/auth/actions.ts

# 2. Verify getCurrentUser fetches fresh organization data
grep -A10 "getCurrentUser" apps/dashboard/src/lib/auth/actions.ts

# 3. Run typecheck
pnpm typecheck
```

**DO NOT claim completion unless:**
1. You can explain WHAT was causing the stale data
2. You implemented a fix (Option A, B, C, or similar)
3. You manually tested that changing subscription_status in DB reflects immediately in the UI

---

## FILES TO MODIFY

| File | Action |
|------|--------|
| `apps/dashboard/src/lib/auth/actions.ts` | Fix getCurrentUser() to fetch fresh organization data OR add cache opt-out |
| `apps/dashboard/src/app/(app)/admin/layout.tsx` | Possibly add `export const dynamic = 'force-dynamic'` |
| `apps/dashboard/src/app/(app)/dashboard/layout.tsx` | Possibly add `export const dynamic = 'force-dynamic'` (if not already fixed) |

**DO NOT TOUCH:**
- `apps/dashboard/src/components/PaymentBlocker.tsx` (already correct)
- `apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx` (already correct)
- `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx` (already correct)

---

## 📜 ATTEMPT HISTORY

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1-v3 | Layout integration issues | Fixed - modal now integrated in both layouts |
| v4 | Layout integration completed | Initially PASSED, then FAILED - server-side caching returns stale org data |

**v4 Passed Then Failed:** The UI implementation is correct, but the server-side data fetching has a caching bug that wasn't caught in earlier tests. This is NOT a UI issue - it's a data fetching/caching issue.

---

## ACCEPTANCE CRITERIA (Unchanged)

After your fix, QA will verify:
- [ ] Modal appears on `/admin/*` routes when org is `past_due`
- [ ] Modal appears on `/dashboard/*` routes when org is `past_due`
- [ ] Changing subscription_status in DB immediately reflects in UI (no stale data)
- [ ] Admin users see "Update Payment Method" button
- [ ] Non-admin users see "Contact admin" message

---

## COMPLETION CHECKLIST

Before writing your completion report:
- [ ] I identified WHERE the stale data was coming from
- [ ] I implemented a fix (Option A, B, C, or equivalent)
- [ ] I tested that changing subscription_status in DB reflects immediately in UI
- [ ] pnpm typecheck passes
- [ ] I committed and pushed my changes

**Write a clear explanation in your completion report:**
- What was causing the stale data?
- What did you change to fix it?
- How did you verify the fix works?
