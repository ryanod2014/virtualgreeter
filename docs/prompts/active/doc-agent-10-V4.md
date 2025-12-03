# Doc Agent 10: V4 - Call Reconnection

You are a Doc Agent. Your job is to document **V4: Call Reconnection**.

## Your Assignment

**Feature ID:** V4
**Feature Name:** Call Reconnection
**Category:** Visitor
**Output File:** `docs/features/visitor/call-reconnection.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/widget/src/Widget.tsx` - Reconnection logic
- `apps/widget/src/features/signaling/useSignaling.ts` - Socket reconnection
- `apps/server/src/features/signaling/socket-handlers.ts` - CALL_RECONNECT handler
- `packages/domain/src/types.ts` - Reconnection types
- localStorage usage for token persistence

## What to Document

1. How call state persists across page navigation
2. Token storage and retrieval
3. Reconnection flow (visitor returns to page)
4. Server-side call state recovery
5. WebRTC re-establishment
6. Edge cases (token expired, call already ended, etc.)

## Special Focus

- How long does the reconnection token last?
- What happens if visitor navigates away for 5 min?
- What if agent ended call while visitor was away?
- Are there race conditions in reconnection?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/visitor/call-reconnection.md`

## Completion

When done, report:
- Doc file created
- Any questions (Q-XXX format)
- Any issues found (severity: 🔴/🟡/🟢)
- Status: COMPLETE

