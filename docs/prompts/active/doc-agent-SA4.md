# Doc Agent: SA4 - Funnel Analytics

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SA4.md`

---

You are a Documentation Agent. Your job is to document **SA4: Funnel Analytics** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SA4
**Feature Name:** Funnel Analytics
**Category:** superadmin
**Output File:** `docs/features/superadmin/funnel-analytics.md`

---

## Feature Description

Conversion funnel analysis showing user journey from signup through activation, including drop-off points, conversion rates, and bottleneck identification.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/platform/funnel/funnel-client.tsx` | Funnel UI |
| `apps/dashboard/src/app/(app)/platform/funnel/page.tsx` | Funnel page |
| `apps/dashboard/src/app/api/funnel/track/route.ts` | Funnel tracking API |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What are the funnel stages tracked?
2. How are conversions measured?
3. Where are the main drop-off points?
4. How is time-to-conversion tracked?
5. Can funnels be filtered by source/campaign?
6. What visualization is used?
7. Are there cohort comparisons?
8. How far back does funnel data go?
9. Can funnel data be exported?
10. Are there funnel alerts/anomaly detection?

---

## Specific Edge Cases to Document

- User skips funnel stages
- Very long time between stages
- Funnel re-entry (churned then returned)
- Multiple devices/sessions
- Attribution tracking issues
- Zero conversions period
- Funnel data discrepancies
- High volume tracking performance

---

## Output Requirements

1. Create: `docs/features/superadmin/funnel-analytics.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

