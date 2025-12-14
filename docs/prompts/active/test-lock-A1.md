# TEST LOCK Agent: A1

> **Feature:** Bullpen & Agent States
> **Priority:** Critical
> **Doc:** `docs/features/agent/bullpen-states.md`

---

## Your Task

Lock in current behavior for all code in the Bullpen & Agent States feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Bullpen is the agent's main workspace in the dashboard where they manage their live presence and receive incoming calls. Agent states control availability and routing eligibility. The system tracks five distinct states: `offline`, `idle`, `in_simulation`, `in_call`, and `away`, with automatic transitions based on activity, timeouts, and call events.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/features/signaling/use-signaling.ts` | `setAway`, `setBack`, status management | High |
| `apps/dashboard/src/features/workbench/hooks/useIdleTimer.ts` | `useIdleTimer` hook, Web Worker logic | High |
| `apps/dashboard/src/features/workbench/hooks/useHeartbeat.ts` | `useHeartbeat` hook | Medium |
| `apps/server/src/features/routing/pool-manager.ts` | `updateAgentStatus`, `getStaleAgents` | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `AGENT_AWAY`, `AGENT_BACK` handlers | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### use-signaling.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `setAway` | 1. Emits agent:away with reason, 2. Retries up to 3 times on failure, 3. Sets isMarkedAway=true on success, 4. Sets awayReason message |
| `setBack` | 5. Emits agent:back event, 6. Retries up to 3 times on failure, 7. Clears isMarkedAway on success |
| `handleAgentMarkedAway` | 8. Sets isMarkedAway=true, 9. Sets awayReason from payload |

### useIdleTimer.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Idle Detection** | 1. Detects inactivity after configured timeout (5 min default), 2. Resets on mouse/keyboard/scroll/touch events, 3. Uses Web Worker when available, 4. Falls back to setTimeout when Worker unavailable |
| **Hidden Tab** | 5. Shows browser notification when tab hidden, 6. 60 second grace period for response, 7. Returns to active on tab visible |
| **Callbacks** | 8. Fires onIdle callback when idle confirmed, 9. Fires onActive callback when user returns |

### useHeartbeat.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Heartbeat** | 1. Sends heartbeat every 25 seconds, 2. Uses Web Worker to prevent Chrome throttling, 3. Falls back to setInterval if Worker fails |

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `updateAgentStatus` | 1. Updates agent.profile.status, 2. Updates lastActivityAt timestamp |
| `getStaleAgents` | 3. Returns agents with status="idle" and lastActivityAt > threshold, 4. Does not return agents with other statuses |

### socket-handlers.ts (Agent Events)

| Handler | Behaviors to Test |
|---------|-------------------|
| `AGENT_AWAY` | 1. Calls updateAgentStatus("away"), 2. Calls recordStatusChange with reason, 3. Calls reassignVisitors for agent, 4. Emits AGENT_UNAVAILABLE to affected visitors, 5. Sends ack with success |
| `AGENT_BACK` | 6. Calls updateAgentStatus("idle"), 7. Reassigns unassigned visitors in matched pools, 8. Sends ack with success |
| Staleness check | 9. Runs every 60 seconds, 10. Marks idle agents without heartbeat as away after 2 minutes |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/agent/bullpen-states.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/A1-[TIMESTAMP].md`

---

## Mocking Notes

- Mock Socket.io for signaling events and acks
- Mock Web Worker for idle timer and heartbeat
- Mock `document.visibilityState` for hidden tab tests
- Mock `Notification` API for browser notifications
- Use `vi.useFakeTimers()` for timeout tests

---

## Output

- `apps/dashboard/src/features/signaling/use-signaling.test.ts` (status tests)
- `apps/dashboard/src/features/workbench/hooks/useIdleTimer.test.ts`
- `apps/dashboard/src/features/workbench/hooks/useHeartbeat.test.ts`
- `apps/server/src/features/routing/pool-manager.test.ts` (status tests)
- `apps/server/src/features/signaling/socket-handlers.test.ts` (agent events)
- Completion report: `docs/agent-output/test-lock/A1-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (manual away, idle timeout, staleness)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")






