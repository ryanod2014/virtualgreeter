# Agent Workflow Hub

> **Current Phase:** Ready for Dev Sprint
> **Status:** Documentation ✅ → Review ✅ → Tickets ✅ → **Dev Ready**

---

## 🚀 Quick Start

### Dev Workflow (Active)

**Launch PM (Dev Mode):**
```
You are the PM. Read and execute docs/workflow/PM_DEV_SOP.md
```

**Launch Dev Agent:**
```
You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-[ID].md
```

### Documentation/Review Workflow

**Launch PM (Doc/Review Mode):**
```
You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md
```

**Launch Doc Agent:**
```
You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[ID].md
```

**Launch Review Agent:**
```
You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-[ID].md
```

**Launch Cleanup Agent:** (NEW - runs before human reviews findings)
```
You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then execute.
```

---

## 📁 Workflow Files

```
docs/
├── workflow/
│   ├── README.md                ← You are here
│   ├── PM_DEV_SOP.md            ← PM workflow for dev sprints
│   ├── PM_DOCS_SOP.md           ← PM workflow for doc/review sprints
│   ├── DEV_AGENT_SOP.md         ← Dev agent instructions
│   ├── DOC_AGENT_SOP.md         ← Doc agent instructions
│   ├── REVIEW_AGENT_SOP.md      ← Review agent instructions
│   ├── CLEANUP_AGENT_SOP.md     ← 🆕 Cleanup agent instructions (dedup/validate findings)
│   └── templates/
│       ├── ticket-schema.json   ← Required ticket fields (v2)
│       ├── dev-ticket.md        ← Ticket creation template
│       ├── doc-agent.md         ← Doc agent prompt template
│       ├── review-agent.md      ← Review agent prompt template
│       └── redoc-agent.md       ← Re-documentation agent template
│
├── data/
│   ├── tickets.json             ← All tickets (source of truth)
│   ├── findings-staging.json    ← 🆕 Raw findings pending cleanup
│   ├── findings.json            ← INBOX - cleaned findings for human review
│   ├── findings-processed.json  ← 🆕 Audit trail of rejected/merged findings
│   ├── decisions.json           ← Human decisions
│   ├── doc-status.json          ← Documentation freshness tracking
│   └── .agent-credentials.json  ← Service logins & API keys (gitignored)
│
├── DEV_BLOCKED.md               ← Blocked dev agents queue
├── PM_DASHBOARD.md              ← Pipeline status dashboard
├── TICKET_BACKLOG.md            ← Human-readable backlog
│
└── prompts/
    ├── active/                  ← Active agent prompts
    │   ├── dev-agent-*.md
    │   ├── doc-agent-*.md
    │   └── review-agent-*.md
    └── archive/                 ← Completed prompts
```

---

## 🔄 Full Pipeline

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  DOCUMENTATION  │ → │     REVIEW      │ → │    CLEANUP      │ → │    QUESTIONS    │
│   Doc Agents    │    │  Review Agents  │    │  Cleanup Agent  │    │  Human Decides  │
│   ✅ Complete   │    │   ✅ Complete   │    │  Dedup/Validate │    │   ✅ Complete   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                                            │
                                                                            ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     MERGED      │ ← │     REVIEW      │ ← │   DEV AGENTS    │ ← │     TICKETS     │
│  Human Merges   │    │  Human/QA Agent │    │  Execute Tickets │    │   PM Creates    │
│                 │    │                 │    │  ⚡ READY       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │    BLOCKED?     │
                                              │  Human Decides  │
                                              │  → Continuation │
                                              └─────────────────┘
```

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

**Note:** Tickets TKT-004 and TKT-005 were split into smaller pieces (4a/b/c/d and 5a/b/c/d/e).

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

1. Agent writes blocker to `docs/agent-output/blocked/BLOCKED-TKT-XXX-[TIMESTAMP].json` with:
   - Progress checkpoint (commits, files, current state)
   - Options with tradeoffs
   - Recommendation

2. PM aggregates blockers and presents to human

3. Human reviews and chooses option

4. PM creates continuation ticket with decision

5. Agent resumes with full context

### Pipeline Order (Post-Dev)

After a dev agent completes a ticket:

```
Dev Completes Ticket
       ↓
PM Reviews Completion Report
       ↓
PM Marks Affected Docs as "needs_redoc" in doc-status.json
       ↓
Doc Agent Re-Documents (reads CODE via git diff, not dev summary)
       ↓
QA Agent Tests (future - uses updated docs for context)
       ↓
Human Reviews & Merges to main
       ↓
PM Clears doc-status (documented=true, needs_redoc=false)
```

**Why Doc Before QA:**
- Documentation captures the intended behavior from code
- QA agents need accurate docs to know what to test
- Docs serve as the "spec" that QA validates against

**Note:** QA Agents are planned for future implementation. Currently human QA.

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
| `docs/data/tickets.json` | All tickets (source of truth) | PM |
| `docs/data/findings-staging.json` | Raw findings pending cleanup | Review/Dev Agents → Cleanup Agent |
| `docs/data/findings.json` | INBOX - cleaned findings for human | Cleanup Agent |
| `docs/data/findings-processed.json` | Audit trail of rejected/merged | Cleanup Agent |
| `docs/data/doc-status.json` | Documentation freshness tracking | PM |
| `docs/agent-output/started/` | Dev agent start signals + file locks (per-agent JSON) | Dev Agents |
| `docs/agent-output/completions/` | Dev agent completion reports (per-agent MD) | Dev Agents |
| `docs/agent-output/blocked/` | Dev agent blocker reports (per-agent JSON) | Dev Agents |
| `docs/agent-output/findings/` | Dev agent out-of-scope findings (per-agent JSON) | Dev Agents |
| `docs/PM_DASHBOARD.md` | Pipeline status | PM |
| `docs/workflow/PM_DEV_SOP.md` | PM dev instructions | - |
| `docs/workflow/DEV_AGENT_SOP.md` | Dev agent instructions | - |
| `docs/workflow/CLEANUP_AGENT_SOP.md` | Cleanup agent instructions | - |
| `docs/workflow/templates/ticket-schema.json` | Ticket requirements | - |
| `docs/workflow/templates/redoc-agent.md` | Re-documentation agent template | - |

---

## 🗄️ Archived Workflows

Previous workflow versions are in:
```
docs/workflow/archive/
```

These include the original Dev/QA/Review/Strategy agent SOPs before the v2 update.
