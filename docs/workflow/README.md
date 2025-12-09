# Agent Workflow Hub

> **Current Phase:** Ready for Dev Sprint
> **Status:** Documentation ✅ → Review ✅ → Tickets ✅ → **Dev Ready**

---

## 🚀 Launch Agents NOW

**See [LAUNCHING_AGENTS.md](./LAUNCHING_AGENTS.md) for complete operational guide.**

```bash
# Start dashboard (required for API)
node docs/pm-dashboard-ui/server.js &

# Launch all ready dev agents in parallel (CPU/RAM throttled)
./scripts/orchestrate-agents.sh --auto

# Or launch specific agents
./scripts/launch-agents.sh TKT-001 TKT-002

# Launch QA agents
./scripts/launch-qa-agents.sh TKT-001

# Monitor
tmux ls
```

---

## 📋 Quick Start

### Core Agents

| Agent | Purpose | Launch Command |
|-------|---------|----------------|
| **Dispatch** | Route blockers, create tickets, answer questions | `You are a Dispatch Agent. Read docs/workflow/DISPATCH_AGENT_SOP.md then execute.` |
| **Triage** | Filter/dedupe raw findings before inbox | `You are a Triage Agent. Read docs/workflow/TRIAGE_AGENT_SOP.md then execute.` |
| **Dev** | Implement tickets | `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-[ID].md` |
| **Review** | Audit feature documentation | `You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-[ID].md` |
| **Doc** | Document features | `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[ID].md` |
| **Test Lock** | Lock test baselines for features | `You are a Test Lock Agent. Read docs/workflow/TEST_LOCK_AGENT_SOP.md then execute: docs/prompts/active/test-lock-[ID].md` |

### PM Workflows

**Dev Sprint Mode:**
```
You are the PM. Read and execute docs/workflow/PM_DEV_SOP.md
```

**Doc/Review Mode:**
```
You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md
```

---

## 📁 Workflow Files

```
docs/
├── workflow/
│   ├── README.md                ← You are here
│   ├── DISPATCH_AGENT_SOP.md    ← 🆕 Route blockers, create tickets
│   ├── TRIAGE_AGENT_SOP.md      ← 🆕 Dedup/validate raw findings
│   ├── PM_DEV_SOP.md            ← PM workflow for dev sprints
│   ├── PM_DOCS_SOP.md           ← PM workflow for doc/review sprints
│   ├── DEV_AGENT_SOP.md         ← Dev agent instructions
│   ├── DOC_AGENT_SOP.md         ← Doc agent instructions
│   ├── REVIEW_AGENT_SOP.md      ← Review agent instructions
│   ├── TEST_LOCK_AGENT_SOP.md   ← Test lock agent instructions
│   ├── REGRESSION_HANDLING.md   ← How to handle CI failures
│   └── templates/
│       ├── ticket-schema.json   ← Required ticket fields (v2)
│       ├── dev-ticket.md        ← Ticket creation template
│       ├── doc-agent.md         ← Doc agent prompt template
│       ├── review-agent.md      ← Review agent prompt template
│       ├── test-lock-agent.md   ← Test lock agent template
│       └── redoc-agent.md       ← Re-documentation agent template
│
├── data/
│   ├── tickets.json             ← All tickets (source of truth)
│   ├── findings-staging.json    ← Raw findings pending triage
│   ├── findings.json            ← INBOX - triaged findings for human review
│   ├── findings-processed.json  ← Audit trail of rejected/merged findings
│   ├── decisions.json           ← Human decisions
│   ├── dev-status.json          ← Dev pipeline status
│   ├── doc-status.json          ← Documentation freshness tracking
│   └── .agent-credentials.json  ← Service logins & API keys (gitignored)
│
├── agent-output/
│   ├── started/                 ← Dev agent start signals + file locks
│   ├── completions/             ← Dev agent completion reports
│   ├── blocked/                 ← Blocker files (CI, clarification, env)
│   ├── findings/                ← Dev agent out-of-scope findings
│   ├── reviews/                 ← Review agent outputs
│   ├── test-lock/               ← Test lock agent outputs
│   └── archive/                 ← Processed blockers/outputs
│
└── prompts/
    ├── active/                  ← Active agent prompts
    │   ├── dispatch-agent.md    ← 🆕 Dispatch agent prompt
    │   ├── triage-agent.md      ← 🆕 Triage agent prompt
    │   ├── dev-agent-*.md
    │   ├── review-agent-*.md
    │   └── test-lock-*.md
    └── archive/                 ← Completed prompts
```

---

## 🔄 Agent Pipeline

