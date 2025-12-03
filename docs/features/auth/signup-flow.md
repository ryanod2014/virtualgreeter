# Feature: Signup Flow (AUTH1)

## Quick Summary
The signup flow enables new users to create an account with their email, phone, and password. A database trigger automatically provisions their organization, user record, and inactive agent profile. After signup, users are redirected directly to the admin dashboard.

## Affected Users
- [x] Website Visitor (becomes Admin)
- [ ] Agent (created via invite flow instead)
- [ ] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The signup flow is the primary self-service account creation path for new customers. It:
- Collects user identification (name, email, phone)
- Creates authentication credentials via Supabase Auth
- Auto-provisions an organization for the new user
- Creates a user record with "admin" role
- Creates an inactive agent profile (for future call-taking)
- Tracks funnel conversion for analytics

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Prospective Customer | Create an account quickly | Simple 4-field form with instant account creation |
| Marketing Team | Track conversion funnel | Funnel events fire on page view and signup completion |
| New Admin | Start using the product | Auto-redirects to admin dashboard after signup |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. User navigates to `/signup`
2. Funnel tracking fires "signup" pageview event
3. User enters full name, email, phone, and password
4. User clicks "Create account"
5. Client calls `supabase.auth.signUp()` with email, password, and metadata
6. Supabase Auth creates user in `auth.users`
7. Database trigger `handle_new_user()` fires automatically
8. Trigger creates: organization → user → agent_profile
9. Client fires "signup_complete" conversion event
10. User is redirected to `/admin` dashboard

### State Machine

```
┌─────────────┐
│    IDLE     │ ← Initial state: form ready
└─────┬───────┘
      │ User submits form
      ▼
┌─────────────┐
│   LOADING   │ ← Button shows spinner, disabled
└─────┬───────┘
      │
      ├──────────────────┐
      │ Error            │ Success
      ▼                  ▼
┌─────────────┐    ┌─────────────┐
│    ERROR    │    │  SUCCESS    │
│  (shows msg)│    │ (redirect)  │
└─────────────┘    └─────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Idle | Form displayed, ready for input | Initial page load | Submit form |
| Loading | Form submitted, awaiting response | Click "Create account" | Response received |
| Error | Error message displayed | Supabase returns error | User corrects and resubmits |
| Success | Account created | Supabase signup succeeds | Hard redirect to /admin |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `useEffect` | Tracks funnel event | `trackFunnelEvent(FUNNEL_STEPS.SIGNUP)` |
| Form submit | `handleSubmit` | Initiates signup | Sets `isLoading=true` |
| `supabase.auth.signUp()` | Client | Creates auth user | Triggers `handle_new_user` |
| Signup success | `handleSubmit` | Tracks conversion | `trackFunnelEvent(SIGNUP_COMPLETE)` |
| Redirect | After success | Navigation | `window.location.href = "/admin"` |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `SignupPage` | `apps/dashboard/src/app/(auth)/signup/page.tsx` | Main signup form UI |
| `handleSubmit` | `signup/page.tsx:24` | Form submission handler |
| `createClient` | `lib/supabase/client.ts` | Browser Supabase client |
| `handle_new_user` | Database trigger | Auto-provisions org/user/profile |
| `trackFunnelEvent` | `lib/funnel-tracking.ts` | Analytics tracking |

### Data Flow

```
USER SUBMITS FORM
    │
    ├─► Extract values from refs: fullName, email, phone, password
    │
    ├─► Call supabase.auth.signUp({
    │       email,
    │       password,
    │       options: { data: { full_name, phone } }
    │   })
    │
    └─► Supabase Auth creates row in auth.users

DATABASE TRIGGER FIRES (handle_new_user)
    │
    ├─► Check: User already exists in users table? → SKIP (invite flow)
    │
    ├─► Check: Pending invite for this email? → SKIP (invite flow)
    │
    ├─► Extract user_name from:
    │   1. raw_user_meta_data->>'full_name' OR
    │   2. raw_user_meta_data->>'name' OR
    │   3. split_part(email, '@', 1)
    │
    ├─► Extract user_phone from raw_user_meta_data->>'phone'
    │
    ├─► INSERT into organizations:
    │   - name: "[user_name]'s Organization"
    │   - slug: "[user_name]-[uuid8]"
    │   - plan: 'free' (default)
    │   - max_agents: 1 (default)
    │
    ├─► INSERT into users:
    │   - id: NEW.id (auth user id)
    │   - organization_id: new_org_id
    │   - email, full_name, phone
    │   - role: 'admin'
    │
    └─► INSERT into agent_profiles:
        - user_id: NEW.id
        - organization_id: new_org_id
        - display_name: user_name
        - is_active: FALSE  ← Important: Not billed until activated
