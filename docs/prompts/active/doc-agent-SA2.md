# Doc Agent: SA2 - Cancellations Dashboard

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SA2.md`

---

You are a Documentation Agent. Your job is to document **SA2: Cancellations Dashboard** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SA2
**Feature Name:** Cancellations Dashboard
**Category:** superadmin
**Output File:** `docs/features/superadmin/cancellations-dashboard.md`

---

## Feature Description

Platform-wide view of all subscription cancellations. Shows cancellation reasons, trends, feedback from cancelled customers, and churn analysis.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | Cancellations UI |
| `apps/dashboard/src/app/(app)/platform/cancellations/page.tsx` | Cancellations page |
| `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx` | Cancel feedback collection |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What data is shown for each cancellation?
2. What cancellation reasons are tracked?
3. How are trends visualized?
4. Can cancellations be filtered?
5. Is there feedback from cancelled users?
6. What churn metrics are calculated?
7. Can cancelled subscriptions be viewed in detail?
8. How far back does cancellation history go?
9. Are there cohort analysis features?
10. Can data be exported for analysis?

---

## Specific Edge Cases to Document

- Cancelled then resubscribed customers
- Cancellation without feedback
- Bulk cancellation events
- Involuntary cancellations (payment failure)
- Cancellation trends during promotions
- Filtering with no results
- Very high cancellation volume
- Partial period cancellations

---

## Output Requirements

1. Create: `docs/features/superadmin/cancellations-dashboard.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

