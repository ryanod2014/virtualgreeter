# QA Review Agent: TKT-003 - Update Cancellation Data Deletion Copy

> **Type:** QA Review
> **Ticket:** TKT-003
> **Priority:** critical
> **Branch:** `agent/TKT-003-cancel-copy`

---

## Ticket Summary

**Issue:** Cancel modal warns that data will be 'permanently deleted' but actual behavior just downgrades to free - no data is deleted. This is misleading.

---

## Acceptance Criteria to Verify

- [ ] Cancel modal shows updated retention language
- [ ] No mention of 'immediate' or 'permanent' deletion
- [ ] Modal text matches exact copy provided in fix_required

---

## QA Notes

Verify modal displays correctly on desktop and mobile viewports.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/TKT-003-cancel-copy`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
