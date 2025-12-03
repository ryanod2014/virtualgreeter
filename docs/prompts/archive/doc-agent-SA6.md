# Doc Agent: SA6 - Retargeting Analytics

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SA6.md`

---

You are a Documentation Agent. Your job is to document **SA6: Retargeting Analytics** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SA6
**Feature Name:** Retargeting Analytics
**Category:** superadmin
**Output File:** `docs/features/superadmin/retargeting-analytics.md`

---

## Feature Description

Analytics for retargeting campaigns showing visitor re-engagement, conversion attribution, and campaign performance metrics.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx` | Retargeting UI |
| `apps/dashboard/src/app/(app)/platform/retargeting/page.tsx` | Retargeting page |
| `apps/server/src/lib/greetnow-retargeting.ts` | Retargeting logic |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What retargeting campaigns are tracked?
2. How are conversions attributed?
3. What metrics are displayed?
4. How is visitor re-engagement measured?
5. What campaign performance data is shown?
6. Can campaigns be compared?
7. What time periods can be analyzed?
8. Is there ROI calculation?
9. How is the data visualized?
10. Can data be exported?

---

## Specific Edge Cases to Document

- No campaign activity
- Multi-touch attribution
- Cross-device tracking issues
- Campaign with no conversions
- Very high impression volumes
- Attribution window edge cases
- Seasonal campaign analysis
- Campaign data discrepancies

---

## Output Requirements

1. Create: `docs/features/superadmin/retargeting-analytics.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