```
                                    ┌─────────────────┐
                                    │   Review Agent  │
                                    │ (audits docs)   │
                                    └────────┬────────┘
                                             │ raw findings
                                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         STAGING QUEUE                                │
│                    docs/data/findings-staging.json                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                      ┌──────────────────┐
                      │   Triage Agent   │
                      │ (dedup, filter)  │
                      └────────┬─────────┘
                               │ promoted findings
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            INBOX                                     │
│                     docs/data/findings.json                          │
│                    (Human reviews here)                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ human decisions
                                 ▼
                      ┌──────────────────┐
                      │  Dispatch Agent  │
                      │ (creates tickets)│
                      └────────┬─────────┘
                               │ tickets
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         TICKET QUEUE                                 │
│                     docs/data/tickets.json                           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │   Dev Agent    │
                        │ (implements)   │
                        └───────┬────────┘
                                │ completes/blocks
                        ┌───────┴───────┐
                        ▼               ▼
              ┌──────────────┐   ┌─────────────┐
              │  Completed   │   │   Blocked   │
              │  (review)    │   │   Queue     │
              └──────────────┘   └──────┬──────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  Dispatch Agent │
                              │ (routes/resolves│
                              │  blockers)      │
                              └─────────────────┘
```

---

## 🚧 Blocker Types

| Prefix | Type | Auto-Handled? | Description |
|--------|------|---------------|-------------|
| `CI-TKT-*` | CI Failure | ✅ Yes (if clear regression) | Tests failed on agent branch |
| `BLOCKED-TKT-*` | Clarification | ❌ No (needs human) | Agent has a question |
| `ENV-TKT-*` | Environment | ❌ No (needs human) | Infra/credentials issue |

**Dispatch Agent routes blockers:**
- Clear regressions → Auto-create continuation ticket
- Ambiguous → Route to inbox for human decision
- Clarifications → Always to inbox

---

## 📊 Current Status

### Tickets Ready for Dev

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 7 | Ready |
| 🟠 High | 19 | Ready |
| 🟡 Medium | 3 | Ready |
| 🟢 Low | 2 | Ready |
| **Total** | **40** | **Ready** |

---

## 🛠️ Dev Workflow Details

### Ticket Quality (v2 Schema)

All tickets now include:
- ✅ `feature_docs` — Links to relevant documentation
- ✅ `similar_code` — Patterns to follow
- ✅ `out_of_scope` — What NOT to do
- ✅ `dev_checks` — Quick verification steps
- ✅ `qa_notes` — Context for QA agent

### When Agents Get Blocked

1. Agent writes blocker to `docs/agent-output/blocked/[TYPE]-TKT-XXX-[TIMESTAMP].json`

2. **Dispatch Agent** runs and:
   - CI failures with clear regressions → auto-creates continuation ticket
   - Unclear/clarification blockers → routes to inbox for human

3. Human reviews (if needed) and provides decision

4. Dispatch Agent creates continuation ticket with context

5. Dev Agent resumes work

### Pipeline Order (Post-Dev)

After a dev agent completes a ticket:

```
Dev Completes Ticket
       ↓
PM Reviews Completion Report
       ↓
Run Regression Tests (dashboard)
       ↓
If regressions → Dispatch Agent creates fix ticket
       ↓
If passed → Human Reviews & Merges to main
       ↓
PM marks affected docs as "needs_redoc"
       ↓
Doc Agent re-documents (reads CODE, not summary)
```

### Branch Strategy

```
main (production)
  ├── agent/TKT-001-cobrowse-sanitization
  ├── agent/TKT-006-middleware-redirect
  └── agent/TKT-019-incoming-call-countdown
```

- Agents create branches: `agent/TKT-XXX-description`
- Human merges to main after QA approval

---

## 📝 Key Files Reference

| File | Purpose | Who Updates |
|------|---------|-------------|
| `docs/data/tickets.json` | All tickets (source of truth) | Dispatch Agent |
| `docs/data/findings-staging.json` | Raw findings pending triage | Review/Dev Agents |
| `docs/data/findings.json` | INBOX - triaged findings | Triage Agent |
| `docs/data/findings-processed.json` | Audit trail of rejected/merged | Triage Agent |
| `docs/data/decisions.json` | Human decisions on findings | Human / Dispatch Agent |
| `docs/data/dev-status.json` | Dev pipeline status | Dashboard / Agents |
| `docs/data/doc-status.json` | Documentation freshness tracking | PM |
| `docs/agent-output/blocked/` | Blocker files (CI, clarification, env) | Dev Agents / CI |
| `docs/agent-output/completions/` | Dev agent completion reports | Dev Agents |

---

## 🗄️ Archived Workflows

Previous workflow versions are in:
```
docs/workflow/archive/
```

These include the original PM Agent, Cleanup Agent, and other deprecated SOPs.
