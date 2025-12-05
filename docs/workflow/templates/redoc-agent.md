# Re-Documentation Agent Template

> **Purpose:** Template for creating re-documentation agent prompts when code changes affect existing docs.
> **One-liner to launch:** `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/redoc-agent-[FEATURE-ID].md`

---

## How to Use This Template

When a dev ticket completes and affects documented features:

1. PM reads the dev completion report's "Documentation Impact" section
2. PM creates a re-doc prompt using this template
3. Fill in the placeholders below
4. Save to: `docs/prompts/active/redoc-agent-[FEATURE-ID].md`

---

## Template

```markdown
# Re-Documentation Agent: [FEATURE-ID]

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/redoc-agent-[FEATURE-ID].md`

---

## Your Mission

Update existing documentation to reflect recent code changes.

**CRITICAL:** Do NOT trust the dev agent's completion report. Use the CODE as your source of truth.

---

## Context

**Feature:** [Feature Name]
**Doc File:** `docs/features/[category]/[feature].md`
**Triggering Tickets:** [TKT-XXX, TKT-YYY]
**Branch:** `[branch-name]`

---

## What Changed (Code-Level)

Run this command to see exactly what changed:

```bash
[git_diff_cmd from doc-status.json redoc_context]
```

### Files to Re-Read

| File | Why |
|------|-----|
| `[file-path]` | [What changed in this file] |

---

## Your Process

1. **Read the existing documentation** — understand current state
2. **Run the git diff command above** — see exactly what code changed
3. **Read the changed files** — understand new behavior
4. **Update documentation sections** — only sections affected by changes
5. **Keep unaffected sections intact** — don't rewrite everything

### Sections to Focus On

Based on the code changes, review these sections:

- [ ] Section 2: HOW IT WORKS (if flow changed)
- [ ] Section 3: DETAILED LOGIC (if functions/events changed)
- [ ] Section 4: EDGE CASES (if new scenarios exist)
- [ ] Section 6: TECHNICAL CONCERNS (if security/performance changed)
- [ ] Section 8: CODE REFERENCES (update file/line references)

---

## Output

### 1. Update the Doc File

Edit directly: `docs/features/[category]/[feature].md`

### 2. Write Completion Report

**File path:** `docs/agent-output/doc-tracker/REDOC-[FEATURE-ID]-[TIMESTAMP].md`

```markdown
# Re-Doc Complete: [FEATURE-ID]

- **Feature:** [Feature Name]
- **Status:** RE-DOCUMENTED
- **Doc File:** `docs/features/[category]/[filename].md`
- **Triggering Tickets:** [TKT-XXX]
- **Sections Updated:** [list which sections you modified]
- **Completed At:** [ISO timestamp]
- **Code Verified:** ✅ (read actual git diff, not just ticket summary)

### Changes Made
| Section | What Was Updated |
|---------|------------------|
| [Section N] | [Brief description] |

### Notes
[Any observations or concerns for PM]
```

---

## Critical Rules

1. **CODE IS TRUTH** — Don't trust dev agent's description, read the actual code
2. **GIT DIFF IS YOUR FRIEND** — See exactly what changed
3. **MINIMAL UPDATES** — Only change sections affected by code changes
4. **PRESERVE FORMAT** — Follow existing 10-section structure exactly
5. **VERIFY BEHAVIOR** — If code contradicts existing doc, code wins
```

---

## Example: Filled-In Template

```markdown
# Re-Documentation Agent: cobrowse-viewer

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/redoc-agent-cobrowse-viewer.md`

---

## Your Mission

Update existing documentation to reflect recent code changes.

**CRITICAL:** Do NOT trust the dev agent's completion report. Use the CODE as your source of truth.

---

## Context

**Feature:** Co-Browse Viewer
**Doc File:** `docs/features/agent/cobrowse-viewer.md`
**Triggering Tickets:** TKT-001
**Branch:** `agent/TKT-001-cobrowse-sanitization`

---

## What Changed (Code-Level)

Run this command to see exactly what changed:

```bash
git diff main..agent/TKT-001-cobrowse-sanitization -- apps/widget/src/features/cobrowse/
```

### Files to Re-Read

| File | Why |
|------|-----|
| `apps/widget/src/features/cobrowse/domSerializer.ts` | Added sensitive field masking |
| `apps/widget/src/features/cobrowse/SensitiveFieldMasker.ts` | New file for masking logic |

---

## Your Process

1. **Read the existing documentation** — understand current state
2. **Run the git diff command above** — see exactly what code changed
3. **Read the changed files** — understand new behavior
4. **Update documentation sections** — only sections affected by changes
5. **Keep unaffected sections intact** — don't rewrite everything

### Sections to Focus On

Based on the code changes (sensitive data masking), review:

- [x] Section 3: DETAILED LOGIC — new masking function
- [x] Section 6: TECHNICAL CONCERNS — security improvements
- [x] Section 8: CODE REFERENCES — new file paths
```

