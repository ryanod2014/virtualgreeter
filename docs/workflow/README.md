# Agent Workflow Hub

> **Version:** 2.0 (Database-Driven)
> **Status:** All agents use CLI for database operations. No JSON files.

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌─────────────┐    ┌──────────────┐                   │
│  │ All Tickets  │───▶│ Batch Select│───▶│  DEV AGENT   │                   │
│  │   (ready)    │    │(no conflicts)│   │              │                   │
│  └──────────────┘    └─────────────┘    └──────┬───────┘                   │
│         ▲                                      │                            │
│         │                               ┌──────┴──────┐                     │
│         │                               ▼             ▼                     │
│         │                          [Pass]        [Blocker]                  │
│         │                               │             │                     │
│         │                               ▼             ▼                     │
│         │                        ┌──────────────┐  ┌────────────────┐       │
│         │                        │  QA AGENT    │  │ TICKET AGENT   │       │
│         │                        └──────┬───────┘  │(continuation)  │       │
│         │                               │          └───────┬────────┘       │
│         │                        ┌──────┴──────┐           │                │
│         │                        ▼             ▼           │                │
│         │                   [Pass]        [Blocker]        │                │
│         │                        │             │           │                │
│         │                        │             └───────────┤                │
│         │                        ▼                         │                │
│         │              ┌─────────────────────┐             │                │
│         │              │ DOCS + TESTS AGENTS │             │                │
│         │              │   (same branch)     │             │                │
│         │              └─────────┬───────────┘             │                │
│         │                        │                         │                │
│         │                        ▼                         │                │
│         │              ┌─────────────────┐                 │                │
│         │              │  AUTO-MERGE     │                 │                │
│         │              │ (selective)     │                 │                │
│         │              └────────┬────────┘                 │                │
│         │                       │                          │                │
│         │                       ▼                          │                │
│         │              ┌─────────────────┐                 │                │
│         │              │  REVIEW AGENT   │                 │                │
│         │              │(audits changes) │                 │                │
│         │              └────────┬────────┘                 │                │
│         │                       │ findings                 │                │
│         │                       ▼                          │                │
│         │              ┌─────────────────┐                 │                │
│         │              │  TRIAGE AGENT   │                 │                │
│         │              │ (top 5 to inbox)│                 │                │
│         │              └────────┬────────┘                 │                │
│         │                       │                          │                │
│         │                       ▼                          │                │
│         │              ┌─────────────────┐                 │                │
│         │              │     INBOX       │◀────────────────┤                │
│         │              │ (human review)  │                 │                │
│         │              └────────┬────────┘                 │                │
│         │                       │                          │                │
│         │                       ▼                          │                │
│         │              ┌─────────────────┐                 │                │
│         │              │  INBOX AGENT    │                 │                │
│         │              │ (answers Qs)    │                 │                │
│         │              └────────┬────────┘                 │                │
│         │                       │                          │                │
│         │                       ▼                          │                │
│         │              ┌─────────────────┐                 │                │
│         │              │  TICKET AGENT   │─────────────────┘                │
│         │              │ (creates ticket)│                                  │
│         │              └────────┬────────┘                                  │
│         │                       │                                           │
│         └───────────────────────┘                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Roster

| Agent | Purpose | SOP | Trigger |
|-------|---------|-----|---------|
| **Dev Agent** | Implement tickets | [DEV_AGENT_SOP.md](./DEV_AGENT_SOP.md) | Ticket assigned |
| **QA Agent** | Test implementations | [QA_REVIEW_AGENT_SOP.md](./QA_REVIEW_AGENT_SOP.md) | Dev complete |
| **Docs Agent** | Document changes | [DOC_AGENT_SOP.md](./DOC_AGENT_SOP.md) | QA passed |
| **Tests Agent** | Write unit tests | [TEST_LOCK_AGENT_SOP.md](./TEST_LOCK_AGENT_SOP.md) | QA passed |
| **Review Agent** | Audit merged code | [REVIEW_AGENT_SOP.md](./REVIEW_AGENT_SOP.md) | After merge |
| **Triage Agent** | Filter findings | [TRIAGE_AGENT_SOP.md](./TRIAGE_AGENT_SOP.md) | Findings added |
| **Inbox Agent** | Answer human questions | [INBOX_AGENT_SOP.md](./INBOX_AGENT_SOP.md) | Human responds |
| **Ticket Agent** | Create tickets | [TICKET_AGENT_SOP.md](./TICKET_AGENT_SOP.md) | Decision made |

---

## Quick Commands

### Launch Agents

