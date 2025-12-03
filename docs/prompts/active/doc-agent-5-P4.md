# Spec: Doc Agent 5 - P4 Visitor Reassignment

> **Session:** 2024-12-02
> **Status:** 🟡 Active

---

## Your Assignment

Document **Feature P4: Visitor Reassignment** - what happens when an agent becomes unavailable (disconnects, goes away, rejects) and the visitor needs to be handed to another agent.

## Output Files

1. **Feature Doc:** `docs/features/platform/visitor-reassignment.md`
2. **Findings:** Add to `docs/findings/session-2024-12-02.md`

---

## Phase 1: Research (15-20 min)

### Read These First
- `packages/domain/src/types.ts` - Type definitions
- `packages/domain/src/constants.ts` - Socket events for reassignment
- `packages/domain/src/database.types.ts` - call_logs, agent states

### Key Files to Trace
| File | What to Look For |
|------|------------------|
| `apps/server/src/features/routing/pool-manager.ts` | Reassignment logic, `reassignVisitor`, handling agent disconnect |
| `apps/server/src/features/signaling/socket-handlers.ts` | `AGENT_AWAY`, `AGENT_LOGOUT`, disconnect handlers, `CALL_REJECT` |
| `apps/widget/src/Widget.tsx` | `AGENT_UNAVAILABLE` handling, what visitor sees |
| `apps/widget/src/features/signaling/useSignaling.ts` | Reassignment events from visitor perspective |

### Questions to Answer
- What triggers reassignment? (disconnect, away, reject, logout?)
- How is the next agent selected? (same pool? priority?)
- What does the VISITOR see during reassignment?
- What if reassignment happens DURING an active call vs BEFORE call starts?
- What if no other agents are available?
- Is there a timeout on finding a new agent?
- What gets logged?
- Can visitor end up with no agent after reassignment fails?

---

## Phase 2: Document (20-30 min)

Create `docs/features/platform/visitor-reassignment.md` using the template.

### Must Include
- All triggers that cause reassignment
- Reassignment flow diagram
- Difference between pre-call reassignment vs mid-call reassignment
- Visitor UX during reassignment (what do they see?)
- Failure case: no agents available
- Database logging

---

## Phase 3: Critical Review (10 min)

Ask yourself:
- "What if agent disconnects mid-call? Does visitor just see black screen?"
- "What if the 'next best agent' also disconnects immediately?"
- "Can reassignment cascade through all agents leaving visitor stuck?"
- "Is there a grace period before reassignment (agent might reconnect)?"
- "What happens to the WebRTC connection during reassignment?"
- "Does visitor have to re-request call or is it automatic?"

---

## Phase 4: Report Findings

Add to `docs/findings/session-2024-12-02.md`

**IMPORTANT:** After adding ANY finding, update the "NEEDS YOUR ATTENTION" table at the TOP of the session file:
- Increment the count
- Add your finding ID to the IDs column

### 🔴 CRITICAL (Stop and wait)
- Visitor stuck with no agent and no recovery
- Mid-call disconnect leaves visitor in broken state
- Reassignment cascade/loop
- WebRTC not properly cleaned up

```markdown
### CRIT-1202-XXX: [Title]
**Found by:** Doc Agent 5
**Feature:** P4
**File:** `path/to/file.ts:123`

**Current Behavior:** [What happens]
**Why It's Critical:** [Impact]
**Agent's Analysis:** [Your analysis]
**Suggested Fix:** [Your suggestion]
```

### 🟡 QUESTION (Log and continue)
- Should there be a grace period for agent reconnection?
- Should visitor see "agent disconnected, finding new agent"?
- What's the max reassignment attempts?

### 🟢 MINOR
- Better error messages
- Logging improvements

---

## Phase 5: Completion Report

```
## Documentation Complete: P4 - Visitor Reassignment

**Doc file:** `docs/features/platform/visitor-reassignment.md`

**Findings:**
- 🔴 Critical: [count]
- 🟡 Questions: [count]
- 🟢 Minor: [count]

**Confidence:** [High/Medium/Low]
**Related Features:** P2 (agent assignment), A3 (RNA), V8 (agent unavailable from visitor POV)

**Ready for Review:** Yes/No
```

---

## Rules

1. **Cover all triggers** - Disconnect, away, reject, logout
2. **Pre-call vs mid-call** - These are very different scenarios
3. **Visitor experience** - What do they see? Are they informed?
4. **Stop on CRITICAL** - Visitor stuck = broken product

## Your Inbox

Check `docs/agent-inbox/doc-agent-5.md` if waiting for answers.

