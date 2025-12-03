# Doc Agent 9: P5 - WebRTC Signaling

You are a Doc Agent. Your job is to document **P5: WebRTC Signaling**.

## Your Assignment

**Feature ID:** P5
**Feature Name:** WebRTC Signaling
**Category:** Platform
**Output File:** `docs/features/platform/webrtc-signaling.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/server/src/features/signaling/socket-handlers.ts` - Signaling relay
- `apps/widget/src/features/webrtc/useWebRTC.tsx` - Widget WebRTC
- `apps/dashboard/src/features/webrtc/` - Dashboard WebRTC
- `packages/domain/src/types.ts` - Signaling types
- `packages/domain/src/constants.ts` - ICE servers, timeouts

## What to Document

1. Offer/Answer/ICE flow
2. STUN/TURN configuration
3. Signal relay through server
4. Connection state machine
5. Reconnection/renegotiation
6. Error handling

## Special Focus

- How are ICE candidates handled?
- What happens if signaling fails mid-connection?
- How does the system handle network changes?
- Are there any race conditions in the signaling flow?
- What's the fallback when STUN fails (TURN)?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found (bugs, edge cases, concerns)
5. Output your doc to `docs/features/platform/webrtc-signaling.md`

## Completion

When done, report:
- Doc file created
- Any questions (Q-XXX format)
- Any issues found (severity: 🔴/🟡/🟢)
- Status: COMPLETE

