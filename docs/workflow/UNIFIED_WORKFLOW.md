# Unified Workflow (DB-Only)

> **Version:** 2.0 - Database-First Architecture
> **Status:** ✅ Active
> **Last Updated:** 2025-12-12

---

## 🔑 Key Principles

1. **ALL data lives in SQLite** - No JSON files for workflow state
2. **Agents use CLI only** - Never read/write JSON files directly
3. **Merges are automated** - Not an agent's responsibility
4. **Pipeline is event-driven** - Each step triggers the next

---

## 📊 The Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              TICKET LIFECYCLE                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────┐    ┌────────────┐    ┌─────────────┐    ┌───────────┐    ┌─────────┐ │
│  │  draft   │───▶│   ready    │───▶│ in_progress │───▶│dev_complete│───▶│ TESTS   │ │
│  └──────────┘    └────────────┘    └─────────────┘    └───────────┘    └────┬────┘ │
│       ▲              ▲                   ▲                                  │      │
│       │              │                   │                                  ▼      │
│   (manual)      (dispatch)          (dev_agent)                    ┌──────────────┐│
│                                                                    │unit_test_pass││
│                                                                    └───────┬──────┘│
│                                                                            │       │
│  ┌───────────────────────────────────────────────────────────────────────┘        │
│  │                                                                                 │
│  ▼                                                                                 │
│  ┌───────────┐    ┌───────────┐    ┌──────────────┐    ┌────────────┐    ┌──────┐│
│  │ qa_pending│───▶│ qa_passed │───▶│test_lock_pend│───▶│ doc_pending│───▶│MERGED││
│  └───────────┘    └───────────┘    └──────────────┘    └────────────┘    └──────┘│
│       │                │                  │                  │              ▲      │
│       ▼                │                  │                  │              │      │
│  ┌───────────┐         └──────────────────┴──────────────────┴──────────────┘      │
│  │ qa_failed │                                                                      │
│  └─────┬─────┘                                                                      │
│        │                                                                            │
│        └──────────────▶ (create continuation ticket)                               │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Agent CLI Commands (Use These, Not JSON!)

### Session Management

```bash
# Start a session (FIRST THING every agent does)
export AGENT_SESSION_ID=$(./scripts/agent-cli.sh start --ticket TKT-001 --type dev)

# Send heartbeat (every 10 minutes)
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID

# Mark complete
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report /path/to/report.md

# Report blocked
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "Need clarification" --type clarification
```

### Ticket Operations

```bash
# Get a ticket
./scripts/agent-cli.sh get-ticket TKT-001

# List tickets by status
./scripts/agent-cli.sh list-tickets --status ready

# Update ticket status (agents should rarely need this - pipeline handles it)
./scripts/agent-cli.sh update-ticket TKT-001 --status dev_complete
```

### Findings

```bash
# Add a finding (issues discovered outside scope)
./scripts/agent-cli.sh add-finding \
  --title "Pre-existing type error" \
  --severity high \
  --description "Type error on line 42 in utils.ts" \
  --file apps/dashboard/src/utils.ts
```

### File Locks

```bash
# Check what files are locked
./scripts/agent-cli.sh check-locks

# Acquire locks (done automatically by orchestrator)
./scripts/agent-cli.sh acquire-locks --session $AGENT_SESSION_ID file1.ts file2.ts

# Release locks (done automatically on session complete)
./scripts/agent-cli.sh release-locks --session $AGENT_SESSION_ID
```

---

## 🤖 Agent Responsibilities

### Dev Agent

**Reads:** Ticket spec from DB via CLI
**Writes:** Code changes, completion report
**Triggers:** `dev_complete` status (pipeline takes over)

```bash
# On completion, just update status
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report docs/agent-output/completions/TKT-001.md
./scripts/agent-cli.sh update-ticket TKT-001 --status dev_complete
```

**Does NOT:**
- Run unit tests (pipeline does this)
- Launch QA (pipeline does this)
- Merge anything (pipeline does this)
- Write to JSON files

### QA Agent

**Reads:** Ticket spec, dev completion report
**Writes:** QA report (pass/fail)
**Triggers:** `qa_passed` or `qa_failed` status

```bash
# On pass
./scripts/agent-cli.sh update-ticket TKT-001 --status qa_passed

# On fail
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "AC3 failed" --type qa_failure
./scripts/agent-cli.sh update-ticket TKT-001 --status qa_failed
```

**Does NOT:**
- Create continuation tickets (Dispatch does this)
- Merge anything (pipeline does this)

### Test Lock Agent

**Reads:** Ticket spec, code changes
**Writes:** Baseline test expectations
**Triggers:** `test_lock_done` status

### Doc Agent

**Reads:** Code changes via git diff
**Writes:** Updated documentation
**Triggers:** `doc_done` status → ready_to_merge

---

## ⚙️ Pipeline Runner (Automated)

The Pipeline Runner handles all transitions automatically:

```bash
# Process all pending tickets through the pipeline
node scripts/pipeline-runner.js

# Process specific ticket
node scripts/pipeline-runner.js --ticket TKT-001

# Handle specific event
node scripts/pipeline-runner.js --event dev_complete TKT-001

# Run as daemon (watch mode)
node scripts/pipeline-runner.js --watch
```

### What It Does

