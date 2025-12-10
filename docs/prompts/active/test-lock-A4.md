# TEST LOCK Agent: A4

> **Feature:** Agent Active Call
> **Priority:** Critical
> **Doc:** `docs/features/agent/agent-active-call.md`

---

## Your Task

Lock in current behavior for all code in the Agent Active Call feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Agent Active Call feature handles the agent's experience once a call has been accepted. It includes a real-time video call interface with controls for mute, video toggle, screen sharing, a live call duration timer, WebRTC connection management, and co-browse integration to view the visitor's screen during the call.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/features/webrtc/active-call-stage.tsx` | `ActiveCallStage` component | High |
| `apps/dashboard/src/features/webrtc/use-webrtc.ts` | `useWebRTC` hook, connection management | High |
| `apps/dashboard/src/features/webrtc/use-call-recording.ts` | `useCallRecording` hook | Medium |
| `apps/server/src/features/signaling/socket-handlers.ts` | `CALL_END`, `WEBRTC_SIGNAL` handlers | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### ActiveCallStage.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows local video preview, 2. Shows remote video when connected, 3. Shows "LIVE" badge when connected, 4. Shows call duration timer |
| **Controls** | 5. Mute button toggles audio track enabled, 6. Video button toggles video track enabled, 7. End call button calls onEndCall, 8. Fullscreen button toggles fullscreen state, 9. Screen share button calls startScreenShare |
| **Timer** | 10. Updates every second from call.startedAt |

### use-webrtc.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `initializeCall` | 1. Creates RTCPeerConnection with ICE servers, 2. Calls getUserMedia for local stream, 3. Adds tracks to peer connection, 4. Sets up ontrack handler |
| `createOffer` | 5. Creates and sets local description, 6. Emits webrtc:signal with offer |
| `handleSignal` | 7. Handles offer → creates answer, 8. Handles answer → sets remote description, 9. Handles candidate → adds ICE candidate |
| `startScreenShare` | 10. Calls getDisplayMedia, 11. Replaces video track on peer connection, 12. Sends renegotiation offer |
| `stopScreenShare` | 13. Stops screen share track, 14. Restores camera track |
| Cleanup | 15. Closes peer connection, 16. Stops all tracks, 17. Clears refs |

### use-call-recording.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Recording** | 1. Creates canvas for side-by-side video, 2. Creates AudioContext to mix audio, 3. Uses MediaRecorder with 1s chunks |
| **Upload** | 4. Uploads to Supabase storage on call end, 5. Updates call_logs with recording_url |

### socket-handlers.ts (Call Handlers)

| Handler | Behaviors to Test |
|---------|-------------------|
| `CALL_END` | 1. Clears max duration timeout, 2. Marks call as ended in database, 3. Emits call:ended to both parties, 4. Triggers disposition modal |
| `WEBRTC_SIGNAL` | 5. Forwards signal from sender to receiver, 6. Validates caller is part of the call |
| Max duration timeout | 7. Auto-ends call after configured max duration, 8. Emits call:ended with reason "max_duration" |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/agent/agent-active-call.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/A4-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `RTCPeerConnection` (createOffer, createAnswer, setLocalDescription, setRemoteDescription, addIceCandidate)
- Mock `navigator.mediaDevices.getUserMedia` and `getDisplayMedia`
- Mock `MediaRecorder` for recording tests
- Mock `canvas` and `AudioContext` for recording compositing
- Mock Supabase storage for upload tests

---

## Output

- `apps/dashboard/src/features/webrtc/active-call-stage.test.tsx`
- `apps/dashboard/src/features/webrtc/use-webrtc.test.ts`
- `apps/dashboard/src/features/webrtc/use-call-recording.test.ts`
- `apps/server/src/features/signaling/socket-handlers.test.ts` (call end tests)
- Completion report: `docs/agent-output/test-lock/A4-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (connect, controls, screen share, end)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")



