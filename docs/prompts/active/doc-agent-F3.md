# Doc Agent: F3 - Agent Stats Dashboard

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-F3.md`

---

You are a Documentation Agent. Your job is to document **F3: Agent Stats Dashboard** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** F3
**Feature Name:** Agent Stats Dashboard
**Category:** agent
**Output File:** `docs/features/agent/agent-stats-dashboard.md`

---

## Feature Description

Agent's personal statistics dashboard showing their own performance metrics, call history summary, and availability tracking. The agent's view of their own stats.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/dashboard/stats/page.tsx` | Agent stats page |
| `apps/dashboard/src/app/(app)/dashboard/page.tsx` | Dashboard home |
| `apps/dashboard/src/features/workbench/stats-card.tsx` | Stats card component |
| `apps/dashboard/src/features/workbench/workbench-client.tsx` | Workbench (includes stats) |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What stats does an agent see about themselves?
2. How are call counts displayed?
3. What time periods can be viewed?
4. How is availability time tracked?
5. Are there performance trends?
6. How does this differ from admin view?
7. What goals or targets are shown?
8. Is there a leaderboard/ranking?
9. Can agents export their stats?
10. What real-time stats are shown?

---

## Specific Edge Cases to Document

- New agent with no stats
- Agent in multiple pools
- Stats during timezone change
- Very high call volume day
- Stats with incomplete data
- Agent stats after transfer
- Real-time vs historical views
- Mobile stats view

---

## Output Requirements

1. Create: `docs/features/agent/agent-stats-dashboard.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

