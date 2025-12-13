# Automated Pipeline Testing Guide

## Overview

This document provides a systematic approach to testing the automated ticket pipeline, which handles the full lifecycle of tickets from development through QA to merge.

---

## System Architecture

### Pipeline Flow
```
Ready → Dev Agent → Regression Tests → QA Agent → Docs+Tests Agents → Merged
         ↓                ↓                ↓
      (failure)       (failure)        (failure)
         ↓                ↓                ↓
   Continuation ←←←←←←←←←←←←←←←←←←←←←←←←←←←
   (max 5 iterations, then blocked)
```

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| **PM Dashboard** | `docs/pm-dashboard-ui/` | Web UI + API server |
| **Server** | `docs/pm-dashboard-ui/server.js` | Backend, job queue, file watchers |
| **Automation Config** | `docs/pm-dashboard-ui/automation-config.js` | Enable/disable automation, whitelist |
| **Database** | `docs/pm-dashboard-ui/pm-dashboard.db` | SQLite - tickets, jobs, sessions |
| **Launch Scripts** | `scripts/launch-agents.sh` | Launch dev agents |
| **QA Scripts** | `scripts/run-qa-agent.sh` | Launch QA agents |
| **Ticket Agent CLI** | `scripts/ticket-agent-cli.js` | Create/continue tickets |
| **Prompt Files** | `docs/prompts/active/` | Agent instructions |
| **Agent Output** | `docs/agent-output/` | Results, blockers, QA reports |

---

## Dashboard Access

**URL:** http://localhost:3456

### Starting the Server
```bash
cd docs/pm-dashboard-ui
node server.js
```

### Key Dashboard Views
- **Pipeline Chart (Mermaid)** - Visual flow showing agent counts
- **Tickets Tab** - List of all tickets with status
- **Agents Tab** - Running agent sessions
- **Jobs Tab** - Background job queue

---

## Configuration

### Automation Config (`docs/pm-dashboard-ui/automation-config.js`)

```javascript
const automationConfig = {
  enabled: true,               // Master switch for automation
  testTickets: ['TKT-095'],    // Whitelist - empty = all tickets
  autoQueueOnDevComplete: true,
  autoQueueOnQaPass: true,
  autoDispatchOnBlock: true,   // Auto-create continuations on failure
  maxParallelDevAgents: 2,
  maxParallelQaAgents: 2,
  maxIterations: 5,            // Max retries before blocking
};
```

### Whitelist Behavior
- Uses **prefix matching**: `['TKT-095']` matches `TKT-095`, `TKT-095-V2`, `TKT-095-V3`, etc.
- Empty array `[]` = **all tickets** get automation
- Non-whitelisted tickets are skipped with log: `⏭️ Skipping TKT-XXX - not in test whitelist`

---

## Ticket Statuses

| Status | Meaning |
|--------|---------|
| `ready` | Ready for dev agent |
| `in_progress` | Dev agent working |
| `dev_complete` | Dev done, awaiting regression |
| `qa_pending` | Waiting for QA |
| `qa_approved` | QA passed, ready for docs+tests |
| `merged` | Successfully merged |
| `blocked` | Requires human intervention |
| `qa_failed` | QA or regression failed |

---

## File Structure for Agents

### Prompt Files
```
docs/prompts/active/
├── dev-agent-TKT-095-v1.md      # Dev prompt for TKT-095
├── dev-agent-TKT-095-V2-v1.md   # Dev prompt for continuation
├── qa-review-TKT-095.md         # QA review prompt
└── qa-review-TKT-095-V2.md
```

**Naming Convention:**
- Dev: `dev-agent-{TICKET_ID}-v{VERSION}.md`
- QA: `qa-review-{TICKET_ID}.md`
- Continuation tickets use `-V2`, `-V3` suffix in ticket ID

### Agent Output
```
docs/agent-output/
├── blocked/                     # Blocker files (JSON)
│   ├── QA-TKT-095-FAILED-*.json
│   └── REGRESSION-TKT-095-*.json
├── qa-results/                  # QA reports (MD)
│   ├── QA-TKT-095-PASSED-*.md
│   └── QA-TKT-095-FAILED-*.md
└── completions/                 # Dev completion files
```

