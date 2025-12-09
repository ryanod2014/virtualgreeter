# Protected System Files

> **Purpose:** This document lists system infrastructure files that AI agents must NEVER modify.

---

## Core System Files (DO NOT TOUCH)

These files are critical infrastructure that runs the autonomous agent workflow:

### PM Dashboard & Orchestration
- `docs/pm-dashboard-ui/server.js` - Main orchestration server
- `docs/pm-dashboard-ui/*.html` - Dashboard UI files

### Database Layer
- `scripts/db/db.js` - SQLite database operations

### Agent Launchers
- `scripts/launch-agents.sh` - Dev agent launcher
- `scripts/launch-qa-agents.sh` - QA agent launcher
- `scripts/orchestrate-agents.sh` - Multi-agent orchestrator

### Setup & Infrastructure
- `scripts/setup-agent-worktree.sh` - Git worktree setup
- `scripts/run-regression-tests.sh` - Regression test runner
- `scripts/agent-cli.sh` - Agent command-line interface
- `scripts/check-system-integrity.sh` - System health check

---

## Why Are These Protected?

1. **Single point of failure** - Bugs in these files break the entire agent workflow
2. **Cross-cutting impact** - Changes affect all tickets, not just one
3. **Debugging difficulty** - Issues may only appear during parallel agent runs
4. **No automated tests** - These files are infrastructure, not application code

---

## What To Do If Your Ticket Seems To Require Changes

If a ticket's implementation appears to require modifying a protected file:

1. **STOP immediately** - Do not attempt the modification
2. **Report as BLOCKED** with reason: `"Ticket requires protected file modification - needs human engineer"`
3. **Document in blocker file:**
   - Which protected file would need changes
   - What changes would be needed
   - Why the ticket requires this

---

## Who Can Modify Protected Files?

Only **human engineers** should modify these files, with:

1. Careful code review
2. Manual testing of the full agent loop
3. Immediate git commit after changes
4. Verification that changes survive git operations

---

## History

This protection was added after infrastructure fixes were lost due to:
- Changes made to working directory but not committed
- Git operations (checkout, stash, reset) overwriting uncommitted changes
- No automated checks to detect infrastructure regressions

---

## Related Files

- `scripts/check-system-integrity.sh` - Automated check for known issues
- `docs/workflow/DEV_AGENT_SOP.md` - Dev agent instructions (references this file)
- `docs/workflow/QA_REVIEW_AGENT_SOP.md` - QA agent instructions
