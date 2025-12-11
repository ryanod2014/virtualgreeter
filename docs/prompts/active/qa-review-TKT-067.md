# QA Review Agent: TKT-067 - Add Exponential Backoff to Widget Verification Polling

> **Type:** QA Review
> **Ticket:** TKT-067
> **Priority:** medium
> **Branch:** `agent/tkt-067`

---

## Ticket Summary

**Issue:** **PM Decision:** whats best practice on this? because if its not infinite polling how does it detect new URLs?

**Background:** Dashboard polls every 5 seconds indefinitely until widget is verified, causing unnecessary load. Quote: 'Polls forever until verified' with ⚠️ flag. This wastes server resources and creates unnecessary database queries for installations that take hours or days to complete.

---

## Acceptance Criteria to Verify

- [ ] Polling starts at 5 second intervals
- [ ] After 1 minute, increases to 10s intervals
- [ ] After 3 minutes, increases to 30s intervals
- [ ] After 5 minutes, increases to 60s intervals
- [ ] After 10 minutes, polling stops and shows manual check button
- [ ] Button click triggers immediate check and resumes polling

---

## QA Notes

Leave widget unverified and monitor polling intervals. Verify button appears and works after timeout.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-067`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
