# Workflow Database

SQLite database for agent workflow state management, replacing the JSON-based system.

## Quick Start

```bash
# Install dependencies
cd scripts/db
npm install

# Initialize database (creates schema)
npm run init

# Migrate existing JSON data
npm run migrate
```

## Database Location

The SQLite database file is at: `data/workflow.db`

## API Endpoints

Once the dashboard server is running (`node docs/pm-dashboard-ui/server.js`), the v2 API is available:

### Tickets
- `GET /api/v2/tickets` - List tickets (with ?status=ready, ?priority=high filters)
- `GET /api/v2/tickets/TKT-001` - Get single ticket
- `POST /api/v2/tickets` - Create ticket
- `PUT /api/v2/tickets/TKT-001` - Update ticket

### Findings
- `GET /api/v2/findings` - List findings (with ?status=inbox, ?severity=high filters)
- `POST /api/v2/findings` - Create finding
- `PUT /api/v2/findings/F-001` - Update finding

### Agent Sessions
- `GET /api/v2/agents` - List sessions (with ?running=true, ?stalled=true)
- `POST /api/v2/agents/start` - Register new session
- `POST /api/v2/agents/:id/heartbeat` - Update heartbeat
- `POST /api/v2/agents/:id/complete` - Mark complete
- `POST /api/v2/agents/:id/block` - Mark blocked

### Locks
- `GET /api/v2/locks` - Get active file locks
- `POST /api/v2/locks/acquire` - Acquire locks
- `POST /api/v2/locks/release` - Release locks

### Dashboard
- `GET /api/v2/dashboard` - Get all dashboard data
- `GET /api/v2/batch?max=3` - Get conflict-free ticket batch

## Agent CLI

Agents can use the CLI tool instead of direct API calls:

```bash
# Session management
./scripts/agent-cli.sh start --ticket TKT-006 --type dev
./scripts/agent-cli.sh heartbeat --session <SESSION_ID>
./scripts/agent-cli.sh complete --session <SESSION_ID> --report path/to/report.md
./scripts/agent-cli.sh block --session <SESSION_ID> --reason "Need clarification"

# Findings
./scripts/agent-cli.sh add-finding --title "Bug" --severity high --description "..."

# Tickets
./scripts/agent-cli.sh list-tickets --status ready
./scripts/agent-cli.sh get-ticket TKT-006
./scripts/agent-cli.sh update-ticket TKT-006 --status in_progress

# Status
./scripts/agent-cli.sh status
./scripts/agent-cli.sh check-locks
```

## Schema

See `schema.sql` for the full database schema. Key tables:

- `tickets` - Ticket definitions and status
- `findings` - Review findings (staging and inbox)
- `decision_threads` / `decision_messages` - Human decisions
- `agent_sessions` - Track running/completed/crashed agents
- `file_locks` - Prevent file conflicts between agents
- `features` - Feature documentation status
- `unit_test_runs` - Regression test results
- `events` - Audit log

## Backward Compatibility

The dashboard supports both JSON and database sources:
- `GET /api/data` - Returns JSON data (legacy, default)
- `GET /api/data?source=db` - Returns database data (new)
- `GET /api/v2/*` - Always uses database

## Direct Database Access

For debugging:

```bash
# Open SQLite CLI
sqlite3 data/workflow.db

# Example queries
.tables
SELECT * FROM tickets WHERE status = 'ready';
SELECT * FROM agent_sessions WHERE status = 'running';
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;
```

## Files

- `schema.sql` - Database schema definition
- `db.js` - Database operations module (ES module)
- `init-db.js` - Initialize database script
- `migrate-from-json.js` - Migration script
- `package.json` - Dependencies (better-sqlite3, uuid)
