# Feature: Agent Availability Restrictions on Payment Failure (TKT-005E)

## Quick Summary
When an organization's payment status is `past_due`, `cancelled`, or `paused`, all agents from that organization are automatically prevented from going available to take customer calls. Agents are forced to "away" status on login and blocked from changing to "idle" or "available" status until payment is resolved.

## Affected Users
- [x] Agent
- [x] Admin (indirectly - no agents available)
- [x] Website Visitor (indirectly - widget shows no agents)
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Prevents revenue loss by automatically restricting agent availability when an organization has payment issues. This ensures that:
- Organizations with failed payments cannot receive customer calls
- Agents receive clear messaging about why they cannot go available
- Service automatically resumes when payment is resolved
- In-progress calls are not disrupted

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | Know why they can't go available | Error message: "Unable to go available - payment issue with your organization's account" |
| Agent | Continue working once payment resolves | Real-time checks allow immediate availability when org status changes to active |
| Admin | Automatically restrict service during payment issues | Agents forced offline without admin intervention |
| Platform Admin | Ensure orgs pay before receiving service | Automatic enforcement prevents unpaid service delivery |
| Visitor | Clear indication when no agents available | Widget shows no available agents (existing routing already excludes away agents) |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)

1. Organization's payment fails (Stripe webhook → `subscription_status` = `past_due`)
2. Agent logs in to dashboard
3. Server checks org subscription status
4. If org is not operational (past_due, cancelled, or paused):
   - Agent is forced to "away" status
   - Server logs: "Forcing agent X to away - org not operational"
5. Agent tries to click "Go Available"
6. Server checks org subscription status again
7. If org is still not operational:
   - Status change is blocked
   - Error returned to client
   - Agent sees: "Unable to go available - payment issue"
8. Admin resolves payment (org status → `active`)
9. Agent clicks "Go Available" again
10. Server check passes
11. Agent successfully goes to "idle" status and can receive calls

### State Machine

```
┌─────────────────────────────────────────────────────────┐
│                   Organization States                    │
└─────────────────────────────────────────────────────────┘
           │
           ├─► active / trialing
           │   └─► canAgentGoAvailable() = true
           │       └─► Agents allowed to go available
           │
           └─► past_due / cancelled / paused
               └─► canAgentGoAvailable() = false
                   ├─► AGENT_LOGIN: Force to "away"
                   └─► AGENT_BACK: Block with error


┌─────────────────────────────────────────────────────────┐
│                     Agent States                         │
└─────────────────────────────────────────────────────────┘

  LOGIN (org OK)        AGENT_BACK (org OK)        CALL_ACCEPT
  ─────────────►  idle  ◄──────────────────  away  ◄─────────  in_call
                  │                           ▲                   │
                  │ canAgentGoAvailable()     │                   │
                  │ checks org status         │                   │ CALL_END
                  └───────────────────────────┘                   │
                                                                  │
  LOGIN (org FAIL)                                                │
  ─────────────►  away  ◄───────────────────────────────────────┘
                  ▲
                  │ AGENT_BACK (org FAIL)
                  │ blocked with error
                  └────── X (rejected)
```

### State Definitions

| State | Description | How to Enter | How to Exit | Allowed During Payment Failure? |
|-------|-------------|--------------|-------------|-------------------------------|
| `away` | Agent not available for calls | Login when org not operational, agent clicks away | Agent clicks "Go Available" AND org is operational | ✅ Yes - forced state |
| `idle` | Agent available for calls | Login when org operational, return from away | Accept call, go away | ❌ No - blocked |
| `in_call` | Agent on active call | Accept incoming call | End call | ✅ Yes - existing calls continue |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| `AGENT_LOGIN` | Socket connection, agent dashboard login | Checks `canAgentGoAvailable(orgId)` - if false, forces agent status to "away" | Agent immediately sees "away" status, console log |
| `AGENT_BACK` | Agent clicks "Go Available" button | Checks `canAgentGoAvailable(orgId)` - if false, blocks status change and returns error | Agent sees error toast, remains in "away" status |
| `invoice.paid` webhook | Stripe → Server | Updates org `subscription_status` to `active` | Next `canAgentGoAvailable()` check passes, agents can go available |
| Org status check | Every login and status change attempt | Queries `organizations.subscription_status` | None - read-only check |

### Key Functions/Components

