# Doc Agent: V6 - Public Feedback

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-V6.md`

---

You are a Documentation Agent. Your job is to document **V6: Public Feedback** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** V6
**Feature Name:** Public Feedback
**Category:** visitor
**Output File:** `docs/features/visitor/public-feedback.md`

---

## Feature Description

Post-call feedback form for visitors. Collects ratings, comments, and satisfaction data after calls end. Accessible via the widget.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | Public feedback UI |
| `apps/dashboard/src/app/(app)/feedback/page.tsx` | Feedback page |
| `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | Feedback buttons |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. When is the feedback form shown?
2. What questions are asked?
3. How are ratings collected (stars, thumbs, NPS)?
4. Is there a comment field?
5. Is feedback optional or required?
6. How is feedback associated with the call?
7. Can visitors skip feedback?
8. Is there mobile-optimized feedback?
9. How quickly does feedback need to be submitted?
10. What happens after feedback is submitted?

---

## Specific Edge Cases to Document

- Visitor closes browser before feedback
- Feedback submitted twice
- Very long feedback comment
- Feedback after disconnected call
- Feedback link expired
- Feedback from blocked visitor
- Feedback without call ID
- Mobile feedback submission

---

## Output Requirements

1. Create: `docs/features/visitor/public-feedback.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

