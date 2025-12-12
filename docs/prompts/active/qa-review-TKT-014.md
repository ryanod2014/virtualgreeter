# QA Review Agent: TKT-014 - Recording Consent Indicator for Visitors

> **Type:** QA Review
> **Ticket:** TKT-014
> **Priority:** high
> **Branch:** `agent/tkt-014`

---

## Ticket Summary

**Issue:** Visitors are recorded with NO indication. No 'This call may be recorded' message. Compliance risk for GDPR, CCPA, two-party consent states.

---

## Acceptance Criteria to Verify

- [ ] 'Recording' indicator appears after call connects
- [ ] Indicator is in same location as 'Live' badge was
- [ ] Only shows when org has recording enabled
- [ ] Badge is visible but not intrusive

---

## QA Notes

Test with recording enabled and disabled orgs. Verify badge visibility on mobile.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-014`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
