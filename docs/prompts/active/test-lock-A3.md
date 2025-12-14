# TEST LOCK Agent: A3

> **Feature:** RNA (Ring-No-Answer) Timeout
> **Priority:** High
> **Doc:** `docs/features/agent/rna-timeout.md`

---

## Your Task

Lock in current behavior for all code in the RNA Timeout feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

RNA (Ring-No-Answer) timeout handles the scenario when a visitor requests a call, but the assigned agent doesn't answer within the configured timeout period. The system automatically marks the non-responsive agent as "away" and attempts to reassign the visitor to another available agent.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/features/signaling/socket-handlers.ts` | `startRNATimeout`, `clearRNATimeout` | High |
| `apps/server/src/features/routing/pool-manager.ts` | `findBestAgentForVisitor`, `updateAgentStatus` | High |
| `apps/server/src/lib/call-settings.ts` | `getCallSettings` (rna_timeout_seconds) | Medium |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### socket-handlers.ts (RNA Logic)

| Function | Behaviors to Test |
|----------|-------------------|
| `startRNATimeout` | 1. Clears existing timeout for same requestId, 2. Sets timeout using org-configured rna_timeout_seconds, 3. Falls back to default 15s if not configured |
| `clearRNATimeout` | 4. Clears timeout from map, 5. Returns true if timeout existed |

### RNA Timeout Handler (when fires)

| Area | Behaviors to Test |
|------|-------------------|
| **Grace Period** | 1. Waits 100ms grace period before processing, 2. Skips if request no longer exists (accepted during grace), 3. Skips if call already active for visitor |
| **Agent Handling** | 4. Marks agent as "away", 5. Records status change with reason "ring_no_answer", 6. Emits call:cancelled to agent, 7. Emits agent:marked_away to agent |
| **Call Handling** | 8. Marks call as "missed" in database |
| **Reassignment** | 9. Calls findBestAgentForVisitor with org and page, 10. If new agent found: creates new call request, 11. If new agent found: starts new RNA timeout, 12. If no agents: emits agent:unavailable to visitor |

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `findBestAgentForVisitor` | 1. Skips agents with status "away", 2. Skips agents with status "in_call", 3. Skips agents with status "offline" |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/agent/rna-timeout.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/A3-[TIMESTAMP].md`

---

## Mocking Notes

- Use `vi.useFakeTimers()` for timeout tests
- Mock Supabase for getCallSettings
- Mock pool manager methods
- Mock Socket.io for event emissions

---

## Output

- `apps/server/src/features/signaling/socket-handlers.test.ts` (RNA tests)
- `apps/server/src/features/routing/pool-manager.test.ts` (agent filtering)
- Completion report: `docs/agent-output/test-lock/A3-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (timeout fires, accept race, no agents)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")





