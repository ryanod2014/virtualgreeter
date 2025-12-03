# Documentation Agent SOP

> **Purpose:** Document a single feature with ALL possible user stories, scenarios, and edge cases.
>
> **One-liner to launch:** `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[FEATURE].md`

---

## Your Mission

Document **exactly how the feature works right now** — not how it should work, not improvements needed. Just the truth of the current implementation.

**Output:** A comprehensive 10-section document following the existing format in `docs/features/`.

---

## Process (3 Steps)

### Step 1: Read the Code

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

### Step 2: Write Scenario Documentation

Create your doc file at: `docs/features/[category]/[feature-name].md`

**Use the existing 10-section format (see template below).**

### Step 3: Notify Completion

Append to `docs/DOC_TRACKER.md`:

```markdown
### [FEATURE-ID] ✅
- **Feature:** [Feature Name]
- **Status:** COMPLETE
- **Doc File:** `docs/features/[category]/[filename].md`
- **Scenarios Documented:** [count]
- **Edge Cases Documented:** [count]
- **Completed At:** [timestamp]
```

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
