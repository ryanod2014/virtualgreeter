# Feature: Invite Accept (AUTH3)

## Quick Summary
Agent/Admin invitation acceptance flow that validates invite tokens, collects account setup information (name, password), creates the user account in the invited organization, and optionally creates an agent profile based on role and user preference.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Enables new team members (agents or admins) to join an existing organization by accepting an email invitation. The flow validates the invite, collects necessary account information, creates all required database records, handles billing seat allocation, and onboards the user into the organization.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Invited Agent | Quick and simple account setup | One-click link from email, minimal form fields, automatic org membership |
| Invited Admin | Choose their level of participation | Can decide whether to take calls (use agent seat) or be admin-only (free) |
| Existing Admin | Team members to join easily | Sends professional invite emails, tracks acceptance status |
| Organization | Control over team composition | Seat billing handled automatically, role-based permissions enforced |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin sends invite via Agent Management page → `/api/invites/send`
2. System creates invite record, charges billing seat (for agent role), sends email via Resend
3. Invitee receives email with "Accept Invitation" button linking to `/accept-invite?token=xxx`
4. Invitee clicks link, lands on accept invite page
5. Page validates token: exists, not expired, not already accepted
6. Invitee fills in: Full Name (pre-filled), Password, Confirm Password
7. (Admin role only) Invitee chooses: "Yes, I'll take calls" or "No, admin only"
8. Invitee clicks "Create Account"
9. System creates: auth.users record, users record, agent_profiles record (if applicable)
10. Invite marked as accepted (`accepted_at` timestamp set)
11. User redirected to `/admin` dashboard

### State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INVITE LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────┘

  [CREATED]                                                    
      │                                                        
      ▼                                                        
 ┌─────────┐    7 days    ┌──────────┐                        
 │ PENDING │─────────────►│ EXPIRED  │                        
 └────┬────┘              └──────────┘                        
      │                                                        
      │ Token clicked                                          
      ▼                                                        
 ┌──────────┐   Invalid token    ┌─────────────┐              
 │ VALIDATING│──────────────────►│ ERROR STATE │              
 └────┬─────┘                    └─────────────┘              
      │                                                        
      │ Valid token                                            
      ▼                                                        
 ┌────────────┐                                                
 │ FORM SHOWN │◄──────────────┐                               
 └─────┬──────┘               │                               
       │                      │ Validation error               
       │ Submit               │                               
       ▼                      │                               
 ┌────────────┐               │                               
 │ PROCESSING │───────────────┘                               
 └─────┬──────┘                                               
       │                                                       
       │ Success                                               
       ▼                                                       
 ┌──────────┐                                                  
 │ ACCEPTED │────────────────► Redirect to /admin             
 └──────────┘                                                  

