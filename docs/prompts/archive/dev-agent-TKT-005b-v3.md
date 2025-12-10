# Dev Agent Continuation: TKT-005b-v3

> **Type:** Continuation (QA FAILED - Wrong File Modified)
> **Original Ticket:** TKT-005b
> **Branch:** `agent/tkt-005b` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v3 (previous: v1, v2)

---

## 🔴 PREVIOUS ATTEMPT FAILED - CRITICAL ERROR

**What v2 Dev Agent tried:**
- Modified `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx`
- Added PaymentBlocker import and rendering logic to dashboard-layout-client.tsx

**Why it didn't work:**
The dev agent modified the WRONG file! The ticket specifies modifying `apps/dashboard/src/app/(app)/dashboard/layout.tsx` but the dev agent modified `dashboard-layout-client.tsx` instead.

**Key mistake to avoid:**
- ❌ DO NOT modify dashboard-layout-client.tsx (wrong file!)
- ✅ DO modify layout.tsx (the correct file as specified in the ticket)

---

## ❌ QA FAILED - Component Not Integrated

**QA Summary:**
PaymentBlocker component not integrated into layout - modal never appears despite past_due status.

**Failures Found:**

1. **CRITICAL - AC#1: Modal Does Not Appear**
   - **Expected:** Full-screen modal blocks dashboard when organization.subscription_status === 'past_due'
   - **Actual:** No modal appears. Dashboard loads normally with full access despite past_due status.
   - **Evidence:** Browser test screenshot shows no modal at `docs/agent-output/qa-results/screenshots/TKT-005b/admin-no-modal-past-due.png`

2. **CRITICAL - AC#4: Layout Does Not Check Org Status**
   - **Expected:** Layout file (apps/dashboard/src/app/(app)/layout.tsx) imports PaymentBlocker, checks org status, conditionally renders component
   - **Actual:** Layout does not import PaymentBlocker. No org status checking. No conditional rendering. Component is orphaned.
   - **Evidence:** Code inspection of layout.tsx lines 1-31 shows no PaymentBlocker import or rendering

---

## 🚨 ROOT CAUSE ANALYSIS

The v2 dev agent modified the **WRONG FILE**:
- ❌ Modified: `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx`
- ✅ Should modify: `apps/dashboard/src/app/(app)/layout.tsx`

The ticket explicitly states in files_to_modify:
- `apps/dashboard/src/app/(dashboard)/layout.tsx`

But this was interpreted as the dashboard subdirectory instead of the main app layout!

---

## 📋 WHAT YOU MUST FIX

### Step 1: REMOVE Wrong Changes
Remove or revert the changes from `dashboard-layout-client.tsx` since that's the wrong file.

### Step 2: MODIFY CORRECT FILE
Edit `apps/dashboard/src/app/(app)/layout.tsx` (lines 1-31) to:

1. **Import PaymentBlocker:**
```typescript
import { PaymentBlocker } from "@/components/PaymentBlocker";
```

2. **Check subscription status and render blocker:**
```typescript
// After line 15 where auth is obtained
const showPaymentBlocker = auth.organization.subscription_status === 'past_due';

return (
  <>
    <MobileRedirect />
    {showPaymentBlocker && <PaymentBlocker isAdmin={auth.isAdmin} />}
    <AppShell
      user={auth.profile}
      organization={auth.organization}
      agentProfile={auth.agentProfile}
      isAdmin={auth.isAdmin}
    >
      {children}
    </AppShell>
  </>
);
```

---

## Your Task

1. **Review previous mistakes:**
   ```bash
   # See what was wrongly modified
   git diff main..origin/agent/tkt-005b -- apps/dashboard/src/app/\(app\)/dashboard/dashboard-layout-client.tsx

   # See the CORRECT file that needs modification
   cat apps/dashboard/src/app/\(app\)/layout.tsx
   ```

2. **Checkout existing branch:** `git checkout agent/tkt-005b`

3. **Pull latest:** `git pull origin agent/tkt-005b`

4. **Revert wrong changes:**
   ```bash
   git diff main..origin/agent/tkt-005b -- apps/dashboard/src/app/\(app\)/dashboard/dashboard-layout-client.tsx
   # If there are changes to dashboard-layout-client.tsx, revert them
   ```

5. **Modify the CORRECT file:**
   - Edit `apps/dashboard/src/app/(app)/layout.tsx`
   - Add import for PaymentBlocker
   - Add subscription status check
   - Add conditional rendering

6. **Verify with grep BEFORE claiming completion:**
   ```bash
   # Verify PaymentBlocker is imported in layout.tsx
   grep -n "PaymentBlocker" apps/dashboard/src/app/\(app\)/layout.tsx

   # Should show import and usage!
   ```

7. **Test manually:**
   ```bash
   # Start dev server
   pnpm dev

   # In another terminal, set an org to past_due
   curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
     -H "Content-Type: application/json" \
     -d '{"user_email":"your-test-user@example.com","subscription_status":"past_due"}'

   # Navigate to /admin in browser - modal MUST appear
   ```

8. **Push for re-QA**

---

## Original Acceptance Criteria

- [ ] Full-screen modal appears when org status is 'past_due'
- [ ] Admins see 'Update Payment Method' button
- [ ] Agents see read-only message directing them to contact admin
- [ ] Modal cannot be dismissed without resolving payment

---

## Files in Scope

**CORRECT file to modify:**
- ✅ `apps/dashboard/src/app/(app)/layout.tsx` - ADD INTEGRATION HERE

**File already complete (do not modify):**
- ✅ `apps/dashboard/src/components/PaymentBlocker.tsx` - Component is perfect, leave as-is

**File wrongly modified in v2 (revert if needed):**
- ❌ `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx` - WRONG FILE, revert changes

---

## 📜 Attempt History

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1 | Created PaymentBlocker component | No layout integration - component created but never used |
| v2 | Added integration to dashboard-layout-client.tsx | Wrong file! Ticket specifies layout.tsx, not dashboard-layout-client.tsx |

---

## 🎯 SUCCESS CRITERIA FOR V3

To avoid failing QA again:

1. ✅ PaymentBlocker component remains unchanged (it's already correct)
2. ✅ Modify `apps/dashboard/src/app/(app)/layout.tsx` (NOT dashboard-layout-client.tsx)
3. ✅ Import PaymentBlocker in layout.tsx
4. ✅ Check `auth.organization.subscription_status === 'past_due'`
5. ✅ Conditionally render `<PaymentBlocker isAdmin={auth.isAdmin} />`
6. ✅ Verify with grep that PaymentBlocker appears in layout.tsx
7. ✅ Manual test: Set org to past_due, verify modal appears in browser
8. ✅ Run pnpm typecheck and pnpm build before pushing

---

## ⚠️ IMPORTANT REMINDERS

- The PaymentBlocker component itself is PERFECT - do not touch it
- The issue is ONLY that it's not being used in the correct layout file
- Read the file path carefully: `layout.tsx` not `dashboard-layout-client.tsx`
- Always verify your changes with grep before claiming completion
- Test in a real browser before pushing

---

## 📝 Testing Commands

```bash
# Start dev server
pnpm dev

# In another terminal, create test user and set to past_due
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{"user_email":"test@example.com","subscription_status":"past_due"}'

# Open browser to http://localhost:3000/admin
# Modal MUST appear blocking the dashboard

# Set back to active to verify modal disappears
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{"user_email":"test@example.com","subscription_status":"active"}'

# Refresh browser - modal should be gone
```
