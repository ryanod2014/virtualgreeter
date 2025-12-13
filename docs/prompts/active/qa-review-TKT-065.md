# QA Review Agent: TKT-065 - Geo-Failure Handling Toggle in Blocklist Settings

> **Type:** QA Review
> **Ticket:** TKT-065
> **Priority:** medium
> **Branch:** `agent/tkt-065`

---

## Ticket Summary

**Issue:** When geolocation fails, behavior differs by mode (blocklist=allow, allowlist=block). Admins have no control over this. Need a toggle to let admins choose what happens when location can't be determined, plus display geolocation failure rate so admins can make informed decisions.

---

## Acceptance Criteria to Verify

- [ ] Toggle appears in blocklist settings UI
- [ ] Toggle default matches current behavior (blocklist=allow, allowlist=block)
- [ ] Geolocation failures respect admin's toggle choice
- [ ] Failure rate percentage displayed to help admin decide

---

## QA Notes

Test with VPN/unknown IP to trigger geolocation failure. Verify toggle works in both modes.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-065`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
