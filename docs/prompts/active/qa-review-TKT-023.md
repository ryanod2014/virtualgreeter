# QA Review Agent: TKT-023 - Atomic Stripe-DB Updates for Seat Changes

> **Type:** QA Review
> **Ticket:** TKT-023
> **Priority:** high
> **Branch:** `agent/tkt-023`

---

## Ticket Summary

**Issue:** Stripe is updated before DB for seat changes. If DB update fails after Stripe succeeds, customer is charged for seats not reflected in app. Inconsistent state.

---

## Acceptance Criteria to Verify

- [ ] DB failure prevents Stripe call
- [ ] Stripe failure triggers DB rollback
- [ ] Rollback failures are logged and alerted
- [ ] Successful flow unchanged

---

## QA Notes

Test failure scenarios. Verify logs capture all seat change attempts.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-023`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
