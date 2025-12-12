# PM Dashboard - Modular Architecture

This is the modular refactoring of the PM Dashboard server.

## Quick Start

```bash
# Run the NEW modular server
cd docs/pm-dashboard-ui
npm run start:new

# Or run the original server (for backwards compatibility)
npm run start
```

## Architecture

```
docs/pm-dashboard-ui/
├── server.js              # Original monolithic server (4,800+ lines)
├── server-new.js          # NEW modular entry point (~150 lines)
├── automation-config.js   # Kill-switch for original server
├── package.json
│
└── src/
    ├── config.js          # Feature flags, limits, paths
    │
    ├── api/               # HTTP Layer (stateless)
    │   ├── index.js       # Express app setup
    │   └── routes/
    │       ├── tickets.js # Ticket CRUD + pipeline actions
    │       ├── jobs.js    # Job queue management
    │       ├── agents.js  # Agent session management
    │       ├── dashboard.js # Dashboard stats
    │       └── config.js  # Runtime configuration
    │
    ├── core/              # Business Logic
    │   ├── stateMachine.js    # Ticket state transitions
    │   ├── orchestrator.js    # Pipeline coordination
    │   └── scheduler.js       # Job queue with pause/resume
    │
    ├── services/          # External Interactions
    │   ├── agentLauncher.js   # Tmux session management
    │   └── regressionRunner.js # Test execution
    │
    ├── db/                # Data Access
    │   ├── index.js       # Re-exports from scripts/db/db.js
    │   └── migrations/
    │       └── 001-status-update.sql
    │
    └── events/            # Internal Communication
        └── eventBus.js    # Pub/sub for decoupling
```

## Key Features

### 1. Automation Kill-Switches

All automation is **OFF by default**. Enable via:

```bash
# Environment variables
AUTOMATION_ENABLED=true node server-new.js

# Or via API at runtime
curl -X POST http://localhost:3456/api/v2/config/automation/enable
```

### 2. Parallel Agent Limits

Hard caps on concurrent agents (default: 2 each):

```javascript
config.limits = {
  maxParallelDevAgents: 2,
  maxParallelQaAgents: 2,
  maxIterations: 5,
};
```

### 3. Explicit State Machine

Valid ticket transitions are enforced:

```
ready → in_progress → dev_complete → in_review → qa_pending
  → qa_approved → finalizing → ready_to_merge → merged
```

Invalid transitions are rejected with clear errors.

### 4. Manual Pipeline Control

Step through the pipeline manually:

```bash
# Launch dev agent for a ticket
curl -X POST http://localhost:3456/api/v2/tickets/TKT-001/launch

# Run regression tests
curl -X POST http://localhost:3456/api/v2/tickets/TKT-001/regression

# Launch QA agent
curl -X POST http://localhost:3456/api/v2/tickets/TKT-001/qa

# Start finalizing
curl -X POST http://localhost:3456/api/v2/tickets/TKT-001/finalize

# Mark ready to merge
curl -X POST http://localhost:3456/api/v2/tickets/TKT-001/ready-to-merge

# Complete merge
curl -X POST http://localhost:3456/api/v2/tickets/TKT-001/merge
```

### 5. Scheduler Controls

```bash
# Start processing jobs
curl -X POST http://localhost:3456/api/v2/jobs/start

# Pause (finish current, don't start new)
curl -X POST http://localhost:3456/api/v2/jobs/pause

# Resume
curl -X POST http://localhost:3456/api/v2/jobs/resume

# Stop
curl -X POST http://localhost:3456/api/v2/jobs/stop

# Process single job manually
curl -X POST http://localhost:3456/api/v2/jobs/process-one

# Clear all pending jobs
curl -X DELETE http://localhost:3456/api/v2/jobs/pending
```

## API Endpoints

### Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/tickets` | List tickets with filters |
| GET | `/api/v2/tickets/:id` | Get ticket + valid next states |
| POST | `/api/v2/tickets` | Create ticket |
| PUT | `/api/v2/tickets/:id` | Update ticket |
| POST | `/api/v2/tickets/:id/transition` | Change status (validated) |
| POST | `/api/v2/tickets/:id/launch` | Launch dev agent |
| POST | `/api/v2/tickets/:id/regression` | Run regression tests |
| POST | `/api/v2/tickets/:id/qa` | Launch QA agent |
| POST | `/api/v2/tickets/:id/finalize` | Start finalizing |
| POST | `/api/v2/tickets/:id/ready-to-merge` | Mark ready to merge |
| POST | `/api/v2/tickets/:id/merge` | Complete merge |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/jobs` | List jobs |
| GET | `/api/v2/jobs/status` | Get scheduler status |
| POST | `/api/v2/jobs` | Create job |
| POST | `/api/v2/jobs/start` | Start scheduler |
| POST | `/api/v2/jobs/stop` | Stop scheduler |
| POST | `/api/v2/jobs/pause` | Pause scheduler |
| POST | `/api/v2/jobs/resume` | Resume scheduler |
| POST | `/api/v2/jobs/process-one` | Process single job |
| DELETE | `/api/v2/jobs/pending` | Clear pending jobs |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/agents` | List running agents |
| GET | `/api/v2/agents/:ticketId` | Get agents for ticket |
| DELETE | `/api/v2/agents/:ticketId` | Kill agent |
| DELETE | `/api/v2/agents` | Kill all agents |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/config` | Get current config |
| PATCH | `/api/v2/config` | Update config |
| POST | `/api/v2/config/automation/enable` | Enable all automation |
| POST | `/api/v2/config/automation/disable` | Disable all automation |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/dashboard` | Get dashboard overview |
| GET | `/api/v2/dashboard/dev-status` | Get dev status overview |
| GET | `/api/v2/dashboard/pipeline` | Get pipeline status |

## Migration from Original Server

The original `server.js` is still available and working. To use the new modular server:

1. **Test first**: Run `npm run start:new` to test the new server
2. **Gradual migration**: Both servers can coexist during transition
3. **Kill-switches added**: The original server now has automation kill-switches via `automation-config.js`

## Database

The database (`data/workflow.db`) is now in `.gitignore` to prevent state loss on `git reset`.

To run the status migration:
```sql
-- Run from scripts/db/
sqlite3 ../../data/workflow.db < ../../docs/pm-dashboard-ui/src/db/migrations/001-status-update.sql
```
