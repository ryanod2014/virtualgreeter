# Pipeline Testing Runbook

## Quick Start

```bash
# 1. Start the server (with dashboard + automation)
cd /Users/ryanodonnell/projects/Digital_greeter/docs/pm-dashboard-ui
node server.js &

# 2. Open dashboard
open http://localhost:3456

# 3. Pick a test ticket and update whitelist
# Edit: docs/pm-dashboard-ui/automation-config.js
# Set: testTickets: ['TKT-XXX']

# 4. Restart server to pick up config change
pkill -f "node.*server" && sleep 2 && node server.js &

# 5. Clear old jobs/locks
sqlite3 data/workflow.db "DELETE FROM jobs; DELETE FROM file_locks;"

# 6. Launch the dev agent
./scripts/launch-agents.sh TKT-XXX

# 7. Monitor via dashboard or terminal
watch -n 10 'curl -s http://localhost:3456/api/v2/tickets | jq ".tickets[] | select(.id == \"TKT-XXX\") | {id, status}"'
```

---

## What Was Fixed (Dec 12, 2025)

### Problem
The `testTickets` whitelist in `automation-config.js` was documented but **never implemented** in `server.js`. All tickets were being processed, causing agent spam.

### Solution
Added whitelist checking to `server.js` in three places:
1. `handleTicketStatusChange()` - main automation handler
2. QA result file watcher - before processing QA PASS
3. Blocker file watcher - before processing blockers

Also added `/api/v2/data` endpoint to `server.js` so the dashboard works with automation.

### Files Changed
- `docs/pm-dashboard-ui/server.js` - Added whitelist checks + /api/v2/data endpoint
- `docs/pm-dashboard-ui/automation-config.js` - Already had testTickets, now it works

---

## Server Architecture

### Use `server.js` (NOT `server-new.mjs`)

| Feature | server.js | server-new.mjs |
|---------|-----------|----------------|
| Dashboard API (`/api/v2/data`) | ✅ YES (added) | ✅ YES |
| File watchers (detect completions) | ✅ YES | ❌ NO |
| Job worker (runs queued jobs) | ✅ YES | ❌ NO |
| Auto-queue next steps | ✅ YES | ❌ NO |
| Whitelist support | ✅ YES | ❌ NO |

**Always use `server.js` for testing automation.**

---

## Automation Config

File: `docs/pm-dashboard-ui/automation-config.js`

```javascript
const automationConfig = {
  enabled: true,                    // Master switch
  testTickets: ['TKT-XXX'],         // Whitelist - empty = all tickets
  autoQueueOnDevComplete: true,     // Dev done → queue regression
  autoQueueOnQaPass: true,          // QA pass → queue test+doc agents
  autoDispatchOnBlock: true,        // Failure → create continuation
  maxParallelDevAgents: 2,
  maxParallelQaAgents: 2,
  maxIterations: 5,                 // Max retries before blocking
};
```

### Whitelist Behavior
- Uses **prefix matching**: `['TKT-095']` matches TKT-095, TKT-095-V2, etc.
- Empty array `[]` = **all tickets** get automation
- Non-whitelisted tickets logged: `⏭️ Skipping TKT-XXX - not in whitelist`

---

## Expected Pipeline Flow

```
1. Dev Agent completes
   ↓ (server detects dev_complete, auto-queues regression)
   
2. Regression tests run
   ↓ (pass → status: unit_test_passed → auto-queues QA)
   
3. QA Agent runs
   ↓ (creates QA-TKT-XXX-PASSED.md or QA-TKT-XXX-FAILED.md)
   
4. Server detects QA result file
   ↓ (PASS → status: qa_approved → auto-queues Test+Doc agents)
   
5. Test Agent + Doc Agent run
   ↓ (both complete → status: merged)
   
6. DONE
```

On failure at any step:
- Server creates blocker file
- Dispatch agent creates continuation ticket (TKT-XXX-V2)
- Pipeline restarts for continuation
- After 5 iterations → status: blocked

---

## Phase 1: Single Ticket Test

### Goal
Verify one ticket goes through the full pipeline automatically.

### Steps

1. **Pick a test ticket**
   ```bash
   # Find easy ready tickets
   curl -s http://localhost:3456/api/v2/tickets | \
     jq '[.tickets[] | select(.status == "ready" and .difficulty == "easy")] | .[0:5] | .[].id'
   ```

2. **Update whitelist**
   ```bash
   # Edit automation-config.js
   testTickets: ['TKT-XXX'],
   ```

3. **Start fresh**
   ```bash
   # Kill everything
   pkill -f "node.*server" && tmux kill-server
   
   # Clear jobs and locks
   sqlite3 data/workflow.db "DELETE FROM jobs; DELETE FROM file_locks;"
   
   # Start server
   cd docs/pm-dashboard-ui && node server.js &
   ```

