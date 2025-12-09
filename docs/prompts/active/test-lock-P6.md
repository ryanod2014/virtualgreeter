# TEST LOCK Agent: P6

> **Feature:** Heartbeat & Staleness Detection
> **Priority:** High
> **Doc:** `docs/features/platform/heartbeat-staleness.md`

---

## Your Task

Lock in current behavior for all code in the Heartbeat & Staleness Detection feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Heartbeat and staleness detection ensures agents are actually present and responsive. Agents send periodic heartbeat signals to the server; if no heartbeat is received for 2 minutes, the agent is marked as "away" and their visitors are reassigned to other agents.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/features/routing/pool-manager.ts` | `updateAgentActivity`, `getStaleAgents` | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `heartbeat` handler, staleness check interval, disconnect handler | High |
| `apps/dashboard/src/features/workbench/hooks/useHeartbeat.ts` | `useHeartbeat` hook | Medium |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `updateAgentActivity` | 1. Sets lastActivityAt to current timestamp |
| `getStaleAgents` | 2. Returns agents with status="idle" and lastActivityAt older than threshold, 3. Does not return agents with status="in_call", 4. Does not return agents with status="away", 5. Does not return agents with status="offline" |

### socket-handlers.ts

| Area | Behaviors to Test |
|------|-------------------|
| **heartbeat handler** | 1. Calls updateAgentActivity with agent's ID |
| **Staleness check** | 2. Runs every 60 seconds, 3. Uses 2-minute (120s) threshold, 4. Marks stale agents as "away", 5. Records status change with reason "heartbeat_stale", 6. Emits AGENT_MARKED_AWAY to stale agents, 7. Calls reassignVisitors for stale agents |
| **disconnect handler** | 8. Ends call immediately if agent in_call, 9. Starts 10s grace period if not in call, 10. Stores previous status in pendingDisconnects, 11. Restores status if reconnect within grace, 12. Unregisters agent if grace expires |

### useHeartbeat.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Heartbeat** | 1. Sends heartbeat every 25 seconds, 2. Uses Web Worker when available, 3. Falls back to setInterval when Worker unavailable, 4. Stops on component unmount |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/platform/heartbeat-staleness.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/P6-[TIMESTAMP].md`

---

## Mocking Notes

- Use `vi.useFakeTimers()` for interval and timeout tests
- Mock Web Worker for heartbeat hook
- Mock Socket.io for event handlers
- Set up agent test fixtures with various statuses and timestamps

---

## Output

- `apps/server/src/features/routing/pool-manager.test.ts` (staleness tests)
- `apps/server/src/features/signaling/socket-handlers.test.ts` (heartbeat/staleness tests)
- `apps/dashboard/src/features/workbench/hooks/useHeartbeat.test.ts`
- Completion report: `docs/agent-output/test-lock/P6-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (heartbeat, staleness, grace period)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")


