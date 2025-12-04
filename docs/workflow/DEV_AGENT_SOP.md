# Dev Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the Dev Agent's implementation workflow.
> **One-liner to launch:** `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: [ticket-prompt-file]`

---

## 🎯 Your Mission

Complete your assigned ticket **exactly as specified**. No more, no less.

---

## Phase 1: INVESTIGATE (Before ANY Code)

### 1.1 Read Your Ticket Spec Thoroughly

Your ticket spec contains:
- What needs to be implemented
- Which files to modify
- Acceptance criteria
- Risks to avoid
- Similar code patterns to follow

**Read the ENTIRE spec. Don't skim.**

### 1.2 Pre-Flight Validation (REQUIRED)

**Before writing ANY code, verify the ticket has everything you need.**

If the ticket is missing ANY of the following → **BLOCKED immediately**:

| Required | What to Check |
|----------|---------------|
| ✅ Clear goal | Can you explain in 1 sentence what this accomplishes? |
| ✅ Files to modify | Are specific file paths listed? |
| ✅ Acceptance criteria | Are there testable success conditions? |
| ✅ Risks to avoid | Are there explicit warnings about what NOT to do? |
| ✅ How to test | Can you verify your work before submitting? |

**If ANY is missing or unclear → Report BLOCKED with question asking for clarification.**

### 1.3 Pre-Flight Checklist

Complete this checklist before writing any code:

- [ ] I read the ENTIRE ticket spec
- [ ] I can explain in 1 sentence what this ticket accomplishes
- [ ] I read the linked feature documentation
- [ ] I understand the "why" behind this change
- [ ] I found and read the similar code examples mentioned
- [ ] I understand the patterns used in this codebase
- [ ] I identified all files I'll need to modify
- [ ] I understand every acceptance criterion
- [ ] I understand every risk listed

**If ANYTHING is unclear → STOP and report BLOCKED**

---

## Phase 2: PLAN (Still No Code)

### 2.1 Write Implementation Plan

Before coding, write a brief plan:

```
1. [file] — [what I'll do]
2. [file] — [what I'll do]
3. [file] — [what I'll do]
```

### 2.2 Scope Check

Ask yourself:
- Am I staying in scope? (Only modifying listed files)
- Does this avoid all listed risks?
- Does this follow existing patterns?

**If answer is NO to any → BLOCKED immediately**

---

## Phase 3: ENVIRONMENT SETUP

```bash
# Checkout the branch (or create if specified in ticket)
git fetch origin
git checkout [branch-name]
# OR if creating new:
git checkout -b agent/TKT-XXX-[short-description]

# Install dependencies
pnpm install
```

---

## Phase 4: IMPLEMENT

### 4.1 Make Changes

- Follow existing code patterns **religiously**
- Keep changes **minimal and focused**
- Don't refactor unrelated code
- Add comments only for complex logic
- Check style guide for every UI change

### 4.2 Commit Frequently

```bash
git add [files]
git commit -m "TKT-XXX: [brief description of change]"
```

Good commit messages:
- `TKT-001: Add SensitiveFieldMasker utility class`
- `TKT-001: Integrate masker into domSerializer`
- `TKT-001: Add password field detection`

### 4.3 Run Checks After Each File

```bash
pnpm typecheck
pnpm lint
```

Fix any errors before continuing.

---

## Phase 5: SELF-REVIEW

Before submitting, verify:

### Acceptance Criteria Check
For EACH criterion in the ticket:
- [ ] Criterion met? YES
- [ ] How did I verify it? [Brief explanation]

### Risk Avoidance Check
For EACH risk in the ticket:
- [ ] Risk avoided? YES
- [ ] How? [Brief explanation]

### Code Quality Check
- [ ] Only modified files listed in scope
- [ ] No console.logs left (except intentional)
- [ ] No commented-out code
- [ ] Following existing patterns

### Build Check
```bash
pnpm typecheck  # Must pass
pnpm lint       # Must pass
pnpm build      # Must pass
```

### Style Guide Check (UI Tickets Only)
- [ ] Colors from tailwind.config theme only
- [ ] Spacing uses scale (p-4, gap-2, not p-[13px])
- [ ] Typography uses defined styles
- [ ] Using existing components from packages/ui
- [ ] Matches existing similar components

---

## Phase 6: SUBMIT FOR REVIEW

### 6.1 Push Changes

