# Dev Agent: TKT-045 - Exclude Dismissed Surveys from PMF Calculation

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-045-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-045: Exclude Dismissed Surveys from PMF Calculation**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-045
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-045-exclude-dismissed-surveys-from`
**Version:** v1

---

## The Problem

When user dismisses survey, code sets disappointment_level: 'not_disappointed' as default. This skews PMF data negatively - dismissed surveys inflate 'not disappointed' count.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/feedback/SurveyModal.tsx` | Implement required changes |
| `apps/dashboard/src/features/feedback/actions.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/feedback/ellis-survey.md`



**Similar Code:**
- apps/dashboard/src/features/feedback/SurveyModal.tsx - survey component


---

## What to Implement

1. On dismiss, set disappointment_level to null instead of 'not_disappointed'
2. Exclude null responses from PMF calculations

---

## Acceptance Criteria

- [ ] Dismissed surveys have null disappointment_level
- [ ] PMF calculation excludes null responses
- [ ] Submitted responses work as before

---

## Out of Scope

- ❌ Do NOT change survey questions
- ❌ Do NOT modify survey trigger logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Simple fix - low risk | Follow existing patterns |
| Verify PMF calculation handles null correctly | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Dismiss survey, verify null is stored

---

## QA Notes

Test survey dismissal. Verify PMF stats page handles correctly.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-045-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-045-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-045-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-045-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
