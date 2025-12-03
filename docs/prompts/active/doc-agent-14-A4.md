# Doc Agent 14: A4 - Agent Active Call

You are a Doc Agent. Your job is to document **A4: Agent Active Call**.

## Your Assignment

**Feature ID:** A4
**Feature Name:** Agent Active Call
**Category:** Agent
**Output File:** `docs/features/agent/agent-active-call.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/dashboard/src/features/workbench/` - Active call UI
- `apps/dashboard/src/features/webrtc/` - WebRTC handling
- `apps/server/src/features/signaling/socket-handlers.ts` - Call events
- `packages/domain/src/types.ts` - Call types

## What to Document

1. In-call controls (mute, video, screen share)
2. Call duration timer
3. WebRTC connection management
4. Co-browse integration during call
5. Call end handling
6. Error states during call

## Special Focus

- How does screen share work?
- What happens if WebRTC fails mid-call?
- How is call duration tracked?
- What controls are available to agent?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/agent/agent-active-call.md`

## Completion

When done, report doc file created, questions, issues, status.