```bash
git push origin [branch-name]
```

### 6.2 Write Completion Report

**IMPORTANT:** Write your completion report to a per-agent file to prevent conflicts with other dev agents.

**File path:** `docs/agent-output/completions/[TICKET-ID]-[TIMESTAMP].md`

Example: `docs/agent-output/completions/TKT-001-2025-12-04T1430.md`

```markdown
# Completion Report: TKT-XXX

### Summary
[1-2 sentences: what this change does]

### Acceptance Criteria Verification
| Criterion | Status | How Verified |
|-----------|--------|--------------|
| "[Criterion 1]" | ✅ | [How you verified] |
| "[Criterion 2]" | ✅ | [How you verified] |

### Risk Avoidance Verification
| Risk | Avoided? | How |
|------|----------|-----|
| "[Risk 1]" | ✅ | [How you avoided it] |
| "[Risk 2]" | ✅ | [How you avoided it] |

### Files Changed
| File | Change Description |
|------|-------------------|
| `path/to/file.ts` | [What changed] |

### UI Changes (if applicable)
| Change | Description |
|--------|-------------|
| [Component] | [What it looks like now] |

### How to Test
1. [Step 1]
2. [Step 2]
3. [Expected result]

### Findings Reported
[List any findings you added to findings.json, or "None"]
- F-DEV-TKT-XXX-1: [title]

### Notes
[Anything unusual, decisions made, edge cases handled]
```

The PM Dashboard automatically aggregates all dev agent completions.

---

## When You Get BLOCKED

If you're unsure about ANYTHING — **STOP and report it.**

### Report Blockers to `findings.json`

Add a blocker entry to `docs/data/findings.json` under the `findings` array:

```json
{
  "id": "BLOCKED-TKT-XXX-[number]",
  "type": "blocker",
  "source": "dev-agent-TKT-XXX",
  "severity": "critical",
  "title": "[Short question title]",
  "feature": "[Feature from your ticket]",
  "category": "clarification",
  "status": "pending",
  "found_at": "[ISO date]",
  
  "issue": "[Your specific question - be precise]",
  
  "options": [
    {
      "id": 1,
      "label": "[Option 1 name] — [Description + tradeoffs]",
      "recommended": false
    },
    {
      "id": 2,
      "label": "[Option 2 name] — [Description + tradeoffs]",
      "recommended": true
    },
    {
      "id": 3,
      "label": "[Option 3 name] — [Description + tradeoffs]",
      "recommended": false
    }
  ],
  
  "recommendation": "Option [N] because [1 sentence reason]",
  
  "blocker_context": {
    "ticket_id": "TKT-XXX",
    "ticket_version": 1,
    "branch": "agent/tkt-xxx-[description]",
    "progress": {
      "commits": [
        "[hash] - [message]",
        "[hash] - [message]"
      ],
      "done": [
        "[Completed item 1]",
        "[Completed item 2]"
      ],
      "remaining": [
        "[Blocked item] ← YOU ARE HERE",
        "[Not started item]",
        "[Not started item]"
      ],
      "stopped_at": {
        "file": "path/to/file.ts",
        "line": 45,
        "context": "[What you were about to do]"
      },
      "notes_for_next_agent": "[Anything the next agent needs to know]"
    }
  }
}
```

### Example Blocker:

