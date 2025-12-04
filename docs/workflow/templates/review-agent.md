# Review Agent Prompt Template

> **Instructions for PM:** Copy this template to `docs/prompts/active/review-agent-[ID].md` and fill in the bracketed sections.

---

## Feature to Review

- **Feature ID:** [e.g., V1, A3, B2]
- **Feature Name:** [e.g., Widget Lifecycle, RNA Timeout]
- **Doc File:** `docs/features/[category]/[filename].md`

---

## Review Focus

Check all that apply:
- [x] User Stories - Do they make sense?
- [x] Logic Flow - Is it correct and complete?
- [x] Edge Cases - Are they all handled?
- [x] Open Questions - What's already flagged?
- [x] UX/Accessibility - Any concerns?
- [x] Technical Debt - Performance/Security/Reliability
- [x] Cross-Feature Consistency - Contradictions with other docs?

---

## Additional Context

[Optional: Any specific areas the PM wants you to focus on, or known concerns to investigate]

---

## Instructions

1. Read `docs/workflow/REVIEW_AGENT_SOP.md` for full process
2. Read the doc file specified above
3. Analyze for all issue categories
4. Write findings to `docs/agent-output/reviews/[FEATURE-ID]-[TIMESTAMP].md`
5. Use the exact format specified in the SOP

---

## Launch Command

```
You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-[ID].md
```
