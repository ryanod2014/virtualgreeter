# Doc Agent: AUTH4 - Password Reset

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-AUTH4.md`

---

You are a Documentation Agent. Your job is to document **AUTH4: Password Reset** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** AUTH4
**Feature Name:** Password Reset
**Category:** auth
**Output File:** `docs/features/auth/password-reset.md`

---

## Feature Description

Forgot password flow including email request, token generation, reset link delivery, and password update with validation.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(auth)/forgot-password/page.tsx` | Forgot password page |
| `apps/dashboard/src/app/reset-password/page.tsx` | Reset password page |
| `apps/dashboard/src/app/reset-password/[token]/page.tsx` | Token-based reset |
| `apps/dashboard/src/app/api/auth/forgot-password/route.ts` | Request reset API |
| `apps/dashboard/src/app/api/auth/reset-password/route.ts` | Reset password API |
| `apps/server/src/features/auth/password-reset.ts` | Reset logic |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What is the forgot password flow?
2. How long is the reset token valid?
3. What does the reset email contain?
4. What password requirements exist?
5. How is the new password validated?
6. Are existing sessions invalidated?
7. Is there rate limiting on reset requests?
8. What happens with non-existent email?
9. How is the token securely generated?
10. What confirmation is shown after reset?

---

## Specific Edge Cases to Document

- Reset request for non-existent email
- Expired reset link clicked
- Reset link clicked twice
- Password same as old password
- Multiple reset requests in sequence
- Reset during active session
- Reset token URL manipulation
- Email delivery delay exceeds token expiry

---

## Output Requirements

1. Create: `docs/features/auth/password-reset.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

