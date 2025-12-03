# Doc Agent 7: A1 - Bullpen & Agent States

You are a Doc Agent. Your job is to document **A1: Bullpen & Agent States**.

## Your Assignment

**Feature ID:** A1
**Feature Name:** Bullpen & Agent States
**Category:** Agent
**Output File:** `docs/features/agent/bullpen-states.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/dashboard/src/features/workbench/` - Bullpen UI components
- `apps/server/src/features/signaling/socket-handlers.ts` - Status change handlers
- `apps/server/src/features/routing/pool-manager.ts` - Agent state management
- `packages/domain/src/types.ts` - AgentStatus type, related types
- `packages/domain/src/constants.ts` - Idle timeout, etc.

## What to Document

1. All agent states (away, idle, in_call, offline)
2. How state transitions work
3. Status dropdown UI and behavior
4. Idle timeout logic (auto-away)
5. How states affect routing eligibility
6. Reconnection behavior per state

## Special Focus

- What triggers each state transition?
- How does idle timeout work? Is it configurable?
- What happens to in-progress work when status changes?
- Are there any inconsistencies between UI state and server state?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found (bugs, edge cases, concerns)
5. Output your doc to `docs/features/agent/bullpen-states.md`

## Completion

When done, report:
- Doc file created
- Any questions (Q-XXX format)
- Any issues found (severity: 🔴/🟡/🟢)
- Status: COMPLETE

