# Testing the Automated Pipeline

## Quick Overview

The pipeline moves tickets through these stages:
```
ready → in_progress → dev_complete → unit_test_passed → qa_pending → qa_passed → docs_tests_pending → docs_tests_complete → merged → review_pending → closed
```

## Monitoring a Running Ticket

### 1. Check if a QA agent is running
```bash
tmux ls
# Look for: qa-TKT-XXX sessions
```

### 2. Watch the agent in real-time
```bash
# Attach to the tmux session to see Claude working
tmux attach -t qa-TKT-088

# Detach without killing: Ctrl+B then D
```

### 3. Check ticket status
```bash
curl -s "http://localhost:3456/api/v2/tickets/TKT-088" | jq '.ticket.status'
```

### 4. See all tickets and their statuses
```bash
curl -s "http://localhost:3456/api/v2/tickets" | jq '.tickets[] | {id, status, title}' | head -50
```

---

## Testing New Tickets

### Step 1: Find tickets ready for testing
```bash
# Get tickets in 'ready' status (ready for dev)
curl -s "http://localhost:3456/api/v2/tickets?status=ready" | jq '.tickets[].id'

# Or dev_complete (ready for unit tests)
curl -s "http://localhost:3456/api/v2/tickets?status=dev_complete" | jq '.tickets[].id'
```

### Step 2: Launch the pipeline for a specific ticket

**Option A: Full pipeline (from dev_complete onward)**
```bash
# Trigger unit tests → QA → docs → merge → review
node scripts/pipeline-runner.js --event dev_complete TKT-XXX
```

**Option B: Just launch QA agent**
```bash
./scripts/launch-qa-agents.sh TKT-XXX
```

**Option C: Run multiple tickets in parallel**
```bash
./scripts/launch-qa-agents.sh TKT-001 TKT-002 TKT-003
```

### Step 3: Monitor progress
```bash
# List all running QA sessions
tmux ls

# Watch a specific one
tmux attach -t qa-TKT-XXX
```

---

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/pipeline-runner.js` | Orchestrates full flow from dev_complete to closed |
| `scripts/launch-qa-agents.sh` | Launches QA agents with Playwright browser testing |
| `scripts/launch-agents.sh` | Launches Dev agents for initial ticket work |
| `scripts/auto-merge.js` | Merges completed tickets to main |

---

## Troubleshooting

### Agent seems stuck
```bash
# Check if Claude process is running
ps aux | grep claude

# Check CPU usage - if > 0%, it's working
ps -p $(pgrep -f "claude") -o pid,%cpu,etime
```

### View agent logs
```bash
# Find latest log
ls -t .agent-logs/qa-TKT-XXX-*.log | head -1

# Or check the tmux session directly
tmux attach -t qa-TKT-XXX
```

### Kill and restart an agent
```bash
tmux kill-session -t qa-TKT-XXX
./scripts/launch-qa-agents.sh TKT-XXX
```

---

## Dashboard API (runs on port 3456)

```bash
# Start if not running
node apps/pm-dashboard/server.js &

# Check it's up
curl http://localhost:3456/health
```


