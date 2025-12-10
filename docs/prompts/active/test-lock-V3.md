# TEST LOCK Agent: V3

> **Feature:** Visitor Call
> **Priority:** Critical
> **Doc:** `docs/features/visitor/visitor-call.md`

---

## Your Task

Lock in current behavior for all code in the Visitor Call feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The complete visitor experience from clicking "Start Call" (via camera/mic buttons) through the video conversation to hangup. This is THE conversion moment - when a browsing visitor becomes an active lead on a live video call with an agent.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/widget/src/Widget.tsx` | `handleCameraToggle`, `handleMicToggle`, call state management | High |
| `apps/widget/src/features/signaling/useSignaling.ts` | `requestCall`, `cancelCall`, `endCall` | High |
| `apps/widget/src/features/webrtc/useWebRTC.ts` | `initializeCall`, `processSignal`, peer connection management | High |
| `apps/widget/src/features/webrtc/LiveCallView.tsx` | In-call video UI | Medium |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### Widget.tsx (Call Initiation)

| Area | Behaviors to Test |
|------|-------------------|
| **Camera Toggle** | 1. Requests getUserMedia with video, 2. Sets state to "waiting_for_agent" on success, 3. Shows error toast on permission denied, 4. Sets previewStream on success |
| **Mic Toggle** | 5. Requests getUserMedia with audio, 6. Same state transitions as camera |
| **Cancel Waiting** | 7. Cleans up preview stream, 8. Resets state to "open", 9. Emits call:cancel |
| **Call Timeout** | 10. Shows call_timeout state after 45s, 11. Retry returns to waiting_for_agent |
| **End Call** | 12. Ends signaling and WebRTC, 13. Transitions to minimized |

### useSignaling.ts (Call Events)

| Function | Behaviors to Test |
|----------|-------------------|
| `requestCall` | 1. Emits call:request with agentId, 2. Stores reconnect token on call:accepted |
| `cancelCall` | 3. Emits call:cancel event |
| `endCall` | 4. Emits call:end event |
| Event handlers | 5. call:accepted sets callAccepted=true, 6. call:rejected keeps visitor waiting, 7. agent:unavailable hides widget |

### useWebRTC.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `initializeCall` | 1. Creates RTCPeerConnection with ICE servers, 2. Gets user media for local stream, 3. Adds tracks to peer connection |
| `processSignal` | 4. Handles offer → creates answer, 5. Handles answer → sets remote description, 6. Handles ICE candidate → adds to peer |
| Connection states | 7. "connected" state fires callback, 8. "failed" state handles error, 9. 30s timeout triggers callback |
| Cleanup | 10. Closes peer connection, 11. Stops all tracks, 12. Removes event handlers |

### LiveCallView.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **UI Controls** | 1. Mute button toggles audio track, 2. Camera button toggles video track, 3. End button calls onEndCall, 4. Fullscreen button toggles fullscreen state |
| **Video Display** | 5. Local video shows self-view, 6. Remote video shows agent, 7. "LIVE" badge displayed |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/visitor/visitor-call.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/V3-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `navigator.mediaDevices.getUserMedia`
- Mock `RTCPeerConnection` (createOffer, createAnswer, setLocalDescription, setRemoteDescription, addIceCandidate)
- Mock Socket.io client for signaling events
- Mock video/audio tracks with enabled property

---

## Output

- `apps/widget/src/Widget.test.tsx` (call-related tests)
- `apps/widget/src/features/signaling/useSignaling.test.ts` (call events)
- `apps/widget/src/features/webrtc/useWebRTC.test.ts`
- `apps/widget/src/features/webrtc/LiveCallView.test.tsx`
- Completion report: `docs/agent-output/test-lock/V3-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (permissions, success, errors, timeouts)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")