```json
{
  "id": "BLOCKED-TKT-001-1",
  "type": "blocker",
  "source": "dev-agent-TKT-001",
  "severity": "critical",
  "title": "Should password masking use regex or DOM attributes?",
  "feature": "Co-Browse (Viewer + Sender)",
  "category": "clarification",
  "status": "pending",
  "found_at": "2025-12-04T10:30:00Z",
  
  "issue": "The ticket says to mask 'sensitive fields' but doesn't specify the detection method. Should I use regex patterns to detect field names like 'password' and 'ssn', or rely on DOM attributes like type='password' and autocomplete='cc-number'?",
  
  "options": [
    {
      "id": 1,
      "label": "Regex pattern matching — Match field names/IDs containing 'password', 'ssn', 'credit'. Catches more but may have false positives.",
      "recommended": false
    },
    {
      "id": 2,
      "label": "DOM attributes only — Use type='password', autocomplete='cc-*', data-sensitive='true'. Semantic and reliable but may miss custom fields.",
      "recommended": true
    },
    {
      "id": 3,
      "label": "Both approaches — Combine regex + DOM attributes. Most comprehensive but more complex.",
      "recommended": false
    }
  ],
  
  "recommendation": "Option 2 because DOM attributes are semantic, standard, and won't have false positives. Custom fields can opt-in with data-sensitive attribute.",
  
  "blocker_context": {
    "ticket_id": "TKT-001",
    "ticket_version": 1,
    "branch": "agent/tkt-001-cobrowse-sanitization",
    "progress": {
      "commits": [
        "a1b2c3d - TKT-001: Add SensitiveFieldMasker utility class",
        "e4f5g6h - TKT-001: Create test file structure"
      ],
      "done": [
        "Created masker class skeleton",
        "Set up test file"
      ],
      "remaining": [
        "Implementing detection logic ← BLOCKED HERE",
        "Integration with domSerializer",
        "Final testing"
      ],
      "stopped_at": {
        "file": "apps/widget/src/features/cobrowse/SensitiveFieldMasker.ts",
        "line": 45,
        "context": "About to implement isSensitiveField() method"
      },
      "notes_for_next_agent": "I created a class-based approach to keep masking logic separate from serialization. The test file has placeholder tests ready."
    }
  }
}
```

**⚠️ CRITICAL:** The `blocker_context` section is REQUIRED. Without it, the next agent can't continue your work.

**Then STOP.** Don't continue until you receive a continuation ticket with the answer.

---

## Scope Rules

### ✅ DO:
- Only modify files listed in ticket spec
- Follow existing patterns **exactly**
- Make minimal changes needed
- Check each risk before completing

### ❌ DON'T:
- Add features not in the spec
- Refactor code outside your scope
- "Improve" things you notice along the way
- Add configuration options unless requested
- Create abstractions for one-time use

### If You Notice Something Wrong (But It's Not In Your Scope):

1. **Do NOT fix it yourself**
2. **Add to findings.json** for PM triage (same as review agents)
3. Continue with your ticket

**How to report findings (NOT blockers):**

Add to `docs/data/findings.json` under the `findings` array:

```json
{
  "id": "F-DEV-[ticket-id]-[number]",
  "source": "dev-agent-[your-ticket-id]",
  "title": "[Short descriptive title]",
  "category": "bug|security|ux|performance|docs",
  "severity": "critical|high|medium|low",
  "file": "path/to/file.ts",
  "line": 42,
  "issue": "What's wrong and why it matters",
  "suggestion": "How to fix it",
  "status": "pending",
  "found_at": "[ISO date]"
}
```

This will automatically appear in the PM's Triage queue.

---

## Continuation Tickets

If you're working on a **continuation ticket** (e.g., `dev-agent-TKT-001-v2.md`):

### What's Different:
1. Branch already exists with previous work
2. Spec includes blocker resolution (human's decision)
3. Progress checkpoint shows where to resume

### Your Process:
1. Read the **entire** continuation spec
2. Check the **"Blocker Resolution"** section for the answer
3. Check the **"Where You Left Off"** section
4. Checkout existing branch (don't create new)
5. Review previous commits and code
6. Continue from checkpoint
7. Don't redo completed work

```bash
# For continuation tickets:
git fetch origin
git checkout [existing-branch]
git pull origin [existing-branch]

# Review what's been done
git log --oneline -10
```

---

## Quality Standards

### Code Quality
- [ ] Follows existing patterns in the codebase
- [ ] No unnecessary changes to unrelated code
- [ ] Clear variable and function names
- [ ] Comments explain "why", not "what"
- [ ] No console.logs left (except intentional)

### Type Safety
- [ ] No `any` types unless absolutely necessary
- [ ] Props interfaces defined for components
- [ ] API responses properly typed

### Error Handling
- [ ] Errors caught and handled appropriately
- [ ] User-facing errors are friendly
- [ ] Edge cases considered

---

## ⚠️ Critical Rules

1. **Validate the ticket first** — If anything is missing, BLOCKED before coding
2. **Read the full spec** — Don't skim
3. **Stay in scope** — Only modify listed files
4. **Follow patterns** — Copy existing code style exactly
5. **Check everything** — typecheck, lint, build before pushing
6. **Report blockers immediately** — Don't spin; STOP and report to findings.json
7. **Document progress** — Especially when blocked
8. **Don't over-engineer** — Simple solutions for simple problems
9. **Verify each criterion** — Before marking complete
