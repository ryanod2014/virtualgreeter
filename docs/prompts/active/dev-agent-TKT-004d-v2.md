# Dev Agent Continuation: TKT-004d-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-004d
> **Branch:** `agent/tkt-004d-paused-org-status` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
AC2 not implemented - no mechanism to force agents offline when org pauses

**Failures Found:**

1. **AC2: All agents forced to 'offline' status when org pauses - FAILED**
   - **Expected**: When org transitions to 'paused' status, all agents should be automatically forced offline, visitors reassigned, and active calls ended gracefully
   - **Actual**: No implementation found. Code only prevents agents from GOING available (AC3) but does not force currently-available agents offline when pause event occurs
   - **Evidence**: Searched for force-offline logic in Stripe webhooks, admin pause actions, org utilities, and agent status management - NO force-offline mechanism found
   - **Impact**: Agents remain available and serving visitors after org is paused

2. **Test coverage missing**
   - No test files exist for new modules
   - agentStatus.test.ts not found
   - organization.test.ts not found

3. **Type definition missing**
   - Widget imports OrgPausedPayload but type definition not found in domain package
   - Widget.tsx line 7 imports from domain, but grep found no definition

**What You Must Fix:**

### Primary Fix: Implement AC2 - Force Agents Offline

Create a force-offline handler that triggers when org status changes to 'paused':

1. **Integrate with Stripe webhook** (apps/server/src/features/webhooks/stripe.ts)
   - When `subscription.paused` webhook fires, call force-offline handler
   - Handler should: force all org agents offline, reassign their visitors, end active calls gracefully

2. **Integrate with admin pause action** (apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.tsx or actions)
   - When admin clicks "Pause", same force-offline handler should be called

3. **Create force-offline utility** (apps/server/src/lib/organization.ts or apps/server/src/features/agents/agentStatus.ts)
   - Function: `forceOrganizationAgentsOffline(orgId: string)`
   - Steps:
     - Query all agents with org_id = orgId AND status = 'available'
     - For each agent: set status to 'offline'
     - Reassign their active visitors to other available agents (or queue)
     - End active calls gracefully with message to visitor

4. **Add OrgPausedPayload type** (packages/domain/src/database.types.ts or similar)
   - Define the type that Widget.tsx is trying to import

### Secondary: Add Test Coverage

Create basic test files for the new functionality:
- apps/server/src/features/agents/agentStatus.test.ts
- apps/server/src/lib/organization.test.ts

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-004d-paused-org-status`
2. Pull latest: `git pull origin agent/tkt-004d-paused-org-status`
3. Read the QA failure report for details
4. Implement the force-offline handler as described above
5. Add the missing OrgPausedPayload type definition
6. Add basic test coverage
7. Verify with grep that force-offline logic exists
8. Run `pnpm typecheck` - must pass
9. Push for re-QA

---

## Verification Commands

Run these to verify your fix:

```bash
# Should find force-offline function:
grep -rn 'forceOrganizationAgentsOffline\|forceAgentsOffline' apps/server/src/

# Should find OrgPausedPayload type:
grep -rn 'OrgPausedPayload' packages/domain/

# Should find webhook integration:
grep -n 'subscription.paused' apps/server/src/features/webhooks/stripe.ts
```

---

## Original Acceptance Criteria

- Widget shows 'temporarily unavailable' message for paused orgs ✅
- **All agents forced to 'offline' when org pauses** ❌ FAILED
- Agents cannot toggle to 'available' while paused ✅
- When org resumes, agents can go available again ✅

**Completion Status**: 75% complete (3 of 4 ACs working)

---

## Files in Scope

Primary:
- apps/server/src/features/webhooks/stripe.ts
- apps/dashboard/src/app/(app)/admin/settings/actions.ts (or wherever pause action lives)
- apps/server/src/lib/organization.ts
- apps/server/src/features/agents/agentStatus.ts
- packages/domain/src/database.types.ts

Reference:
- apps/widget/src/Widget.tsx (check line 7 for type import)

Tests (create):
- apps/server/src/features/agents/agentStatus.test.ts
- apps/server/src/lib/organization.test.ts