```bash
# Start dashboard (required for API)
node docs/pm-dashboard-ui/server.js &

# Start pipeline runner (daemon)
node scripts/pipeline-runner.js --watch &

# Launch dev agents
./scripts/launch-agents.sh TKT-001 TKT-002

# Launch QA agents
./scripts/launch-qa-agents.sh TKT-001

# Launch inbox agent for specific finding
./scripts/launch-inbox-agent.sh F-042

# Monitor agents
./scripts/agent-cli.sh status
```

### CLI Reference

```bash
# Session management
./scripts/agent-cli.sh start --ticket TKT-XXX --type dev
./scripts/agent-cli.sh heartbeat
./scripts/agent-cli.sh complete --report path/to/report.md
./scripts/agent-cli.sh block --reason "..." --type clarification

# Ticket operations
./scripts/agent-cli.sh get-ticket TKT-XXX
./scripts/agent-cli.sh list-tickets --status ready
./scripts/agent-cli.sh update-ticket TKT-XXX --status dev_complete
./scripts/agent-cli.sh create-ticket --title "..." --priority high

# Findings
./scripts/agent-cli.sh add-finding --title "Bug" --severity high
./scripts/agent-cli.sh list-findings --status inbox

# Inbox/decisions
./scripts/agent-cli.sh generate-inbox-prompt F-042
./scripts/agent-cli.sh resolve-thread THREAD-123 --decision create_ticket

# Status
./scripts/agent-cli.sh status
./scripts/agent-cli.sh events
./scripts/agent-cli.sh check-locks
```

---

## Key Concepts

### Database-Driven (No JSON Files)

All workflow state is stored in SQLite database (`scripts/db/workflow.db`).
Agents interact via CLI commands, not by editing JSON files.

### Pipeline Runner

`scripts/pipeline-runner.js` automatically:
- Advances tickets through status states
- Launches next agents when conditions are met
- Handles failures by routing to Ticket Agent

### Ticket Statuses

```
draft → ready → in_progress → dev_complete → 
qa_pending → qa_passed → docs_tests_pending → docs_tests_complete → 
merged → review_pending → closed
```

### Blocker Types

| Type | Description | Handled By |
|------|-------------|------------|
| `clarification` | Need human decision | Inbox Agent → Human |
| `environment` | pnpm fails, pre-existing bugs | Human fix |
| `external_setup` | Need API keys, accounts | Human setup |
| `qa_failure` | QA tests failed | Ticket Agent (auto) |
| `regression_failure` | Unit tests failed | Ticket Agent (auto) |

---

## File Structure

```
docs/
├── workflow/
│   ├── README.md              ← You are here
│   ├── DEV_AGENT_SOP.md
│   ├── QA_REVIEW_AGENT_SOP.md
│   ├── INBOX_AGENT_SOP.md     ← NEW
│   ├── TICKET_AGENT_SOP.md    ← NEW
│   ├── TRIAGE_AGENT_SOP.md
│   ├── REVIEW_AGENT_SOP.md
│   ├── DOC_AGENT_SOP.md
│   ├── TEST_LOCK_AGENT_SOP.md
│   └── archive/               ← Old SOPs (Dispatch, etc.)
│
├── prompts/
│   └── active/                ← Agent prompt files
│       ├── dev-agent-TKT-XXX.md
│       ├── inbox-agent-F-XXX.md
│       └── ...
│
├── agent-output/
│   ├── completions/           ← Dev completion reports
│   ├── qa-results/            ← QA reports + screenshots
│   ├── qa-screenshots/        ← QA evidence
│   └── archive/               ← Processed outputs
│
└── pm-dashboard-ui/           ← Dashboard server + UI

scripts/
├── agent-cli.sh               ← CLI wrapper
├── agent-cli.js               ← CLI backend
├── ticket-agent-cli.js        ← Ticket creation + prompts
├── pipeline-runner.js         ← Pipeline orchestration
├── auto-merge.js              ← Selective merge
├── launch-inbox-agent.sh      ← Launch per-thread inbox
├── launch-agents.sh           ← Launch dev agents
├── launch-qa-agents.sh        ← Launch QA agents
└── db/
    ├── db.js                  ← Database module
    ├── schema.sql             ← DB schema
    └── workflow.db            ← SQLite database
```

---

## PM Dashboard

**URL:** http://localhost:3456

**Features:**
- View all tickets, findings, agents
- Respond to inbox items
- Monitor pipeline status
- Trigger agent launches

---

## Archived Workflows

Previous versions (JSON-based, Dispatch Agent, etc.) are in:
```
docs/workflow/archive/
```
