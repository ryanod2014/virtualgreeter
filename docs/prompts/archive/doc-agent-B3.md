# Doc Agent: B3 - Billing Frequency

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B3.md`

---

You are a Documentation Agent. Your job is to document **B3: Billing Frequency** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** B3
**Feature Name:** Billing Frequency
**Category:** billing
**Output File:** `docs/features/billing/billing-frequency.md`

---

## Feature Description

Switching between monthly, annual, and 6-month billing frequencies. Handles plan changes, proration, and discount application for longer commitments.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/billing/update-settings/route.ts` | Billing settings API |
| `apps/dashboard/src/app/admin/billing/frequency-section.tsx` | Frequency selection UI |
| `apps/server/src/features/billing/frequency-change.ts` | Frequency change logic |
| `apps/server/src/features/billing/pricing.ts` | Price ID mapping |
| `apps/server/src/features/billing/stripe-webhook-handler.ts` | Webhook handling |
| `apps/dashboard/src/lib/pricing.ts` | Pricing display helpers |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What billing frequencies are available?
2. How does monthly → annual upgrade work?
3. How does annual → monthly downgrade work?
4. What discounts apply to longer terms?
5. When does the new frequency take effect?
6. How is remaining time credited?
7. What happens to the 6-month promotional offer?
8. How does frequency change affect renewal?
9. Can frequency change during trial?
10. What Stripe API calls are made?

---

## Specific Edge Cases to Document

- Frequency change near end of cycle
- Downgrade from annual with credit remaining
- 6-month to annual conversion
- Frequency change during past-due status
- Multiple frequency changes in same cycle
- Frequency change with pending seat changes
- Reverting frequency change before it takes effect
- Frequency options for paused subscriptions

---

## Output Requirements

1. Create: `docs/features/billing/billing-frequency.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