Parallel path:
 ┌─────────┐                                                   
 │ PENDING │──── Admin revokes ────► [DELETED]                
 └─────────┘                                                   
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `CREATED/PENDING` | Invite exists in database, email sent | Admin sends invite via API | Accepted, expired, or revoked |
| `EXPIRED` | Invite past 7-day validity | `expires_at < NOW()` | Cannot exit (permanent) |
| `VALIDATING` | User clicked link, token being checked | URL with token accessed | Valid → Form Shown, Invalid → Error |
| `FORM_SHOWN` | Valid invite, signup form displayed | Token validation passed | Form submitted |
| `PROCESSING` | Account creation in progress | User clicks "Create Account" | Success or validation error |
| `ACCEPTED` | User account created, invite complete | `accepted_at` timestamp set | N/A (terminal state) |
| `REVOKED/DELETED` | Admin cancelled the invite | Admin clicks revoke | Row deleted from database |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Token URL accessed | `/accept-invite?token=xxx` | Validates token, loads invite data | Shows form or error |
| Form submitted | Accept invite page | Creates user + agent records | Auth user, DB records, billing |
| "Will take calls" selected | Admin invite form | Flags user to create agent profile | Adds billing seat at accept time |
| Password validation | Client-side | Checks length and match | Shows error if invalid |
| Supabase signUp | Accept flow | Creates auth.users record | Triggers no auto-org creation (handled manually) |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AcceptInvitePage` | `apps/dashboard/src/app/accept-invite/page.tsx` | Main accept invite UI |
| `AcceptInviteContent` | `apps/dashboard/src/app/accept-invite/page.tsx` | Form logic and state |
| `fetchInvite` (useEffect) | `apps/dashboard/src/app/accept-invite/page.tsx` | Token validation via Supabase |
| `handlePasswordSignup` | `apps/dashboard/src/app/accept-invite/page.tsx` | Account creation flow |
| `POST /api/invites/send` | `apps/dashboard/src/app/api/invites/send/route.ts` | Creates invite, sends email |
| `POST /api/invites/revoke` | `apps/dashboard/src/app/api/invites/revoke/route.ts` | Deletes invite, credits seat |
| `POST /api/billing/seats` | `apps/dashboard/src/app/api/billing/seats/route.ts` | Seat allocation for billing |
| `handle_new_user` trigger | `supabase/migrations/20251127000000_add_invites.sql` | Skips auto-org creation for invites |

### Data Flow

```
USER CLICKS INVITE LINK
    │
    ├─► Browser: Navigate to /accept-invite?token=xxx
    │
    ├─► Component: useEffect → fetchInvite()
    │   │
    │   ├─► Supabase: SELECT from invites
    │   │   WHERE token = xxx
    │   │   AND accepted_at IS NULL
    │   │   AND expires_at > NOW()
    │   │
    │   ├─► [Invalid/Expired] → setError("This invite is invalid or has expired")
    │   │                     → Show error screen with "Go to Login" link
    │   │
    │   └─► [Valid] → setInvite(data)
    │               → setFullName(data.full_name)
    │               → Show signup form
    │
USER SUBMITS FORM
    │
    ├─► Validation:
    │   ├─► Password length >= 8? 
    │   ├─► Password === confirmPassword?
    │   └─► [Failed] → setError() → Return
    │
    ├─► Step 1: Create Auth User
    │   ├─► supabase.auth.signUp({ email, password, options: { data: { full_name } } })
    │   ├─► [Error] → setError(authError.message) → Return
    │   └─► [Success] → authData.user.id available
    │
    ├─► Step 2: Create User Record
    │   ├─► supabase.from("users").insert({
    │   │       id: authData.user.id,
    │   │       organization_id: invite.organization_id,
    │   │       email: invite.email,
    │   │       full_name: fullName,
    │   │       role: invite.role
    │   │   })
    │   └─► [Error] → Log (continue anyway - may be trigger-created)
    │
    ├─► Step 3: Create Agent Profile (conditional)
    │   │
    │   ├─► shouldCreateAgentProfile = (role === "agent") OR (willTakeCalls)
    │   │
    │   ├─► [Admin + willTakeCalls] → fetch("/api/billing/seats", { action: "add" })
    │   │                           → Adds 1 billing seat
    │   │
    │   └─► supabase.from("agent_profiles").insert({
    │           user_id: authData.user.id,
    │           organization_id: invite.organization_id,
    │           display_name: fullName,
    │           is_active: true
    │       })
    │
    ├─► Step 4: Mark Invite Accepted
    │   └─► supabase.from("invites").update({ accepted_at: NOW() }).eq("id", invite.id)
    │
    └─► Step 5: Redirect
        └─► window.location.href = "/admin"
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - Agent invite | Valid token + form submit | Account created, joins org as agent | ✅ | |
| 2 | Happy path - Admin invite (takes calls) | Valid token + "Yes" selected | Account + agent profile created, seat charged | ✅ | |
| 3 | Happy path - Admin invite (admin only) | Valid token + "No" selected | Account created, no agent profile, no seat | ✅ | |
| 4 | Expired invite link | Token > 7 days old | "This invite is invalid or has expired" error | ✅ | |
| 5 | Already-used invite link | `accepted_at IS NOT NULL` | Same error as expired | ✅ | User-friendly |
| 6 | No token in URL | `/accept-invite` (no ?token=) | "Invalid invite link - no token provided" | ✅ | |
| 7 | Invalid/random token | Token doesn't exist in DB | Generic invalid/expired error | ✅ | Security: doesn't reveal if token ever existed |
| 8 | Password too short | < 8 characters | "Password must be at least 8 characters" | ✅ | Client-side validation |
| 9 | Password mismatch | password !== confirmPassword | "Passwords don't match" | ✅ | Client-side validation |
| 10 | Email already has Supabase account | Same email in auth.users | Supabase signUp error shown | ✅ | Error message from Supabase |
| 11 | User record creation fails | DB insert error | Logged, continues anyway | ✅ | Trigger might have created it |
| 12 | Agent profile creation fails | DB insert error | Logged, continues anyway | ⚠️ | User is created but may not appear as agent |
| 13 | Billing seat add fails | Stripe/API error | Logged, continues anyway | ⚠️ | Admin may not have seat allocated |
| 14 | Revoked invite clicked | Invite deleted before click | Generic invalid/expired error | ✅ | |
| 15 | Multiple pending invites same email | Different orgs invite same person | Each has unique token, can accept both | ✅ | Creates user in each org |
| 16 | Invite to email already in org | Admin sends to existing member | Blocked at invite send time: "User already exists in this organization" | ✅ | |
| 17 | Name field edited | User changes pre-filled name | New name used for user + agent profile | ✅ | |
| 18 | Browser refresh during submit | Interrupts API calls | May leave partial state | ⚠️ | No transaction rollback |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Invalid/expired token | Token not found or expired | Full-screen error with AlertCircle icon + "Go to Login" button | Request new invite |
| No token provided | URL missing ?token param | Same error screen | Get correct link from email |
| Password too short | < 8 characters entered | Inline error: "Password must be at least 8 characters" | Enter longer password |
| Passwords don't match | confirm !== password | Inline error: "Passwords don't match" | Re-enter passwords |
| Auth user exists | Email already in auth.users | Supabase error message (varies) | Login instead, or contact admin |
| Unexpected error | Catch-all | "An unexpected error occurred" | Try again, contact support |

