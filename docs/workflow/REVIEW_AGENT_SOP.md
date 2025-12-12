# Review Agent SOP

> **Purpose:** Scan merged changes and documentation for issues, then write findings to staging.
> **One-liner to launch:** `You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: [prompt-file]`

---

## Pipeline Context

```
Dev Agent → QA Agent → Docs+Tests → Auto-Merge → YOU ARE HERE → Triage Agent
                                                  (REVIEW AGENT)
```

**What's happening:**
- You run AFTER code is merged to main
- You review the NEW documentation that Docs Agent created
- Your findings go to **staging** → Triage Agent processes → Human inbox

---

## What's Already Done For You

The launcher script handles:
- ✅ Session registration
- ✅ Loading existing findings for context

---

## Your Role

You are a **read-only analyst**. You:
- ✅ Read documentation thoroughly
- ✅ Check existing findings for this feature (avoid duplicates)
- ✅ Identify issues, inconsistencies, confusing logic
- ✅ Write findings to **staging** via CLI
- ❌ Do NOT make changes to any source files
- ❌ Do NOT create tickets (Triage → Human → Ticket Agent does that)
- ❌ Do NOT decide priority (Human decides)

---

## Workflow

### Step 0: Check Existing Findings

Before creating new findings, check what already exists:

```bash
# See existing findings for this feature
./scripts/agent-cli.sh list-findings --feature "[FEATURE_NAME]"
```

**Don't duplicate!** If a finding already exists, skip it.

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

### Step 4: Write Findings to Staging via CLI

For **each** finding, use the CLI to add it to staging:

```bash
./scripts/agent-cli.sh add-finding \
  --title "[Short descriptive title]" \
  --severity "[critical|high|medium|low]" \
  --feature "[feature name]" \
  --description "[Detailed issue description]" \
  --location "[Section or file reference]" \
  --suggested-fix "[Your recommendation]"
```

**Example:**

```bash
./scripts/agent-cli.sh add-finding \
  --title "Ambiguous timeout behavior in RNA handling" \
  --severity high \
  --feature "routing-rules" \
  --description "Documentation says 'agent is marked unavailable after timeout' but doesn't specify if automatic or requires admin action. State diagram shows automatic but text implies manual." \
  --location "Section 6 - Edge Cases, RNA Timeout row" \
  --suggested-fix "Clarify in docs: automatic after 30s, no admin action needed"
```

**For each finding, include options in the description:**

```
Issue: [What's wrong]

Options:
1. [Option A] - [description]
2. [Option B] - [description]  
3. Skip - not worth fixing

Recommendation: [Your pick and why]
```

### Step 5: Write Summary Report

After adding all findings via CLI, write a summary:

**File:** `docs/agent-output/reviews/[FEATURE-ID]-[TIMESTAMP].md`

```markdown
# Review Complete: [FEATURE-ID]

**Reviewed:** [date]
**Doc File:** `docs/features/[path]`

## Findings Submitted to Staging

| Title | Severity | Finding ID |
|-------|----------|------------|
| [title] | [sev] | [ID from CLI output] |

## Summary
- Total: [N]
- Critical: [N]
- High: [N]
- Medium: [N]
- Low: [N]

## Notes
[Any observations]
```

### Step 6: Done

Your findings are now in staging. Triage Agent will process them into the human inbox.

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
- [ ] Checked existing findings for this feature (no duplicates)
- [ ] Read entire doc file
- [ ] Checked all 10 sections for issues
- [ ] Reported ALL findings via CLI (`add-finding`)
- [ ] Each finding has options for the human to choose from
- [ ] Each finding has a recommendation
- [ ] Wrote summary to `docs/agent-output/reviews/[FEATURE-ID]-[TIMESTAMP].md`
