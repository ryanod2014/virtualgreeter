# QA Review Agent: TKT-095-V2 - Add Validation for Facebook Pixel Settings (Retry 2)

> **Type:** QA Review
> **Ticket:** TKT-095-V2
> **Priority:** medium
> **Branch:** `agent/tkt-095-v2`

---

## Ticket Summary

**Issue:** Admins can save Facebook event mappings without providing a Pixel ID. This allows configuration that will never work, with no feedback that the setup is incomplete. Edge case #15 notes: "Save FB settings without pixel ID - Leave pixel ID empty - Can save but events won't fire - No validation error shown".

---

## Acceptance Criteria to Verify

- [ ] Cannot save Facebook event mappings without Pixel ID
- [ ] Clear error/warning message explains the requirement
- [ ] Existing configs without Pixel ID show warning in UI
- [ ] F-067 is resolved

---

## QA Notes

Test edge case: save FB event mappings without Pixel ID - should show validation error.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-095-v2`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
