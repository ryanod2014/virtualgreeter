# Feature: Invites API (API3)

## Quick Summary
The Invites API provides REST endpoints for managing agent and admin invitations, including sending invites with email delivery, revoking pending invites, and accepting invites to join an organization. It integrates with the billing system to manage seat allocation.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Invites API enables organization admins to grow their team by inviting new users as either agents or admins. It handles the complete invitation lifecycle from creation through acceptance, integrating with Stripe billing for seat management and Resend for email delivery.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Add team members | Send email invites with one click |
| Admin | Control costs | Seats charged only for agents (admins can opt out) |
| Admin | Manage pending invites | Revoke invites to free up prepaid seats |
| Invitee | Join organization | Accept invite via email link, create account |
| Invitee (Admin) | Choose role scope | Option to be admin-only (free) or admin+agent (uses seat) |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin clicks "Invite Agent" in the Agents page
2. Admin enters email, name, and role (agent/admin)
3. System validates no duplicate user/invite exists
4. System creates invite record with unique token
5. System charges billing seat (for agent role only)
6. System sends invite email via Resend
7. Invitee clicks email link → arrives at `/accept-invite?token=...`
8. Invitee sets password and (for admins) chooses if they'll take calls
9. System creates auth user, users record, and optionally agent_profile
10. System marks invite as accepted
11. Invitee redirected to `/admin` dashboard

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                        INVITE LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [Create Request]                                               │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────┐                                                │
│   │   PENDING   │◄──────────────────────────┐                   │
│   │ (accepted_at│                            │                   │
│   │   is null)  │                            │                   │
│   └──────┬──────┘                            │                   │
│          │                                    │                   │
│          │                                    │                   │
│    ┌─────┼─────────────────┐                 │                   │
│    │     │                 │                 │                   │
│    ▼     ▼                 ▼                 │                   │
│ [Accept] [Revoke]    [7 days pass]          │                   │
│    │       │               │                 │                   │
│    ▼       ▼               ▼                 │                   │
│ ┌──────┐ ┌──────┐    ┌─────────┐            │                   │
│ │ACCEPT│ │DELETE│    │ EXPIRED │────────────┘                   │
│ │  ED  │ │  D   │    │(implicit)│  (Can resend → new invite)    │
│ └──────┘ └──────┘    └─────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `pending` | Invite created, awaiting acceptance | `POST /api/invites/send` | Accept, revoke, or expiration |
| `accepted` | User has joined the organization | Token URL + account creation | Terminal state |
| `revoked` | Admin cancelled the invite (deleted) | `POST /api/invites/revoke` | Terminal state (record deleted) |
| `expired` | 7+ days passed without acceptance | Automatic via `expires_at` | Can resend (creates new invite) |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Send invite request | Admin UI → `/api/invites/send` | Creates invite, charges seat, sends email | DB: insert invite, Stripe: add seat (agents only) |
| Revoke invite | Admin UI → `/api/invites/revoke` | Deletes invite, credits seat | DB: delete invite, Stripe: no change (pre-paid model) |
| Accept invite | Accept page → Supabase | Creates user/profile, marks accepted | DB: insert user, agent_profile; update invite |
| Invite expiration | Query filter | Prevents acceptance | No side effect (implicit via `expires_at` check) |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `POST /api/invites/send` | `apps/dashboard/src/app/api/invites/send/route.ts` | Create invite + send email |
| `POST /api/invites/revoke` | `apps/dashboard/src/app/api/invites/revoke/route.ts` | Cancel pending invite |
| `AcceptInvitePage` | `apps/dashboard/src/app/accept-invite/page.tsx` | Accept invite UI |
| `POST /api/billing/seats` | `apps/dashboard/src/app/api/billing/seats/route.ts` | Add/remove billing seats |
| `AgentsClient` | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Admin UI for invites |

### Data Flow

