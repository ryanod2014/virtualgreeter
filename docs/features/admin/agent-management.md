# Feature: Agent Management (D4)

## Quick Summary
Agent Management enables admins to invite new team members, remove existing agents, manage seat allocation, and monitor agent status. It includes email invitations via Resend, seat-based billing integration with Stripe, and a pre-paid seats model where removing agents frees up seats without reducing billing.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Provides a centralized interface for admins to manage their team of agents who can take video calls from website visitors. The feature handles:
- Inviting new agents or admins via email
- Admin adding themselves as an agent
- Removing agents (soft delete preserving call history)
- Tracking pending invitations
- Managing pre-paid seat allocation
- Pool assignment for agents

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Grow their team | Send invites to new agents with automatic seat management |
| Admin | Control costs | Pre-paid seats model shows available seats before charges increase |
| Admin | Track invitations | See pending invites, expiration dates, and ability to revoke |
| Admin | Remove inactive agents | Soft delete preserves history while freeing seat allocation |
| Admin | Take calls themselves | "Add Myself" option for quick self-enrollment as agent |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path - Inviting Agent)
1. Admin clicks "Add Agent" button in Team page
2. Admin chooses "Invite Someone"
3. Admin enters email, display name, and role (Agent/Admin)
4. System shows cost preview (uses prepaid seat vs +$X/mo)
5. Admin clicks "Continue" → confirmation modal appears
6. Admin clicks "Confirm & Send Invite"
7. Server creates invite record in database
8. Server calls `/api/billing/seats` to update billing (if role is "agent")
9. Server sends invite email via Resend
10. Invitee receives email with unique token link
11. Invitee clicks link → accept-invite page
12. Invitee creates password, optionally selects if they'll take calls (admins only)
13. System creates user, agent_profile (if taking calls), marks invite accepted
14. New agent appears in team list

### State Machine (Invite Lifecycle)

```
                     ┌──────────────┐
                     │   Created    │
                     │  (pending)   │
                     └──────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Accepted   │  │   Expired    │  │   Revoked    │
   │              │  │  (7 days)    │  │  (by admin)  │
   └──────────────┘  └──────────────┘  └──────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `pending` | Invite created, email sent, awaiting acceptance | Admin sends invite | Accept, expire, or revoke |
| `accepted` | Invitee created account | Invitee submits accept-invite form | N/A (terminal) |
| `expired` | 7-day window passed without acceptance | Time-based (expires_at) | N/A (terminal) |
| `revoked` | Admin cancelled invitation | Admin clicks revoke button | N/A (record deleted) |

### Agent Status States
| Status | Description | Color |
|--------|-------------|-------|
| `offline` | Agent not connected to dashboard | Gray |
| `idle` | Agent online and available for calls | Green |
| `in_simulation` | Agent assigned to visitor(s) but not in call | Yellow |
| `in_call` | Agent actively on video call | Blue |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| "Add Agent" click | agents-client.tsx | Opens add agent modal | UI state change |
| "Add Myself" click | agents-client.tsx | Creates/reactivates agent profile + billing | DB: agent_profiles, billing API |
| "Continue" (invite form) | agents-client.tsx | Shows cost confirmation modal | UI state change |
| "Confirm & Send" | agents-client.tsx → /api/invites/send | Creates invite, updates billing, sends email | DB: invites, Stripe, Resend |
| Revoke invite | agents-client.tsx → /api/invites/revoke | Deletes invite, credits seat | DB: delete, billing API |
| Resend invite | agents-client.tsx → agents/actions.ts | Retries email sending for failed invites | Email: Resend API, DB: update email_status |
| Remove agent | agents-client.tsx → /api/agents/remove | Soft deletes agent, removes from pools, ends active calls | DB: update agent_profiles, delete pool_members, billing API, call /api/agent/end-call |
| Accept invite | accept-invite page | Creates user, agent_profile, marks accepted | DB: users, agent_profiles, invites |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AgentsClient` | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Main UI component for agent management |
| `AgentsPage` | `apps/dashboard/src/app/(app)/admin/agents/page.tsx` | Server component fetching agents, invites, stats |
| `POST /api/invites/send` | `apps/dashboard/src/app/api/invites/send/route.ts` | Creates invite, handles billing, sends email with retry |
| `POST /api/invites/revoke` | `apps/dashboard/src/app/api/invites/revoke/route.ts` | Deletes invite, credits billing seat |
| `resendInviteEmail` | `apps/dashboard/src/app/(dashboard)/agents/actions.ts` | Server action to retry failed invite emails |
| `sendEmailWithRetry` | `apps/dashboard/src/lib/email.ts` | Email retry logic (3 attempts, exponential backoff) |
| `POST /api/agents/remove` | `apps/dashboard/src/app/api/agents/remove/route.ts` | Soft deletes agent, removes from pools, ends active calls |
| `POST /api/agent/end-call` | `apps/server/src/index.ts:415-532` | Securely ends active call for agent (internal API) |
| `POST /api/billing/seats` | `apps/dashboard/src/app/api/billing/seats/route.ts` | Updates seat count in billing system |
| `AcceptInvitePage` | `apps/dashboard/src/app/accept-invite/page.tsx` | Invite acceptance UI and account creation |

