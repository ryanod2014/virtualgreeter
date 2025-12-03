# Feature: Invite Accept (AUTH3)

## Quick Summary
The Invite Accept flow enables new team members to join an organization by clicking an email invite link, validating their invitation token, and creating their account with password authentication to join as either an Agent or Admin.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Invite Accept feature provides a secure, self-service onboarding path for new team members to join an existing organization. It handles account creation, role assignment, billing seat allocation, and agent profile setup in a single streamlined flow.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Invited User | Join the team quickly | Single-page form with pre-filled email and name |
| Invited User | Set up secure account | Password creation with validation |
| Admin (inviting) | Add team members without manual setup | Automated account provisioning |
| Admin (accepting) | Choose whether to also take calls | Option to become an agent or admin-only |
| Organization | Control access | Role-based permissions from invite |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin sends invite via Agent Management page
2. Invited user receives email with invite link
3. User clicks link → `/accept-invite?token={token}`
4. Page fetches and validates invite by token
5. User sees form with pre-filled email/name, enters password
6. For admin invites: User chooses whether to take calls
7. User submits form
8. System creates auth user → user record → agent profile (if applicable)
9. Invite marked as accepted
10. User redirected to `/admin` dashboard

### State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INVITE LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   [PENDING]                                                              │
│      │                                                                   │
│      ├──▶ Click Link ──▶ [VALIDATING]                                   │
│      │                       │                                           │
│      │                       ├──▶ Invalid/Expired ──▶ [ERROR]           │
│      │                       │                                           │
│      │                       └──▶ Valid ──▶ [FORM_DISPLAYED]            │
│      │                                          │                        │
│      │                                          ├──▶ Submit ──▶ [CREATING_ACCOUNT]
│      │                                          │                   │    │
│      │                                          │                   │    │
│      │                                          │                   ▼    │
│      │                                          │              [ACCEPTED]│
│      │                                          │                   │    │
│      │                                          │                   ▼    │
│      │                                          │           Redirect to /admin
│      │                                          │                        │
│      ├──▶ Revoked by Admin ──▶ [DELETED]                                │
│      │                                                                   │
│      └──▶ 7 days pass ──▶ [EXPIRED]                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `pending` | Invite created, awaiting acceptance | Admin sends invite | Accepted, revoked, or expired |
| `validating` | Token being checked | User loads page with token | Valid or invalid result |
| `form_displayed` | User sees acceptance form | Token validated successfully | Form submitted |
| `creating_account` | Account being created | User submits form | Success or error |
| `accepted` | Invite used, user created | Account created successfully | N/A (terminal) |
| `expired` | 7-day window passed | Time elapsed | N/A (terminal) |
| `revoked` | Admin cancelled invite | Admin clicks revoke | N/A (invite deleted) |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Invite link clicked | Email → Browser | Loads accept-invite page with token | Page fetch, token validation |
| Token validation | Page load | Queries `invites` table | None |
| Form submission | Accept form | Creates account + marks accepted | Auth user, user record, agent profile, billing seat |
| Password validation | Client-side | Checks min length, match | Error display |
| Admin role choice | Form (admin invites only) | Sets willTakeCalls flag | Determines agent profile creation |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AcceptInviteContent` | `apps/dashboard/src/app/accept-invite/page.tsx` | Main acceptance form component |
| `fetchInvite()` | `apps/dashboard/src/app/accept-invite/page.tsx:31-57` | Validates token and fetches invite data |
| `handlePasswordSignup()` | `apps/dashboard/src/app/accept-invite/page.tsx:63-166` | Creates account and marks invite accepted |
| `/api/invites/send` | `apps/dashboard/src/app/api/invites/send/route.ts` | Creates invite and sends email |
| `/api/invites/revoke` | `apps/dashboard/src/app/api/invites/revoke/route.ts` | Deletes pending invite |
| `/api/billing/seats` | `apps/dashboard/src/app/api/billing/seats/route.ts` | Manages seat billing |
| `handle_new_user()` | Database trigger | Skips auto-org creation for invited users |

### Data Flow

```
USER CLICKS INVITE LINK
    │
    ├─► Browser: Navigate to /accept-invite?token={token}
    │
    ├─► React: useEffect → fetchInvite()
    │   │
    │   ├─► Supabase Query:
    │   │   SELECT *, organization:organizations(name)
    │   │   FROM invites
    │   │   WHERE token = {token}
    │   │     AND accepted_at IS NULL
    │   │     AND expires_at > NOW()
    │   │
    │   ├─► If error/no data → Show "Invalid Invitation" error
    │   │
    │   └─► If valid → Set invite state, pre-fill form
    │
