# Doc Agent: STATS2 - Coverage Stats

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-STATS2.md`

---

You are a Documentation Agent. Your job is to document **STATS2: Coverage Stats** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** STATS2
**Feature Name:** Coverage Stats
**Category:** stats
**Output File:** `docs/features/stats/coverage-stats.md`

---

## Feature Description

Pool coverage analytics showing when agents are available, coverage gaps, and visitor request patterns. Helps optimize staffing.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/lib/stats/coverage-stats.ts` | Coverage calculations |
| `apps/dashboard/src/app/admin/dashboard/coverage-chart.tsx` | Coverage visualization |
| `apps/dashboard/src/app/api/stats/coverage/route.ts` | Coverage stats API |
| `apps/server/src/features/stats/coverage-metrics.ts` | Coverage data collection |
| `apps/server/src/features/availability/availability-tracker.ts` | Agent availability tracking |
| `apps/dashboard/src/app/admin/pools/[id]/coverage/page.tsx` | Pool coverage page |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What does "coverage" mean in this context?
2. How is coverage percentage calculated?
3. What time granularity is available?
4. How are coverage gaps identified?
5. How is visitor demand tracked?
6. What visualization shows coverage patterns?
7. Is coverage per-pool or org-wide?
8. How are timezone differences handled?
9. What historical coverage data is retained?
10. How do recommendations work?

---

## Specific Edge Cases to Document

- Pool with no agents assigned
- 24/7 coverage calculation
- Coverage during holidays/off-hours
- Coverage when agents are all in calls
- Multi-timezone organization
- Coverage stats for new pool
- Coverage gaps < 5 minutes
- Very high visitor demand period

---

## Output Requirements

1. Create: `docs/features/stats/coverage-stats.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