```

### Form Fields Specification

| Field | HTML Type | Required | Validation | Metadata Key |
|-------|-----------|----------|------------|--------------|
| Full Name | `text` | Yes | HTML required | `full_name` |
| Email | `email` | Yes | HTML type validation | (auth field) |
| Phone | `tel` | Yes | HTML required only | `phone` |
| Password | `password` | Yes | minLength=8 | (auth field) |

### Password Requirements
- **Client-side:** HTML `minLength={8}` attribute
- **Server-side:** Supabase Auth default (minimum 6 characters)
- **UI hint:** "Must be at least 8 characters"

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path | Valid form submission | Account created, redirect to /admin | ✅ | |
| 2 | Signup with existing email | Submit with taken email | Error: "User already registered" | ✅ | Supabase error |
| 3 | Signup with invalid email format | Submit malformed email | Browser prevents submit | ✅ | HTML validation |
| 4 | Signup with short password | Submit <8 char password | Browser prevents submit | ✅ | HTML minLength |
| 5 | Signup with weak password | Submit 8+ char weak password | Supabase may accept | ⚠️ | No strength meter |
| 6 | Empty full name | Submit empty name | Browser prevents submit | ✅ | HTML required |
| 7 | Empty phone | Submit empty phone | Browser prevents submit | ✅ | HTML required |
| 8 | Invalid phone format | Submit invalid phone | Signup succeeds | ⚠️ | No format validation |
| 9 | Network failure | Submit with no connection | Generic error displayed | ✅ | Caught by try/catch |
| 10 | Already logged in | Visit /signup while authenticated | Redirect based on role | ✅ | Middleware handles |
| 11 | Double submit | Rapid button clicks | Button disabled during load | ✅ | isLoading state |
| 12 | Browser closes mid-signup | Close before response | Incomplete signup lost | ✅ | Expected |
| 13 | Invite exists for email | Signup with invited email | Trigger skips, invite flow handles | ✅ | Separate path |
| 14 | Supabase service down | Submit to unavailable service | Error displayed | ✅ | |
| 15 | Special chars in name | Submit name with quotes/unicode | Handled correctly | ✅ | DB escapes |
| 16 | Email verification required | Supabase configured to require | User may land on unverified | ⚠️ | See notes |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| "User already registered" | Email exists in auth.users | Red error banner | Use login or forgot password |
| "Invalid email" | Malformed email format | Browser validation tooltip | Fix email format |
| "Password too short" | Password < 8 characters | Browser validation tooltip | Enter longer password |
| Network error | Connection lost | Generic error message | Retry submission |
| Rate limited | Too many attempts | Supabase rate limit error | Wait and retry |

### Email Verification Note
The current implementation redirects immediately to `/admin` after signup. If Supabase is configured to require email verification:
- User will be created but unverified
- Middleware may still allow access (checks auth, not verification)
- This could be a security consideration

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Land on /signup | See signup form with logo | ✅ | Clean design |
| 2 | See form fields | 4 fields with icons, labels | ✅ | Good visual hierarchy |
| 3 | Enter full name | Input with user icon | ✅ | Placeholder: "John Doe" |
| 4 | Enter email | Input with mail icon | ✅ | Placeholder: "you@example.com" |
| 5 | Enter phone | Input with phone icon | ✅ | Placeholder: "(555) 123-4567" |
| 6 | Enter password | Input with lock icon | ✅ | Helper text explains 8 char min |
| 7 | Submit form | Button shows loading spinner | ✅ | "Creating account..." text |
| 8 | See error | Red banner at top of form | ✅ | Clear error message |
| 9 | Success | Hard redirect to /admin | ⚠️ | No success feedback before redirect |
| 10 | Already have account? | Link to login visible | ✅ | At bottom of form |

### Accessibility
- **Keyboard navigation:** ✅ Standard form tab order
- **Screen reader support:** ✅ Labels with `htmlFor` attributes
- **Color contrast:** ✅ Error text has destructive color with border
- **Loading states:** ✅ Spinner and text change on loading
- **Focus indicators:** ✅ Focus ring on inputs

### Consent Notice
The signup form includes consent text:
> "By providing my email address, phone number and clicking 'Create account', I consent to receive email messages, texts & calls from GreetNow, and to the Terms of Service and Privacy Policy."

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Form rendering | Client component with refs | ✅ Optimized |
| Supabase client | Browser client, single instance | ✅ Standard |
| Redirect method | `window.location.href` (hard) | ✅ Ensures cookies sent |
| Funnel tracking | Async, non-blocking | ✅ Doesn't delay signup |

### Security
| Concern | Mitigation |
|---------|------------|
| Password transmission | HTTPS to Supabase |
| SQL injection | Supabase parameterized queries |
| XSS in error messages | React escapes by default |
| CSRF | Supabase cookie-based auth |
| Brute force | Supabase rate limiting |
| Password storage | Supabase bcrypt hashing |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Partial signup | DB trigger is transactional |
| Network failure | Error state with retry option |
| Duplicate accounts | Email uniqueness in auth.users |
| Org slug collision | UUID suffix ensures uniqueness |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Standard signup form pattern
2. **Is the control intuitive?** ✅ Yes - Single button, clear labels
3. **Is feedback immediate?** ⚠️ Mostly - No success state before redirect
4. **Is the flow reversible?** ✅ Yes - Can login instead via link
5. **Are errors recoverable?** ✅ Yes - Form retains values, shows error
6. **Is the complexity justified?** ✅ Yes - Minimal fields for quick signup

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No phone format validation | Invalid phone numbers stored | 🟡 Medium | Add format validation |
| No password strength indicator | Users may choose weak passwords | 🟢 Low | Add strength meter |
| No success feedback | Abrupt redirect may confuse | 🟢 Low | Brief success state |
| Paywall bypassed | Comment says "TODO: Re-enable paywall" | 🟡 Medium | Re-enable when ready |
| Agent profile inactive by default | New admins can't take calls immediately | ✅ Intentional | Avoids surprise billing |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Signup page component | `apps/dashboard/src/app/(auth)/signup/page.tsx` | 1-205 | Main UI |
| Form submission handler | `signup/page.tsx` | 24-64 | `handleSubmit` function |
| Supabase client (browser) | `apps/dashboard/src/lib/supabase/client.ts` | 1-10 | Browser client factory |
| Funnel tracking | `apps/dashboard/src/lib/funnel-tracking.ts` | 1-101 | Analytics utilities |
| Funnel step constants | `funnel-tracking.ts` | 84-101 | `FUNNEL_STEPS` |
| Auth middleware | `apps/dashboard/src/lib/supabase/middleware.ts` | 1-80 | Route protection |
| Main middleware | `apps/dashboard/middleware.ts` | 1-21 | Middleware config |
| Database trigger | `supabase/migrations/20251201000000_add_user_phone.sql` | 11-63 | `handle_new_user()` |
| Auth callback | `apps/dashboard/src/app/auth/callback/route.ts` | 1-36 | Email verification callback |
| Server actions (unused) | `apps/dashboard/src/lib/auth/actions.ts` | 6-30 | Server-side signUp |
| Auth layout | `apps/dashboard/src/app/(auth)/layout.tsx` | 1-8 | Passthrough layout |

---

## 9. RELATED FEATURES
- [Login Flow](./login-flow.md) - Existing user authentication (AUTH2)
- [Invite Accept](./invite-accept.md) - Team member signup via invite (AUTH3)
- [Password Reset](./password-reset.md) - Password recovery flow (AUTH4)
- [Widget Lifecycle](../visitor/widget-lifecycle.md) - End-user experience
- [Billing: Subscription Creation](../billing/subscription-creation.md) - Post-signup billing

---

## 10. OPEN QUESTIONS

1. **Email verification:** Is Supabase configured to require email verification? Current code redirects directly to /admin without checking verification status.

2. **Paywall re-enablement:** The code has `// TODO: Re-enable paywall redirect once billing is set up`. What's the timeline for enabling this?

