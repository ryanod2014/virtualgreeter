# Doc Agent: SA3 - Feedback Dashboard

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SA3.md`

---

You are a Documentation Agent. Your job is to document **SA3: Feedback Dashboard** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SA3
**Feature Name:** Feedback Dashboard
**Category:** superadmin
**Output File:** `docs/features/superadmin/feedback-dashboard.md`

---

## Feature Description

Platform-wide view of all user feedback including NPS surveys, post-call ratings, feature requests, and bug reports from across all organizations.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | Feedback dashboard UI |
| `apps/dashboard/src/app/(app)/platform/feedback/page.tsx` | Feedback page |
| `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | Feedback collection |
| `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | Survey modal |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What types of feedback are collected?
2. How is feedback displayed?
3. What filtering options exist?
4. How are NPS scores calculated?
5. Can feedback be responded to?
6. Are there sentiment trends?
7. How is feedback categorized?
8. Can feedback be exported?
9. What organization context is shown?
10. Are there feedback alerts/notifications?

---

## Specific Edge Cases to Document

- Very long feedback responses
- Feedback with offensive content
- Feedback from deleted users
- High volume feedback periods
- Feedback trends analysis
- Cross-organization feedback comparison
- Anonymous vs identified feedback
- Feedback without ratings

---

## Output Requirements

1. Create: `docs/features/superadmin/feedback-dashboard.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

