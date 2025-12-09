# TEST LOCK Agent: P5

> **Feature:** WebRTC Signaling
> **Priority:** Critical
> **Doc:** `docs/features/platform/webrtc-signaling.md`

---

## Your Task

Lock in current behavior for all code in the WebRTC Signaling feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

WebRTC Signaling enables real-time peer-to-peer video/audio connections between visitors (widget) and agents (dashboard) by exchanging SDP offers/answers and ICE candidates through the signaling server. The system uses Socket.io as the relay mechanism and configures both STUN and TURN servers for NAT traversal.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/features/webrtc/use-webrtc.ts` | `useWebRTC` hook (dashboard) | High |
| `apps/widget/src/features/webrtc/useWebRTC.ts` | `useWebRTC` hook (widget) | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | `WEBRTC_SIGNAL` handler | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### Dashboard use-webrtc.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `initializeCall` | 1. Creates RTCPeerConnection with ICE servers, 2. Calls getUserMedia for local stream, 3. Adds tracks to peer connection, 4. Sets up ontrack handler |
| `createOffer` | 5. Creates SDP offer, 6. Sets local description, 7. Emits webrtc:signal with offer |
| `handleSignal` | 8. Handles answer → sets remote description, 9. Handles ICE candidate → adds to peer connection |
| Screen share | 10. startScreenShare calls getDisplayMedia, 11. Replaces video track on peer, 12. stopScreenShare restores camera track |
| Connection states | 13. "connected" state fires callback, 14. "failed" state handles error |
| Cleanup | 15. Closes peer connection, 16. Stops all tracks |

### Widget useWebRTC.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `initializeCall` | 1. Creates RTCPeerConnection with ICE servers, 2. Gets user media, 3. Adds tracks |
| `processSignal` | 4. Handles offer → sets remote description → creates answer, 5. Handles ICE candidate → adds to peer |
| `pendingSignalsRef` | 6. Queues signals received before peer is ready, 7. Processes queued signals when peer ready |

### socket-handlers.ts (WEBRTC_SIGNAL)

| Area | Behaviors to Test |
|------|-------------------|
| **Relay** | 1. Verifies sender is part of active call, 2. Finds target socket by ID, 3. Forwards signal to target, 4. Ignores invalid signals |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/platform/webrtc-signaling.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/P5-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `RTCPeerConnection` fully (createOffer, createAnswer, setLocalDescription, setRemoteDescription, addIceCandidate, ontrack, onicecandidate)
- Mock `navigator.mediaDevices.getUserMedia` and `getDisplayMedia`
- Mock Socket.io for signal relay tests
- Mock video/audio tracks with enabled property

---

## Output

- `apps/dashboard/src/features/webrtc/use-webrtc.test.ts`
- `apps/widget/src/features/webrtc/useWebRTC.test.ts`
- `apps/server/src/features/signaling/socket-handlers.test.ts` (signal relay tests)
- Completion report: `docs/agent-output/test-lock/P5-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (offer, answer, candidates, errors)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")


