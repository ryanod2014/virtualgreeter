# QA Review Agent: TKT-009 - Org-Level Co-Browse Disable Setting

> **Type:** QA Review
> **Ticket:** TKT-009
> **Priority:** high
> **Branch:** `agent/tkt-009`

---

## Ticket Summary

**Issue:** Visitors have no control over screen sharing during calls. Co-browse is automatic with no opt-out. May violate privacy expectations or GDPR.

---

## Acceptance Criteria to Verify

- [ ] Org settings shows 'Enable Co-Browse' toggle
- [ ] When disabled, co-browse does not initialize for visitors
- [ ] Existing orgs default to enabled (no breaking change)
- [ ] Setting change takes effect on next call (not mid-call)

---

## QA Notes

Test with new org (should default enabled). Test toggle persistence across page refreshes.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-009`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
