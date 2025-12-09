# Dev Agent Continuation: TKT-005e-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-005e
> **Branch:** `agent/tkt-005e` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
AC1 violation: Already-logged-in agents not forced offline when org becomes past_due. Agents who are already logged in and available when payment fails are NOT forced offline. Only new logins after the payment failure are caught. This violates the acceptance criterion which states 'ALL agents forced offline'.

**Critical Failure:**

**AC1 - Existing Logins Not Handled: BLOCKER**
- When org payment fails and status becomes 'past_due', ALL currently logged-in agents should be immediately forced to 'away' status
- **Actual behavior:** Only agents logging in AFTER the payment failure are forced to 'away'. Agents already logged in remain 'idle' and continue receiving calls
- This creates inconsistent enforcement where some agents can serve customers from delinquent accounts

**Test Scenario That Failed:**
1. Agents A, B, C are logged in and 'idle' (available for calls)
2. Org payment fails → Webhook updates org status to 'past_due'
3. **Expected:** All agents (A, B, C) immediately forced to 'away'
4. **Actual:** Agents A, B, C remain 'idle' and continue receiving calls

**Root Cause:**
The AGENT_LOGIN check in `socket-handlers.ts:458-465` only runs on new login events. There is no webhook integration or active monitoring to force existing logged-in agents offline when org status changes to 'past_due'.

---

## What You Must Fix

Implement webhook integration in stripe-webhook-handler.ts to force existing agents offline when org becomes past_due.

**Recommended Implementation:**

In `apps/server/src/features/billing/stripe-webhook-handler.ts`, within the `handleInvoicePaymentFailed()` function:

```typescript
// After updating org status to 'past_due':
const activeAgents = poolManager.getAgentsForOrg(orgId);
for (const agent of activeAgents) {
  if (agent.profile.status !== 'away') {
    poolManager.updateAgentStatus(agent.agentId, 'away');
    io.to(agent.socketId).emit('AGENT_MARKED_AWAY', {
      reason: 'payment_failed',
      message: getPaymentBlockedMessage(),
    });
  }
}
```

**Additional Changes Needed:**
- Add `poolManager.getAgentsForOrg(orgId)` method if not exists
- Import socket.io instance into webhook handler
- Emit socket event to notify agents they've been marked away
- Test webhook triggers agent offline correctly

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-005e`
2. Pull latest: `git pull origin agent/tkt-005e`
3. Read the QA failure report at `docs/agent-output/qa-results/QA-TKT-005e-RETEST-BATCH.md`
4. Implement webhook integration to force existing agents offline when org becomes past_due
5. Add `getAgentsForOrg()` method to pool manager if needed
6. Emit socket events to notify agents of status change
7. Test with multiple logged-in agents, trigger payment failure, verify all are forced offline
8. Verify AC1 passes with existing logged-in agents
9. Push for re-QA

---

## Original Acceptance Criteria

1. **AC1:** All agents forced offline when org status becomes past_due ❌ FAILED
2. **AC2:** Agents cannot toggle to 'available' while past_due ✅ PASSED
3. **AC3:** Widget shows no available agents for past_due orgs ✅ PASSED
4. **AC4:** When payment resolved, agents can go available again ✅ PASSED

---

## Files in Scope

- `apps/server/src/features/billing/stripe-webhook-handler.ts` (NEEDS FIX)
- `apps/server/src/features/agents/agentStatus.ts` (may need helper method)
- `apps/server/src/features/agents/pool-manager.ts` (may need getAgentsForOrg method)
- `apps/server/src/features/signaling/socket-handlers.ts` (reference for socket events)

---

## Test Results So Far

- ✅ AC2 - Agents cannot toggle to 'available' while past_due: PASS
- ✅ AC3 - Widget shows no available agents: PASS
- ✅ AC4 - Recovery works: PASS
- ✅ Build verification: PASS
- ❌ AC1 - Existing logins forced offline: FAIL - BLOCKER

---

## Notes

- Estimated fix time: 2-4 hours
- This is the critical missing piece - webhook needs to actively push agents offline
- The login prevention (AC2) is working correctly
- This is a webhook integration issue, not a login flow issue
