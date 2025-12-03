# Spec: Doc Agent 1 - P2 Agent Assignment Algorithm

> **Session:** 2024-12-02
> **Status:** 🟡 Active

---

## Your Assignment

Document **Feature P2: Agent Assignment Algorithm** - the core routing logic that determines which agent handles which visitor.

## Output Files

1. **Feature Doc:** `docs/features/platform/agent-assignment.md`
2. **Findings:** Add to `docs/findings/session-2024-12-02.md`

---

## Phase 1: Research (15-20 min)

### Read These First
- `packages/domain/src/types.ts` - Type definitions
- `packages/domain/src/constants.ts` - Socket events, timing
- `packages/domain/src/database.types.ts` - Database schema

### Key Files to Trace
| File | What to Look For |
|------|------------------|
| `apps/server/src/features/routing/pool-manager.ts` | THE main routing logic - `findBestAgent`, `findBestAgentForVisitor`, `assignVisitorToAgent` |
| `apps/server/src/features/signaling/socket-handlers.ts` | Where assignment actually happens, look for `VISITOR_JOIN` and assignment events |

### Questions to Answer
- How does "least-connections" routing work?
- How does tiered priority work within a pool?
- What's the tiebreaker when multiple agents have same priority + same load?
- What happens when no agents are available?
- How does pool matching work (routing rules)?
- What happens when an agent disconnects right after being selected?

---

## Phase 2: Document (20-30 min)

Create `docs/features/platform/agent-assignment.md` using the template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

### Must Include
- State machine diagram (mermaid)
- Complete edge case matrix
- All socket events involved
- Data flow from visitor request → agent assignment
- First principles review

---

## Phase 3: Critical Review (10 min)

Ask yourself at every decision point:
- "What if two visitors request at the exact same millisecond?"
- "What if an agent disconnects right after being selected but before call starts?"
- "Is the priority system fair and predictable?"
- "Are there race conditions in the assignment logic?"
- "What if all agents in a pool are at max capacity?"

---

## Phase 4: Report Findings

Add ALL findings to `docs/findings/session-2024-12-02.md`

### 🔴 CRITICAL (Stop and wait for human)
Use for: Wrong routing, race conditions, double-assignment, dead code paths

```markdown
### CRIT-1202-XXX: [Title]
**Found by:** Doc Agent 1
**Feature:** P2
**File:** `path/to/file.ts:123`

**Current Behavior:**
[What the code does]

**Why It's Critical:**
[Impact]

**Agent's Analysis:**
[Your analysis]

**Suggested Fix:**
[Your suggestion]
```

**After adding CRITICAL → STOP and wait**

### 🟡 QUESTION (Log and continue)
Use for: Suboptimal routing, unclear tiebreakers, ambiguous edge cases

```markdown
### Q-1202-XXX: [Question]
**Asked by:** Doc Agent 1
**Feature:** P2
**File:** `path/to/file.ts:123`

**Current Behavior:** [What happens]
**Why I'm Asking:** [Why ambiguous]
**Option A:** [Interpretation 1]
**Option B:** [Interpretation 2]
**My Recommendation:** [Your take]
```

### 🟢 MINOR (Just log in table)
Use for: Missing logging, code style, minor optimizations

---

## Phase 5: Completion Report

When finished, report in the main chat:

```
## Documentation Complete: P2 - Agent Assignment Algorithm

**Doc file:** `docs/features/platform/agent-assignment.md`

**Findings:**
- 🔴 Critical: [count]
- 🟡 Questions: [count]  
- 🟢 Minor: [count]

**Confidence:** [High/Medium/Low]
**Gaps:** [Anything you couldn't trace]
**Related Features:** P4, A3, P6

**Ready for Review:** Yes/No
```

---

## Rules

1. **Don't guess** - Trace actual code paths
2. **Be critical** - Find routing bugs, they affect every call
3. **Stop on CRITICAL** - These need human decision
4. **Focus on the algorithm** - How does selection actually work?

## Your Inbox

Check `docs/agent-inbox/doc-agent-1.md` if waiting for answers.

