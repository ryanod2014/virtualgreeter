# QA Review Agent: TKT-005c - Handle Payment Failed Webhook

> **Type:** QA Review
> **Ticket:** TKT-005c
> **Priority:** critical
> **Branch:** `agent/tkt-005c`

---

## Ticket Summary

**Issue:** No webhook handler for invoice.payment_failed - system doesn't know when payments fail.

---

## Acceptance Criteria to Verify

- [ ] invoice.payment_failed sets org to 'past_due'
- [ ] invoice.paid clears 'past_due' and sets to 'active'
- [ ] Webhook signature verification works
- [ ] Idempotent handling of duplicate webhooks

---

## QA Notes

Use Stripe CLI to forward webhooks. Verify DB state changes correctly.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-005c`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