USER SUBMITS FORM
    │
    ├─► Client Validation:
    │   ├─► Password length >= 8
    │   └─► Password === confirmPassword
    │
    ├─► Supabase Auth: signUp({ email, password, metadata: { full_name } })
    │   │
    │   └─► Creates auth.users record
    │
    ├─► Supabase: INSERT INTO users
    │   { id, organization_id, email, full_name, role }
    │
    ├─► If role === 'agent' OR (role === 'admin' AND willTakeCalls):
    │   │
    │   ├─► If admin taking calls: POST /api/billing/seats { action: 'add', quantity: 1 }
    │   │   (Agent seats already charged at invite send time)
    │   │
    │   └─► Supabase: INSERT INTO agent_profiles
    │       { user_id, organization_id, display_name, is_active: true }
    │
    ├─► Supabase: UPDATE invites SET accepted_at = NOW() WHERE id = {invite.id}
    │
    └─► Redirect: window.location.href = "/admin"
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - Agent invite | Valid token | Account created, agent profile created | ✅ | |
| 2 | Happy path - Admin invite (takes calls) | Valid token + willTakeCalls=true | Account created, agent profile created, seat added | ✅ | |
| 3 | Happy path - Admin invite (no calls) | Valid token + willTakeCalls=false | Account created, NO agent profile | ✅ | Free admin |
| 4 | No token provided | `/accept-invite` (no query param) | Shows "Invalid invite link - no token provided" | ✅ | |
| 5 | Invalid token | Non-existent token | Shows "This invite is invalid or has expired" | ✅ | |
| 6 | Expired invite | Token exists but expires_at < NOW() | Shows "This invite is invalid or has expired" | ✅ | |
| 7 | Already accepted invite | accepted_at IS NOT NULL | Shows "This invite is invalid or has expired" | ✅ | Same message as invalid |
| 8 | Revoked invite | Invite deleted by admin | Shows "This invite is invalid or has expired" | ✅ | Token not found |
| 9 | Password too short | < 8 characters | Client-side error "Password must be at least 8 characters" | ✅ | |
| 10 | Passwords don't match | Mismatch | Client-side error "Passwords don't match" | ✅ | |
| 11 | Email already registered | Same email exists in auth.users | Supabase error "User already registered" | ✅ | |
| 12 | User exists in different org | User has account in another org | Creates new auth user (email is locked to invite) | ⚠️ | Could be confusing |
| 13 | Logged in as different user | Session exists | Creates NEW account (ignores session) | ⚠️ | Session not checked |
| 14 | Multiple pending invites | Same email, different orgs | Each has unique token; user can accept multiple | ✅ | Different org_id |
| 15 | Duplicate invite same org | Same email + org_id | Prevented at send time by unique constraint | ✅ | |
| 16 | Network error during submission | API failure | Shows "An unexpected error occurred" | ✅ | |
| 17 | User record already exists | Created by trigger | Continues anyway (logged but not fatal) | ✅ | Defensive |
| 18 | Agent profile creation fails | DB error | Continues anyway (logged but not fatal) | ⚠️ | Agent may need manual setup |
| 19 | Billing seat add fails (admin taking calls) | Stripe error | Logged but continues | ⚠️ | Potential billing discrepancy |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Invalid token | Token doesn't exist or expired | Full-page error with "Go to Login" button | Request new invite |
| Password validation | Client-side check fails | Inline error below form | Fix password and retry |
| Auth signup error | Email exists, invalid format, etc. | Inline error banner | May need different email |
| User creation error | DB constraint violation | Error logged, continues | Usually still works |
| Billing error | Stripe API failure | Error logged, continues | Admin may need to fix billing |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click email link | Page loads with spinner | ✅ | Good loading state |
| 2 | Wait for validation | Form appears or error shown | ✅ | Clear feedback |
| 3 | Review pre-filled data | Email locked, name editable | ✅ | Name note says "You can change this later" |
| 4 | Enter password | Live validation feedback | ✅ | Shows requirements |
| 5 | Confirm password | No real-time match check | ⚠️ | Only validates on submit |
| 6 | Choose admin role | Clear radio buttons | ✅ | Good explanations |
| 7 | Click "Create Account" | Button shows loading state | ✅ | "Creating account..." text |
| 8 | Success | Redirects to dashboard | ✅ | Immediate redirect |
| 9 | Error case | Returns to form with error | ✅ | Error banner visible |

