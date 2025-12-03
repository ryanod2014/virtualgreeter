# Doc Agent: SA1 - Platform Dashboard

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SA1.md`

---

You are a Documentation Agent. Your job is to document **SA1: Platform Dashboard** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SA1
**Feature Name:** Platform Dashboard
**Category:** superadmin
**Output File:** `docs/features/superadmin/platform-dashboard.md`

---

## Feature Description

Super admin dashboard showing platform-wide metrics: MRR, customer count, churn, growth, and operational health across all organizations.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/platform/page.tsx` | Platform dashboard |
| `apps/dashboard/src/app/(app)/platform/layout.tsx` | Platform layout |
| `apps/dashboard/src/app/(app)/platform/platform-nav.tsx` | Platform navigation |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What metrics are shown on the platform dashboard?
2. How is MRR calculated?
3. What customer metrics are displayed?
4. How is churn tracked?
5. What operational health indicators exist?
6. How are trends visualized?
7. What time periods can be selected?
8. Who has access to this dashboard?
9. Can data be exported?
10. How frequently is data updated?

---

## Specific Edge Cases to Document

- No organizations yet
- Negative MRR changes
- Very large data volumes
- Dashboard load performance
- Data discrepancy with Stripe
- Timezone handling for metrics
- Historical data limitations
- Real-time vs cached data

---

## Output Requirements

1. Create: `docs/features/superadmin/platform-dashboard.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

