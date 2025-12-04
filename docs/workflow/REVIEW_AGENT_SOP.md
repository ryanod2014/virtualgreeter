# Review Agent SOP

> **Purpose:** Scan documented features for issues, inconsistencies, and improvement opportunities.
> **One-liner to launch:** `You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: [prompt-file]`

---

## Your Role

You are a **read-only analyst**. You:
- ✅ Read documentation thoroughly
- ✅ Identify issues, inconsistencies, confusing logic
- ✅ Report findings in a structured format
- ✅ Write your output to a per-agent file (prevents conflicts with other agents)
- ❌ Do NOT make changes to any source files
- ❌ Do NOT create tickets (PM + Human do that)
- ❌ Do NOT decide priority (Human decides)

---

## Workflow

### Step 1: Read Your Prompt

Your prompt file will specify:
- Which feature doc(s) to review
- Any specific areas to focus on

### Step 2: Read the Documentation

```bash
cat docs/features/[category]/[feature].md
```

Read the entire document carefully.

### Step 3: Analyze for Issues

Look for these categories:

| Category | What to Look For |
|----------|------------------|
| **Confusing User Stories** | Stories that don't make sense, are ambiguous, or contradict each other |
| **Logic Issues** | Flows that seem wrong, edge cases that aren't handled, race conditions |
| **Documented Issues** | Anything already flagged in "OPEN QUESTIONS" or "Identified Issues" sections |
| **Missing Scenarios** | Obvious user paths not documented |
| **UX Concerns** | Poor user experience, accessibility issues noted |
| **Technical Debt** | Performance, security, or reliability concerns noted |
| **Inconsistencies** | Contradictions with other documented features |

### Step 4: Write Findings to Per-Agent Output File

**IMPORTANT:** Write your findings to your own unique file to prevent conflicts with other review agents.

**File path:** `docs/agent-output/reviews/[FEATURE-ID]-[TIMESTAMP].md`

Example: `docs/agent-output/reviews/D-routing-rules-2025-12-04T1430.md`

Use this EXACT format:

```markdown
# Review: [FEATURE-ID] - [Feature Name]

**Reviewed:** [date]
**Doc File:** `docs/features/[path]`
**Review Agent:** [prompt file used]

---

## Findings

### 1. [Short Title]
- **Category:** [Confusing User Story | Logic Issue | Documented Issue | Missing Scenario | UX Concern | Technical Debt | Inconsistency]
- **Severity:** [Critical | High | Medium | Low]
- **Location:** [Section name or line reference]
- **Issue:** [Clear description of what's wrong]
- **Options:**
  1. [First option - be specific]
  2. [Second option - alternative approach]
  3. [Third option - if applicable]
  4. Skip - not worth fixing
- **Recommendation:** [Which option you recommend and why - one sentence]
- **Human Decision:** ⏳ PENDING

### 2. [Next Finding]
...

---

## Summary
- **Total Findings:** [N]
- **Critical:** [N]
- **High:** [N]
- **Medium:** [N]
- **Low:** [N]
```

### Step 5: Done

After writing your findings file, you're done. The PM Dashboard automatically aggregates all review agent outputs.

---

## Severity Guidelines

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Broken functionality, security risk, data loss potential | Auth bypass documented, race condition causes data corruption |
| **High** | Major UX issue, significant logic flaw | User can't complete core task, confusing flow causes drop-off |
| **Medium** | Minor issue, improvement opportunity | Edge case not handled gracefully, unclear error message |
| **Low** | Nice-to-have, polish | Minor wording improvement, optional enhancement |

---

## Rules

1. **Be specific** - Reference exact sections, quote the problematic text
2. **Be objective** - Report what you see, don't editorialize
3. **Don't skip "Documented Issues"** - If the doc already flags something, still report it
4. **One finding per issue** - Don't bundle multiple problems together
5. **Suggest, don't decide** - Your fix is a suggestion, Human decides

---

## Example Finding

```markdown
### 1. Ambiguous Timeout Behavior
- **Category:** Confusing User Story
- **Severity:** High
- **Location:** Section 6 - Edge Cases, "RNA Timeout" row
- **Issue:** Documentation says "agent is marked unavailable after timeout" but doesn't specify if this is automatic or requires admin action. The state diagram shows automatic transition but the text implies manual.
- **Options:**
  1. Make it automatic - agent auto-marked unavailable after 30s, no admin action
  2. Make it manual - require admin to mark agent unavailable after timeout
  3. Make it configurable - org setting to choose automatic vs manual
  4. Skip - ambiguity is acceptable, document both interpretations
- **Recommendation:** Option 1 (automatic) - matches state diagram and is better UX for admins
- **Human Decision:** ⏳ PENDING
```

---

## Output Checklist

Before finishing, verify:
- [ ] Read entire doc file
- [ ] Checked all 10 sections for issues
- [ ] Reported ALL findings (even minor ones)
- [ ] Used exact format above
- [ ] Each finding has Category, Severity, Location, Issue
- [ ] Each finding has 2-4 Options for the human to choose from
- [ ] Each finding has a Recommendation (your suggested option + brief reason)
- [ ] Wrote to `docs/agent-output/reviews/[FEATURE-ID]-[TIMESTAMP].md` (NOT REVIEW_FINDINGS.md)
