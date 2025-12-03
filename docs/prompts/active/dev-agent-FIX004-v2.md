# Dev Agent: FIX-004 v2

You are a Dev Agent. Your job is to implement fix **FIX-004: Agent Disconnect Grace Period + Auto-Route**.

## ⚠️ IMPORTANT: Branch Exists But Is Empty

A previous agent created the branch but never implemented the fix. Check out existing branch.

## Your Assignment

**Ticket:** FIX-004
**Priority:** P1 (High)
**Source:** Critical UX issue found during review

**Problem:**
Current behavior immediately ends calls when agent disconnects mid-call. From `socket-handlers.ts` line 1375:
```typescript
// End any active call immediately (can't wait for grace period)
const activeCall = poolManager.getActiveCallByAgentId(agentId);
if (activeCall) {
  markCallEnded(activeCall.callId);
  poolManager.endCall(activeCall.callId);
  visitorSocket?.emit(SOCKET_EVENTS.CALL_ENDED, {
    callId: activeCall.callId,
    reason: "agent_ended",
  });
}
```

The existing 10s grace period only preserves agent registration status, NOT active calls.

**Solution:**
1. **Server:** Instead of immediately ending call, start a mid-call grace period (5-10s)
2. **Server:** If agent reconnects within grace period, restore the call
3. **Server:** If grace period expires, call `findBestAgentForVisitor()` to route visitor to new agent
4. **Widget:** On agent disconnect during call, show "Your connection errored" message
5. **Widget:** Auto-expand widget (not minimize) and show "Connecting to new agent..." state
6. **Widget:** Handle `AGENT_REASSIGNED` event during active call

**Files to Modify:**
- `apps/server/src/features/signaling/socket-handlers.ts` - Grace period logic
- `apps/widget/src/Widget.tsx` or relevant component - Error message + reconnect UI

**Acceptance Criteria:**
- [ ] Mid-call agent disconnect triggers grace period instead of immediate call end
- [ ] Agent can reconnect within grace period and resume call
- [ ] After timeout, visitor is routed to new agent
- [ ] Widget shows "Your connection errored" message
- [ ] Widget auto-expands (not minimized) during reconnection
- [ ] All verification checks pass

## Your SOP

### Phase 0: Git Setup

```bash
git fetch origin
git checkout fix/FIX-004-disconnect-recovery
git merge main
```

### Phase 0.5: Signal Start (REQUIRED!)

**Immediately after git setup, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-004-v2
- **Ticket:** FIX-004
- **Status:** STARTED
- **Branch:** fix/FIX-004-disconnect-recovery
- **Files Locking:** `apps/server/src/features/signaling/socket-handlers.ts`, `apps/widget/src/Widget.tsx`
- **Notes:** Beginning disconnect grace period implementation
```

**This signals to PM that you're live and which files to lock.**

### Phase 1: Understand (10 min)

1. **Read** `socket-handlers.ts` lines 1370-1400 - Current disconnect handling
2. **Find** existing grace period logic (line 427 has timer clear on reconnect)
3. **Read** widget code for connection state handling
4. **Understand** `findBestAgentForVisitor()` for rerouting

### Phase 2: Implement

**Server changes:**
1. When agent disconnects mid-call, don't end call immediately
2. Start grace period timer (use existing `CALL_RECONNECT_TIMEOUT` or similar)
3. Store call state for potential reconnection
4. If agent reconnects, restore call
5. If timeout, emit `AGENT_DISCONNECTED` event to visitor, then try `findBestAgentForVisitor()`

**Widget changes:**
1. Handle `AGENT_DISCONNECTED` event
2. Show "Your connection errored" message
3. Expand widget if minimized
4. Transition to "Connecting to new agent..." state
5. Handle `AGENT_REASSIGNED` event to show new agent

### Phase 3: Self-Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

```bash
git add .
git commit -m "fix(FIX-004): add grace period for mid-call agent disconnect

- Server now waits before ending call on agent disconnect
- Agent can reconnect within grace period
- After timeout, visitor is routed to new agent
- Widget shows error message and reconnection UI

Closes FIX-004"

git push origin fix/FIX-004-disconnect-recovery
```

### Phase 5: Notify PM

Append to `docs/agent-inbox/completions.md`:

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-004-v2
- **Ticket:** FIX-004
- **Status:** COMPLETE
- **Branch:** fix/FIX-004-disconnect-recovery
- **Output:** Branch pushed
- **Notes:** Grace period + auto-route implemented. Has UI changes - needs human review.
```

## Human Review Required

- [x] **UI Changes** - Widget shows error message and reconnection state

## If You Have Questions

Add to findings file and notify via completions.md with status BLOCKED.

