# Doc Agent: F1 - Ellis Survey

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-F1.md`

---

You are a Documentation Agent. Your job is to document **F1: Ellis Survey** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** F1
**Feature Name:** Ellis Survey
**Category:** feedback
**Output File:** `docs/features/feedback/ellis-survey.md`

---

## Feature Description

In-app NPS and satisfaction surveys shown to users at strategic points. Named "Ellis Survey" - handles survey eligibility, display logic, and response collection.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | Survey modal UI |
| `apps/dashboard/src/features/surveys/survey-trigger.tsx` | Survey trigger logic |
| `apps/dashboard/src/features/surveys/use-survey-eligibility.ts` | Eligibility rules |
| `apps/dashboard/src/features/surveys/index.ts` | Survey exports |
| `apps/dashboard/src/app/(app)/admin/preview-survey/page.tsx` | Survey preview |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What types of surveys exist?
2. When are surveys triggered?
3. What is the eligibility criteria?
4. How is NPS score collected?
5. What follow-up questions are asked?
6. How often can a user see a survey?
7. Can users dismiss surveys?
8. Where is survey data stored?
9. How do admins preview surveys?
10. Are there different surveys for different user types?

---

## Specific Edge Cases to Document

- User dismisses survey repeatedly
- Survey during critical workflow
- Survey eligibility edge cases
- Very long survey responses
- Survey shown to new vs returning user
- Survey timing after specific events
- Multiple survey types queued
- Survey display on mobile

---

## Output Requirements

1. Create: `docs/features/feedback/ellis-survey.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