4. **Launch dev agent**
   ```bash
   ./scripts/launch-agents.sh TKT-XXX
   ```

5. **Monitor progress**
   ```bash
   # Terminal monitoring
   watch -n 10 'curl -s http://localhost:3456/api/v2/tickets | jq ".tickets[] | select(.id == \"TKT-XXX\")"'
   
   # Or use dashboard at http://localhost:3456
   ```

6. **Verify checkpoints**
   - [ ] Dev completes → status: `dev_complete`
   - [ ] Regression runs → status: `unit_test_passed`
   - [ ] QA runs → creates QA result file
   - [ ] QA passes → status: `qa_approved`
   - [ ] Test+Doc agents run → status: `finalizing`
   - [ ] All complete → status: `merged`

---

## Phase 2: Failure Path Test

### Goal
Verify the self-healing loop creates continuations correctly.

### Steps

1. Pick a ticket that's likely to fail (complex, or intentionally break something)
2. Watch for continuation creation
3. Verify:
   - [ ] Original ticket → `qa_failed` or `blocked`
   - [ ] Continuation TKT-XXX-V2 created
   - [ ] Continuation has `parent_ticket_id` set
   - [ ] Continuation has `iteration: 2`
   - [ ] After 5 failures → `blocked` status

---

## Phase 3: Parallel Test

### Goal
Verify multiple whitelisted tickets don't interfere.

### Steps

1. Add multiple tickets to whitelist:
   ```javascript
   testTickets: ['TKT-001', 'TKT-002', 'TKT-003'],
   ```

2. Launch all:
   ```bash
   ./scripts/launch-agents.sh TKT-001 TKT-002 TKT-003
   ```

3. Watch for:
   - [ ] No file lock conflicts
   - [ ] No race conditions in job queue
   - [ ] All tickets complete independently

---

## Troubleshooting

### Server not responding
```bash
# Check if running
ps aux | grep "node.*server" | grep -v grep

# Check logs
tail -50 /tmp/pm-server.log
```

### Dashboard stuck on "Loading"
```bash
# Test API directly
curl -s http://localhost:3456/api/v2/data | jq '.source'
# Should return: "database"
```

### Agents spawning for wrong tickets
```bash
# Check whitelist is loaded
grep "testTickets" docs/pm-dashboard-ui/automation-config.js

# Check server log for skipping messages
grep "Skipping" /tmp/pm-server.log
```

### Stale file locks
```bash
# Clear all locks
sqlite3 data/workflow.db "DELETE FROM file_locks;"
```

### Stale jobs
```bash
# Clear all jobs
sqlite3 data/workflow.db "DELETE FROM jobs;"
```

### Kill everything and start fresh
```bash
pkill -f "node.*server"
tmux kill-server
sqlite3 data/workflow.db "DELETE FROM jobs; DELETE FROM file_locks;"
cd docs/pm-dashboard-ui && node server.js &
```

---

## Good Test Tickets (Easy Difficulty)

As of Dec 12, 2025:
- TKT-093 - Fix Timezone Display for Pause End Date
- TKT-090 - Consolidate DEFAULT_WIDGET_SETTINGS
- TKT-088 - Add Warning for Empty Allowlist Mode
- TKT-078 - Add Logging for Malformed URL Routing Fallback
- TKT-005d - Send Email on Payment Failure

---

## API Quick Reference

```bash
# Get ticket status
curl -s http://localhost:3456/api/v2/tickets/TKT-XXX | jq

# List all tickets
curl -s http://localhost:3456/api/v2/tickets | jq '.count'

# Get jobs for ticket
curl -s http://localhost:3456/api/v2/jobs | jq '[.jobs[] | select(.ticket_id == "TKT-XXX")]'

# Get running agents
curl -s http://localhost:3456/api/v2/agents | jq '[.sessions[] | select(.status == "running")]'

# Get file locks
curl -s http://localhost:3456/api/v2/locks | jq '.locks'

# Dashboard data
curl -s http://localhost:3456/api/v2/data | jq '{source, dbAvailable, ticketCount: .tickets.tickets | length}'
```

---

## Session from Dec 12, 2025

### What was tested
- TKT-072 (documentation fix) - Partially tested, QA ran but Test+Doc agents skipped because we used server-new.mjs
- TKT-093 - Started but computer died

### What's ready
- server.js has whitelist support + /api/v2/data endpoint
- automation-config.js has testTickets: ['TKT-093']
- All changes committed and pushed to main

### To resume
1. Start server.js
2. Launch TKT-093 (or pick new ticket)
3. Monitor full pipeline flow

