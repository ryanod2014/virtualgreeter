# Feature A3: RNA (Ring-No-Answer) Timeout & Auto-Reassignment

> **Last Updated:** December 2, 2024  
> **Status:** ✅ Documented  
> **Author:** Doc Agent 4

---

## Overview

RNA (Ring-No-Answer) timeout handles the scenario when a visitor requests a call, but the assigned agent doesn't answer within the configured timeout period. The system automatically marks the non-responsive agent as "away" and attempts to reassign the visitor to another available agent.

This ensures visitors don't wait indefinitely for an agent who may have stepped away from their desk.

---

## Configuration

| Setting | Location | Default | Description |
|---------|----------|---------|-------------|
| `RNA_TIMEOUT` | `packages/domain/src/constants.ts:84` | 15,000ms (15s) | Fallback timeout constant |
| `rna_timeout_seconds` | `recording_settings` in organizations table | 15s | Configurable per-organization |

### Configurable Timeout

Organizations can customize the RNA timeout via admin settings. The server fetches the org-specific value using `getCallSettings()`:

```typescript
// apps/server/src/features/signaling/socket-handlers.ts
const callSettings = await getCallSettings(visitor.orgId);
const rnaTimeoutMs = secondsToMs(callSettings.rna_timeout_seconds);
startRNATimeout(io, poolManager, request.requestId, targetAgentId, visitor.visitorId, rnaTimeoutMs);
```

---

## Timing Diagram

```
VISITOR                    SERVER                     AGENT
   |                          |                          |
   |---call:request---------->|                          |
   |                          |---call:incoming--------->|
   |                          |                          |
   |                          |   [START RNA TIMER]      |
   |                          |   (15 seconds)           |
   |                          |                          |
   |                          |   ...waiting...          |
   |                          |                          |
   |                          |   [TIMEOUT FIRES]        |
   |                          |                          |
   |                          |   (100ms grace period)   |
   |                          |                          |
   |                          |   [Re-check call exists] |
   |                          |                          |
   |                          |---call:cancelled-------->|  Agent notified call gone
   |                          |---agent:marked_away----->|  Agent shown "Away" message
   |                          |                          |
   |                          |   [Mark agent "away"]    |
   |                          |   [Mark call "missed"]   |
   |                          |                          |
   |                          |   [Find new agent]       |
   |                          |                          |
   |<---(see reassignment)----|                          |  (if new agent found)
   |                          |                          |
   |<--agent:unavailable------|                          |  (if no agents available)
   |                          |                          |
```

### Reassignment Flow

```
[RNA Timeout Fires]
        |
        v
[100ms Grace Period] -- wait for any pending CALL_ACCEPT
        |
        v
[Check: Request still exists?]
        |
  NO----+----YES
  |          |
  v          v
[Exit]   [Check: Call already active for visitor?]
              |
        NO----+----YES
        |          |
        v          v
   [Continue]   [Exit - Agent won race]
        |
        v
[Mark Agent "away"]
[Notify Agent: call:cancelled + agent:marked_away]
[Mark Call "missed" in DB]
        |
        v
[Find Next Agent via findBestAgentForVisitor]
        |
  FOUND-+---NOT FOUND
  |              |
  v              v
[Create new    [Mark visitor unassigned]
 call request] [Send agent:unavailable to visitor]
[Create call log]
[Notify new agent]
[Start new RNA timeout]  <-- RECURSIVE
```

---

## State Machine

### Call Request States

```
                                        ┌──────────────────────┐
                                        │                      │
                                        ▼                      │
[pending] ──timeout──> [missed] ──reroute──> [pending] (new agent)
    │                                        │
    │                                        │
    │ accept                                 │ timeout (all agents)
    ▼                                        ▼
[accepted]                              [missed] + visitor unassigned
    │
    │ (call continues...)
    ▼
[completed]
```

### Agent Status Transitions

```
[idle or in_simulation]
         │
         │ RNA timeout fires
         │ (didn't answer call)
         ▼
      [away]
         │
         │ Agent clicks "Back"
         │ (manual return)
         ▼
      [idle]
```

