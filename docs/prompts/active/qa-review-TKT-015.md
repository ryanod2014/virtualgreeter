# QA Review Agent: TKT-015 - Secure Recording URLs with Signed Access

> **Type:** QA Review
> **Ticket:** TKT-015
> **Priority:** high
> **Branch:** `agent/tkt-015`

---

## Ticket Summary

**Issue:** Recording uploads go to public Supabase bucket with predictable URL patterns. Anyone who guesses the pattern can access recordings without auth. HIPAA/GDPR compliance risk.

---

## Acceptance Criteria to Verify

- [ ] New recordings go to private bucket
- [ ] Recording URLs are signed with 1-hour expiration
- [ ] URLs contain randomized UUIDs (not predictable org/call pattern)
- [ ] Playback works with signed URLs
- [ ] URL refreshes automatically if user watches longer than 1 hour

---

## QA Notes

Test playback after URL expiration. Verify refresh mechanism works. Test download button.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-015`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
