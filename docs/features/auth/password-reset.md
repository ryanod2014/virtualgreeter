# Feature: Password Reset (AUTH4)

## Quick Summary
Password reset allows users to recover account access by requesting an email with a secure reset link, then setting a new password. The feature uses Supabase Auth's built-in recovery flow with custom UI pages.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Enables users who have forgotten their password to securely reset it without admin intervention. Provides a self-service recovery path that maintains account security through email verification.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | Regain access to dashboard after forgetting password | Email-based verification ensures secure reset without support tickets |
| Admin | Regain access without exposing org data | Same flow as agents, redirects to appropriate dashboard post-reset |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. User navigates to `/forgot-password` (via login page link)
2. User enters their email address
3. System calls Supabase `resetPasswordForEmail()` with redirect URL
4. Supabase sends email with secure magic link
5. User clicks link in email
6. Browser navigates to `/reset-password` with tokens in URL
7. Supabase parses tokens, fires `PASSWORD_RECOVERY` auth event
8. Page validates session and shows password form
9. User enters new password (with confirmation)
10. System calls Supabase `updateUser()` with new password
11. System checks user role and redirects to appropriate dashboard

### State Machine

```
┌─────────────────┐
│  Login Page     │
│  (entry point)  │
└────────┬────────┘
         │ Click "Forgot password?"
         ▼
┌─────────────────┐
│ Forgot Password │
│    (email)      │
└────────┬────────┘
         │ Submit email
         ▼
┌─────────────────┐
│   Email Sent    │
│  (confirmation) │──────────► Back to login
└────────┬────────┘
         │ Click link in email
         ▼
┌─────────────────┐
│ Validating...   │───┐
│  (loading)      │   │ Invalid/expired
└────────┬────────┘   ▼
         │        ┌─────────────────┐
         │        │  Link Expired   │
         │        │   (error)       │──► Request new link
         │        └─────────────────┘
         │ Valid session
         ▼
┌─────────────────┐
│ Reset Password  │
│   (form)        │
└────────┬────────┘
         │ Submit new password
         ▼
┌─────────────────┐
│    Success!     │
│ (confirmation)  │
└────────┬────────┘
         │ Auto-redirect (2s)
         ▼
┌─────────────────┐
│   Dashboard     │
│ (admin or agent)│
└─────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `forgot-password` | Email entry form | Click "Forgot password?" on login | Submit email, click "Back to login" |
| `email-sent` | Confirmation message shown | Successful email submission | Click "Back to login" |
| `validating` | Loading spinner while checking token | Click email link | Valid session → form, Invalid → error |
| `link-expired` | Error state for invalid/expired tokens | Invalid auth event after 2s timeout | Click "Request new link" |
| `reset-form` | Password entry form | Valid `PASSWORD_RECOVERY` event | Submit valid passwords |
| `success` | Confirmation before redirect | Successful password update | Auto-redirect after 2 seconds |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Form submit (email) | Forgot password page | Calls `supabase.auth.resetPasswordForEmail()` | Supabase sends email, shows confirmation |
| `PASSWORD_RECOVERY` | Supabase auth listener | Validates reset token from URL | Sets `isValidSession = true` |
| `SIGNED_IN` | Supabase auth listener (fallback) | Alternative event sometimes fired | Sets `isValidSession = true` |
| Form submit (password) | Reset password page | Calls `supabase.auth.updateUser()` | Updates password, triggers redirect |
| 2s timeout | Reset password page | Declares token invalid if no auth event | Shows "Link Expired" error |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `ForgotPasswordPage` | `apps/dashboard/src/app/(auth)/forgot-password/page.tsx` | Email entry form, triggers reset email |
| `ResetPasswordPage` | `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | Wrapper with Suspense boundary |
| `ResetPasswordContent` | `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | Token validation, password form, submission |
| `createClient` | `apps/dashboard/src/lib/supabase/client.ts` | Creates browser Supabase client |
| `supabase.auth.resetPasswordForEmail` | Supabase SDK | Sends reset email with magic link |
| `supabase.auth.updateUser` | Supabase SDK | Updates user password |
| `supabase.auth.onAuthStateChange` | Supabase SDK | Listens for auth events |

### Data Flow

```
FORGOT PASSWORD SUBMISSION
    │
    ├─► User: enters email, clicks "Send reset link"
    │
    ├─► Client: supabase.auth.resetPasswordForEmail(email, {
    │       redirectTo: `${origin}/reset-password`
    │   })
    │
    ├─► Supabase: generates secure token, sends email
    │   └─► Email contains: {origin}/reset-password#access_token=...&type=recovery
    │
    └─► UI: shows "Check your email" confirmation

