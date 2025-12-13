# QA Review Agent: TKT-077 - Improve Error Message for Catch-All Pool Routing Rules

> **Type:** QA Review
> **Ticket:** TKT-077
> **Priority:** medium
> **Branch:** `agent/tkt-077`

---

## Ticket Summary

**Issue:** When admin tries to add a routing rule to a catch-all pool, the database error message is unclear. Need user-friendly error message explaining why rules cannot be added to catch-all pools.

---

## Acceptance Criteria to Verify

- [ ] Error message is clear and actionable
- [ ] User understands why operation failed
- [ ] F-108 is resolved

---

## QA Notes

Test: 1) Try adding routing rule to catch-all pool, 2) Verify error message is user-friendly, 3) Check that rule creation still works for non-catch-all pools, 4) Test that existing rules on catch-all pools (if any) are handled gracefully.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-077`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
