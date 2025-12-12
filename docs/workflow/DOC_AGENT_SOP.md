# Documentation Agent SOP

> **Purpose:** Document features - either brand new features OR updates after tickets pass QA.
>
> **One-liner to launch:** `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[FEATURE].md`

---

## Two Modes

### Mode 1: New Feature Documentation

```
Feature Inventory → YOU (Doc Agent) → docs/features/[category]/[feature].md
```

**When:** PM assigns you a feature that has NO existing docs.
**What:** Create comprehensive 10-section documentation from scratch.

### Mode 2: Post-QA Re-documentation

```
Dev Agent → QA Agent → YOU ARE HERE → Auto-Merge → Review Agent
                       (DOC AGENT)
                       + Tests Agent (parallel)
```

**When:** Pipeline launches you after a ticket passes QA.
**What:** Update existing docs to reflect the changes Dev Agent made.

---

## How to Know Which Mode

Check your prompt file. It will say either:
- **"Document new feature: [X]"** → Mode 1 (create from scratch)
- **"Update docs for TKT-XXX"** → Mode 2 (update existing)

---

## Mode 2 Context (Post-QA)

When running after QA:
- You run on the **same branch** as the Dev Agent's work
- **Tests Agent is running in parallel** with you
- **Both must complete** before auto-merge happens
- After merge, Review Agent will look at your docs

---

## What's Already Done For You

The launcher script handles:
- ✅ Branch checkout (same branch as Dev work, for Mode 2)
- ✅ Session registration
- ✅ Worktree setup

You start ready to document.

---

## Your Mission

Document **exactly how the feature works right now** — not how it should work, not improvements needed. Just the truth of the current implementation.

**Output:**
- **Mode 1:** A comprehensive 10-section document in `docs/features/[category]/`
- **Mode 2:** Updates to existing doc OR new sections added

---

## Process

### For Mode 1 (New Feature): 3 Steps

#### Step 1: Read the Code

Read ALL relevant files for your assigned feature:

```bash
# Example for widget feature
cat apps/widget/src/Widget.tsx
cat apps/widget/src/features/[relevant-folder]/*.ts
```

Take notes on:
- What triggers this feature?
- What are ALL the possible states?
- What happens in each state?
- What are the edge cases?
- What errors can occur?

**ALSO: Read an existing completed doc for format reference:**
```bash
cat docs/features/visitor/widget-lifecycle.md
```

#### Step 2: Write Full Documentation

Create your doc file at: `docs/features/[category]/[feature-name].md`

**Use the existing 10-section format (see template below).**

#### Step 3: Notify Completion

---

### For Mode 2 (Post-QA Update): 4 Steps

#### Step 1: Understand What Changed

```bash
# See what the Dev Agent modified
git diff main..HEAD --name-only

# Read the ticket info
cat docs/prompts/active/dev-agent-TKT-XXX-*.md
```

#### Step 2: Find Existing Docs

```bash
# Check if docs exist for this feature
ls docs/features/[category]/
```

#### Step 3: Update Documentation

If docs exist: **Update** the relevant sections to reflect changes
If no docs: **Create** new documentation using the 10-section format

Focus on:
- What behavior changed?
- What new scenarios are possible?
- What edge cases were added/fixed?

#### Step 4: Notify Completion

**IMPORTANT:** Write your completion to a per-agent file to prevent conflicts with other doc agents.

**File path:** `docs/agent-output/doc-tracker/[FEATURE-ID]-[TIMESTAMP].md`

Example: `docs/agent-output/doc-tracker/SA1-2025-12-04T1430.md`

```markdown
# Doc Complete: [FEATURE-ID]

- **Feature:** [Feature Name]
- **Status:** COMPLETE
- **Doc File:** `docs/features/[category]/[filename].md`
- **Scenarios Documented:** [count]
- **Edge Cases Documented:** [count]
- **Completed At:** [timestamp]
```

The PM Dashboard automatically aggregates all doc agent completions.

---

## Documentation Format (10 Sections)

```markdown
# Feature: [Feature Name] ([ID])

## Quick Summary
[1-2 sentence overview of what this feature does]

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
[What problem does this solve? What does it enable?]

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| [user] | [goal] | [how] |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. [Step 1]
2. [Step 2]
3. [Step 3]
...

### State Machine
[Mermaid diagram or ASCII art showing states and transitions]

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| [state] | [description] | [entry] | [exit] |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| [event] | [location] | [action] | [effects] |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| [name] | [file] | [purpose] |

### Data Flow
[Detailed ASCII diagram showing data flow between components]

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | [scenario] | [trigger] | [behavior] | ✅/⚠️/❌ | [notes] |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| [error] | [when] | [user experience] | [recovery] |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| [#] | [action] | [response] | ✅/⚠️ | [issues] |

### Accessibility
- Keyboard navigation: [status]
- Screen reader support: [status]
- Color contrast: [status]
- Loading states: [status]

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| [concern] | [how handled] | [status] |

### Security
| Concern | Mitigation |
|---------|------------|
| [concern] | [mitigation] |

### Reliability
| Concern | Mitigation |
|---------|------------|
| [concern] | [mitigation] |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** [Yes/No - explanation]
2. **Is the control intuitive?** [Yes/No - explanation]
3. **Is feedback immediate?** [Yes/No - explanation]
4. **Is the flow reversible?** [Yes/No - explanation]
5. **Are errors recoverable?** [Yes/No - explanation]
6. **Is the complexity justified?** [Yes/No - explanation]

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| [issue] | [impact] | 🔴/🟡/🟢 | [fix] |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| [purpose] | [file path] | [line range] | [notes] |

---

## 9. RELATED FEATURES
- [Feature X](./relative-path.md) - [how they interact]
- [Feature Y](../category/file.md) - [dependency or integration]

---

## 10. OPEN QUESTIONS
1. [Question that came up during documentation]
2. [Ambiguity that needs clarification]
```

---

## Quality Checklist

Before marking complete, verify:

- [ ] **Completeness:** Every code path is documented
- [ ] **Accuracy:** Scenarios match actual code behavior
- [ ] **Clarity:** Non-technical reader can understand user experience
- [ ] **Edge Cases:** Weird scenarios are covered (empty states, rapid clicks, disconnections, etc.)
- [ ] **Error States:** What happens when things go wrong
- [ ] **All 10 sections:** Follow the existing format exactly

---

## What NOT To Do

❌ Don't suggest improvements or fixes
❌ Don't create tickets for bugs you find
❌ Don't modify any code
❌ Don't skip edge cases because they're "unlikely"
❌ Don't assume behavior — verify in code
❌ Don't use a different format than the existing docs

---

## Reference: Existing Docs

Look at these completed docs for format reference:

| Doc | Good Example Of |
|-----|-----------------|
| `visitor/widget-lifecycle.md` | Comprehensive state machine, edge cases |
| `platform/call-lifecycle.md` | Complex event flows, data diagrams |
| `agent/incoming-call.md` | Agent-side user experience |
| `admin/routing-rules.md` | Admin configuration features |

---

## Time Estimate

- Small feature (single file): 30-60 min
- Medium feature (2-4 files): 1-2 hours
- Large feature (5+ files, complex state): 2-4 hours

---

## Questions?

If you encounter ambiguous behavior in the code, document BOTH possibilities:

```markdown
### Scenario X: [Ambiguous Case]
**Observed Behavior:** [what the code appears to do]
**Uncertainty:** [what's unclear]
**Code Reference:** `file.ts:line-number`
```

DO NOT BLOCK. Document what you can observe and note uncertainties in Section 10 (Open Questions).