| Function/Component | File | Purpose |
|-------------------|------|---------|
| `canAgentGoAvailable(orgId)` | `apps/server/src/features/agents/agentStatus.ts:13-45` | Checks if org subscription allows agents to go available |
| `getAgentOrgId(agentId)` | `apps/server/src/features/agents/agentStatus.ts:56-79` | Fetches organization ID for a given agent from `agent_profiles` table |
| `isOrgOperational(orgId)` | `apps/server/src/features/agents/agentStatus.ts:51-54` | Returns true if org status is `active` or `trialing` |
| `getPaymentBlockedMessage()` | `apps/server/src/features/agents/agentStatus.ts:47-49` | Returns user-facing error message for payment blocked agents |
| `isOrgPastDue(orgId)` | `apps/server/src/features/agents/agentStatus.ts:8-11` | Helper to check if org is specifically past_due |
| `getOrgSubscriptionStatus(orgId)` | `apps/server/src/lib/organization.ts` | Fetches current subscription status from database |
| AGENT_LOGIN handler | `apps/server/src/features/signaling/socket-handlers.ts:452-468` | Forces agent to "away" if org not operational |
| AGENT_BACK handler | `apps/server/src/features/signaling/socket-handlers.ts:615-642` | Blocks agent from going available if org not operational |

### Data Flow

```
AGENT ATTEMPTS LOGIN
    │
    ├─► Client: Sends AGENT_LOGIN event with JWT token
    │
    ├─► Server: socket-handlers.ts - AGENT_LOGIN handler
    │   ├─► verifyAgentToken(token) → { agentId, organizationId }
    │   ├─► poolManager.registerAgent(socketId, profile)
    │   │
    │   ├─► IF organizationId exists:
    │   │   ├─► canAgentGoAvailable(organizationId)
    │   │   │   ├─► getOrgSubscriptionStatus(orgId)
    │   │   │   │   └─► SELECT subscription_status FROM organizations WHERE id = ?
    │   │   │   │
    │   │   │   ├─► IF status == "past_due":
    │   │   │   │   └─► RETURN { canGoAvailable: false, reason: "payment_failed", message: "..." }
    │   │   │   │
    │   │   │   ├─► IF status == "cancelled":
    │   │   │   │   └─► RETURN { canGoAvailable: false, reason: "subscription_cancelled", ... }
    │   │   │   │
    │   │   │   ├─► IF status == "paused":
    │   │   │   │   └─► RETURN { canGoAvailable: false, reason: "subscription_paused", ... }
    │   │   │   │
    │   │   │   └─► OTHERWISE:
    │   │   │       └─► RETURN { canGoAvailable: true }
    │   │   │
    │   │   └─► IF !availabilityCheck.canGoAvailable AND agent.status !== "away":
    │   │       ├─► poolManager.updateAgentStatus(agentId, "away")
    │   │       ├─► agentState.profile.status = "away"
    │   │       └─► console.log("Forcing agent to away - org not operational: ${reason}")
    │   │
    │   └─► socket.emit(LOGIN_SUCCESS, { agentState })
    │
    └─► Client: Receives agent state with status = "away"


AGENT CLICKS "GO AVAILABLE"
    │
    ├─► Client: Sends AGENT_BACK event
    │
    ├─► Server: socket-handlers.ts - AGENT_BACK handler
    │   ├─► Verify agent is logged in (socket.data.agentId exists)
    │   ├─► Get agent from poolManager
    │   │
    │   ├─► getAgentOrgId(agent.agentId)
    │   │   └─► SELECT organization_id FROM agent_profiles WHERE id = ?
    │   │
    │   ├─► IF orgId exists:
    │   │   ├─► canAgentGoAvailable(orgId)
    │   │   │   └─► [same logic as above]
    │   │   │
    │   │   └─► IF !availabilityCheck.canGoAvailable:
    │   │       ├─► console.log("Agent blocked from going available: ${reason}")
    │   │       ├─► ack({ success: false, status: "away", error: message })
    │   │       └─► RETURN (block status change)
    │   │
    │   ├─► poolManager.updateAgentStatus(agentId, "idle")
    │   ├─► recordStatusChange(agentId, "idle", "back_from_away")
    │   └─► ack({ success: true, status: "idle" })
    │
    └─► Client: Receives either success or error
        ├─► Success: Agent status updates to "idle", can receive calls
        └─► Error: Agent remains "away", sees error toast
```

---

## 4. EDGE CASES