```
ADMIN SENDS INVITE
    │
    ├─► POST /api/invites/send { email, fullName, role }
    │
    ├─► Verify admin auth + role
    │
    ├─► Check: User exists in org?
    │   └─► YES → 400 "User already exists in this organization"
    │
    ├─► Check: Pending invite for email?
    │   └─► YES → 400 "An invite has already been sent to this email"
    │
    ├─► Generate token (crypto.randomUUID())
    │
    ├─► INSERT INTO invites (org, email, name, role, token, invited_by)
    │
    ├─► Role = "agent"?
    │   └─► YES → POST /api/billing/seats { action: "add", quantity: 1 }
    │             └─► FAIL? → DELETE invite, return error
    │
    ├─► Send email via Resend
    │   └─► FAIL? → Log warning, continue (invite still created)
    │
    └─► Return { success: true, invite: { id, email } }


INVITEE ACCEPTS
    │
    ├─► Navigate to /accept-invite?token=xxx
    │
    ├─► Query: invites WHERE token=xxx AND accepted_at IS NULL AND expires_at > NOW()
    │   └─► NOT FOUND → Show "Invalid or expired" error
    │
    ├─► Display form with prefilled email + name
    │
    ├─► Admin role? → Show "Will you take calls?" choice
    │
    ├─► Submit: password validation (8+ chars, match confirm)
    │
    ├─► supabase.auth.signUp({ email, password })
    │
    ├─► INSERT INTO users (id, org, email, name, role)
    │
    ├─► Should create agent_profile?
    │   ├─► Role = "agent" → YES
    │   └─► Role = "admin" AND willTakeCalls = true → YES
    │       └─► POST /api/billing/seats { action: "add", quantity: 1 }
    │
    ├─► INSERT INTO agent_profiles (user_id, org, display_name)
    │
    ├─► UPDATE invites SET accepted_at = NOW() WHERE id = invite.id
    │
    └─► Redirect to /admin


ADMIN REVOKES INVITE
    │
    ├─► POST /api/invites/revoke { inviteId }
    │
    ├─► Verify admin auth + same org
    │
    ├─► Query invite: same org + not accepted?
    │   ├─► NOT FOUND → 404
    │   └─► ACCEPTED → 400 "Cannot revoke accepted invite"
    │
    ├─► DELETE FROM invites WHERE id = inviteId
    │
    ├─► POST /api/billing/seats { action: "remove", quantity: 1 }
    │
    └─► Return { success: true }
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path (agent) | Normal flow | Invite created, seat charged, email sent | ✅ | |
| 2 | Happy path (admin) | Normal flow | Invite created, no seat charge | ✅ | Seat charged on accept if choosing to take calls |
| 3 | Invite to already-registered email | Send to existing user | 400 "User already exists" | ✅ | |
| 4 | Duplicate invite to same email | Second invite | 400 "Already been sent" | ✅ | Must revoke first |
| 5 | Revoke invite after acceptance | Revoke accepted | 400 "Cannot revoke accepted" | ✅ | |
| 6 | Accept expired invite | Token URL after 7 days | "Invalid or expired" error | ✅ | |
| 7 | Resend expired invite | Send again | Creates new invite (old stays expired) | ⚠️ | Old record remains but filtered by expiry |
| 8 | Create invite at seat limit | Exceeds purchased seats | Auto-expands billing | ✅ | Pre-paid model expands when needed |
| 9 | Multiple invites to same email (diff orgs) | Cross-org | Each org can have 1 pending invite | ✅ | UNIQUE(org_id, email) constraint |
| 10 | Invite with invalid email format | Bad email | Handled by Resend (likely fails silently) | ⚠️ | No frontend validation visible |
| 11 | List invites for pending filter | Admin page load | Query: `accepted_at IS NULL AND expires_at > NOW()` | ✅ | |
| 12 | Invite during billing pause | Subscription paused | Invite proceeds (billing still works) | ✅ | Paused orgs can still expand |
| 13 | Admin chooses "take calls" on accept | Admin + willTakeCalls | Seat charged at acceptance time | ✅ | |
| 14 | Admin chooses "admin only" on accept | Admin + !willTakeCalls | No agent_profile created, free | ✅ | |
| 15 | Email delivery fails | Resend error | Invite still created, URL logged in dev | ✅ | Non-blocking |
| 16 | Billing seat add fails | Stripe error | Invite deleted (rollback) | ✅ | |
| 17 | Missing RESEND_API_KEY | Dev/staging | Invite created, URL logged to console | ✅ | |
| 18 | Revoke frees seat for new invite | Revoke then invite | Seat available immediately | ✅ | Pre-paid model |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| 401 Unauthorized | No auth session | "Unauthorized" | Login again |
| 403 Forbidden | Non-admin tries to invite | "Only admins can send invites" | Contact admin |
| 400 User exists | Email already in org | "User already exists in this organization" | Use different email |
| 400 Duplicate invite | Pending invite exists | "An invite has already been sent to this email" | Revoke existing or wait for acceptance |
| 400 Cannot revoke | Trying to revoke accepted | "Cannot revoke accepted invite" | Remove user instead |
| 404 Not found | Invalid invite ID for revoke | "Invite not found" | Refresh page |
| 500 Server error | Unexpected failure | "Internal server error" | Retry |
| Invalid token | Bad/missing token param | "Invalid invite link - no token provided" | Request new invite |
| Expired token | 7+ days old | "This invite is invalid or has expired" | Request new invite |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Admin Sending Invite:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click "Add Agent" | Modal opens with choice | ✅ | |
| 2 | Choose "Invite someone" | Form shows | ✅ | |
| 3 | Enter email + name + role | Form validated | ✅ | |
| 4 | Click "Send Invite" | Confirmation dialog (billing impact) | ✅ | Shows cost/seat usage |
| 5 | Confirm | Loading → success toast | ✅ | Auto-closes modal |

**Invitee Accepting:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click email link | Accept page loads | ✅ | |
| 2 | See org name + role | Info displayed | ✅ | |
| 3 | (Admin) Choose call option | Toggle UI | ✅ | Shows seat cost implication |
| 4 | Set password | Validation shown | ✅ | Min 8 chars requirement shown |
| 5 | Submit | Account created, redirect | ✅ | |

### Accessibility
- Keyboard navigation: ⚠️ Not verified
- Screen reader support: ⚠️ Form labels present but not verified
- Color contrast: ✅ Good contrast in error states
- Loading states: ✅ Spinner shown during operations

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Email delivery latency | Fire-and-forget (non-blocking) | ✅ Good |
| Database queries | Single queries with indexes | ✅ Good |
| Stripe API calls | Only on agent invites | ✅ Good |

### Security
| Concern | Mitigation |
|---------|------------|
| Invite token exposure | UUID v4 (cryptographically random) |
| Unauthorized access | Admin role check on all endpoints |
| Cross-org access | org_id validation on all queries |
| Token guessing | 122 bits of entropy in UUID |
| Replay attacks | Single-use tokens (marked accepted_at) |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Email delivery failure | Invite still created, URL logged |
| Billing failure on invite | Rollback invite (delete) |
| Billing failure on accept (admin) | Logged, continues anyway |
| Database constraint violation | Handled with appropriate error messages |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "Send invite → they accept" is intuitive
2. **Is the control intuitive?** ✅ Yes - Single form, clear confirmation
3. **Is feedback immediate?** ✅ Yes - Success/error messages shown
4. **Is the flow reversible?** ✅ Yes - Can revoke pending invites
5. **Are errors recoverable?** ✅ Yes - Clear error messages, can retry
6. **Is the complexity justified?** ✅ Yes - Billing integration requires careful sequencing

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No resend endpoint | Admin must revoke + re-invite | 🟢 Low | Add `/api/invites/resend` endpoint |
| Expired invites not auto-cleaned | DB accumulates old records | 🟢 Low | Add periodic cleanup job |
| No email validation on frontend | Invalid emails fail silently | 🟢 Low | Add regex validation |
| Old invite not deleted on "resend" | Multiple invite records per email | 🟢 Low | Delete old invite on new send |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Send invite endpoint | `apps/dashboard/src/app/api/invites/send/route.ts` | 1-181 | Main create + email logic |
| Revoke invite endpoint | `apps/dashboard/src/app/api/invites/revoke/route.ts` | 1-70 | Delete + seat credit |
| Accept invite page | `apps/dashboard/src/app/accept-invite/page.tsx` | 1-377 | Client-side acceptance |
| Invites schema | `supabase/migrations/20251127000000_add_invites.sql` | 1-128 | Table + RLS policies |
| Type definitions | `packages/domain/src/database.types.ts` | 393-408 | Invite type |
| Billing seats endpoint | `apps/dashboard/src/app/api/billing/seats/route.ts` | 1-118 | Seat management |
| Admin UI (invites) | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 363-461 | Send/revoke UI |
| Pending invites query | `apps/dashboard/src/app/(app)/admin/agents/page.tsx` | 76-83 | Load invites for display |

---

## 9. RELATED FEATURES
- [Agent Management (D4)](../admin/agent-management.md) - UI for managing team
- [Seat Management (B2)](../billing/seat-management.md) - Billing integration
- [Signup Flow (AUTH1)](../auth/signup-flow.md) - Normal signup (vs invite accept)
- [Login Flow (AUTH2)](../auth/login-flow.md) - Post-acceptance authentication

---

## 10. OPEN QUESTIONS

1. **Should expired invites be automatically cleaned up?** → Currently they stay in DB indefinitely (filtered by query)
2. **Should there be a dedicated resend endpoint?** → Currently requires revoke + new invite
3. **What happens if Resend quota is exceeded?** → Presumably email fails silently, invite still created
4. **Should invites count against org's max_agents limit?** → Currently only checked via seat billing
5. **Is 7-day expiration the right duration?** → Hardcoded, could be configurable per-org

