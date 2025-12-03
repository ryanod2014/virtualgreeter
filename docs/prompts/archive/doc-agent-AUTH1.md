# Doc Agent: AUTH1 - Signup Flow

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-AUTH1.md`

---

You are a Documentation Agent. Your job is to document **AUTH1: Signup Flow** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/visitor/widget-lifecycle.md`

---

## Your Assignment

**Feature ID:** AUTH1
**Feature Name:** Signup Flow
**Category:** auth
**Output File:** `docs/features/auth/signup-flow.md`

---

## Feature Description

The complete user signup flow from landing on signup page through organization creation and redirect to paywall/dashboard.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(auth)/signup/page.tsx` | Signup UI |
| `apps/dashboard/src/app/(auth)/layout.tsx` | Auth layout |
| `apps/dashboard/src/lib/auth/actions.ts` | Auth server actions |
| `apps/dashboard/src/lib/supabase/client.ts` | Supabase client |
| `apps/dashboard/src/lib/supabase/middleware.ts` | Auth middleware |
| Database: `organizations` table | Org creation |
| Database: `agent_profiles` table | Profile creation |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What fields are required for signup?
2. How is the organization created?
3. How is the user's agent profile created?
4. Where does the user go after signup? (paywall vs dashboard)
5. How is email verification handled?
6. What validation exists (email format, password strength)?
7. What happens if signup fails partway through?
8. How is the Supabase auth flow structured?

---

## Specific Edge Cases to Document

- Signup with existing email
- Signup with weak password
- Email verification flow
- Browser closes mid-signup
- OAuth signup (if supported)
- Signup from invite link (different flow)
- Mobile vs desktop signup
- Form validation errors

---

## Output Requirements

1. Create: `docs/features/auth/signup-flow.md`
2. Follow the **exact 10-section format** from the SOP
3. First auth doc - be thorough on Supabase integration details

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

