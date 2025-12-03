# Doc Agent: A6 - Agent Stats Detail

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-A6.md`

---

You are a Documentation Agent. Your job is to document **A6: Agent Stats Detail** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** A6
**Feature Name:** Agent Stats Detail
**Category:** agent
**Output File:** `docs/features/agent/agent-stats-detail.md`

---

## Feature Description

Individual agent performance detail page showing comprehensive statistics, call history, performance trends, and comparison metrics.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Agent stats detail UI |
| `apps/dashboard/src/app/(app)/admin/agents/[agentId]/page.tsx` | Agent detail page |
| `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Agent list (links to detail) |
| `apps/dashboard/src/features/workbench/stats-card.tsx` | Stats card component |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What statistics are shown on the agent detail page?
2. How are performance trends calculated?
3. What time periods can be selected?
4. How do comparison metrics work (vs team average)?
5. Is there a call history list on this page?
6. What actions can be taken from this page?
7. Can stats be exported?
8. How does the page differ for admin vs the agent viewing their own stats?
9. Are there performance badges or achievements?
10. How is availability time calculated?

---

## Specific Edge Cases to Document

- Agent with no calls in period
- Newly created agent stats
- Agent transferred between pools
- Stats during timezone changes
- Very long call affecting averages
- Stats for deactivated agent
- Partial day statistics
- Agent stats API rate limiting

---

## Output Requirements

1. Create: `docs/features/agent/agent-stats-detail.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