### Worktrees
```
../agent-worktrees/
├── TKT-095/                     # Dev worktree
├── TKT-095-V2/                  # Continuation worktree
├── qa-TKT-095/                  # QA worktree
└── qa-TKT-095-V2/
```

---

## Systematic Testing Plan

### Phase 1: Single Ticket End-to-End Test

**Goal:** Verify one ticket goes through the full loop successfully.

#### Step 1: Select a Test Ticket
```bash
# Find tickets in "ready" status
curl -s http://localhost:3456/api/v2/tickets | jq '[.tickets[] | select(.status == "ready")] | .[0:5] | .[].id'
```

Pick one with low complexity (check `difficulty` field).

#### Step 2: Configure Whitelist
Edit `docs/pm-dashboard-ui/automation-config.js`:
```javascript
testTickets: ['TKT-XXX'],  // Your test ticket
```

Restart server:
```bash
pkill -f "node.*server.js"
cd docs/pm-dashboard-ui && node server.js &
```

#### Step 3: Launch Dev Agent
```bash
cd /path/to/Digital_greeter
./scripts/launch-agents.sh TKT-XXX
```

#### Step 4: Monitor Progress
```bash
# Watch ticket status
watch -n 5 'curl -s http://localhost:3456/api/v2/tickets/TKT-XXX | jq "{id, status}"'

# Watch tmux sessions
tmux ls

# Watch jobs
curl -s http://localhost:3456/api/v2/jobs | jq '[.jobs[] | select(.ticket_id == "TKT-XXX")] | .[] | {job_type, status}'
```

#### Step 5: Verify Checkpoints

| Checkpoint | How to Verify |
|------------|---------------|
| Dev completes | Status → `dev_complete`, `regression_test` job created |
| Regression passes | `qa_launch` job created, status → `qa_pending` |
| QA passes | Status → `qa_approved`, `test_agent` + `doc_agent` jobs |
| Docs+Tests complete | Status → `merged` |

#### Success Criteria
- [ ] Dev completes → auto-triggers regression tests
- [ ] Regression passes → auto-triggers QA agent
- [ ] QA passes → auto-triggers docs + tests agents
- [ ] Docs + tests complete → auto-merges
- [ ] If any failure → continuation created with correct naming

---

### Phase 2: Failure Path Test

**Goal:** Verify self-healing loop creates continuations correctly.

#### Step 1: Pick a Known-Fail Ticket
Use a ticket that previously failed or modify one to fail intentionally.

#### Step 2: Verify Continuation Creation
When dev/QA fails:
```bash
# Check for continuation ticket
curl -s http://localhost:3456/api/v2/tickets | jq '[.tickets[] | select(.id | test("TKT-XXX"))] | .[].id'

# Should see: TKT-XXX, TKT-XXX-V2
```

#### Step 3: Verify Continuation Properties
```bash
curl -s http://localhost:3456/api/v2/tickets/TKT-XXX-V2 | jq '{id, status, parent_ticket_id, iteration, branch}'
```

Expected:
- `parent_ticket_id`: Original ticket ID
- `iteration`: 2
- `branch`: Same as parent or derived from base ID

#### Step 4: Verify Prompt File
```bash
ls docs/prompts/active/ | grep "TKT-XXX-V2"
# Should see: dev-agent-TKT-XXX-V2-v1.md
```

#### Step 5: Verify Max Iterations
After 5 failures:
```bash
curl -s http://localhost:3456/api/v2/tickets/TKT-XXX-V5 | jq '{id, status}'
# Should be: "blocked"

# Check blocker file
ls docs/agent-output/blocked/ | grep "MAX-ITERATIONS"
```

---

### Phase 3: Parallel Test

**Goal:** Verify multiple tickets don't interfere with each other.

#### Step 1: Add Multiple Tickets to Whitelist
```javascript
testTickets: ['TKT-001', 'TKT-002', 'TKT-003'],
```

#### Step 2: Launch All
```bash
./scripts/launch-agents.sh TKT-001 TKT-002 TKT-003
```

