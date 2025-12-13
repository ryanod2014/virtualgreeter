# QA Review Agent: TKT-093 - Fix Timezone Display for Pause End Date

> **Type:** QA Review
> **Ticket:** TKT-093
> **Priority:** medium
> **Branch:** `agent/tkt-093`

---

## Ticket Summary

**Issue:** **PM Decision:** show UTC in ui

**Background:** The pause_ends_at date is calculated server-side using JavaScript Date which uses UTC. When displayed to the user, this may not align with their local timezone, causing confusion about when the pause actually ends (e.g., "Your account resumes on Dec 15" might resume on Dec 14 or Dec 16 depending on timezone).

---

## Acceptance Criteria to Verify

- [ ] Users can clearly see what timezone the pause end date uses
- [ ] No confusion about when account will actually resume
- [ ] Date display is consistent across all billing UI
- [ ] F-064 is resolved

---

## QA Notes

Test pause end date display in multiple timezones. Verify tooltip/help text is clear.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-093`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
