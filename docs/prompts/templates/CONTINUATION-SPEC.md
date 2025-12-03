# Continuation Spec Template

> **Purpose:** When a previous agent stopped with questions and you've answered them, PM creates this spec so a new agent can continue from where the previous agent left off.
> 
> **PM Agent:** Use this template when human answers a blocking question.

---

## TEMPLATE START (PM customizes this)

---

# Spec: [AGENT_TYPE] Agent [N] - [FEATURE_ID] [FEATURE_NAME] (CONTINUATION)

> **Session:** [DATE]
> **Status:** 🔄 Continuation
> **Continues from:** [ORIGINAL_AGENT] (stopped at [PHASE])
> **Question answered:** [QUESTION_ID]

---

## ⚠️ IMPORTANT: This is a CONTINUATION

**You are NOT starting from scratch.**

A previous agent ([ORIGINAL_AGENT]) already completed work on this feature and stopped because they had questions that needed human answers.

**Those questions have now been answered. Your job is to:**
1. Pick up exactly where they left off
2. Apply the human's decisions
3. Complete the remaining work

---

## Previous Agent's Progress

### ✅ Already Completed
[PM: List what the previous agent already did]

- [ ] Phase 1 (Research): [DONE / PARTIAL - what's done]
- [ ] Phase 2 (Document): [DONE / PARTIAL - what's done]
- [ ] Phase 3 (Critical Review): [DONE / PARTIAL - what's done]
- [ ] Phase 4 (Report Findings): [DONE / PARTIAL - what's done]

### 📁 Files Already Created/Modified
[PM: List files the previous agent created]

| File | Status | Notes |
|------|--------|-------|
| `docs/features/[CATEGORY]/[FILENAME].md` | [Complete/Partial/Outline] | [Description] |
| `docs/findings/session-[DATE].md` | Updated | Added [N] findings |

### 🔴 Questions That Were Blocking (NOW ANSWERED)

[PM: Copy the original question(s) and the human's answer]

#### [QUESTION_ID]: [Question Title]

**Original Question:**
```
[Copy the full question from the session file]
```

**Human's Answer:**
```
[The decision/answer provided]
```

**Action Required:**
[PM: Specific instruction for what agent should do with this answer]
- [ ] Update documentation to reflect this decision
- [ ] Create fix ticket if answer revealed a bug
- [ ] Just note the clarification and continue

---

## Your Assignment: Continue from [PHASE]

### Starting Point
You are resuming at **[SPECIFIC PHASE AND SECTION]**.

The previous agent was working on: [SPECIFIC AREA]

### What You Need to Do

1. **Review the existing work:**
   - Read `docs/features/[CATEGORY]/[FILENAME].md` to see what's documented
   - Check `docs/findings/session-[DATE].md` for already-logged findings

2. **Apply the human's decision:**
   - [SPECIFIC ACTION based on the answer]

3. **Complete remaining phases:**
   [PM: Only list phases that are incomplete]
   
   - [ ] Finish Phase 2 (Document): [What sections remain]
   - [ ] Phase 3 (Critical Review): [Full review needed]
   - [ ] Phase 4 (Report any new findings)
   - [ ] Phase 5 (Completion Report)
   - [ ] Phase 6 (Notify PM via completions.md)

---

## Original Context (Reference)

[PM: Include relevant context from the original spec]

### Feature Overview
[Brief description of the feature]

### Key Files
| File | What to Look For |
|------|------------------|
| [FILE_PATH] | [DESCRIPTION] |

### Original Questions to Answer
[From the original spec - which the previous agent may have partially answered]

---

## Output Files

1. **Feature Doc:** `docs/features/[CATEGORY]/[FILENAME].md` (continue existing)
2. **Findings:** Add to `docs/findings/session-[DATE].md`

---

## Rules for Continuation Agents

1. **Read existing work first** - Don't duplicate what's already documented
2. **Apply the answered questions** - The human's decisions should be reflected
3. **Same quality bar** - Complete all remaining phases thoroughly
4. **Same reporting format** - Use the same finding formats (CRIT, Q, Minor)
5. **Acknowledge the continuation** - In your completion report, note this was a continuation

---

## Phase 5: Completion Report (Modified for Continuation)

When finished, report:

```markdown
## Documentation Complete: [FEATURE_ID] - [FEATURE_NAME] (Continuation)

**Continued from:** [ORIGINAL_AGENT]
**Question answered:** [QUESTION_ID]

**Doc file:** `docs/features/[CATEGORY]/[FILENAME].md`

**Findings Summary:**
- 🔴 Critical: [count] (IDs: ...)
- 🟡 Questions: [count] (IDs: ...)
- 🟢 Minor: [count]
- 💡 UX Recommendations: [count]

**Confidence Level:** [High/Medium/Low]

**Areas I Couldn't Fully Trace:**
- [List any parts where code was unclear]

**Ready for Review:** Yes/No
```

---

## Phase 6: Notify PM (REQUIRED!)

**Append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** [AGENT_TYPE] Agent [N] (Continuation)
- **Ticket:** [FEATURE_ID]
- **Status:** COMPLETE / BLOCKED
- **Continued from:** [ORIGINAL_AGENT]
- **Branch:** N/A
- **Output:** `docs/features/[CATEGORY]/[FILENAME].md`
- **Notes:** Answered [QUESTION_ID], [# new findings]
```

---

## TEMPLATE END

---

## PM Agent: How to Create a Continuation Spec

When human answers a question in the session file:

### Step 1: Identify What to Continue
- Which agent asked the question?
- What phase were they in?
- What work did they already complete?

### Step 2: Get the Answer
- Copy the human's exact answer
- Determine what action the answer implies (update docs, create ticket, note and continue)

### Step 3: Create the Spec
1. Copy this template
2. Fill in all [BRACKETED] fields
3. Save to `docs/prompts/active/[agent-type]-agent-[N]-[FEATURE_ID]-CONTINUED.md`

### Step 4: Give Human the One-Liner
```
Read and execute the spec in docs/prompts/active/[filename]-CONTINUED.md
```

### Naming Convention
- Original: `doc-agent-10-V4.md`
- Continuation: `doc-agent-10-V4-CONTINUED.md`
- Second continuation: `doc-agent-10-V4-CONTINUED-2.md`

### Checklist Before Giving to Human
- [ ] All [BRACKETED] fields replaced
- [ ] Previous agent's progress accurately summarized
- [ ] Question + answer clearly stated
- [ ] Action required is specific
- [ ] Remaining phases clearly listed
- [ ] Original context included for reference