---

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/features/signaling/socket-handlers.ts` | RNA timeout logic, `startRNATimeout`, `clearRNATimeout` |
| `apps/server/src/features/routing/pool-manager.ts` | `findBestAgentForVisitor` for re-routing |
| `apps/dashboard/src/features/signaling/use-signaling.ts` | Agent-side handling of `AGENT_MARKED_AWAY` |
| `apps/widget/src/features/signaling/useSignaling.ts` | Visitor-side `AGENT_UNAVAILABLE` handling |
| `packages/domain/src/constants.ts` | `TIMING.RNA_TIMEOUT` constant |
| `packages/domain/src/types.ts` | `CallRNATimeoutPayload`, `AgentMarkedAwayPayload` |

### Server-Side: startRNATimeout Function

Located at `apps/server/src/features/signaling/socket-handlers.ts:1541-1684`

```typescript
function startRNATimeout(
  io: AppServer,
  poolManager: PoolManager,
  requestId: string,
  agentId: string,
  visitorId: string,
  rnaTimeoutMs: number = TIMING.RNA_TIMEOUT
): void {
  // Clear any existing timeout for this request
  clearRNATimeout(requestId);

  const timeout = setTimeout(async () => {
    // RACE CONDITION FIX: 100ms grace period
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Re-check if call still exists (may have been accepted)
    const request = poolManager.getCallRequest(requestId);
    if (!request) return;

    // Re-check if call is already active (agent won race)
    const activeCall = poolManager.getActiveCallByVisitorId(visitorId);
    if (activeCall) return;

    // Mark agent as away
    poolManager.updateAgentStatus(agentId, "away");
    recordStatusChange(agentId, "away", "ring_no_answer");

    // Notify agent
    agentSocket.emit(SOCKET_EVENTS.CALL_CANCELLED, { requestId });
    agentSocket.emit(SOCKET_EVENTS.AGENT_MARKED_AWAY, {
      reason: "ring_no_answer",
      message: "You've been marked as Away because you didn't answer an incoming call.",
    });

    // Mark call as missed
    markCallMissed(requestId);
    poolManager.rejectCall(requestId);

    // Try to find another agent
    const newResult = poolManager.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl);
    
    if (newResult) {
      // Route to new agent (creates new call log, notifies, starts new RNA timeout)
      // ...
    } else {
      // No agents available - hide widget
      visitorSocket.emit(SOCKET_EVENTS.AGENT_UNAVAILABLE, {
        reason: "rna_timeout",
        previousAgentName: agent.profile.displayName,
        // ...
      });
    }
  }, rnaTimeoutMs);

  rnaTimeouts.set(requestId, timeout);
}
```

### Timeout Clearing Events

The RNA timeout is cleared when:

| Event | Handler Location | Why |
|-------|------------------|-----|
| `call:accept` | Line 694 | Agent answered the call |
| `call:reject` | Line 777 | Agent explicitly rejected |
| `call:cancel` | Line 388 | Visitor cancelled the request |

```typescript
// On CALL_ACCEPT
socket.on(SOCKET_EVENTS.CALL_ACCEPT, async (data: CallAcceptPayload) => {
  clearRNATimeout(data.requestId);  // <-- Clear timeout
  // ... accept call logic
});

// On CALL_REJECT  
socket.on(SOCKET_EVENTS.CALL_REJECT, async (data: CallRejectPayload) => {
  clearRNATimeout(data.requestId);  // <-- Clear timeout
  // ... reject and reroute logic
});

// On CALL_CANCEL
socket.on(SOCKET_EVENTS.CALL_CANCEL, (data: CallCancelPayload) => {
  clearRNATimeout(data.requestId);  // <-- Clear timeout
  // ... cancel logic
});
```

---

## What Each Party Sees

### Original Agent (Who Timed Out)

1. **Incoming call disappears** (`call:cancelled` event)
2. **"Away" modal appears** with message:
   - "You've been marked as Away because you didn't answer an incoming call."
3. **Status badge** changes to "Away"
4. **Must click "I'm Back"** to receive new calls

**Dashboard handling:**
```typescript
socket.on(SOCKET_EVENTS.AGENT_MARKED_AWAY, (data: AgentMarkedAwayPayload) => {
  setIsMarkedAway(true);
  setAwayReason(data.message);
  setIncomingCall(null);  // Clear the incoming call UI
});
```

### Next Agent (If Found)

1. **Receives `call:incoming`** event with same visitor info
2. **Normal incoming call flow** - sees ringing UI
3. **Has same RNA timeout** applied
4. **No indication** this is a reassigned call

### Visitor

**If Reassigned:**
- Seamless experience - visitor continues seeing "Connecting..." UI
- When new agent accepts, WebRTC connection is established
- **No explicit "finding another agent" message** currently

**If No Agents Available:**
- Receives `AGENT_UNAVAILABLE` with:
  - `reason: "rna_timeout"`
  - `previousAgentName`: Name of agent who timed out
- Widget can show "got pulled away" message using `previousAgentName`
- Widget hides and visitor returns to browsing state

---

## Database Logging

### Call Logs Table

| Call | Status | Notes |
|------|--------|-------|
| Original request | `missed` | Set via `markCallMissed(requestId)` |
| New request (if reassigned) | `pending` → `accepted`/`missed` | New call_log row created |

### Agent Status Changes Table

```sql
-- When RNA timeout fires:
INSERT INTO agent_status_changes (
  session_id, agent_id, from_status, to_status, changed_at, reason
) VALUES (
  '...', '...', 'idle', 'away', NOW(), 'ring_no_answer'
);
```

### Timing Fields in call_logs

| Field | Value Set When |
|-------|----------------|
| `ring_started_at` | Call request created |
| `answered_at` | NULL (never answered) |
| `answer_time_seconds` | NULL |
| `status` | `'missed'` |

---

## Edge Cases & Race Conditions

### ✅ HANDLED: Accept vs Timeout Race

**Scenario:** Agent clicks Accept at the exact moment timeout fires.

**Protection:**
1. **100ms grace period** before processing timeout
2. **Re-check** if request still exists
3. **Re-check** if call already active for visitor

```typescript
// RACE CONDITION FIX: Add a small grace period
await new Promise(resolve => setTimeout(resolve, 100));

