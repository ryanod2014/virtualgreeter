# TEST LOCK Agent: P2

> **Feature:** Agent Assignment Algorithm
> **Priority:** Critical
> **Doc:** `docs/features/platform/agent-assignment.md`

---

## Your Task

Lock in current behavior for all code in the Agent Assignment Algorithm feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Agent Assignment Algorithm determines which agent handles which visitor using **tiered priority routing** with **round-robin + least-connections** load balancing within each tier. Visitors are first matched to pools via URL routing rules, then assigned to the best available agent in that pool.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/features/routing/pool-manager.ts` | `findBestAgent`, `findBestAgentInTier`, `findBestAgentForVisitor`, `matchPathToPool`, `assignVisitorToAgent` | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `VISITOR_JOIN` handler | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### pool-manager.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `matchPathToPool` | 1. Returns matching pool when conditions match, 2. Returns defaultPoolId when no rules match, 3. Returns null when no config for org, 4. Rules are evaluated by priority (DESC) |
| `findBestAgent` | 5. Groups agents by priority_rank, 6. Tries tiers in order (lower rank first), 7. Falls through to next tier if tier at capacity, 8. Returns undefined when all tiers exhausted |
| `findBestAgentInTier` | 9. Skips agents with status in_call/offline/away, 10. Skips agents at max capacity, 11. For idle agents with 0 load: round-robin by assignment order, 12. For agents with load: least-connections (lowest count wins) |
| `findBestAgentForVisitor` | 13. Combines pool matching + agent finding, 14. Passes excludeAgentId to avoid same agent |
| `assignVisitorToAgent` | 15. Updates agent's currentSimulations, 16. Increments assignment counter, 17. Updates lastAssignmentOrder for agent |
| `matchConditions` | 18. Uses AND logic for multiple conditions, 19. Matches path patterns, 20. Matches query parameters |

### socket-handlers.ts (VISITOR_JOIN)

| Area | Behaviors to Test |
|------|-------------------|
| **Join Flow** | 1. Registers visitor with orgId and pageUrl, 2. Calls findBestAgentForVisitor, 3. Emits agent:assigned on success, 4. Emits agent:unavailable when no agent found |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/platform/agent-assignment.md`
3. Read each source file listed above
4. Read existing test patterns: `apps/server/src/features/routing/pool-manager.test.ts`
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/P2-[TIMESTAMP].md`

---

## Mocking Notes

- Mock the agents Map with various test scenarios
- Mock orgConfigs for routing rules
- Use `vi.useFakeTimers()` for assignment order tests

---

## Output

- `apps/server/src/features/routing/pool-manager.test.ts` (assignment tests)
- `apps/server/src/features/signaling/socket-handlers.test.ts` (visitor join tests)
- Completion report: `docs/agent-output/test-lock/P2-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (match, fallback, no agents)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")


