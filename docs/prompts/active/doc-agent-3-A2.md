# Spec: Doc Agent 3 - A2 Incoming Call

> **Session:** 2024-12-02
> **Status:** 🟡 Active

---

## Your Assignment

Document **Feature A2: Incoming Call** - the agent's experience when a visitor requests a call: notification, ringtone, accept/reject flow.

## Output Files

1. **Feature Doc:** `docs/features/agent/incoming-call.md`
2. **Findings:** Add to `docs/findings/session-2024-12-02.md`

---

## Phase 1: Research (15-20 min)

### Read These First
- `packages/domain/src/types.ts` - Type definitions
- `packages/domain/src/constants.ts` - Socket events, timing (RNA timeout value!)
- `packages/domain/src/database.types.ts` - Database schema

### Key Files to Trace
| File | What to Look For |
|------|------------------|
| `apps/dashboard/src/features/workbench/` | Agent bullpen UI, incoming call modal |
| `apps/dashboard/src/features/signaling/use-signaling.ts` | Socket events for incoming call |
| `apps/dashboard/src/features/signaling/signaling-provider.tsx` | Signaling context |
| `apps/server/src/features/signaling/socket-handlers.ts` | `INCOMING_CALL` event, accept/reject handlers |

### Questions to Answer
- What triggers an incoming call notification?
- What does the agent SEE? (modal, visitor info, ringtone?)
- Does the browser tab flash/notification appear?
- What happens when agent clicks Accept?
- What happens when agent clicks Reject?
- What happens if agent ignores it (RNA)?
- Can agent receive multiple incoming calls at once?
- What if agent is already on a call?

---

## Phase 2: Document (20-30 min)

Create `docs/features/agent/incoming-call.md` using the template.

### Must Include
- State machine: idle → ringing → accepted/rejected/timed_out
- UI mockup description (what modal looks like)
- All socket events both directions
- Timing: how long does agent have to answer?
- Browser notification behavior
- Audio (ringtone) behavior

---

## Phase 3: Critical Review (10 min)

Ask yourself:
- "What if agent clicks Accept but WebRTC fails?"
- "What if agent clicks Accept at exact moment RNA fires?"
- "What if agent's browser tab is in background?"
- "What if agent has multiple tabs open?"
- "Can the ringtone get stuck playing?"
- "What info does agent see about the visitor?"

---

## Phase 4: Report Findings

Add to `docs/findings/session-2024-12-02.md`

**IMPORTANT:** After adding ANY finding, update the "NEEDS YOUR ATTENTION" table at the TOP of the session file:
- Increment the count
- Add your finding ID to the IDs column

### 🔴 CRITICAL (Stop and wait)
- Agent can't accept calls
- Race condition between accept and RNA
- Stuck states

```markdown
### CRIT-1202-XXX: [Title]
**Found by:** Doc Agent 3
**Feature:** A2
**File:** `path/to/file.ts:123`

**Current Behavior:** [What happens]
**Why It's Critical:** [Impact]
**Agent's Analysis:** [Your analysis]
**Suggested Fix:** [Your suggestion]
```

### 🟡 QUESTION (Log and continue)
- UX improvements
- Unclear timing values
- Missing feedback

### 🟢 MINOR
- Polish items

---

## Phase 5: Completion Report

```
## Documentation Complete: A2 - Incoming Call

**Doc file:** `docs/features/agent/incoming-call.md`

**Findings:**
- 🔴 Critical: [count]
- 🟡 Questions: [count]
- 🟢 Minor: [count]

**Confidence:** [High/Medium/Low]
**Related Features:** V3 (visitor side), A3 (RNA), A4 (active call)

**Ready for Review:** Yes/No
```

---

## Rules

1. **Think like an agent** - What do they experience?
2. **Check timing** - How long to answer? What happens at timeout?
3. **Browser behavior** - Background tabs, notifications, audio
4. **Stop on CRITICAL** - Agent can't take calls = product broken

## Your Inbox

Check `docs/agent-inbox/doc-agent-3.md` if waiting for answers.