const request = poolManager.getCallRequest(requestId);
if (!request) {
  console.log(`[RNA] Request no longer exists (likely accepted during grace period)`);
  return;  // Agent won
}

const activeCall = poolManager.getActiveCallByVisitorId(visitorId);
if (activeCall) {
  console.log(`[RNA] Call already active, agent won the race`);
  return;  // Agent won
}
```

### ✅ HANDLED: Same Agent Gets Same Call

**Why it won't happen:**
- Agent is marked `"away"` **before** `findBestAgentForVisitor` is called
- `findBestAgent` skips agents with status `"away"`:

```typescript
if (agent.profile.status === "in_call" || 
    agent.profile.status === "offline" || 
    agent.profile.status === "away") {  // <-- Skipped
  continue;
}
```

### ⚠️ POTENTIAL ISSUE: No Maximum Reassignment Attempts

**Scenario:** In an org with 3 agents, if Agent A times out, call goes to Agent B. If Agent B times out, call goes to Agent C. If Agent C times out, call could theoretically go back to Agent A if they've returned from away.

**Current behavior:** No limit on reassignment attempts. Each timeout creates a new call_log entry and tries to find another agent.

**Why it's likely not a problem in practice:**
- Agents who timeout are marked "away" and stay away until manually returning
- If all agents are away, visitor gets `AGENT_UNAVAILABLE`
- In a realistic scenario, the chain terminates

### ⚠️ POTENTIAL ISSUE: Server Restart During RNA Period

**Scenario:** Server restarts while RNA timer is running.

**Impact:**
- In-memory `rnaTimeouts` Map is lost
- Visitor's call request still exists in memory (also lost)
- Neither party gets notified

**Mitigation:**
- Server restart clears all pending calls anyway
- Both parties will reconnect and start fresh
- Not a data loss issue, but visitor may be confused

---

## Configuration Recommendations

| Timeout Value | Use Case |
|---------------|----------|
| 10-15 seconds | High-volume sales teams - quick reassignment |
| 20-30 seconds | Support teams - allow agents to prep |
| 45+ seconds | Not recommended - poor visitor experience |

---

## Related Features

| Feature | Relationship |
|---------|--------------|
| **P2: Agent Assignment** | `findBestAgentForVisitor` used for reassignment |
| **A2: Incoming Call** | RNA timeout starts after `call:incoming` |
| **P4: Reassignment** | RNA triggers the same reassignment logic |
| **V3: Visitor Call** | Visitor sees result of RNA (new agent or unavailable) |

---

## Socket Events Reference

### Server → Dashboard

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `call:cancelled` | `{ requestId }` | RNA timeout fires |
| `agent:marked_away` | `{ reason: "ring_no_answer", message }` | RNA timeout fires |
| `call:rna_timeout` | `{ requestId, visitorId, reason }` | RNA timeout fires (informational) |

### Server → Widget

| Event | Payload | When Emitted |
|-------|---------|--------------|
| `agent:unavailable` | `{ reason: "rna_timeout", previousAgentName }` | RNA + no agents available |
| `call:incoming` | (to new agent) | After successful reassignment |

---

## Testing Scenarios

1. **Basic RNA flow** - Let call ring for 15s, verify agent marked away
2. **Accept race** - Accept at ~14.9s, verify call connects
3. **Reassignment** - Have 2 agents, let first timeout, verify second gets call
4. **All agents timeout** - Verify visitor gets unavailable message
5. **Custom timeout** - Set org timeout to 30s, verify it's respected
6. **Agent returns** - After RNA away, click "Back", verify can receive calls

---

## Changelog

| Date | Change |
|------|--------|
| 2024-12-02 | Initial documentation |

