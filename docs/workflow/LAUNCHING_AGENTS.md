# Launching Agents Guide

> **Last Updated:** 2025-12-07
> **Status:** ✅ Tested and Working

This guide covers how to launch dev and QA agents in parallel using the orchestration system.

---

## 🚀 Quick Start

### Prerequisites

1. **PM Dashboard running** (provides API for agent coordination):
   ```bash
   cd /path/to/Digital_greeter
   node docs/pm-dashboard-ui/server.js &
   ```
   Dashboard: http://localhost:3456

2. **tmux installed** (for background sessions):
   ```bash
   brew install tmux  # macOS
   ```

3. **Claude Code CLI installed** with OAuth authenticated:
   ```bash
   # Verify claude is installed and authenticated
   claude --version
   ```
   Note: Claude Code uses OAuth (stored in `~/.claude.json`), NOT an API key.

---

## 📦 Agent Types

| Agent | Script | Purpose |
|-------|--------|---------|
| **Dev Agent** | `scripts/launch-agents.sh` | Implements tickets |
| **QA Agent** | `scripts/launch-qa-agents.sh` | Tests completed tickets |
| **Orchestrator** | `scripts/orchestrate-agents.sh` | Launches dev agents in parallel with CPU/memory throttling |

---

## 🔧 Launching Dev Agents

### Single Agent
```bash
./scripts/launch-agents.sh TKT-065
```

### Multiple Agents (Sequential)
```bash
./scripts/launch-agents.sh TKT-001 TKT-002 TKT-003
```

### Parallel Orchestration (Recommended)
```bash
# Auto-detect tickets from dashboard, throttled by CPU/RAM
./scripts/orchestrate-agents.sh --auto

# Or specify tickets manually
./scripts/orchestrate-agents.sh TKT-001 TKT-002 TKT-003

# Limit max concurrent agents
./scripts/orchestrate-agents.sh --max 3 --auto

# Dry run (see what would launch)
./scripts/orchestrate-agents.sh --auto --dry-run
```

**Orchestrator Features:**
- Auto-detects max concurrent based on CPU cores and available RAM
- Monitors CPU (threshold: 70%) and memory (threshold: 2GB)
- Automatically queues stalled agents for retry
- Kills runaway vite/vitest processes
- Uses SQLite database for session tracking

---

## 🧪 Launching QA Agents

### Single QA Agent
```bash
./scripts/launch-qa-agents.sh TKT-007
```

### Multiple QA Agents
```bash
./scripts/launch-qa-agents.sh TKT-001 TKT-002 TKT-003
```

**QA agents:**
- Require a dev branch to exist (e.g., `agent/tkt-007-*`)
- Create isolated worktrees for testing
- Run with `--dangerously-skip-permissions` for full autonomy
- Use Playwright MCP for browser testing

---

## 📊 Monitoring Agents

### List Running Agents
```bash
# All tmux sessions
tmux ls

# Dev agents only
./scripts/launch-agents.sh --list

# QA agents only
./scripts/launch-qa-agents.sh --list
```

### Attach to Agent Session
```bash
# Dev agent
tmux attach -t agent-TKT-065

# QA agent
tmux attach -t qa-TKT-007

# Switch between sessions: Ctrl+B then s
```

### Check Database Sessions
```bash
sqlite3 data/workflow.db "SELECT id, ticket_id, agent_type, status FROM agent_sessions WHERE status = 'running';"
```

---

## 🛑 Stopping Agents

### Kill Specific Agent
```bash
./scripts/launch-agents.sh --kill TKT-065
./scripts/launch-qa-agents.sh --kill TKT-007
```

### Kill All Agents
```bash
./scripts/launch-agents.sh --kill-all
```

### Emergency Cleanup
```bash
# Kill all agent tmux sessions
tmux kill-server

# Clean up worktrees
./scripts/cleanup-agent-worktrees.sh

# Prune stale git worktree references
git worktree prune
```

---

## 🗂️ Worktree Management

Agents run in isolated git worktrees at:
```
../agent-worktrees/
├── TKT-065/           # Dev agent worktree
├── qa-TKT-007/        # QA agent worktree
└── ...
```

### List Worktrees
```bash
git worktree list
```

### Prune Stale Worktrees
```bash
git worktree prune
```

### Remove Specific Worktree
```bash
git worktree remove ../agent-worktrees/TKT-065 --force
```

---

## 🗄️ SQLite Database

The system uses SQLite for tracking agent sessions and tickets:
- **Database:** `data/workflow.db`
- **API:** `http://localhost:3456/api/v2/*`

### Key Tables
| Table | Purpose |
|-------|---------|
| `tickets` | All tickets with status |
| `agent_sessions` | Running/completed/blocked sessions |
| `file_locks` | Prevents file conflicts between agents |
| `features` | Documentation and test status |

### Useful Queries
```bash
# Check running sessions
sqlite3 data/workflow.db "SELECT * FROM agent_sessions WHERE status = 'running';"

# Check ticket status
sqlite3 data/workflow.db "SELECT id, status FROM tickets WHERE status = 'ready' LIMIT 10;"

# Check file locks
sqlite3 data/workflow.db "SELECT * FROM file_locks WHERE released_at IS NULL;"
```

---

## ⚠️ Troubleshooting

### Agent Won't Start

1. **Check if tmux session already exists:**
   ```bash
   tmux has-session -t agent-TKT-065 && echo "Already running"
   ```

2. **Check if worktree already exists:**
   ```bash
   git worktree list | grep TKT-065
   ```

3. **Prune stale worktrees:**
   ```bash
   git worktree prune
   ```

### Agent Stalled / No Output

1. **Check if Claude process is running:**
   ```bash
   ps aux | grep claude | grep -v grep
   ```

2. **Check tmux pane:**
   ```bash
   tmux attach -t agent-TKT-065
   ```

3. **Check database for stalled sessions:**
   ```bash
   curl -s http://localhost:3456/api/v2/agents?stalled=true | jq
   ```

### Dashboard Not Responding

1. **Restart the server:**
   ```bash
   pkill -f "node.*server.js"
   node docs/pm-dashboard-ui/server.js &
   ```

2. **Check if database module loaded:**
   ```bash
   # Should show "✅ Database module loaded"
   curl -s http://localhost:3456/api/data | jq '.dbAvailable'
   ```

---

## 🔄 Full Workflow Example

```bash
# 1. Start the dashboard
node docs/pm-dashboard-ui/server.js &

# 2. Check what's ready
curl -s http://localhost:3456/api/data | jq '.tickets.tickets | map(select(.status == "ready")) | length'

# 3. Launch dev agents in parallel (auto-throttled)
./scripts/orchestrate-agents.sh --auto

# 4. Monitor progress
tmux ls
sqlite3 data/workflow.db "SELECT ticket_id, status FROM agent_sessions ORDER BY started_at DESC LIMIT 5;"

# 5. When dev agents complete, launch QA
./scripts/launch-qa-agents.sh TKT-001 TKT-002

# 6. Check QA results
ls docs/agent-output/qa-results/
```

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `scripts/launch-agents.sh` | Launch dev agents |
| `scripts/launch-qa-agents.sh` | Launch QA agents |
| `scripts/orchestrate-agents.sh` | Parallel dev agent orchestration |
| `scripts/setup-agent-worktree.sh` | Create isolated worktrees |
| `scripts/agent-post-run.sh` | Cleanup after agent completes |
| `scripts/cleanup-agent-worktrees.sh` | Remove old worktrees |
| `docs/pm-dashboard-ui/server.js` | Dashboard server with API |
| `scripts/db/db.js` | SQLite database operations |
