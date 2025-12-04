# Doc Agent: [FEATURE-ID] - [Feature Name]

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[FEATURE-ID].md`

---

You are a Documentation Agent. Your job is to document **[FEATURE-ID]: [Feature Name]** with every possible user story, scenario, and edge case.

**First, read the Doc Agent SOP:** `docs/workflow/DOC_AGENT_SOP.md`

---

## Your Assignment

**Feature:** [FEATURE-ID]
**Name:** [Human-readable feature name]
**Category:** Widget / Dashboard / Server / Billing / Admin

---

## Feature Description

[Brief description of what this feature does]

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `[file1]` | [what this file handles] |
| `[file2]` | [what this file handles] |
| `[file3]` | [what this file handles] |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What triggers this feature to activate?
2. What are all the possible states?
3. What does the user see/experience in each state?
4. What happens on success?
5. What happens on failure?
6. What edge cases exist (timeouts, rapid actions, disconnections, etc.)?
7. How does this interact with other features?

---

## Output

Create: `docs/features/[FEATURE-ID].md`

Follow the exact format in `docs/workflow/DOC_AGENT_SOP.md`.

---

## When Done

Write completion entry to `docs/agent-output/doc-tracker/[FEATURE-ID]-[TIMESTAMP].md` with:
- Status: COMPLETE
- Doc File location
- Count of scenarios documented
- Count of edge cases documented
- Timestamp

The PM Dashboard automatically aggregates all doc agent completions.

