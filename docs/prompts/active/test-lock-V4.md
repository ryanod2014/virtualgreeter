# TEST LOCK Agent: V4

> **Feature:** Call Reconnection
> **Priority:** High
> **Doc:** `docs/features/visitor/call-reconnection.md`

---

## Your Task

Lock in current behavior for all code in the Call Reconnection feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Call Reconnection allows visitors to maintain their active call state when navigating between pages on a website, or when recovering from brief network interruptions. The system stores a reconnect token in localStorage that enables both the visitor and agent to re-establish their WebRTC connection without losing the call.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/widget/src/features/signaling/useSignaling.ts` | `storeActiveCall`, `getStoredCall`, `clearStoredCall` | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `CALL_RECONNECT` handler | High |
| `apps/server/src/lib/call-logger.ts` | `getCallByReconnectToken`, `markCallReconnected` | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### useSignaling.ts (Token Storage)

| Function | Behaviors to Test |
|----------|-------------------|
| `storeActiveCall` | 1. Saves reconnectToken, callId, agentId, orgId, timestamp to localStorage, 2. Uses correct storage key (gg_active_call) |
| `getStoredCall` | 3. Returns null if no stored call, 4. Returns null if stored call expired (>5 min), 5. Returns null if orgId doesn't match, 6. Returns valid call data if within expiry and matching org |
| `clearStoredCall` | 7. Removes call data from localStorage |

### socket-handlers.ts (CALL_RECONNECT Handler)

| Area | Behaviors to Test |
|------|-------------------|
| **Token Validation** | 1. Validates token exists in database, 2. Checks call status is "accepted", 3. Verifies agent is still in_call |
| **Reconnection Flow** | 4. Re-registers visitor with original visitorId, 5. Notifies both parties of reconnection in progress, 6. Generates new reconnect token, 7. Emits call:reconnected to both parties |
| **Failure Cases** | 8. Returns error for invalid token, 9. Returns error if call already ended, 10. Returns error if agent disconnected |
| **Pending Reconnects** | 11. First party to reconnect waits for other, 12. 30s timeout for pending reconnect, 13. Cleanup on party disconnect during pending |

### call-logger.ts (Database Operations)

| Function | Behaviors to Test |
|----------|-------------------|
| `getCallByReconnectToken` | 1. Returns call data for valid token, 2. Returns null for invalid token, 3. Checks reconnect_eligible flag |
| `markCallReconnected` | 4. Updates call with new reconnect token, 5. Updates last_heartbeat_at, 6. Clears old token |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/visitor/call-reconnection.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/V4-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `localStorage` for token storage
- Mock Supabase client for database operations
- Mock Socket.io for event handling
- Use `vi.useFakeTimers()` for expiry and timeout tests
- Mock `crypto.randomBytes` for token generation

---

## Output

- `apps/widget/src/features/signaling/useSignaling.test.ts` (reconnection tests)
- `apps/server/src/features/signaling/socket-handlers.test.ts` (CALL_RECONNECT)
- `apps/server/src/lib/call-logger.test.ts` (reconnect token operations)
- Completion report: `docs/agent-output/test-lock/V4-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (valid token, expired, invalid, pending)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")