#### Step 3: Monitor for Issues
```bash
# Check for lock conflicts
curl -s http://localhost:3456/api/v2/locks | jq '.locks'

# Check all running agents
curl -s http://localhost:3456/api/v2/agents | jq '[.sessions[] | select(.status == "running")] | group_by(.agent_type)'

# Watch for errors in server logs
tail -f docs/pm-dashboard-ui/server.log  # If logging to file
```

#### Things to Watch For
- File lock conflicts (same file modified by multiple agents)
- Race conditions in job queue
- Worktree conflicts

---

### Phase 4: Full Run

**Goal:** Run all tickets with confidence.

#### Step 1: Remove Whitelist
```javascript
testTickets: [],  // Empty = all tickets
```

#### Step 2: Process Ready Batch
```bash
# Get all ready tickets
curl -s http://localhost:3456/api/v2/tickets | jq '[.tickets[] | select(.status == "ready")] | length'

# Launch in batches (respect maxParallelDevAgents)
./scripts/launch-agents.sh TKT-001 TKT-002  # First batch
# Wait for completion, then next batch
```

#### Step 3: Monitor Dashboard
- Check Mermaid chart for agent counts
- Watch for tickets stuck in one status
- Review merged tickets for quality

---

## Troubleshooting

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "No prompt file found" | Prompt not in worktree | Copy from main repo to worktree |
| "No branch found" | Branch not set on ticket | Update ticket with correct branch |
| "File lock conflict" | Another agent has lock | Wait or cancel stale session |
| Agent count wrong in dashboard | Stale DB sessions | Complete/block stale sessions |
| Continuation not created | `autoDispatchOnBlock: false` | Enable in config |
| Skipping ticket | Not in whitelist | Add prefix to `testTickets` |

### Useful Commands

```bash
# Kill stale tmux session
tmux kill-session -t agent-TKT-XXX

# Cancel stale DB session
curl -X POST http://localhost:3456/api/v2/agents/{SESSION_ID}/complete -H "Content-Type: application/json" -d '{}'

# Clear all file locks
curl -s http://localhost:3456/api/v2/locks | jq -r '.locks[].id' | xargs -I {} curl -X DELETE http://localhost:3456/api/v2/locks/{}

# Force ticket status update
curl -X PUT http://localhost:3456/api/v2/tickets/TKT-XXX -H "Content-Type: application/json" -d '{"status": "ready"}'

# View job queue
curl -s http://localhost:3456/api/v2/jobs | jq '[.jobs[] | select(.status == "pending" or .status == "running")]'
```

### Server Logs to Watch
```
✅ QA PASS detected    → QA passed, advancing
📨 Queueing dispatch   → Creating continuation
🚫 max iterations      → Blocking ticket (good!)
⏭️ Skipping            → Not in whitelist
🔒 Automation DISABLED → Config issue
```

---

## API Reference

### Tickets
- `GET /api/v2/tickets` - List all
- `GET /api/v2/tickets/{id}` - Get one
- `PUT /api/v2/tickets/{id}` - Update

### Agents
- `GET /api/v2/agents` - List sessions
- `POST /api/v2/agents/{id}/complete` - Mark complete
- `POST /api/v2/agents/{id}/block` - Mark blocked

### Jobs
- `GET /api/v2/jobs` - List all jobs
- Job types: `dev_launch`, `qa_launch`, `regression_test`, `dispatch`, `doc_agent`, `test_agent`

### Locks
- `GET /api/v2/locks` - View active locks

---

## Quick Reference Card

```
# Start server
cd docs/pm-dashboard-ui && node server.js

# Dashboard
open http://localhost:3456

# Launch dev agent
./scripts/launch-agents.sh TKT-XXX

# Launch QA agent
PM_DASHBOARD_URL=http://localhost:3456 ./scripts/run-qa-agent.sh TKT-XXX

# Check ticket status
curl -s http://localhost:3456/api/v2/tickets/TKT-XXX | jq '{id, status}'

# List running agents
curl -s http://localhost:3456/api/v2/agents | jq '[.sessions[] | select(.status == "running")]'

# Attach to agent tmux
tmux attach -t agent-TKT-XXX
```