3. **Phone validation:** Should we add proper phone number format validation (E.164, country code)? Currently accepts any string.

4. **OAuth support:** Will OAuth providers (Google, GitHub) be supported for signup? Currently only email/password.

5. **Terms/Privacy links:** The `/terms` and `/privacy` links in the consent text - are these pages implemented?

6. **Organization naming:** Is "[Name]'s Organization" the final format? Should admins be prompted to rename during onboarding?

7. **Server action vs client:** There's a server-side `signUp` action that isn't used. Should the client switch to server actions for better security?

---

## Database Schema Reference

### organizations table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | Primary key |
| name | TEXT | Required | "[user]'s Organization" |
| slug | TEXT | Required | Unique, URL-safe |
| plan | TEXT | 'free' | free/starter/pro/enterprise |
| max_agents | INTEGER | 1 | Seat limit |
| max_sites | INTEGER | 1 | Site limit |

### users table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | - | FK to auth.users, PK |
| organization_id | UUID | Required | FK to organizations |
| email | TEXT | Required | |
| full_name | TEXT | Required | |
| phone | TEXT | NULL | Optional |
| role | TEXT | 'agent' | admin/agent |

### agent_profiles table
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID | gen_random_uuid() | Primary key |
| user_id | UUID | Required | FK to users, unique |
| organization_id | UUID | Required | FK to organizations |
| display_name | TEXT | Required | |
| is_active | BOOLEAN | true | FALSE for new signups |
| status | TEXT | 'offline' | offline/idle/in_simulation/in_call |



