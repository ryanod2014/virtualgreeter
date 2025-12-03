# Doc Agent: STATS1 - Agent Stats

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-STATS1.md`

---

You are a Documentation Agent. Your job is to document **STATS1: Agent Stats** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** STATS1
**Feature Name:** Agent Stats
**Category:** stats
**Output File:** `docs/features/stats/agent-stats.md`

---

## Feature Description

Per-agent performance metrics including calls handled, average duration, availability, and response times. Powers agent performance dashboards.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/lib/stats/agent-stats.ts` | Agent statistics calculations |
| `apps/dashboard/src/app/admin/agents/agent-stats-card.tsx` | Stats display UI |
| `apps/dashboard/src/app/api/stats/agents/route.ts` | Agent stats API |
| `apps/server/src/features/stats/agent-metrics.ts` | Metrics collection |
| `apps/server/src/db/schema/call-metrics.ts` | Metrics schema |
| `apps/dashboard/src/app/admin/dashboard/agent-leaderboard.tsx` | Leaderboard component |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What metrics are tracked per agent?
2. How is call count calculated?
3. How is average duration calculated?
4. What time ranges are available?
5. How is availability calculated?
6. How are RNA (Ring No Answer) events counted?
7. Are stats real-time or cached?
8. How is the agent leaderboard sorted?
9. What happens to stats for removed agents?
10. How is data aggregated (daily, weekly, monthly)?

---

## Specific Edge Cases to Document

- Agent with zero calls in period
- Stats for newly created agent
- Agent transferred between pools
- Stats during very long call
- Agent stats across timezone boundaries
- Stats for deleted agent
- Incomplete call counting
- Stats API with large date range

---

## Output Requirements

1. Create: `docs/features/stats/agent-stats.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