---

## 5. UI/UX REVIEW

### User Experience Audit

| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click email link | Loading spinner shown | ✅ | |
| 2 | Wait for validation | Form or error appears | ✅ | |
| 3 | See pre-filled name | Can edit if needed | ✅ | Helper text: "You can change this later" |
| 4 | Enter password | 8+ char requirement shown | ✅ | Helper text visible |
| 5 | Confirm password | No helper text | ✅ | |
| 6 | (Admin) Choose call preference | Two clear options with icons | ✅ | "Uses an agent seat" / "Free • manage only" |
| 7 | Click Create Account | Button shows loading state | ✅ | "Creating account..." |
| 8 | Error occurs | Red error banner at top of form | ✅ | |
| 9 | Success | Redirect to /admin | ✅ | No success message (instant redirect) |

### Visual Design
- **Background:** Gradient with blur effects (primary/purple tones)
- **Card:** Glass-morphism effect (`glass` class)
- **Logo:** Centered above form
- **Header:** Organization name prominently displayed
- **Form fields:** Icon-prefixed inputs (Mail, User, Lock icons)
- **Email field:** Disabled, shown as read-only (security)
- **Admin choice:** Two-column button grid with border highlight on selection

### Accessibility
- Keyboard navigation: ✅ Standard form tabbing works
- Screen reader support: ⚠️ No explicit ARIA labels on custom choice buttons
- Color contrast: ✅ Follows design system
- Loading states: ✅ Spinner + disabled state + text change
- Error states: ✅ Red border/background, clear error text
- Focus indicators: ⚠️ Uses outline-none, relies on border change

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Token lookup | Single Supabase query with compound WHERE | ✅ Indexed on token column |
| Multiple sequential DB operations | User → Agent Profile → Invite update | ⚠️ No batching, acceptable latency |
| Suspense boundary | Loading fallback shown during useSearchParams | ✅ Good UX |

