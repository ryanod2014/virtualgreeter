# Code Review: STRIPE-003 - Fix Pause/Resume to Update Stripe

> **One-liner to launch:**
> `Read and execute docs/prompts/active/review-agent-STRIPE003-v2.md`

---

You are a Code Review Agent. Your job is to review the code changes for **STRIPE-003: Fix Pause/Resume to Actually Update Stripe** before it goes to QA.

## Your Assignment

**Ticket:** STRIPE-003
**Priority:** P0 Ship Blocker
**Dev Agent:** Dev Agent STRIPE-003-v2
**Branch:** `fix/STRIPE-003-pause-resume`

**Files Changed:**
- `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts` (main implementation)
- Other supporting files (migrations, etc.)

**What Was Changed:**
The `pauseAccount()` and `resumeAccount()` server actions now call Stripe API:
- **Pause:** Calls `stripe.subscriptions.update()` with `pause_collection: { behavior: "void" }`
- **Resume:** Calls `stripe.subscriptions.update()` with `pause_collection: null`

**Why This Matters:**
Previously, pausing/resuming only updated the database. Users who paused were STILL BEING CHARGED by Stripe. This is a P0 ship blocker.

## Your Job

Review the diff and check for issues that automated tests won't catch.

## Review Checklist

### 1. Stripe Integration (CRITICAL)
- [ ] `stripe.subscriptions.update()` called with correct parameters
- [ ] Pause uses `pause_collection: { behavior: "void" }` 
- [ ] Resume uses `pause_collection: null` to remove pause
- [ ] Correct subscription ID retrieved from org
- [ ] Stripe call happens BEFORE database update (so if Stripe fails, we don't mark as paused in DB)

### 2. Error Handling
- [ ] Stripe errors caught and handled
- [ ] User-friendly error messages on Stripe failure
- [ ] Errors logged for debugging
- [ ] No silent failures - if Stripe fails, the operation fails

### 3. Security
- [ ] Stripe client properly imported (server-side only)
- [ ] No hardcoded API keys
- [ ] Authorization checks still in place

### 4. Database Consistency
- [ ] If Stripe succeeds but DB fails, what happens? (Acceptable - user can retry)
- [ ] If Stripe fails, DB should NOT be updated
- [ ] Order of operations: Stripe first, then DB

### 5. Code Quality
- [ ] Follows existing patterns in the codebase
- [ ] No duplicate code
- [ ] Clear variable names
- [ ] Appropriate error messages

## Your SOP

### Step 0: Signal Start (REQUIRED FIRST!)

**Before starting your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent STRIPE-003
- **Ticket:** STRIPE-003
- **Status:** STARTED
- **Branch:** `fix/STRIPE-003-pause-resume`
- **Files Locking:** N/A (review only)
- **Notes:** Beginning code review for Stripe pause/resume
```

### Step 1: Get the Diff

```bash
git diff main..fix/STRIPE-003-pause-resume
```

Focus on:
- `apps/dashboard/src/app/(app)/admin/settings/billing/actions.ts`
- Any Stripe-related files

### Step 2: Verify the Key Changes

1. Check `pauseAccount()` function:
   - Gets `stripe_subscription_id` from organization
   - Calls `stripe.subscriptions.update()` with `pause_collection: { behavior: "void" }`
   - Error handling for Stripe failure
   - Stripe call before database update

2. Check `resumeAccount()` function:
   - Gets `stripe_subscription_id` from organization
   - Calls `stripe.subscriptions.update()` with `pause_collection: null`
   - Error handling for Stripe failure
   - Stripe call before database update

### Step 3: Generate Review Report

```markdown
# Code Review: STRIPE-003 - Fix Pause/Resume to Update Stripe

## Summary
[One sentence: Approve / Request Changes / Needs Discussion]

## Checklist Results

| Category | Status | Notes |
|----------|--------|-------|
| Stripe Integration | ✅/⚠️/❌ | [notes] |
| Error Handling | ✅/⚠️/❌ | [notes] |
| Security | ✅/⚠️/❌ | [notes] |
| Database Consistency | ✅/⚠️/❌ | [notes] |
| Code Quality | ✅/⚠️/❌ | [notes] |

## Critical Verification

### Pause Call
**Function Found:** [Yes/No]
**Stripe Call:** [exact code snippet]
**Order:** [Stripe first, then DB? Yes/No]
**Error Handling:** [Yes/No]

### Resume Call  
**Function Found:** [Yes/No]
**Stripe Call:** [exact code snippet]
**Order:** [Stripe first, then DB? Yes/No]
**Error Handling:** [Yes/No]

## Issues Found

### Issue 1: [Title]
**Severity:** 🔴 Must Fix / 🟡 Should Fix / 🟢 Suggestion
**File:** `path/to/file.ts:123`
**Problem:** [What's wrong]
**Suggestion:** [How to fix]

## Verdict

- [ ] ✅ **APPROVE** - Ready for QA
- [ ] 🔄 **REQUEST CHANGES** - Fix issues first
- [ ] 💬 **NEEDS DISCUSSION** - Unclear on: [what]

## Files Reviewed
- `actions.ts` - ✅ Reviewed
```

### Step 4: Notify PM (REQUIRED!)

**After completing your review, append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent STRIPE-003
- **Ticket:** STRIPE-003
- **Status:** APPROVED / CHANGES_REQUESTED / NEEDS_DISCUSSION
- **Branch:** `fix/STRIPE-003-pause-resume`
- **Output:** Review report above
- **Notes:** [One line summary]
```

---

## ⚠️ REQUIRED: Notify PM When Done

**After completing your work, append this to `docs/agent-inbox/completions.md`:**

### [Current Date/Time]
- **Agent:** Review Agent STRIPE-003
- **Ticket:** STRIPE-003
- **Status:** [STARTED/COMPLETE/BLOCKED]
- **Branch:** fix/STRIPE-003-pause-resume
- **Output:** Review report in chat
- **Notes:** [summary]

**This is mandatory. PM checks this file to update the task board.**

