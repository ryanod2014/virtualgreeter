# Dev Agent: TKT-005d - Send Email on Payment Failure

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-005d-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-005d: Send Email on Payment Failure**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-005d
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-005d-send-email-on-payment-failure`
**Version:** v1

---

## The Problem

Admins receive no email when payment fails - may not notice until service is blocked.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/lib/email.ts` | Implement required changes |
| `apps/server/src/features/webhooks/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/payment-failure.md`



**Similar Code:**
- apps/server/src/lib/email.ts - existing email functions


---

## What to Implement

1. Add sendPaymentFailedEmail() function to email.ts
2. Call from payment_failed webhook handler
3. Email includes link to update payment method

---

## Acceptance Criteria

- [ ] Admin receives email when payment fails
- [ ] Email includes clear subject line about payment issue
- [ ] Email includes link/button to update payment method
- [ ] Only org admin receives email, not all agents

---

## Out of Scope

- ❌ Do NOT modify payment blocker UI
- ❌ Do NOT modify webhook logic beyond calling email function

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't spam - only send once per failure event | Follow existing patterns |
| Ensure email doesn't look like spam/phishing | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Trigger webhook, verify email sent (check Resend dashboard)

---

## QA Notes

Use Resend test mode. Verify email formatting and links work.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-005d-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-005d-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-005d-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-005d-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