### Security
| Concern | Mitigation |
|---------|------------|
| Token enumeration | Generic "invalid or expired" message for all failure cases |
| Token predictability | UUID-based tokens (`crypto.randomUUID()`) |
| Email spoofing | Email pre-filled and disabled, cannot be changed |
| Password requirements | Minimum 8 characters enforced |
| Invite scope | Can only join the org specified in invite (org_id in token) |
| RLS bypass | Token validation uses direct Supabase query with RLS policy allowing public read |
| Session hijacking | Standard Supabase auth flow handles session |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Partial account creation | Sequential operations continue on non-critical errors |
| Duplicate invites | Unique constraint on (organization_id, email) |
| Expired during form fill | Form submission re-validates (implicit via accepted_at check) |
| Email delivery failure | Invite created even if email fails (logged) |
| Billing API failure | Logged and continued (admin seat may not be charged) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Standard "click link → fill form → create account" flow that users know
2. **Is the control intuitive?** ✅ Yes - Minimal required fields, clear button labels
3. **Is feedback immediate?** ✅ Yes - Validation errors inline, loading states clear
4. **Is the flow reversible?** ⚠️ Partially - Once accepted, invite is consumed; user can delete account but can't "un-accept"
5. **Are errors recoverable?** ✅ Yes - Form errors allow correction, invalid invites direct to login
6. **Is the complexity justified?** ✅ Yes - Admin role choice adds value without significant complexity

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No success toast before redirect | Users may be confused by instant redirect | 🟢 Low | Add brief success message |
| Billing seat failure continues silently | Admin might not get agent capabilities | 🟡 Medium | Show warning if seat allocation fails |
| No focus management for accessibility | Screen readers may miss error messages | 🟡 Medium | Focus error message on validation failure |
| Agent profile creation failure continues | User created but not as agent | 🟡 Medium | Show error and allow retry |
| No email confirmation sent | User doesn't get welcome email | 🟢 Low | Consider sending welcome email post-accept |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Accept invite page | `apps/dashboard/src/app/accept-invite/page.tsx` | 1-377 | Main component |
| Token validation | `apps/dashboard/src/app/accept-invite/page.tsx` | 31-60 | useEffect fetchInvite |
| Account creation | `apps/dashboard/src/app/accept-invite/page.tsx` | 62-166 | handlePasswordSignup |
| Admin call choice UI | `apps/dashboard/src/app/accept-invite/page.tsx` | 297-338 | willTakeCalls toggle |
| Invite send API | `apps/dashboard/src/app/api/invites/send/route.ts` | 1-182 | Creates invite + sends email |
| Invite revoke API | `apps/dashboard/src/app/api/invites/revoke/route.ts` | 1-71 | Deletes invite + credits seat |
| Billing seats API | `apps/dashboard/src/app/api/billing/seats/route.ts` | 1-119 | Seat allocation logic |
| Invites schema | `supabase/migrations/20251127000000_add_invites.sql` | 1-128 | Table + RLS policies |
| Invites type definition | `packages/domain/src/database.types.ts` | 393-408 | TypeScript interface |
| Handle new user trigger | `supabase/migrations/20251127000000_add_invites.sql` | 77-127 | Skips auto-org for invites |

---

## 9. RELATED FEATURES
- [Agent Management (D4)](../admin/agent-management.md) - Where invites are sent from
- [Billing Seats (B2)](../billing/seat-management.md) - Seat allocation on invite send/accept
- [Login Flow (AUTH2)](./login-flow.md) - Alternative path for existing users
- [Signup Flow (AUTH1)](./signup-flow.md) - Non-invite account creation

---

## 10. OPEN QUESTIONS

1. **What happens if user tries to accept with a different email?** Currently the email field is disabled, so this is prevented. But if they have a Supabase account with a different email, they could be logged in and see a mismatch.

2. **Should there be a "resend invite" option?** Currently admins must revoke and re-invite. A resend button would be more user-friendly.

3. **Should invite expiry be configurable?** Currently hardcoded to 7 days. Some orgs may want shorter or longer windows.

4. **What happens to pending invites when org is deleted?** The `ON DELETE CASCADE` constraint handles this, but should there be notification to invitees?

5. **Should billing seat be charged at send time or accept time for all roles?** Currently agents charge on send (to prevent invite spam), admins charge on accept if they choose to take calls. This asymmetry could be confusing.

6. **Is there a way to upgrade admin-only to agent later?** User would need to manually create agent_profile. Consider adding "Start taking calls" button in dashboard.
