# TEST LOCK Agent: P4

> **Feature:** Visitor Reassignment
> **Priority:** High
> **Doc:** `docs/features/platform/visitor-reassignment.md`

---

## Your Task

Lock in current behavior for all code in the Visitor Reassignment feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Visitor Reassignment handles what happens when an agent becomes unavailable (disconnects, goes away, rejects, or times out) and a visitor needs to be handed off to another agent. The system attempts to find a replacement agent or gracefully notifies the visitor if none are available.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/features/routing/pool-manager.ts` | `reassignVisitors` | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `AGENT_AWAY`, `disconnect`, `CALL_REJECT` handlers, `notifyReassignments` | High |
| `apps/widget/src/Widget.tsx` | `onAgentReassigned`, `onAgentUnavailable` handlers | Medium |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `reassignVisitors` | 1. Gets all visitors in agent's currentSimulations, 2. Excludes specified visitorId (the one in call), 3. Calls findBestAgent for each visitor, 4. Returns reassigned Map and unassigned array, 5. Assigns visitor to new agent when found, 6. Clears visitor's assignedAgentId when no agent found |

### socket-handlers.ts

| Handler | Behaviors to Test |
|---------|-------------------|
| `AGENT_AWAY` | 1. Updates agent status to "away", 2. Calls reassignVisitors for agent, 3. Cancels any pending call requests |
| `disconnect` | 4. Ends call immediately if agent in_call, 5. Starts 10s grace period if not in call, 6. Reassigns visitors if grace period expires, 7. Restores status if reconnects within grace |
| `CALL_REJECT` | 8. Clears RNA timeout, 9. Finds next agent with excludeAgentId, 10. Creates new call request for new agent, 11. Emits agent:unavailable if no agents |
| `notifyReassignments` | 12. Emits AGENT_REASSIGNED to reassigned visitors, 13. Emits AGENT_UNAVAILABLE to unassigned visitors |

### Widget.tsx (Visitor Side)

| Handler | Behaviors to Test |
|---------|-------------------|
| `onAgentReassigned` | 1. Shows handoff message with previous/new agent names, 2. Updates agent state, 3. Clears stored widget state, 4. Resets intro sequence |
| `onAgentUnavailable` | 5. Cleans up preview stream, 6. Shows "got pulled away" message briefly, 7. Hides widget after message |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/platform/visitor-reassignment.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/P4-[TIMESTAMP].md`

---

## Mocking Notes

- Mock pool manager for reassignment tests
- Use `vi.useFakeTimers()` for grace period tests
- Mock Socket.io for event emissions
- Mock localStorage for widget state tests

---

## Output

- `apps/server/src/features/routing/pool-manager.test.ts` (reassignment tests)
- `apps/server/src/features/signaling/socket-handlers.test.ts` (away/disconnect/reject tests)
- `apps/widget/src/Widget.test.tsx` (reassignment handler tests)
- Completion report: `docs/agent-output/test-lock/P4-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (reassigned, unassigned, grace period)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")


