# QA Review Agent: TKT-051 - Add Gzip Compression for Co-Browse DOM Snapshots

> **Type:** QA Review
> **Ticket:** TKT-051
> **Priority:** medium
> **Branch:** `agent/tkt-051`

---

## Ticket Summary

**Issue:** **PM Decision:** yes

**Background:** Large DOM snapshots (>1MB) are sent uncompressed over WebSocket, causing latency and lag in agent co-browse view on complex pages. Mobile/slow connections suffer most.

---

## Acceptance Criteria to Verify

- [ ] DOM snapshots are gzip compressed before transmission
- [ ] Server correctly decompresses snapshots
- [ ] Agent viewer displays decompressed content correctly
- [ ] Payload size reduced by ~70% for typical pages
- [ ] Large DOM (>500KB) logged for monitoring

---

## QA Notes

Test with data-heavy dashboards and chart-heavy pages. Compare payload sizes before/after.

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/tkt-051`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing (mcp__playwright__* tools)
6. Take screenshots for visual verification
7. Make PASS/FAIL decision
8. Write report to `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/` (ABSOLUTE PATH - NOT the worktree!)
