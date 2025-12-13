# QA Review Agent: TKT-068 - Allow Pageview Tracking Without Agent Online

> **Type:** QA Review
> **Ticket:** TKT-068
> **Priority:** medium
> **Branch:** `agent/tkt-068`

---

## Ticket Summary

**Issue:** **PM Decision:** Track pageviews when agents are available SEPARATELY from widget views. We use both stats in admin & agent call logs pages.

**Background:** Pageviews are only tracked when an agent is online (agent_id is required). This means organizations without 24/7 agent coverage have inaccurate pageview counts, making install verification unreliable and analytics misleading.

---

## Acceptance Criteria to Verify

- [ ] Pageviews are recorded even when no agents are online
- [ ] agent_id field is null when no agent available
- [ ] Dashboard shows total pageviews (assigned + unassigned)
- [ ] Verification succeeds based on any pageview, not just assigned ones
- [ ] Existing pageview tracking still works for assigned pageviews

---

## QA Notes

Test with all agents offline. Load widget and verify pageview is tracked. Check dashboard analytics.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-068`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
