# QA Review Agent: TKT-089-V2-V3 - Save Blocklist Mode Data When Switching Modes (Retry 2) (Retry 3)

> **Type:** QA Review
> **Ticket:** TKT-089-V2-V3
> **Priority:** medium
> **Branch:** `agent/tkt-089-v2-v3`

---

## Ticket Summary

**Issue:** **PM Decision:** when switching modes it should save their data from the other mode in case they switch back

**Background:** Switching between Blocklist and Allowlist modes clears the entire country list (see blocklist-settings-client.tsx:194-199). If an admin accidentally clicks the wrong mode or needs to compare both modes, they lose their entire list of selected countries.

**Implementation:** Store separate country lists for blocklist and allowlist modes. When switching modes, preserve the current list and restore the previously saved list for the target mode.

---

## Acceptance Criteria to Verify

- [ ] Switching from blocklist to allowlist preserves blocklist selections
- [ ] Switching from allowlist to blocklist preserves allowlist selections
- [ ] Can switch between modes multiple times without losing data
- [ ] Saving updates the database with the currently active mode's list
- [ ] F-038 is resolved

---

## QA Notes

Test in browser: 1) Add countries to blocklist (e.g., US, UK, CA). 2) Switch to allowlist mode - list should clear visually. 3) Add different countries to allowlist (e.g., FR, DE). 4) Switch back to blocklist - should see original US, UK, CA. 5) Switch to allowlist again - should see FR, DE. 6) Save and reload page - verify saved mode's data persists.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-089-v2-v3`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
