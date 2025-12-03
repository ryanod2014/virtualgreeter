# Spec: Doc Agent 10 - V4 Call Reconnection (CONTINUATION)

> **Session:** 2024-12-03
> **Status:** 🔄 Continuation
> **Continues from:** Doc Agent 10 (stopped with questions)
> **Questions answered:** Q-V4-001, Q-V4-002, Q-V4-003, Q-V4-004

---

## ⚠️ IMPORTANT: This is a CONTINUATION

**You are NOT starting from scratch.**

Doc Agent 10 already completed comprehensive documentation of the V4 Call Reconnection feature. They stopped because they had 4 questions that needed human answers.

**Those questions have now been answered. Your job is to:**
1. Update the existing documentation with these decisions
2. Create fix tickets if any answers revealed bugs
3. Mark the documentation as complete

---

## Previous Agent's Progress

### ✅ Already Completed

- [x] Phase 1 (Research): DONE - Fully traced reconnection flow
- [x] Phase 2 (Document): DONE - Full documentation created
- [x] Phase 3 (Critical Review): DONE - Found the timing mismatch and other issues
- [x] Phase 4 (Report Findings): DONE - Added to session file

### 📁 Files Already Created/Modified

| File | Status | Notes |
|------|--------|-------|
| `docs/features/visitor/call-reconnection.md` | Complete | Full documentation |
| `docs/findings/session-2024-12-02.md` | Updated | 4 questions + minor findings |

### ✅ Confirmed Working (Already Verified)

The previous agent verified ALL of these work correctly:
- Token storage and retrieval
- Server token validation
- Pending reconnect mechanism
- Both-party reconnect
- New token on reconnect
- Agent profile sent to visitor
- Call log continuity
- Cleanup on disconnect during pending
- Different org check

---

## 🔴 Questions That Were Blocking (NOW ANSWERED)

### Q-V4-001: localStorage expiry (5 min) mismatches server timeout (30s)

**Original Question:**
The visitor stores a reconnect token in localStorage with a 5-minute expiry, but the server's `CALL_RECONNECT_TIMEOUT` is only 30 seconds. If a visitor navigates away for 2 minutes and returns, their localStorage still has a valid token, but the server has already timed out. The visitor will try to reconnect and get "No active call found" error.

Options were:
- A: Keep as-is - 5min localStorage is safety net, 30s server is real constraint
- B: Reduce localStorage to 30s
- C: Increase server timeout to 5 min

**Human's Answer:**
> **Sync these - use the LONGER timeout (5 min)**. The current 30s server timeout is too short for real page navigation. Visitors genuinely browse other pages for 1-2 minutes. Create a fix ticket.

**Action Required:**
- [x] Create fix ticket FIX-008 for this (ALREADY DONE - see AGENT_TASKS.md)
- [ ] Update documentation to note this is a known issue being fixed
- [ ] Add to "Technical Concerns" section

---

### Q-V4-002: Is call heartbeat during active calls implemented?

**Original Question:**
Types and constants define call heartbeat (`CallHeartbeatPayload`, `CALL_HEARTBEAT_INTERVAL: 10s`) but implementation wasn't found in the widget that sends these heartbeats during active calls.

Options were:
- A: Intentionally not implemented - socket connection is the heartbeat
- B: Gap to implement
- C: Leave for later

**Human's Answer:**
> **Option C - Leave for later**. Socket connection's ping/pong provides basic liveness. This is a nice-to-have for faster orphaned call detection but not critical. Add to backlog.

**Action Required:**
- [ ] Note in documentation that heartbeat types exist but aren't actively used
- [ ] Add to backlog (minor - detection works via socket already)

---

### Q-V4-003: Multiple browser tabs with same call token

**Original Question:**
The reconnect token is stored in localStorage with a fixed key (`gg_active_call`). Multiple tabs share this token, which could cause issues if visitor has active call in Tab A and navigates in Tab B.

Options were:
- A: Fine - browsers typically have one active widget per site
- B: Add tab identifier to storage key
- C: Document as known limitation

**Human's Answer:**
> **Option C - Document as known limitation**. Multi-tab calls are an edge case. Monitor for user reports but don't add complexity for rare scenario.

**Action Required:**
- [ ] Add to "Known Limitations" section of documentation
- [ ] Note it's monitored but not prioritized

---

### Q-V4-004: Should there be audio/visual cue when call reconnects?

**Original Question:**
After page navigation, the call just reappears with no explicit notification or sound. Video appearing might not be obvious enough.

Options were:
- A: Current behavior fine - video appearing is obvious
- B: Add toast notification
- C: Add sound chime
- D: Add to backlog as UX enhancement

**Human's Answer:**
> **Option D - Add to backlog as UX enhancement**. The video with agent's face is a strong visual indicator. Nice-to-have but not critical.

**Action Required:**
- [ ] Add to UX Recommendations in session file
- [ ] Note in documentation as potential future enhancement

---

## Your Assignment: Update Documentation

### Starting Point
The documentation is essentially complete. You need to update it based on the human's decisions.

### What You Need to Do

1. **Read the existing documentation:**
   - `docs/features/visitor/call-reconnection.md`

2. **Update based on decisions:**
   - Add "Known Limitations" section (Q-V4-003)
   - Add note about heartbeat types not being actively used (Q-V4-002)
   - Note the timing mismatch as being addressed by FIX-008 (Q-V4-001)
   - Add reconnection cue to UX recommendations (Q-V4-004)

3. **Add UX recommendation to session file:**
   - Add UX-V4-001 for the reconnection cue

4. **Completion Report + PM Notification**

---

## Output Files

1. **Feature Doc:** `docs/features/visitor/call-reconnection.md` (UPDATE existing)
2. **Findings:** Add UX recommendation to `docs/findings/session-2024-12-02.md`

---

## Phase 5: Completion Report

When finished, report:

```markdown
## Documentation Complete: V4 - Call Reconnection (Continuation)

**Continued from:** Doc Agent 10
**Questions answered:** Q-V4-001, Q-V4-002, Q-V4-003, Q-V4-004

**Doc file:** `docs/features/visitor/call-reconnection.md`

**Updates Made:**
- Added Known Limitations section (multi-tab behavior)
- Noted heartbeat types vs implementation
- Referenced FIX-008 for timing mismatch
- Added UX-V4-001 for reconnection cue

**Findings Summary:**
- 🔴 Critical: 0
- 🟡 Questions: 0 (all answered!)
- 🟢 Minor: [count already logged]
- 💡 UX Recommendations: +1 (UX-V4-001)

**Confidence Level:** High

**Ready for Review:** Yes
```

---

## Phase 6: Notify PM (REQUIRED!)

**Append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Doc Agent 10 (Continuation)
- **Ticket:** V4
- **Status:** COMPLETE
- **Continued from:** Doc Agent 10
- **Branch:** N/A
- **Output:** `docs/features/visitor/call-reconnection.md`
- **Notes:** All 4 questions answered and applied to docs. Added UX-V4-001.
```