EMAIL LINK CLICKED
    │
    ├─► Browser: navigates to /reset-password#access_token=...&type=recovery
    │
    ├─► Supabase Client: parses URL fragment, validates tokens
    │
    ├─► Supabase: fires auth event
    │   ├─► PASSWORD_RECOVERY (primary event)
    │   └─► SIGNED_IN (fallback event)
    │
    ├─► onAuthStateChange listener:
    │   ├─► if event === "PASSWORD_RECOVERY" && session
    │   │   └─► setIsValidSession(true)
    │   └─► if event === "SIGNED_IN" && session (fallback)
    │       └─► setIsValidSession(true)
    │
    └─► Fallback: 2s timeout → setIsValidSession(false) + error

PASSWORD SUBMISSION
    │
    ├─► User: enters password + confirmation
    │
    ├─► Client-side validation:
    │   ├─► password === confirmPassword? → or error "Passwords don't match"
    │   └─► password.length >= 8? → or error "Password must be at least 8 characters"
    │
    ├─► Client: supabase.auth.updateUser({ password })
    │
    ├─► Supabase: updates password in auth.users table
    │
    ├─► Client: fetch user role from users table
    │   └─► const isAdmin = profile?.role === "admin"
    │
    ├─► UI: shows success confirmation
    │
    └─► setTimeout 2s → window.location.href = isAdmin ? "/admin" : "/dashboard"
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path | Normal flow | Works as designed | ✅ | |
| 2 | Reset request for non-existent email | Submit unknown email | Supabase returns success (no email sent) | ✅ | Security: no email enumeration |
| 3 | Expired reset link clicked | Link older than Supabase expiry | 2s timeout → "Link Expired" error | ✅ | Supabase default: 1 hour |
| 4 | Reset link clicked twice | Second click after password changed | Shows form if session valid, or error | ⚠️ | Depends on Supabase session state |
| 5 | Password same as old password | Enter current password | Supabase accepts it | ⚠️ | No "same password" check |
| 6 | Multiple reset requests in sequence | Click "Send" multiple times | Supabase sends multiple emails | ⚠️ | No client-side debounce |
| 7 | Reset during active session | Already logged in, click reset link | Creates new session, resets password | ✅ | Works correctly |
| 8 | Reset token URL manipulation | Tamper with token in URL | Supabase validation fails → error | ✅ | Cryptographic security |
| 9 | Password too short | Enter < 8 characters | Client error "Password must be at least 8 characters" | ✅ | |
| 10 | Password mismatch | Passwords don't match | Client error "Passwords don't match" | ✅ | |
| 11 | Network error during submission | Lost connection | Supabase error message shown | ✅ | |
| 12 | Page refresh during reset | F5 on reset-password page | Re-validates via getSession() | ✅ | 100ms delay for URL parsing |
| 13 | Back navigation after success | Browser back button | May show form again (stale state) | ⚠️ | No history management |
| 14 | Email delivery delay | Email arrives after token expiry | Click fails with "Link Expired" | ✅ | Expected behavior |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Invalid token | Tampered/malformed URL | "This password reset link is invalid or has expired" | Click "Request new link" → forgot-password |
| Expired token | Token > 1 hour old | "This password reset link is invalid or has expired" | Click "Request new link" → forgot-password |
| Password mismatch | Passwords don't match | "Passwords don't match" (inline error) | Re-enter matching passwords |
| Password too short | < 8 characters | "Password must be at least 8 characters" (inline error) | Enter longer password |
| Supabase error | Network/server issue | Error message from Supabase | Retry submission |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Forgot Password Page:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to /forgot-password | Shows email form with back link | ✅ | |
| 2 | Enter email | Input validates (required, email format) | ✅ | |
| 3 | Click "Send reset link" | Shows loading spinner | ✅ | |
| 4 | Wait for response | Shows "Check your email" confirmation | ✅ | |
| 5 | Click "Back to login" | Returns to login page | ✅ | |

**Reset Password Page:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click link in email | Shows loading spinner | ✅ | |
| 2 | Wait for validation | Shows password form OR error | ✅ | 2s timeout may feel slow |
| 3 | Enter new password | Shows helper text "Must be at least 8 characters" | ✅ | |
| 4 | Enter confirmation | Input validates on submit | ✅ | |
| 5 | Click "Update password" | Shows loading spinner | ✅ | |
| 6 | Wait for update | Shows success + "Redirecting..." | ✅ | |
| 7 | Auto-redirect | Goes to /admin or /dashboard | ✅ | Based on user role |

