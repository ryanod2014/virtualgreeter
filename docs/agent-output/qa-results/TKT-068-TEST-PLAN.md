# Test Plan for TKT-068: Allow Pageview Tracking Without Agent Online
## TICKET TYPE: hybrid

## Context
The dev agent found that this functionality **already exists** in the codebase. The implementation files differ from those specified in the ticket, but all acceptance criteria are met by existing code. This QA will verify the existing implementation works correctly.

### Actual Implementation Files
- ✅ `apps/server/src/lib/pageview-logger.ts` (not `apps/server/src/features/pageviews/track.ts`)
- ✅ `supabase/migrations/20251128400000_widget_pageviews.sql` (agent_id already nullable on line 13)
- ✅ `apps/server/src/features/signaling/socket-handlers.ts:280-290` (tracks WIDGET_MISSED_OPPORTUNITY with agentId: null)
- ✅ `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` (verification counts all pageviews)

## Acceptance Criteria (from ticket)
1. ✅ Pageviews are recorded even when no agents are online
2. ✅ agent_id field is null when no agent available
3. ✅ Dashboard shows total pageviews (assigned + unassigned)
4. ✅ Verification succeeds based on any pageview, not just assigned ones
5. ✅ Existing pageview tracking still works for assigned pageviews

---

## API/BACKEND TESTS

| # | Test Scenario | Method/Operation | Input | Expected Result |
|---|--------------|------------------|-------|-----------------|
| 1 | Verify DB schema allows null agent_id | SQL query | Check widget_pageviews schema | agent_id column nullable |
| 2 | Create pageview with agent (covered) | DB insert | visitorId, agentId (valid), orgId, pageUrl | Record created with agent_id populated |
| 3 | Create pageview without agent (missed opportunity) | DB insert | visitorId, agentId: null, orgId, pageUrl | Record created with agent_id = NULL |
| 4 | Query all pageviews for org | DB query | organization_id | Returns both covered and missed pageviews |
| 5 | Verify missed opportunity socket handler | Code inspection | WIDGET_MISSED_OPPORTUNITY event | Calls recordPageview with agentId: null |
| 6 | Count pageviews without agent_id filter | DB query | Count pageviews for org | Includes pageviews with null agent_id |

---

## UI TESTS - ROLES TO TEST

| Role | User Email | Tests | Magic Link? |
|------|-----------|-------|-------------|
| Admin | qa-admin-tkt-068@greetnow.test | Verify site setup shows pageviews (all types) | Yes |
| Agent | qa-agent-tkt-068@greetnow.test | Verify call logs show covered pageviews | Yes |

---

## UI TESTS - SCENARIOS

| # | Scenario | User Action | Expected Result |
|---|----------|-------------|-----------------|
| 1 | Admin views site setup - no pageviews yet | Login as admin, go to sites setup | Shows "Waiting for installation" |
| 2 | Admin after missed opportunity pageview added | Add pageview with null agent_id, refresh | Shows "Installed" and counts the pageview |
| 3 | Admin views total pageviews count | Check detected sites count | Shows total including both covered and missed |
| 4 | Agent views call logs | Login as agent, go to calls dashboard | Shows only calls with agents (covered pageviews) |
| 5 | Verify verification logic counts all pageviews | Check verification query in code | Query doesn't filter by agent_id |

---

## ARTIFACT TRACKING

| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| DB schema verification | API | ☐ | [pending] | [pending] |
| Insert with agent_id | API | ☐ | [pending] | [pending] |
| Insert with null agent_id | API | ☐ | [pending] | [pending] |
| Query all pageviews | API | ☐ | [pending] | [pending] |
| Socket handler verification | API | ☐ | [pending] | [pending] |
| Count without filter | API | ☐ | [pending] | [pending] |
| Admin - no pageviews | UI | ☐ | [pending] | [pending] |
| Admin - after missed opportunity | UI | ☐ | [pending] | [pending] |
| Admin - total count | UI | ☐ | [pending] | [pending] |
| Agent - call logs | UI | ☐ | [pending] | [pending] |
| Verification logic check | Code | ☐ | [pending] | [pending] |

---

## Testing Strategy

### Phase 1: Code Inspection (verify implementation exists)
1. Confirm `pageview-logger.ts:12` accepts `agentId: string | null`
2. Confirm `pageview-logger.ts:52` allows null: `agent_id: data.agentId`
3. Confirm `socket-handlers.ts:282` passes `agentId: null` for missed opportunities
4. Confirm `supabase/migrations/20251128400000_widget_pageviews.sql:13` has nullable agent_id

### Phase 2: Database Direct Testing
1. Start dashboard on port 3168
2. Connect to Supabase and verify schema
3. Insert test pageviews (with and without agent_id)
4. Query to verify both types are stored and counted

### Phase 3: UI Testing
1. Create admin user for test org
2. Add pageviews via DB for that org (both types)
3. Verify site setup page shows "Installed" and counts both
4. Create agent user
5. Verify agent dashboard shows appropriate data

---

## Risk Verification

| Risk | Mitigation Check |
|------|-----------------|
| Database migration backwards compatible | ✅ Schema created with nullable agent_id from start - no migration needed |
| Analytics queries handle null agent_id | ✅ Verify queries don't filter by agent_id in verification logic |
| Differentiate covered vs missed | ✅ Code logs "pageview" vs "missed_opportunity" (line 63) |

---

## Test Data Setup

```sql
-- Test org and users will be created via PM Dashboard API
-- Pageviews will be inserted directly to test both scenarios:

-- Covered pageview (with agent)
INSERT INTO widget_pageviews (organization_id, visitor_id, page_url, agent_id)
VALUES ('[test-org-id]', 'visitor-123', 'https://example.com', '[agent-id]');

-- Missed opportunity (no agent)
INSERT INTO widget_pageviews (organization_id, visitor_id, page_url, agent_id)
VALUES ('[test-org-id]', 'visitor-456', 'https://example.com', NULL);
```

---

## Notes
- This ticket has NO NEW CODE - testing existing implementation
- Focus on verifying all acceptance criteria work as documented
- Both API and UI testing required (hybrid ticket)
- Evidence must include actual query results and screenshots