### Accessibility
- Keyboard navigation: ✅ Standard form elements work
- Screen reader support: ⚠️ Not explicitly tested
- Color contrast: ✅ Uses theme variables
- Loading states: ✅ Spinner and button text changes

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Token lookup | Indexed on `token` column | ✅ Fast |
| Multiple DB calls | Sequential (auth, user, profile) | ⚠️ Could batch |
| Billing API call | Synchronous within flow | ⚠️ Adds latency |

### Security
| Concern | Mitigation |
|---------|------------|
| Token guessing | UUID tokens (128-bit entropy) |
| Token in URL | Single-use, 7-day expiry |
| Password storage | Supabase Auth (bcrypt) |
| RLS bypass | Uses SECURITY DEFINER for trigger |
| Direct DB access | RLS policies on invites table |
| Email enumeration | Generic error messages |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Partial creation failure | Error logged, user redirected anyway |
| Billing seat failure | Logged but not blocking |
| Network interruption | Standard error handling |
| Concurrent acceptance | `accepted_at IS NULL` check prevents |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Invite → Click → Set Password → Done
2. **Is the control intuitive?** ✅ Yes - Standard sign-up form pattern
3. **Is feedback immediate?** ✅ Yes - Loading states, error messages
4. **Is the flow reversible?** ❌ No - Once accepted, can't undo (but can be removed)
5. **Are errors recoverable?** ⚠️ Mostly - Some errors continue silently
6. **Is the complexity justified?** ✅ Yes - Billing and role logic necessary

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Session not checked | Confusing if already logged in | 🟡 Medium | Check session, offer logout or warning |
| Silent profile creation failure | Agent may not work | 🟡 Medium | Show warning if profile fails |
| No real-time password match | Minor UX friction | 🟢 Low | Add onChange validation |
| Generic invalid/expired error | Can't tell why failed | 🟢 Low | Could differentiate (debatable for security) |
| Admin billing failure silent | Potential revenue loss | 🟡 Medium | Block or alert on billing failure |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Accept page component | `apps/dashboard/src/app/accept-invite/page.tsx` | 1-377 | Full accept flow |
| Token validation query | `apps/dashboard/src/app/accept-invite/page.tsx` | 39-45 | Supabase query |
| Account creation | `apps/dashboard/src/app/accept-invite/page.tsx` | 81-104 | Auth + user insert |
| Agent profile creation | `apps/dashboard/src/app/accept-invite/page.tsx` | 119-151 | Conditional profile |
| Admin billing seat | `apps/dashboard/src/app/accept-invite/page.tsx` | 125-138 | Seat add for admin agents |
| Send invite API | `apps/dashboard/src/app/api/invites/send/route.ts` | 1-182 | Creates invite + email |
| Revoke invite API | `apps/dashboard/src/app/api/invites/revoke/route.ts` | 1-71 | Deletes invite |
| Billing seats API | `apps/dashboard/src/app/api/billing/seats/route.ts` | 1-119 | Seat management |
| Invites schema | `supabase/migrations/20251127000000_add_invites.sql` | 1-129 | Table + RLS |
| handle_new_user trigger | `supabase/migrations/20251127000000_add_invites.sql` | 82-127 | Skips org creation |
| Invite TypeScript types | `packages/domain/src/database.types.ts` | 393-408 | Type definitions |
| Agents page (invites list) | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 76-83 | PendingInvite interface |
| Revoke invite handler | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 441-464 | Client-side revoke |

---

## 9. RELATED FEATURES
- [Signup Flow](./signup-flow.md) - Normal self-signup creates new org
- [Agent Management (D4)](../admin/agent-management.md) - Where invites are sent from
- [Seat Management (B2)](../billing/seat-management.md) - Billing for agent seats
- [Pool Management (D1)](../admin/pool-management.md) - New agents need pool assignment

---

## 10. OPEN QUESTIONS

1. **Should we check existing session?** Currently ignores logged-in state. Should we warn user they're creating a new account?

2. **What happens to invite on auth failure?** If Supabase auth fails but user creation started, should we clean up?

3. **Should agent profile failure be blocking?** Currently logged but continues. Agent may not work properly.

4. **Is 7-day expiry appropriate?** Could make configurable per-org or add re-send functionality.

5. **Should billing failure for admin-taking-calls be blocking?** Currently continues with potential revenue loss.

6. **Email mismatch scenario?** What if someone shares their invite link? Email is locked to invite, but name is editable.