### Data Flow

```
INVITE FLOW
    │
    ├─► Admin: Click "Add Agent" → Opens modal
    │
    ├─► Admin: Enter email, name, role → Click "Continue"
    │
    ├─► Admin: Reviews cost → Click "Confirm & Send Invite"
    │
    ├─► Client: POST /api/invites/send
    │   │
    │   ├─► Validate: Admin role check
    │   ├─► Check: User doesn't already exist in org
    │   ├─► Check: No pending invite for email
    │   │
    │   ├─► DB: INSERT INTO invites (token, email, full_name, role...)
    │   │
    │   ├─► Billing: POST /api/billing/seats { action: "add", quantity: 1 }
    │   │   └─► If exceeds purchasedSeats → Stripe expand subscription
    │   │   └─► If fails → DELETE invite (rollback)
    │   │
    │   ├─► Email: sendEmailWithRetry() attempts up to 3 times
    │   │   ├─► Attempt 1 → Fail → Wait 1s
    │   │   ├─► Attempt 2 → Fail → Wait 2s
    │   │   ├─► Attempt 3 → Fail → Mark email_status='failed'
    │   │   └─► Success → Mark email_status='sent'
    │   │
    │   └─► If email failed → Return warning + show Resend button
    │
    └─► Client: Update UI state (pendingInvites, billingInfo, email status)

ACCEPT FLOW
    │
    ├─► Invitee: Opens invite URL with ?token=XXX
    │
    ├─► Client: Fetch invite by token (pending, not expired)
    │
    ├─► Invitee: Fills password, confirms name
    │   │
    │   └─► (If admin) Choose: "Will take calls?" Yes/No
    │
    ├─► Client: supabase.auth.signUp()
    │
    ├─► Client: INSERT INTO users (organization_id from invite)
    │
    ├─► (If agent role OR admin chose "yes")
    │   ├─► (If admin taking calls) POST /api/billing/seats { add: 1 }
    │   └─► INSERT INTO agent_profiles
    │
    ├─► Client: UPDATE invites SET accepted_at = NOW()
    │
    └─► Client: Redirect to /admin

REMOVE FLOW
    │
    ├─► Admin: Click remove button → Confirmation modal
    │
    ├─► Admin: Click "Remove Agent"
    │
    ├─► Client: POST /api/agents/remove { agentProfileId }
    │   │
    │   ├─► Validate: Admin role + org match
    │   ├─► Check: Agent exists and is_active = true
    │   │
    │   ├─► (If agent.status === "in_call")
    │   │   └─► POST /api/agent/end-call
    │   │       ├─► Headers: x-internal-api-key (required)
    │   │       ├─► Validate: INTERNAL_API_KEY authentication
    │   │       ├─► End call in pool manager (Redis/in-memory)
    │   │       ├─► Notify visitor: "Agent has ended the call"
    │   │       ├─► Notify agent: "Call ended due to agent removal"
    │   │       └─► DB: Mark call as ended
    │   │
    │   ├─► DB: UPDATE agent_profiles SET is_active=false,
    │   │       deactivated_at=NOW(), status='offline'
    │   │
    │   ├─► DB: DELETE FROM agent_pool_members WHERE agent_profile_id=X
    │   │
    │   └─► Billing: POST /api/billing/seats { action: "remove", quantity: 1 }
    │       └─► Frees seat but doesn't reduce Stripe billing
    │
    └─► Client: Update UI state (agents, billingInfo)
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path invite | Normal flow | Creates invite, sends email | ✅ | |
| 2 | Happy path accept | Invitee signs up | Creates user and optional agent_profile | ✅ | |
| 3 | Invite when at seat limit | Admin invites when used=purchased | Auto-expands billing, invite succeeds | ✅ | Pre-paid model |
| 4 | Invite to existing user in org | Email matches existing user | Error: "User already exists in this organization" | ✅ | |
| 5 | Duplicate pending invite | Same email already has pending invite | Error: "An invite has already been sent to this email" | ✅ | |
| 6 | Revoke pending invite | Admin clicks X on invite | Deletes invite, credits seat back | ✅ | |
| 7 | Accept expired invite | Token older than 7 days | Error: "This invite is invalid or has expired" | ✅ | |
| 8 | Accept with no token | URL missing ?token= | Error: "Invalid invite link - no token provided" | ✅ | |
| 9 | Remove active agent | Admin removes agent | Soft delete, removes from pools, seat freed | ✅ | |
| 10 | Remove agent in call | Agent is in_call status | Gracefully ends call, then removes agent | ✅ | Fixed in TKT-010-V2 |
| 11 | Admin removes themselves | Admin clicks remove on their own row | Allowed - removes agent profile, keeps admin role | ✅ | Shows "Remove Myself" |
| 12 | Remove already inactive agent | Edge case | Error: "Agent already deactivated" | ✅ | |
| 13 | Admin invites admin role | Role selection | Creates invite, no seat charge | ✅ | Admin chooses at accept time |
| 14 | Admin accepts and takes calls | Admin role accept flow | Charges seat at accept time | ✅ | |
| 15 | Admin accepts without calls | Admin role accept flow | No seat charge, no agent_profile | ✅ | |
| 16 | Add myself (first time) | Admin not yet an agent | Creates agent_profile, charges seat | ✅ | |
| 17 | Add myself (reactivate) | Admin was previously removed | Reactivates profile, charges seat | ✅ | |
| 18 | Add myself (already agent) | Admin already active agent | Option hidden (isCurrentUserAgent) | ✅ | |
| 19 | Billing API fails during invite | Stripe error | Invite is deleted (rollback) | ✅ | |
| 20 | Email send fails | Resend API error | Automatically retries up to 3 times with exponential backoff (1s, 2s delays), marks invite as "failed" if all attempts fail, admin sees warning toast with "Resend Invite" button | ✅ | Retry mechanism added in TKT-011 |
| 21 | Re-invite removed user | Email in users but deactivated | Error: "User already exists" | ⚠️ | Can't re-invite (by design) |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| "Unauthorized" | Not logged in | Error message | Redirect to login |
| "Admin access required" | Non-admin tries action | Error toast | N/A (UI hidden) |
| "User already exists in this organization" | Invite to existing user | Form error | Use different email |
| "An invite has already been sent to this email" | Duplicate invite | Form error | Revoke old invite first |
| "This invite is invalid or has expired" | Bad/expired token | Full page error | Contact admin for new invite |
| "Agent not found" | Invalid agent ID | Toast error | Refresh page |
| "Agent already deactivated" | Double-remove | Toast error | None needed |
| "Failed to add billing seat" | Stripe error | Form error | Try again later |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Invite Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click "Add Agent" row | Modal opens with choice | ✅ | |
| 2 | Choose "Invite Someone" | Form appears | ✅ | |
| 3 | Fill email/name/role | Fields update, cost preview shown | ✅ | Clear prepaid vs extra cost messaging |
| 4 | Click "Continue" | Confirmation modal with billing summary | ✅ | |
| 5 | Click "Confirm & Send" | Loading state → Success | ✅ | |
| 6 | See pending invite in list | Shows with "Pending" badge | ✅ | |

**Remove Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click remove icon | Confirmation modal | ✅ | |
| 2 | Review consequences | Shows preserved data, freed seat | ✅ | |
| 3 | Click "Remove Agent" | Loading → agent disappears | ✅ | |

**Accept Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Open invite link | Form with pre-filled email | ✅ | |
| 2 | Enter name/password | Fields validate | ✅ | |
| 3 | (Admin) Choose call preference | Two clear buttons | ✅ | |
| 4 | Click "Create Account" | Loading → redirect to dashboard | ✅ | |

### Visual Elements
- **Seat Banner:** Always visible showing purchased/used/available seats
- **Cost Indicators:** Green for "Included", Amber for "+$X/mo"
- **Status Colors:** Green=Available, Yellow=In Simulation, Blue=In Call, Gray=Offline
- **Pending Invites:** Distinct section with expiration dates

### Accessibility
- Keyboard navigation: ✅ Add agent row is focusable and keyboard accessible
- Screen reader support: ⚠️ Not explicitly verified
- Color contrast: ✅ Status indicators use standard colors
- Loading states: ✅ All async actions show spinners

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Agent list query | Single query with joins to pools, users | ✅ Efficient |
| Call stats aggregation | Aggregated in server component | ✅ Non-blocking |
| Invite count for billing | Count query in page.tsx | ✅ Cached with React |
| Pool video expansion | Lazy load on click | ✅ No initial video load |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Admin role check on all API routes |
| Org isolation | All queries filter by organization_id |
| Invite token guessing | UUID token (128-bit entropy) |
| Invite token reuse | Marked accepted_at, checked on accept |
| Cross-org agent removal | Agent's org_id verified against admin's org |
| Unauthorized call termination | `/api/agent/end-call` protected by INTERNAL_API_KEY auth |
| Information disclosure on remove | `/api/agent/end-call` returns generic success for all cases |
| Missing API key in production | Server returns 500 if INTERNAL_API_KEY not configured |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Invite without billing | Billing called AFTER invite creation; rollback on failure |
| Orphaned billing seat | Email failure doesn't rollback invite (invite exists) |
| Race condition on accept | DB unique constraint on users prevents double creation |
| Soft delete data preservation | FK to call_logs is SET NULL, agent_id preserved |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Invite → Accept → Active Agent flow is intuitive
2. **Is the control intuitive?** ✅ Yes - Clear options for self-add vs invite
3. **Is feedback immediate?** ✅ Yes - Loading states, success/error messages throughout
4. **Is the flow reversible?** ✅ Yes - Can revoke invites, can remove agents
5. **Are errors recoverable?** ✅ Yes - All errors show clear messages with next steps
6. **Is the complexity justified?** ✅ Yes - Pre-paid seats model is well-explained with cost previews

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| ~~Agent removal doesn't end active calls~~ | ~~Call continues after agent "removed"~~ | ✅ Fixed | ~~Consider emitting call:end on removal~~ RESOLVED in TKT-010-V2 |
| Can't re-invite removed users | Users with inactive agent_profile can't be re-invited | 🟡 Medium | Check is_active or allow re-invitation |
| ~~Email send failure silent~~ | ~~Invite created but invitee never notified~~ | ✅ Fixed | ~~Add retry mechanism or alert admin~~ RESOLVED in TKT-011 |
| No bulk invite | Must invite one at a time | 🟢 Low | Add CSV upload for enterprise |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main agents client component | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 1-2594 | All invite/remove UI + email status badges |
| Server component data fetching | `apps/dashboard/src/app/(app)/admin/agents/page.tsx` | 1-303 | Fetches agents, invites, stats |
| Send invite API | `apps/dashboard/src/app/api/invites/send/route.ts` | 1-160 | Token gen, billing, email with retry |
| Revoke invite API | `apps/dashboard/src/app/api/invites/revoke/route.ts` | 1-71 | Delete + credit seat |
| Resend invite action | `apps/dashboard/src/app/(dashboard)/agents/actions.ts` | 15-82 | Server action for retry |
| Email retry library | `apps/dashboard/src/lib/email.ts` | 1-120 | Retry logic + templates |
| Remove agent API | `apps/dashboard/src/app/api/agents/remove/route.ts` | 1-82 | Soft delete + pool removal |
| Seat management API | `apps/dashboard/src/app/api/billing/seats/route.ts` | 1-118 | Pre-paid seats logic |
| Accept invite page | `apps/dashboard/src/app/accept-invite/page.tsx` | 1-376 | Account creation flow |
| Invites table schema | `supabase/migrations/20251127000000_add_invites.sql` | 1-53 | DB schema + RLS |
| Email status migration | `supabase/migrations/20251206000000_add_invite_email_status.sql` | 1-18 | email_status column |
| Soft delete migration | `supabase/migrations/20251127800000_soft_delete_and_billing.sql` | 1-83 | is_active, Stripe fields |

---

## 9. RELATED FEATURES
- [Billing - Seat Management](../../billing/seat-management.md) - How seats are purchased and billed
- [Auth - Signup Flow](../../auth/signup-flow.md) - How new accounts are created
- [Pool Management (D1)](./pool-management.md) - Where agents are assigned
- [Agent Bullpen States (A1)](../agent/bullpen-states.md) - Agent status definitions

---

## 10. OPEN QUESTIONS

1. ~~**Should removing an agent terminate their active call?**~~ RESOLVED in TKT-010-V2. Now calls `/api/agent/end-call` to gracefully terminate active calls when removing agents.

2. **How to handle re-inviting a previously removed user?** Current logic blocks this with "User already exists" error. May need a reactivation flow instead.

3. **INTERNAL_API_KEY configuration** - The `/api/agent/end-call` endpoint requires both dashboard and server to have the same INTERNAL_API_KEY. Deployment processes should ensure this is properly configured.

4. **Should email failures be more visible?** Currently only logs to console. Admin might not know invite wasn't delivered.

5. **Is 7-day invite expiration appropriate?** Hardcoded in DB default. Should it be configurable per-org?

6. **What happens if Stripe is down during invite?** Currently fails and rolls back invite. Should there be a retry mechanism?

7. **Should admins be able to see deactivated agents?** Currently filtered out entirely. May be useful for audit/history.



