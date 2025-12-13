# QA Review Agent: TKT-078 - Add Logging for Malformed URL Routing Fallback

> **Type:** QA Review
> **Ticket:** TKT-078
> **Priority:** medium
> **Branch:** `agent/tkt-078`

---

## Ticket Summary

**Issue:** **PM Decision:** i dont unerstand - simplify explanation and make it real

**Background:** Invalid/malformed URLs are silently treated as paths in routing logic, which could cause unexpected routing behavior. Add logging and dashboard warnings for debugging.

---

## Acceptance Criteria to Verify

- [ ] Malformed URLs are logged for debugging
- [ ] Dashboard shows warning for unusual URL patterns
- [ ] F-109 is resolved

---

## QA Notes

Test with various malformed URLs: 1) Invalid protocol, 2) Missing domain, 3) Special characters, 4) Very long URLs. Verify: logging appears with context, dashboard shows warnings, no crashes occur, PII is sanitized.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-078`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