| Ticket Status | Pipeline Action |
|---------------|-----------------|
| `dev_complete` | Run unit tests automatically |
| `unit_test_passed` | Launch QA agent |
| `unit_test_failed` | Create continuation ticket |
| `qa_passed` | Check if needs doc/test-lock, or merge |
| `qa_failed` | Create continuation ticket |
| `test_lock_done` | Check if needs doc, or merge |
| `doc_done` | Mark ready to merge |
| `ready_to_merge` | Run auto-merge script |

---

## 🔀 Auto-Merge (Automated)

Merge is **NEVER** an agent's job. It runs automatically:

```bash
# Merge all ready tickets
node scripts/auto-merge.js

# Merge specific ticket
node scripts/auto-merge.js --ticket TKT-001

# Dry run (see what would merge)
node scripts/auto-merge.js --dry-run
```

### Merge Flow

1. Pipeline Runner advances ticket to `ready_to_merge`
2. Auto-Merge script runs
3. Uses **selective file checkout** (not `git merge`)
4. Updates ticket status to `merged`
5. Logs event to database

---

## 🚀 Launch Commands

### Start Everything

```bash
# 1. Start the dashboard (provides API)
node docs/pm-dashboard-ui/server.js &

# 2. Start pipeline runner in watch mode
node scripts/pipeline-runner.js --watch &

# 3. Launch dev agents (orchestrator handles the rest)
./scripts/orchestrate-agents.sh --auto
```

### Monitor

```bash
# Check running agents
./scripts/agent-cli.sh status

# Check ticket pipeline
./scripts/agent-cli.sh list-tickets --status in_progress
./scripts/agent-cli.sh list-tickets --status qa_pending
./scripts/agent-cli.sh list-tickets --status ready_to_merge

# View recent events
./scripts/agent-cli.sh events --limit 20
```

---

## 📁 Data Storage

### SQLite Database (Source of Truth)

**Location:** `data/workflow.db`

| Table | Purpose |
|-------|---------|
| `tickets` | All tickets with status |
| `findings` | Findings from agents (staging → inbox → ticketed) |
| `decision_threads` | Human decisions on blockers |
| `agent_sessions` | Running/completed/blocked sessions |
| `file_locks` | Prevents file conflicts |
| `unit_test_runs` | Test results per ticket |
| `events` | Audit log |
| `jobs` | Background job queue |

### JSON Files (DEPRECATED)

**Do NOT use these for workflow state:**

- ~~`docs/data/tickets.json`~~ → Use CLI: `./scripts/agent-cli.sh list-tickets`
- ~~`docs/data/findings.json`~~ → Use CLI: `./scripts/agent-cli.sh list-findings`
- ~~`docs/data/decisions.json`~~ → Use API: `/api/v2/decisions`
- ~~`docs/data/dev-status.json`~~ → Use DB: `agent_sessions` table
- ~~`docs/agent-output/started/*.json`~~ → Use CLI: `./scripts/agent-cli.sh start`

### Output Files (Still Used for Reports)

These are still written by agents for human review:

```
docs/agent-output/
├── completions/        # Dev agent reports (markdown)
├── qa-results/         # QA agent reports (markdown)
├── qa-screenshots/     # QA visual evidence
└── archive/            # Processed outputs
```

---

## 🔄 Status Reference

| Status | Set By | Next Status | Trigger |
|--------|--------|-------------|---------|
| `draft` | Human | `ready` | Human approval |
| `ready` | Human/Dispatch | `in_progress` | Agent starts |
| `in_progress` | Agent | `dev_complete` | Agent completes |
| `dev_complete` | Agent | `unit_test_passed` | Pipeline: run tests |
| `unit_test_passed` | Pipeline | `qa_pending` | Pipeline: launch QA |
| `unit_test_failed` | Pipeline | `ready` (new ticket) | Pipeline: continuation |
| `qa_pending` | Pipeline | `qa_passed` | QA agent passes |
| `qa_passed` | QA Agent | `ready_to_merge` or `test_lock_pending` | Pipeline: check gates |
| `qa_failed` | QA Agent | `ready` (new ticket) | Pipeline: continuation |
| `test_lock_pending` | Pipeline | `test_lock_done` | Test-lock agent |
| `test_lock_done` | Agent | `doc_pending` or `ready_to_merge` | Pipeline |
| `doc_pending` | Pipeline | `ready_to_merge` | Doc agent |
| `ready_to_merge` | Pipeline | `merged` | Auto-merge script |
| `merged` | Auto-merge | (end) | — |

---

## ⚠️ Migration from JSON

If you have existing JSON files, migrate them:

```bash
# Run the migration script
node scripts/db/migrate-from-json.js

# Verify data
sqlite3 data/workflow.db "SELECT id, status FROM tickets LIMIT 5;"

# After verification, archive (don't delete) the JSON files
mkdir -p docs/data/archive
mv docs/data/*.json docs/data/archive/
```

---

## 🎯 Quick Reference

**Agent starting work:**
```bash
export AGENT_SESSION_ID=$(./scripts/agent-cli.sh start --ticket TKT-001 --type dev)
```

**Agent completing work:**
```bash
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report /path/report.md
./scripts/agent-cli.sh update-ticket TKT-001 --status dev_complete
```

**Agent reporting issue:**
```bash
./scripts/agent-cli.sh add-finding --title "Bug found" --severity high --description "..."
```

**Agent getting blocked:**
```bash
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "Need clarification" --type clarification
```

**Check pipeline status:**
```bash
node scripts/pipeline-runner.js  # Process pending
```

**Force merge a ticket:**
```bash
node scripts/auto-merge.js --ticket TKT-001
```



