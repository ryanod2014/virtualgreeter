# Dev Agent Continuation: TKT-016-v2

> **Type:** Continuation (QA FAILED - Incomplete Implementation)
> **Original Ticket:** TKT-016
> **Branch:** `agent/tkt-016-webrtc-ice-restart` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Dashboard (Agent) Side Not Implemented

**QA Summary:**
Incomplete implementation - only widget (visitor) side has ICE restart functionality. The dashboard (agent) side was not implemented despite being in the ticket scope. Agent still requires manual intervention on network issues.

**Failures Found:**

1. **Incomplete Scope Coverage**
   - Expected: Both widget (visitor) AND dashboard (agent) should have automatic ICE restart
   - Actual: Only widget side implemented
   - Evidence: Only 1 of 3 files specified in ticket scope was modified
   - Impact: Agent must still manually end/restart calls on network issues

2. **Missing Files**
   - ✅ `apps/widget/src/features/webrtc/useWebRTC.ts` - IMPLEMENTED (excellent quality)
   - ❌ `apps/dashboard/src/features/call/useWebRTC.ts` - NOT MODIFIED (no ICE restart logic)
   - ❌ `apps/server/src/features/signaling/handleIceRestart.ts` - NOT CREATED

3. **Dashboard Missing Features**
   - No `performIceRestart()` function
   - No `isReconnecting` state
   - No connection state handlers for restart
   - No logging for reconnection attempts
   - No retry counter with max attempts

**What You Must Implement:**

Use the EXCELLENT widget implementation as a reference and implement the same ICE restart logic on the dashboard (agent) side.

---

## Your Task

1. Checkout existing branch: `git checkout agent/tkt-016-webrtc-ice-restart`
2. Pull latest: `git pull origin agent/tkt-016-webrtc-ice-restart`
3. Read the QA failure report carefully
4. **Review widget implementation** at `apps/widget/src/features/webrtc/useWebRTC.ts` to see the pattern
5. **Implement ICE restart on dashboard side** at `apps/dashboard/src/features/call/useWebRTC.ts`
6. **Create server handler** at `apps/server/src/features/signaling/handleIceRestart.ts` if needed
7. Verify with grep/code inspection BEFORE claiming completion
8. Push for re-QA

---

## Implementation Requirements

Based on widget implementation, add to `apps/dashboard/src/features/call/useWebRTC.ts`:

### 1. State Management
```typescript
const [isReconnecting, setIsReconnecting] = useState(false);
const reconnectAttempts = useRef(0);
const MAX_RECONNECT_ATTEMPTS = 3;
```

### 2. performIceRestart() Function
- Implement ICE restart using `peerConnection.restartIce()`
- Track retry attempts (max 3)
- Set `isReconnecting` state
- Log all reconnection attempts
- Show error after max attempts exceeded

### 3. Connection State Handlers
- Monitor `peerConnection.connectionState`
- Trigger ICE restart on `failed` or `disconnected` states
- Handle state transitions properly

### 4. UI Feedback
- Show 'Reconnecting...' status during restart attempts
- Display clear error message if all attempts fail

### 5. Logging
Log all reconnection events:
- Attempt started
- Attempt number
- Success/failure
- Max attempts reached

---

## Original Acceptance Criteria

From TKT-016: WebRTC ICE Restart on Connection Failure

1. ICE failure triggers automatic restart attempt ← Dashboard needs this
2. Up to 3 restart attempts before showing error ← Dashboard needs this
3. User sees 'Reconnecting...' status during attempts ← Dashboard needs this
4. If all attempts fail, graceful error message shown ← Dashboard needs this
5. Reconnection events logged for debugging ← Dashboard needs this

**Widget implementation:** ✅ ALL 5 PASSED
**Dashboard implementation:** ❌ ALL 5 MISSING

---

## Files in Scope

Original files_to_modify:
- apps/dashboard/src/features/call/useWebRTC.ts ← **YOU MUST IMPLEMENT THIS**
- apps/widget/src/features/webrtc/useWebRTC.ts ← ✅ Already done (use as reference)
- apps/server/src/features/signaling/handleIceRestart.ts ← Create if needed

---

## Dev Checks

- [ ] Dashboard useWebRTC.ts has `performIceRestart()` function
- [ ] Dashboard has `isReconnecting` state and UI
- [ ] Connection state handlers detect failures and trigger restart
- [ ] Retry counter with max 3 attempts
- [ ] Logging for all reconnection events
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Manual test: Simulate network disconnect during agent call
- [ ] All 5 acceptance criteria now work on BOTH sides
- [ ] Push to branch

---

## Reference Implementation

The widget implementation at `apps/widget/src/features/webrtc/useWebRTC.ts` is technically excellent. Copy that pattern to the dashboard side, adapting for agent-specific UI and logging.

**QA Note:** Widget implementation quality is production-ready. Just need to replicate for dashboard.
