# Spec: Doc Agent 2 - V3 Visitor Call

> **Session:** 2024-12-02
> **Status:** 🟡 Active

---

## Your Assignment

Document **Feature V3: Visitor Call (Call Initiation & Active Call)** - the complete visitor experience from clicking "Start Call" through the conversation to hangup.

## Output Files

1. **Feature Doc:** `docs/features/visitor/visitor-call.md`
2. **Findings:** Add to `docs/findings/session-2024-12-02.md`

---

## Phase 1: Research (15-20 min)

### Read These First
- `packages/domain/src/types.ts` - Type definitions
- `packages/domain/src/constants.ts` - Socket events, timing constants
- `packages/domain/src/database.types.ts` - Database schema

### Key Files to Trace
| File | What to Look For |
|------|------------------|
| `apps/widget/src/Widget.tsx` | Main widget component - all states, call initiation, UI during call |
| `apps/widget/src/features/signaling/useSignaling.ts` | Socket connection, call request events |
| `apps/widget/src/features/webrtc/useWebRTC.tsx` | WebRTC connection setup, media handling |
| `apps/server/src/features/signaling/socket-handlers.ts` | Server-side: `CALL_REQUEST`, `CALL_ACCEPT`, `CALL_END` handlers |

### Questions to Answer
- What states does the widget go through during a call? (hidden → minimized → calling → in_call → ended?)
- What happens when visitor clicks "Start Call"?
- What does visitor SEE while waiting for agent to answer?
- How is WebRTC connection established? (offer/answer/ICE)
- What controls does visitor have during call? (mute, video, end)
- How does call end? (visitor ends vs agent ends vs disconnect)
- What happens after call ends? (back to loop? thank you message?)

---

## Phase 2: Document (20-30 min)

Create `docs/features/visitor/visitor-call.md` using the template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

### Must Include
- State machine diagram showing all widget states during call
- Complete sequence diagram: click → request → accept → connect → call → end
- All socket events (both directions)
- WebRTC flow (offer/answer/ICE candidates)
- UI screenshots descriptions for each state
- Error states and recovery

---

## Phase 3: Critical Review (10 min)

Ask yourself at every step:
- "What if visitor clicks 'Start Call' twice quickly?"
- "What if WebRTC connection fails?"
- "What if agent never answers (RNA)?"
- "What if visitor's camera/mic permission is denied?"
- "What if visitor navigates to different page during call?"
- "What if network drops mid-call?"
- "Is feedback immediate at every step?"
- "Can visitor always cancel/exit?"

---

## Phase 4: Report Findings

Add ALL findings to `docs/findings/session-2024-12-02.md`

### 🔴 CRITICAL (Stop and wait for human)
Use for:
- Visitor can get stuck with no way out
- Double call requests possible
- WebRTC failure leaves broken state
- No timeout on waiting states

```markdown
### CRIT-1202-XXX: [Title]
**Found by:** Doc Agent 2
**Feature:** V3
**File:** `path/to/file.ts:123`

**Current Behavior:**
[What the code does]

**Why It's Critical:**
[Impact on visitor experience]

**Agent's Analysis:**
[Your analysis]

**Suggested Fix:**
[Your suggestion]
```

**After adding CRITICAL → STOP and wait**

### 🟡 QUESTION (Log and continue)
Use for:
- UX that seems suboptimal
- Unclear what visitor should see in edge case
- Timeout values that seem wrong
- Missing feedback/loading states

```markdown
### Q-1202-XXX: [Question]
**Asked by:** Doc Agent 2
**Feature:** V3
**File:** `path/to/file.ts:123`

**Current Behavior:** [What happens]
**Why I'm Asking:** [Why this might be wrong]
**Option A:** [Interpretation 1]
**Option B:** [Interpretation 2]
**My Recommendation:** [Your take]
```

### 🟢 MINOR (Just log in table)
Use for: Missing loading spinners, console warnings, minor polish

---

## Phase 5: Completion Report

When finished, report in the main chat:

```
## Documentation Complete: V3 - Visitor Call

**Doc file:** `docs/features/visitor/visitor-call.md`

**Findings:**
- 🔴 Critical: [count]
- 🟡 Questions: [count]
- 🟢 Minor: [count]

**Confidence:** [High/Medium/Low]
**Gaps:** [Anything you couldn't trace]
**Related Features:** A2 (agent side), V4 (reconnection), P5 (WebRTC signaling)

**Ready for Review:** Yes/No
```

---

## Rules

1. **Think like a visitor** - What do they see and experience?
2. **Trace the full flow** - Button click to hangup
3. **Stop on CRITICAL** - Visitor UX bugs are urgent
4. **Note every state** - What does widget show at each moment?

## Your Inbox

Check `docs/agent-inbox/doc-agent-2.md` if waiting for answers.

