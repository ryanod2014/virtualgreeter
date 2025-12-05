# TEST LOCK Agent: A2

> **Feature:** Incoming Call
> **Priority:** Critical
> **Doc:** `docs/features/agent/incoming-call.md`

---

## Your Task

Lock in current behavior for all code in the Incoming Call feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

When a visitor requests a call, the assigned agent receives a full-screen notification modal with ringtone, browser notification, and title flash. The agent has a configurable timeout (default 15 seconds) to accept or reject before Ring-No-Answer (RNA) kicks in and routes the visitor elsewhere.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/features/workbench/incoming-call-modal.tsx` | `IncomingCallModal` component | High |
| `apps/dashboard/src/features/workbench/hooks/useIncomingCall.ts` | `startRinging`, `stopRinging`, audio & notifications | High |
| `apps/dashboard/src/features/signaling/use-signaling.ts` | `CALL_INCOMING` handler | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `CALL_REQUEST`, `CALL_ACCEPT`, `CALL_REJECT` handlers | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### IncomingCallModal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows visitor ID (truncated to 20 chars), 2. Shows page URL (truncated), 3. Shows location with flag, 4. Shows countdown timer |
| **Actions** | 5. Accept button calls handleAcceptCall, 6. Reject button calls handleRejectCall |

### useIncomingCall.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `startRinging` | 1. Creates AudioContext and starts dual-tone ring, 2. Shows browser notification with requireInteraction, 3. Starts title flash interval, 4. Shows fallback alert if notifications blocked |
| `stopRinging` | 5. Stops audio oscillator, 6. Closes browser notification, 7. Clears title flash interval, 8. Restores original document.title |
| `handleAcceptCall` | 9. Calls stopRinging, 10. Emits call:accept event |
| `handleRejectCall` | 11. Calls stopRinging, 12. Emits call:reject event |

### socket-handlers.ts (Call Request)

| Handler | Behaviors to Test |
|---------|-------------------|
| `CALL_REQUEST` | 1. Creates CallRequest in pool manager, 2. Creates call_log entry, 3. Emits call:incoming to agent, 4. Starts RNA timeout |
| `CALL_ACCEPT` | 5. Clears RNA timeout, 6. Marks call as accepted, 7. Generates reconnect token, 8. Reassigns other visitors, 9. Emits CALL_STARTED to agent, 10. Starts max duration timeout |
| `CALL_REJECT` | 11. Clears RNA timeout, 12. Finds next agent via findBestAgentForVisitor, 13. Routes visitor to new agent, 14. Emits agent:unavailable if no agents |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/agent/incoming-call.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/A2-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `AudioContext` and `OscillatorNode` for ringtone tests
- Mock `Notification` API for browser notification tests
- Mock `document.title` for title flash tests
- Mock Socket.io for signaling events
- Use `vi.useFakeTimers()` for countdown and interval tests

---

## Output

- `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx`
- `apps/dashboard/src/features/workbench/hooks/useIncomingCall.test.ts`
- `apps/server/src/features/signaling/socket-handlers.test.ts` (call request tests)
- Completion report: `docs/agent-output/test-lock/A2-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (accept, reject, RNA timeout, visitor cancel)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")