### Accessibility
- Keyboard navigation: ✅ Standard form controls, tab order correct
- Screen reader support: ✅ Labels associated with inputs via `htmlFor`
- Color contrast: ⚠️ Not verified (uses theme colors)
- Loading states: ✅ Loader2 spinner + disabled button + status text
- Error announcements: ⚠️ Errors shown visually but no aria-live regions
- Focus management: ⚠️ No focus trap in modal-like card

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Form re-renders | useRef for inputs (no controlled state) | ✅ Optimized |
| Auth listener cleanup | useEffect cleanup unsubscribes | ✅ No memory leaks |
| Session check delay | 100ms setTimeout before getSession() | ✅ Prevents race condition |
| Redirect timing | 2s setTimeout before navigation | ✅ Allows reading success message |

### Security
| Concern | Mitigation |
|---------|------------|
| Token exposure in URL | Tokens in URL fragment (#) not sent to server |
| Email enumeration | Supabase returns success for all emails |
| Brute force protection | Handled by Supabase rate limiting |
| Password strength | 8 character minimum enforced client-side |
| Session hijacking | Supabase handles secure session management |
| XSS in email | Supabase controls email template |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Token validation race | 100ms delay + 2s timeout + ref to prevent double-fire |
| Network failure | Supabase error messages propagated to UI |
| Email delivery | Depends on Supabase email provider (not configurable) |
| Browser back button | No special handling (may cause confusion) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Standard "forgot password" → "email link" → "new password" flow that users expect
2. **Is the control intuitive?** ✅ Yes - Clear CTA buttons, minimal form fields
3. **Is feedback immediate?** ✅ Yes - Loading states, success/error messages shown promptly
4. **Is the flow reversible?** ✅ Yes - Can navigate back to login at any point before completion
5. **Are errors recoverable?** ✅ Yes - "Request new link" option for expired tokens, inline errors for validation
6. **Is the complexity justified?** ✅ Yes - Uses Supabase built-in functionality, minimal custom code

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No client-side debounce on email submit | Multiple emails possible | 🟢 Low | Add 1s debounce or disable button after first click |
| No "same as old password" check | User might set identical password | 🟢 Low | Not critical - password is being reset anyway |
| 2s timeout may feel slow | User waits for "Link Expired" | 🟢 Low | Could reduce to 1.5s |
| No password strength indicator | User doesn't know if password is strong | 🟢 Low | Could add strength meter |
| Back navigation after success shows stale state | Confusion if user hits back | 🟢 Low | Could use router.replace or history.replaceState |
| No confirmation for password visibility | User can't verify what they typed | 🟡 Medium | Add show/hide password toggle |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Forgot password page | `apps/dashboard/src/app/(auth)/forgot-password/page.tsx` | 1-136 | Email form, reset email trigger |
| Reset password page | `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | 1-278 | Token validation, password form |
| Token validation logic | `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | 24-75 | Auth event listener + timeout |
| Password validation | `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | 77-132 | Length + match checks |
| Role-based redirect | `apps/dashboard/src/app/(auth)/reset-password/page.tsx` | 111-131 | Checks user role for redirect |
| Supabase client (browser) | `apps/dashboard/src/lib/supabase/client.ts` | 1-10 | Browser client factory |
| Login page (entry point) | `apps/dashboard/src/app/(auth)/login/page.tsx` | 108-113 | "Forgot password?" link |

---

## 9. RELATED FEATURES
- [Login Flow](./login-flow.md) - Entry point to password reset via "Forgot password?" link
- [Signup Flow](./signup-flow.md) - New users create password during signup

---

## 10. OPEN QUESTIONS

1. **What is the exact token expiration time?** - Supabase default is 1 hour, but this may be configurable in Supabase dashboard. Not exposed in code.

2. **Are existing sessions invalidated on password reset?** - Code does not explicitly invalidate other sessions. Supabase may handle this, but behavior is not verified.

3. **Is there rate limiting on forgot-password requests?** - Supabase has built-in rate limiting, but the specific limits are not documented in this codebase.

4. **What email template is used?** - Supabase sends the email using its built-in templates. Custom templates may be configured in Supabase dashboard but are not managed in this codebase.

5. **Should password requirements be stricter?** - Currently only 8 character minimum. No requirements for uppercase, numbers, or special characters.

