# QA Review Agent: TKT-013 - Retention Policy Retroactive Deletion Warning

> **Type:** QA Review
> **Ticket:** TKT-013
> **Priority:** high
> **Branch:** `agent/tkt-013`

---

## Ticket Summary

**Issue:** When admin reduces retention from 90→30 days, behavior is unclear. Should be retroactive (delete old recordings) with clear warning.

---

## Acceptance Criteria to Verify

- [ ] Reducing retention triggers confirmation modal
- [ ] Modal shows exact count of recordings to be deleted
- [ ] User must type 'DELETE' to confirm
- [ ] Deletion is logged for audit
- [ ] Recordings older than new retention are deleted

---

## QA Notes

Test with org that has recordings. Verify count is accurate. Verify deletion happens after confirmation.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-013`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
