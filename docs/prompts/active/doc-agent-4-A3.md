# Spec: Doc Agent 4 - A3 RNA Timeout

> **Session:** 2024-12-02
> **Status:** 🟡 Active

---

## Your Assignment

Document **Feature A3: RNA (Ring-No-Answer) Timeout & Auto-Reassignment** - what happens when an agent doesn't answer an incoming call within the timeout period.

## Output Files

1. **Feature Doc:** `docs/features/agent/rna-timeout.md`
2. **Findings:** Add to `docs/findings/session-2024-12-02.md`

---

## Phase 1: Research (15-20 min)

### Read These First
- `packages/domain/src/types.ts` - Type definitions
- `packages/domain/src/constants.ts` - **RNA_TIMEOUT value**, socket events
- `packages/domain/src/database.types.ts` - call_logs status values

### Key Files to Trace
| File | What to Look For |
|------|------------------|
| `apps/server/src/features/signaling/socket-handlers.ts` | RNA timeout logic, `startRNATimeout`, timeout handlers |
| `apps/server/src/features/routing/pool-manager.ts` | Re-routing after RNA, finding next agent |
| `apps/dashboard/src/features/signaling/use-signaling.ts` | Agent-side handling of timeout |
| `apps/widget/src/features/signaling/useSignaling.ts` | Visitor-side: what they see during RNA |

### Questions to Answer
- How long is the RNA timeout? (find the constant)
- What happens server-side when timeout fires?
- Is the original agent marked as unavailable/away?
- How is the next agent selected?
- What does the VISITOR see during reassignment?
- What does the ORIGINAL AGENT see when they time out?
- What if ALL agents RNA timeout?
- Is there a max number of reassignment attempts?
- What gets logged in call_logs?

---

## Phase 2: Document (20-30 min)

Create `docs/features/agent/rna-timeout.md` using the template.

### Must Include
- Timing diagram: request → ring → timeout → reassign → ring → ...
- State machine for the call during RNA flow
- What happens to agent who timed out (status change?)
- Maximum reassignment attempts
- Final fallback (no agents available)
- Database logging at each step

---

## Phase 3: Critical Review (10 min)

Ask yourself:
- "What if agent clicks Accept at the EXACT moment timeout fires?" (race condition!)
- "What if the same agent gets reassigned the same call?"
- "What if reassignment creates infinite loop?"
- "Is the timeout cleared if agent accepts?"
- "What if server restarts during RNA period?"
- "Does the visitor know they're being reassigned?"

---

## Phase 4: Report Findings

Add to `docs/findings/session-2024-12-02.md`

**IMPORTANT:** After adding ANY finding, update the "NEEDS YOUR ATTENTION" table at the TOP of the session file:
- Increment the count
- Add your finding ID to the IDs column

### 🔴 CRITICAL (Stop and wait)
- Race condition between accept and timeout
- Infinite reassignment loop possible
- Visitor stuck forever
- Same agent gets same call repeatedly

```markdown
### CRIT-1202-XXX: [Title]
**Found by:** Doc Agent 4
**Feature:** A3
**File:** `path/to/file.ts:123`

**Current Behavior:** [What happens]
**Why It's Critical:** [Impact]
**Agent's Analysis:** [Your analysis]
**Suggested Fix:** [Your suggestion]
```

### 🟡 QUESTION (Log and continue)
- Timeout duration appropriate?
- Should agent status change after RNA?
- Should visitor see "finding another agent" message?

### 🟢 MINOR
- Logging improvements

---

## Phase 5: Completion Report

```
## Documentation Complete: A3 - RNA Timeout

**Doc file:** `docs/features/agent/rna-timeout.md`

**Findings:**
- 🔴 Critical: [count]
- 🟡 Questions: [count]
- 🟢 Minor: [count]

**Confidence:** [High/Medium/Low]
**Related Features:** A2 (incoming call), P2 (agent assignment), P4 (reassignment)

**Ready for Review:** Yes/No
```

---

## Rules

1. **Focus on timing** - When does timeout fire? What clears it?
2. **Watch for race conditions** - Accept vs timeout is critical
3. **Trace reassignment** - Who gets the call next? Can it loop?
4. **Stop on CRITICAL** - RNA bugs affect every missed answer

## Your Inbox

Check `docs/agent-inbox/doc-agent-4.md` if waiting for answers.

