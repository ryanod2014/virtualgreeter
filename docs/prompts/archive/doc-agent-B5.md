# Doc Agent: B5 - Cancel Subscription

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B5.md`

---

You are a Documentation Agent. Your job is to document **B5: Cancel Subscription** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** B5
**Feature Name:** Cancel Subscription
**Category:** billing
**Output File:** `docs/features/billing/cancel-subscription.md`

---

## Feature Description

Subscription cancellation flow including feedback collection, grace period handling, and data retention policy. Manages the complete offboarding process.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/billing/cancel/route.ts` | Cancel API |
| `apps/dashboard/src/app/admin/billing/cancel-section.tsx` | Cancel UI |
| `apps/server/src/features/billing/subscription-cancel.ts` | Cancel logic |
| `apps/server/src/features/billing/stripe-webhook-handler.ts` | Cancel webhooks |
| `apps/dashboard/src/components/cancel-feedback-modal.tsx` | Feedback collection |
| `apps/server/src/db/schema/cancellation-feedback.ts` | Feedback storage |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What is the cancellation flow?
2. Is cancellation immediate or end-of-period?
3. What feedback is collected?
4. What is the grace period (if any)?
5. What data is retained after cancellation?
6. Can a cancelled subscription be reactivated?
7. What happens to agents and pools?
8. What Stripe API calls are made?
9. Are there retention offers shown?
10. What notifications are sent?

---

## Specific Edge Cases to Document

- Cancel during trial (no charge)
- Cancel request reversed before period ends
- Cancel with remaining credits/time
- Agent in active call during cancellation
- Last-minute cancellation attempts
- Cancel while subscription is past due
- Re-subscribe immediately after cancel
- Partial refund scenarios

---

## Output Requirements

1. Create: `docs/features/billing/cancel-subscription.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

