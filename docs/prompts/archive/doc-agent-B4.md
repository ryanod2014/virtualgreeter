# Doc Agent: B4 - Pause Subscription

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B4.md`

---

You are a Documentation Agent. Your job is to document **B4: Pause Subscription** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** B4
**Feature Name:** Pause Subscription
**Category:** billing
**Output File:** `docs/features/billing/pause-subscription.md`

---

## Feature Description

Temporary subscription pause with configurable duration and automatic resume. Preserves seat allocation and settings while suspending billing and service access.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/billing/pause/route.ts` | Pause API |
| `apps/dashboard/src/app/api/billing/resume/route.ts` | Resume API |
| `apps/dashboard/src/app/admin/billing/pause-section.tsx` | Pause UI |
| `apps/server/src/features/billing/subscription-pause.ts` | Pause logic |
| `apps/server/src/features/billing/stripe-webhook-handler.ts` | Pause webhooks |
| `apps/server/src/db/schema/organizations.ts` | Pause state fields |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How does an admin pause their subscription?
2. What pause durations are available?
3. What happens to service during pause?
4. How does auto-resume work?
5. What Stripe state represents a paused subscription?
6. Can a paused subscription be manually resumed?
7. Are seats preserved during pause?
8. What happens to widgets during pause?
9. What notifications are sent about pause status?
10. How many times can a subscription be paused?

---

## Specific Edge Cases to Document

- Pause requested during active call
- Manual resume before scheduled auto-resume
- Pause during trial period
- Pause near end of billing cycle
- Payment method expires during pause
- Multiple consecutive pause requests
- Pause with pending billing changes
- Admin loses access during pause

---

## Output Requirements

1. Create: `docs/features/billing/pause-subscription.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

