# Doc Agent 6: P6 - Heartbeat & Staleness Detection

You are a Doc Agent. Your job is to document **P6: Heartbeat & Staleness Detection**.

## Your Assignment

**Feature ID:** P6
**Feature Name:** Heartbeat & Staleness Detection
**Category:** Platform
**Output File:** `docs/features/platform/heartbeat-staleness.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/server/src/features/signaling/socket-handlers.ts` - Heartbeat handlers
- `apps/server/src/features/routing/pool-manager.ts` - Staleness checks, cleanup
- `packages/domain/src/constants.ts` - Timing constants
- `packages/domain/src/types.ts` - Related types

## What to Document

1. How agents send heartbeats
2. How server tracks agent liveness
3. Staleness detection thresholds and logic
4. What happens when agent goes stale (cleanup, reassignment)
5. Grace periods for reconnection
6. Edge cases (network blips, browser freeze, tab visibility)

## Special Focus

- What is the staleness threshold? (check constants)
- How does staleness detection interact with agent status?
- What triggers cleanup vs what triggers reassignment?
- Are there race conditions between heartbeat and status changes?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found (bugs, edge cases, concerns)
5. Output your doc to `docs/features/platform/heartbeat-staleness.md`

## Completion

When done, report:
- Doc file created
- Any questions (Q-XXX format)
- Any issues found (severity: 🔴/🟡/🟢)
- Status: COMPLETE

