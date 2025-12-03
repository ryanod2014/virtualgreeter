# [TICKET-ID]: Attempt Log

> **Purpose:** Track what we've tried so agents can learn from previous attempts.
> **When to use:** When a ticket is stuck, failing QA, or getting passed between agents.
> **Delete when:** Ticket is merged.

---

## The Problem

**Symptom:** [What's happening that shouldn't]
**Expected:** [What should happen instead]
**Reproduction:** [How to trigger the bug]

---

## Attempts

### Attempt 1
**Date:** [DATE]
**Agent:** Dev Agent [N]

**Hypothesis:**
> "I think the bug is caused by [X] because [reasoning]"

**What I tried:**
- [Specific change 1]
- [Specific change 2]

**Result:** ❌ Failed / ⚠️ Partial / ✅ Worked

**What happened:**
[Describe the outcome - what error, what behavior]

**What I learned:**
> "[Insight gained from this attempt]"

**Files touched:**
- `path/to/file.ts`

---

### Attempt 2
**Date:** [DATE]
**Agent:** Dev Agent [N]

**Hypothesis:**
> "Based on Attempt 1, I now think [Y] because [reasoning]"

**What I tried:**
- [Changes]

**Result:** ❌ Failed / ⚠️ Partial / ✅ Worked

**What happened:**
[Outcome]

**What I learned:**
> "[Insight]"

---

## Current Understanding

**What we've ruled out:**
- [X is not the cause because Attempt 1 showed...]
- [Y is not the cause because...]

**Leading theory:**
> "Based on attempts 1-N, the most likely cause is [Z] because [evidence]"

**Next hypothesis to test:**
> "If [Z] is the cause, then [specific test] should [expected result]"

---

## For Next Agent

If you're picking this up:
1. Read the attempts above
2. Don't repeat what's already been tried
3. Start from "Current Understanding"
4. Add your attempt using the scientific method

