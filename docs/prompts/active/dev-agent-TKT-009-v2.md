# Dev Agent Continuation: TKT-009-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-009  
> **Branch:** `agent/tkt-009` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2 (previous: v1)

---

## 🔴 PREVIOUS ATTEMPT FAILED - DO NOT REPEAT

**What v1 Dev Agent implemented:**
- Added 'Enable Co-Browse' toggle to org settings page
- Stored setting in organization settings
- Widget checks setting before initializing cobrowse sender

**Why it failed:**
- Missing input validation on the settings form

**Key mistake to avoid:**
- Ensure all form inputs have proper validation

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
QA found missing input validation in the settings form.

**Failures Found:**
- Missing input validation

**What You Must Fix:**
- Add validation to settings form
- Ensure toggle state is properly validated before saving

---

## Your Task

1. **Review previous attempt first:**
   ```bash
   git log --oneline -5 origin/agent/tkt-009
   git diff main..origin/agent/tkt-009 -- apps/dashboard/src/app/\(dashboard\)/settings/
   ```
2. Checkout existing branch: `git checkout agent/tkt-009`
3. Pull latest: `git pull origin agent/tkt-009`
4. Read the QA failure report carefully
5. **Understand WHY the previous fix failed before coding**
6. Fix ALL issues identified by QA - add proper input validation
7. Verify with grep/code inspection BEFORE claiming completion
8. Push for re-QA

---

## Original Acceptance Criteria

- [ ] Org settings shows 'Enable Co-Browse' toggle
- [ ] When disabled, co-browse does not initialize for visitors
- [ ] Existing orgs default to enabled (no breaking change)
- [ ] Setting change takes effect on next call (not mid-call)
- [ ] **NEW: Form inputs are properly validated**

---

## Files in Scope

- `apps/dashboard/src/app/(dashboard)/settings/page.tsx`
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts`
- `apps/widget/src/features/cobrowse/cobrowseSender.ts`

---

## 📜 Attempt History

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1 | Added co-browse toggle to settings | Missing input validation |