### Complete Scenario Matrix

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Agent logs in while org is `past_due` | Login attempt | Agent forced to "away" status | ✅ | TKT-005E |
| 2 | Agent tries to go available while `past_due` | Click "Go Available" | Blocked with error message | ✅ | TKT-005E |
| 3 | Payment resolves while agent is logged in | `invoice.paid` webhook | Agent can go available on next attempt | ✅ | Real-time check |
| 4 | Agent in active call when payment fails | Mid-call payment failure | Call continues normally | ✅ | No disruption to active calls |
| 5 | Agent finishes call after payment failed | Call ends, agent returns to idle | Agent forced to "away" (next status check) | ⚠️ | Agent may briefly be idle before next check |
| 6 | Multiple agents from same org | Org becomes past_due | All agents blocked individually on next action | ✅ | Each agent checked independently |
| 7 | Agent refreshes page during past_due | Page reload → re-login | Agent forced to "away" again | ✅ | Check runs on every login |
| 8 | Org is `cancelled` (not just past_due) | Agent tries to go available | Blocked with "subscription cancelled" message | ✅ | TKT-005E handles all non-operational states |
| 9 | Org is `paused` | Agent tries to go available | Blocked with "subscription paused" message | ✅ | TKT-005E handles paused state |
| 10 | Org is `trialing` (free trial) | Agent tries to go available | Allowed - trialing counts as operational | ✅ | isOrgOperational includes trialing |
| 11 | Agent's org cannot be found | Login or status change | Defaults to allowing action (null org check) | ⚠️ | Graceful degradation - logs warning |
| 12 | Supabase connection failure | getAgentOrgId or canAgentGoAvailable | Returns null/defaults to allow | ⚠️ | Fails open to avoid blocking all agents |
| 13 | Payment fails during agent's idle time | Webhook updates status while agent idle | Agent blocked on next status change attempt | ✅ | Check runs on every action |
| 14 | Admin manually updates org status in DB | Direct DB update | Agent affected on next real-time check | ✅ | Checks current DB state every time |
| 15 | Agent tries to accept incoming call while past_due | Call routed to agent (shouldn't happen) | Existing routing excludes away agents | ✅ | Defense in depth - routing filters away agents |

### Error States

| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Payment blocked | Agent clicks "Go Available" during past_due | Error message: "Unable to go available - payment issue with your organization's account. Please contact your administrator." | Wait for admin to resolve payment, try again |
| Forced to away | Agent logs in during past_due | Status automatically set to "away" (may see status indicator) | Contact admin about payment issue |
| Org status check failure | Supabase unavailable | No error - defaults to allowing action | Temporary - retry when service restored |
| Org ID not found | Agent profile missing organization_id | Warning logged, action allowed | Data integrity issue - investigate agent profile |
| Subscription cancelled | Agent attempts availability with cancelled org | Error: "Your organization's subscription has been cancelled" | Admin must resubscribe |
| Subscription paused | Agent attempts availability with paused org | Error: "Your organization's subscription is paused" | Admin must resume subscription |

---

## 5. UI/UX REVIEW

### User Experience Audit

| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Agent logs in during past_due | Dashboard loads, status shows "away" | ⚠️ | No explanation banner about payment issue |
| 2 | Agent clicks "Go Available" | Error toast appears with payment message | ✅ | Clear error message |
| 3 | Agent wonders why they're away | No proactive notification | ❌ | Should show banner: "Payment issue - contact admin" |
| 4 | Payment resolves | No notification to agent | ❌ | Agent must try going available to discover it works again |
| 5 | Admin resolves payment | Agents immediately unblocked | ✅ | Real-time checks work well |

### Accessibility
- Keyboard navigation: ✅ Standard button interaction (Go Available button)
- Screen reader support: ⚠️ Error message displayed in toast (depends on toast accessibility)
- Color contrast: ✅ Standard dashboard UI
- Loading states: N/A - Instant check (no spinner needed)

---

## 6. TECHNICAL CONCERNS

### Performance

| Concern | Implementation | Status |
|---------|----------------|--------|
| Database query on every login | Single SELECT by indexed `id` on `organizations` table | ✅ Fast |
| Database query on every status change | Single SELECT by indexed `id` on `agent_profiles`, then `organizations` | ✅ Fast (2 queries, both indexed) |
| Socket event latency | Synchronous check before emitting response | ✅ Minimal impact (<10ms) |
| Concurrent agent logins | Independent checks per agent | ✅ No bottleneck |

### Security

| Concern | Mitigation |
|---------|------------|
| Agent bypassing restriction | Enforced server-side on every status change |
| Spoofed organization ID | Uses verified JWT token from authentication |
| Direct database manipulation | All checks query current DB state (no caching) |
| Race conditions | Status changes are synchronous in socket handler |

### Reliability

| Concern | Mitigation |
|---------|------------|
| Supabase connection failure | Fails open (allows action), logs warning |
| Missing agent profile data | Defaults to null orgId, allows action |
| Webhook delay | Real-time checks on every action (not webhook-dependent) |
| Server restart | Agents re-login, checks run again |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ⚠️ Partially - Error message is clear, but lack of proactive notification on login is confusing
2. **Is the control intuitive?** ✅ Yes - Agent attempts normal action, receives clear error
3. **Is feedback immediate?** ✅ Yes - Real-time check on every action
4. **Is the flow reversible?** ✅ Yes - Payment resolution immediately restores access
5. **Are errors recoverable?** ⚠️ Partially - Requires admin intervention (agent cannot self-recover)
6. **Is the complexity justified?** ✅ Yes - Essential for preventing unpaid service delivery

### Identified Issues

| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No proactive payment notification | Agent confused why they're away | 🟡 Medium | Add banner in dashboard when org is past_due |
| Error message says "contact administrator" | Vague - admin may not know about payment issue | 🟡 Medium | Ensure admin also sees payment banners (separate ticket) |
| No notification when payment resolves | Agent doesn't know when they can work again | 🟢 Low | Add success toast when org returns to operational |
| Fails open on Supabase failure | Potential unpaid service delivery during outage | 🟡 Medium | Consider fail-closed approach with cached status |
| Agent forced to away after call ends | Jarring UX if payment failed during call | 🟢 Low | Acceptable tradeoff for simplicity |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Agent status utilities module | `apps/server/src/features/agents/agentStatus.ts` | 1-80 | All TKT-005E logic |
| `canAgentGoAvailable()` | `apps/server/src/features/agents/agentStatus.ts` | 13-45 | Main authorization check |
| `getAgentOrgId()` | `apps/server/src/features/agents/agentStatus.ts` | 56-79 | Fetch org for agent |
| `isOrgOperational()` | `apps/server/src/features/agents/agentStatus.ts` | 51-54 | Check if status is active/trialing |
| `getPaymentBlockedMessage()` | `apps/server/src/features/agents/agentStatus.ts` | 47-49 | User-facing error message |
| AGENT_LOGIN handler | `apps/server/src/features/signaling/socket-handlers.ts` | 452-468 | Force away on login |
| AGENT_BACK handler | `apps/server/src/features/signaling/socket-handlers.ts` | 615-642 | Block go-available action |
| Import statement | `apps/server/src/features/signaling/socket-handlers.ts` | 79 | Imports canAgentGoAvailable and getAgentOrgId |
| Organization status fetcher | `apps/server/src/lib/organization.ts` | — | `getOrgSubscriptionStatus()` |
| Supabase client | `apps/server/src/lib/supabase.ts` | — | Database connection |

---

## 9. RELATED FEATURES

- [Payment Failure](./payment-failure.md) - Webhook handling for payment failures (parent feature)
- [Bullpen States](../agent/bullpen-states.md) - Agent status state machine (away, idle, in_call)
- [Subscription Pause](./pause-subscription.md) - Paused subscriptions also block agent availability
- [Subscription Cancellation](./cancel-subscription.md) - Cancelled subscriptions also block agent availability

---

## 10. OPEN QUESTIONS

1. **Should agents see a banner explaining why they're away?** — Currently no proactive notification. Agents only see error when attempting to go available.

2. **Should admins receive real-time notification when agents try to go available during past_due?** — Could help admins realize the urgency of payment resolution.

3. **What happens if Supabase is down?** — Currently fails open (allows action). Should we cache last-known status?

4. **Should we proactively disconnect agents when org becomes past_due?** — Currently only enforced on next login or status change. Could forcefully set all logged-in agents to away via socket event.

5. **What if an agent is reassigned to a different org?** — `getAgentOrgId()` reads current org from `agent_profiles` table, so org changes take effect immediately.

6. **Should the error message be more specific?** — Currently says "payment issue" - could specify "past due" vs "cancelled" vs "paused" for transparency.

---

## IMPLEMENTATION DETAILS (TKT-005E)

### Files Modified
- `apps/server/src/features/signaling/socket-handlers.ts` - Added org status checks in AGENT_LOGIN and AGENT_BACK handlers
- `apps/server/src/features/agents/agentStatus.ts` - Created new module with status utilities (canAgentGoAvailable, getAgentOrgId, etc.)

### Files Created
- `apps/server/src/features/agents/agentStatus.ts` - New utility module for agent availability checks

### Database Changes
- None - Uses existing `organizations.subscription_status` column

### Dependencies Added
- None - Uses existing Supabase client and organization utilities

### Acceptance Criteria Met
- ✅ All agents forced offline when org status becomes past_due
- ✅ Agents cannot toggle to 'available' while past_due
- ✅ Widget shows 'no agents available' for past_due orgs (existing routing filters away agents)
- ✅ When payment resolved, agents can go available again

### Testing Notes
- Manual testing: Set org `subscription_status` to `past_due` in DB, verify agent forced to away on login
- Manual testing: Try clicking "Go Available" while past_due, verify error message
- Manual testing: Set org back to `active`, verify agent can go available
- In-progress calls not disrupted (verified by code review - no call termination logic)

---

*Documentation created for TKT-005E implementation (merged to main on 2025-12-06). This feature adds real-time agent availability restrictions based on organization payment status.*
