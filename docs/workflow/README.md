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
│   └── templates/
│       ├── ticket-schema.json   ← Required ticket fields (v2)
│       ├── dev-ticket.md        ← Ticket creation template
│       ├── doc-agent.md         ← Doc agent prompt template
│       └── review-agent.md      ← Review agent prompt template
│
├── data/
│   ├── tickets.json             ← All tickets (source of truth)
│   ├── findings.json            ← Review findings
│   └── decisions.json           ← Human decisions
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
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  DOCUMENTATION  │ → │     REVIEW      │ → │    QUESTIONS    │
│   Doc Agents    │    │  Review Agents  │    │  Human Decides  │
│   ✅ Complete   │    │   ✅ Complete   │    │   ✅ Complete   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     MERGED      │ ← │     REVIEW      │ ← │   DEV AGENTS    │
│  Human Merges   │    │  Human/QA Agent │    │  Execute Tickets │
│                 │    │                 │    │  ⚡ READY       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
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

1. Agent reports to `docs/DEV_BLOCKED.md` with:
   - Progress checkpoint (commits, files, current state)
   - Options with tradeoffs
   - Recommendation

2. Human reviews and chooses option

3. PM creates continuation ticket with decision

4. Agent resumes with full context

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
| `docs/DEV_BLOCKED.md` | Blocked dev agents queue | Dev Agents |
| `docs/PM_DASHBOARD.md` | Pipeline status | PM |
| `docs/workflow/PM_DEV_SOP.md` | PM dev instructions | - |
| `docs/workflow/DEV_AGENT_SOP.md` | Dev agent instructions | - |
| `docs/workflow/templates/ticket-schema.json` | Ticket requirements | - |

---

## 🗄️ Archived Workflows

Previous workflow versions are in:
```
docs/workflow/archive/
```

These include the original Dev/QA/Review/Strategy agent SOPs before the v2 update.
