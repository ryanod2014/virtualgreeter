# Dev Agent Continuation: TKT-010-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-010
> **Branch:** `agent/tkt-010` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
Two CRITICAL security vulnerabilities found in the new `/api/agent/end-call` endpoint:
1. No authentication mechanism - any unauthenticated user can forcibly end calls
2. No organization isolation check - cross-tenant call termination possible

**CRITICAL Security Issues:**

### Issue 1: Unauthenticated API Endpoint (BLOCKER)
- **Severity:** CRITICAL
- **File:** `apps/server/src/index.ts` (lines 389-468)
- **Problem:** The `/api/agent/end-call` endpoint has no authentication mechanism
- **Impact:** Any attacker can perform denial-of-service on video call functionality by terminating active calls
- **Attack vector:** `curl -X POST http://server-url/api/agent/end-call -H 'Content-Type: application/json' -d '{"agentId": "any-uuid"}'`
- **Required fix:** Add authentication middleware or JWT validation before processing requests

### Issue 2: Missing Organization Isolation (BLOCKER)
- **Severity:** CRITICAL
- **File:** `apps/server/src/index.ts` (lines 389-468)
- **Problem:** The endpoint does not verify that the agentId belongs to any particular organization
- **Impact:** Admin from Organization A can terminate calls in Organization B. Violates multi-tenant security model and regulatory compliance (GDPR, SOC2)
- **Attack vector:** Authenticated user from one org can discover agent UUIDs from other orgs and terminate their calls
- **Required fix:** Query `agent_profiles.organization_id` and verify caller has admin role in that organization

### Issue 3: Database Error Handling Missing (Non-blocking)
- **Severity:** MEDIUM
- **File:** `apps/server/src/index.ts` (line 423)
- **Problem:** No try/catch around `markCallEnded()` call
- **Impact:** If database write fails, call state becomes inconsistent and users won't receive CALL_ENDED notifications
- **Required fix:** Wrap DB operation in try/catch and decide whether to continue with notifications even if DB logging fails

### Issue 4: Information Disclosure (Non-blocking)
- **Severity:** LOW
- **File:** `apps/server/src/index.ts` (lines 412-414)
- **Problem:** Response message 'No active call found' reveals whether an agent is currently in a call
- **Impact:** Attacker can enumerate which agents are currently on calls
- **Required fix:** Return generic success message for both cases

---

## What You Must Fix

### Priority 1 - MUST FIX BEFORE MERGE:

1. **Add Authentication:**
   - Recommended approach: Use existing auth middleware from other protected routes
   - Alternative: Generate short-lived JWT in dashboard, validate in server endpoint
   - Quick fix option: Add shared secret API key in environment variable, require X-Internal-API-Key header

2. **Add Organization Isolation:**
   - Query `agent_profiles.organization_id` from database
   - Verify the authenticated caller has admin role in that organization
   - Reject request if caller is not authorized for that organization

### Priority 2 - SHOULD FIX:

3. **Add Database Error Handling:**
   - Wrap `markCallEnded()` in try/catch
   - Log error but continue with notifications (or decide appropriate behavior)

4. **Fix Information Disclosure:**
   - Return generic success message for both "call ended" and "no call found" cases

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-010`
2. Pull latest: `git pull origin agent/tkt-010`
3. **CRITICAL:** Add authentication to `/api/agent/end-call` endpoint
4. **CRITICAL:** Add organization isolation check (verify caller has access to agent's org)
5. Add try/catch around database operations
6. Return generic success messages (no information disclosure)
7. Run `pnpm typecheck` and `pnpm build` to verify
8. Test authentication and authorization thoroughly
9. Push for re-QA

---

## Original Acceptance Criteria

- ✅ AC1: Removing in-call agent triggers call end (PASS)
- ✅ AC2: Visitor sees friendly message (PASS)
- ✅ AC3: Call logged in database (PASS)
- ✅ AC4: Non-in-call removal proceeds normally (PASS)

**All acceptance criteria passed, but security issues block merge.**

---

## Files in Scope

- `apps/server/src/index.ts` (lines 389-468) - NEEDS SECURITY FIXES
- `apps/server/src/lib/auth.ts` - reference for authentication patterns
- `apps/dashboard/src/app/(dashboard)/agents/actions.ts` - may need to pass auth token

---

## Recommended Implementation

### Authentication Option 1 (Quick Fix):
```typescript
// In index.ts, at start of /api/agent/end-call handler:
const apiKey = req.headers['x-internal-api-key'];
if (process.env.NODE_ENV === 'production' && apiKey !== process.env.INTERNAL_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Organization Isolation:
```typescript
// Query agent's organization
const { data: agent } = await supabase
  .from('agent_profiles')
  .select('organization_id')
  .eq('id', agentId)
  .single();

// Verify caller has access to this organization
// (Implementation depends on your auth approach)
```

---

## Test Scenarios

1. **Unauthenticated request:** Should return 401
2. **Wrong API key:** Should return 403
3. **Cross-org access attempt:** Should return 403
4. **Valid authenticated request:** Should succeed
5. **Database failure:** Should handle gracefully

---

## Notes

- **DO NOT MERGE** until security issues are fixed
- Security review recommended after fixes
- Estimated fix time: 2-3 hours
- Test thoroughly with different auth scenarios
