# TEST LOCK Agent: P3

> **Feature:** Call Lifecycle
> **Priority:** Critical
> **Doc:** `docs/features/platform/call-lifecycle.md`

---

## Your Task

Lock in current behavior for all code in the Call Lifecycle feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Call Lifecycle is the core state machine orchestrating all video calls between website visitors and agents. It manages the complete flow from call request → ringing → acceptance/rejection → active call → call end, plus reconnection scenarios.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/features/signaling/socket-handlers.ts` | Socket event handlers | High |
| `apps/server/src/features/routing/pool-manager.ts` | Agent assignment, call queue | High |

**Note:** `socket-handlers.test.ts` and `pool-manager.test.ts` already exist! Read them first, then expand coverage if needed.

---

## Behaviors to Capture

### socket-handlers.ts (EXPAND EXISTING TESTS)

Check existing tests. Add any missing behaviors:

| Event | Behaviors to Test |
|-------|-------------------|
| **call:request** | 1. Creates call request, 2. Logs to database, 3. Emits call:incoming to agent, 4. Starts RNA timeout |
| **call:accept** | 5. Clears RNA timeout, 6. Creates ActiveCall, 7. Generates reconnect token, 8. Emits call:accepted to visitor, 9. Emits call:started to agent |
| **call:reject** | 10. Triggers reroute to next agent, 11. Clears RNA timeout |
| **call:end** | 12. Emits call:ended to both parties, 13. Logs call completion, 14. Clears max duration timeout |
| **RNA timeout** | 15. Sets agent to 'away', 16. Reroutes visitor to next agent |
| **Max duration timeout** | 17. Ends call when max duration reached |
| **Reconnection** | 18. Valid reconnect token → rejoin call, 19. Invalid/expired token → rejected |

### pool-manager.ts (EXPAND EXISTING TESTS)

Check existing tests in `pool-manager.test.ts`. Add any missing behaviors:

| Area | Behaviors to Test |
|------|-------------------|
| **Agent Selection** | ✓ Round-robin distribution, ✓ Least connections load balancing |
| **Agent Status** | ✓ Skip in_call agents, ✓ Skip offline agents |
| **Call Queue** | ✓ FIFO order for waiting requests |
| **Rerouting** | Visitor rerouted when agent busy, No available agents → queue visitor |
| **Reconnection** | Grace period for agent reconnection, Stale detection after timeout |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/platform/call-lifecycle.md`
3. **Read existing tests first:**
   - `apps/server/src/features/signaling/socket-handlers.test.ts`
   - `apps/server/src/features/routing/pool-manager.test.ts`
4. Read each source file listed above
5. Write tests for missing behaviors (don't duplicate existing tests)
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/P3-[TIMESTAMP].md`

---

## Mocking Notes

- Socket.IO mocking patterns may be in existing tests
- Mock database calls for call logging
- Mock timers for timeout testing (`vi.useFakeTimers()`)
- Mock reconnect token generation/validation

---

## Output

- Expand `apps/server/src/features/signaling/socket-handlers.test.ts` if gaps exist
- Expand `apps/server/src/features/routing/pool-manager.test.ts` if gaps exist
- Completion report: `docs/agent-output/test-lock/P3-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] Don't duplicate existing tests - expand them
- [ ] One behavior per `it()` block
- [ ] All state transitions covered
- [ ] Timeout behaviors tested with fake timers
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns from existing tests




