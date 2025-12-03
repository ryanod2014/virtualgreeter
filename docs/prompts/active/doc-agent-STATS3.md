# Doc Agent: STATS3 - Call Analytics

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-STATS3.md`

---

You are a Documentation Agent. Your job is to document **STATS3: Call Analytics** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** STATS3
**Feature Name:** Call Analytics
**Category:** stats
**Output File:** `docs/features/stats/call-analytics.md`

---

## Feature Description

Call volume analytics including total calls, outcomes, duration trends, peak times, and abandonment rates. Primary dashboard analytics view.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/admin/dashboard/page.tsx` | Main dashboard |
| `apps/dashboard/src/app/admin/dashboard/call-volume-chart.tsx` | Call volume chart |
| `apps/dashboard/src/app/api/stats/calls/route.ts` | Call stats API |
| `apps/dashboard/src/lib/stats/call-analytics.ts` | Analytics calculations |
| `apps/server/src/features/stats/call-aggregator.ts` | Call data aggregation |
| `apps/dashboard/src/app/admin/dashboard/outcomes-breakdown.tsx` | Outcome visualization |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What call metrics are displayed?
2. How is call volume aggregated (hourly, daily)?
3. What call outcomes are tracked?
4. How is abandonment rate calculated?
5. How is average duration calculated?
6. What date ranges are available?
7. Can data be exported?
8. How are peak times identified?
9. How do filters work (by pool, agent)?
10. Is data real-time or delayed?

---

## Specific Edge Cases to Document

- Dashboard with no call data
- Extremely high call volume display
- Call duration outliers skewing averages
- Analytics during timezone transitions
- Partial day data handling
- Analytics for deleted pools
- Very short calls (< 10 seconds)
- Export of large date range

---

## Output Requirements

1. Create: `docs/features/stats/call-analytics.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

