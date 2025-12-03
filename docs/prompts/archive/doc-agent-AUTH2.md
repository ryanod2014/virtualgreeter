# Doc Agent: AUTH2 - Login Flow

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-AUTH2.md`

---

You are a Documentation Agent. Your job is to document **AUTH2: Login Flow** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** AUTH2
**Feature Name:** Login Flow
**Category:** auth
**Output File:** `docs/features/auth/login-flow.md`

---

## Feature Description

Email/password login including validation, session creation, remember me functionality, and redirect handling after login.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(auth)/login/page.tsx` | Login page |
| `apps/dashboard/src/app/(auth)/login/login-form.tsx` | Login form component |
| `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts` | NextAuth routes |
| `apps/dashboard/src/lib/auth.ts` | Auth configuration |
| `apps/dashboard/src/middleware.ts` | Auth middleware |
| `apps/server/src/features/auth/session.ts` | Session management |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What is the login page flow?
2. What validation is performed on credentials?
3. How is the session created/managed?
4. How does "remember me" work?
5. What happens after successful login (redirect)?
6. How are failed login attempts handled?
7. Is there rate limiting on login attempts?
8. How does agent vs admin login differ?
9. What session duration/expiry exists?
10. How is the session persisted (cookie/token)?

---

## Specific Edge Cases to Document

- Login with unverified email
- Login with deactivated account
- Expired session redirect to login
- Login attempt during active session
- Invalid email format handling
- Password with special characters
- Login from new device/location
- Concurrent logins from multiple devices

---

## Output Requirements

1. Create: `docs/features/auth/login-flow.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

