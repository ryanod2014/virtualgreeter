# Documentation Workflow

> **Current Focus:** Feature documentation sprint
> **Goal:** Document ALL features with comprehensive scenario-based docs

---

## 🚀 Quick Start

### Launch PM
```
You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md
```

### Launch Doc Agent
```
You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[ID].md
```

---

## 📁 Active Workflow Files

```
docs/
├── workflow/
│   ├── README.md              ← You are here
│   ├── PM_DOCS_SOP.md         ← PM workflow for doc sprint
│   ├── DOC_AGENT_SOP.md       ← Doc agent instructions
│   └── templates/
│       └── doc-agent.md       ← Template for new doc prompts
│
├── FEATURE_INVENTORY.md       ← Master list of all features
├── DOC_TRACKER.md             ← Completion tracking
│
├── features/                  ← Output documentation
│   ├── visitor/               ← ✅ 5/5 complete
│   ├── agent/                 ← ✅ 5/5 complete
│   ├── platform/              ← ✅ 5/5 complete
│   ├── admin/                 ← 2/8 complete
│   ├── billing/               ← 0/6 complete
│   ├── auth/                  ← 0/4 complete
│   └── ...
│
└── prompts/
    └── active/                ← Active doc agent prompts
        └── doc-agent-*.md
```

---

## 📊 Current Progress

| Category | Done | Remaining |
|----------|------|-----------|
| Visitor | ✅ 5 | 0 |
| Agent | ✅ 5 | 0 |
| Platform | ✅ 5 | 0 |
| Admin | 2 | 6 |
| Billing | 0 | 6 |
| Auth | 0 | 4 |
| Other | 1 | 4 |
| **Total** | **18** | **~23** |

---

## 🔄 Workflow Overview

```
┌─────────────────────────┐
│  FEATURE_INVENTORY.md   │  ← All features listed
└───────────┬─────────────┘
            │ PM creates prompts
            ▼
┌─────────────────────────┐
│   DOC AGENTS (parallel) │  ← Read code, write docs
│   No dependencies!      │
└───────────┬─────────────┘
            │ Agents post to tracker
            ▼
┌─────────────────────────┐
│    DOC_TRACKER.md       │  ← PM checks progress
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│   docs/features/*.md    │  ← Final documentation
└─────────────────────────┘
```

---

## ✅ What's Different (Simplified)

**This workflow is ONLY for documentation:**
- ❌ No Dev agents (not fixing code)
- ❌ No QA agents (not testing)
- ❌ No Review agents (not reviewing PRs)
- ❌ No Strategy agents (not auditing)
- ❌ No file locks (docs don't conflict)
- ❌ No ticket versioning (one-shot docs)
- ❌ No branches or PRs (docs go straight to main)

**Just:**
- ✅ PM creates doc prompts
- ✅ Doc agents read code & write docs
- ✅ All agents run in parallel
- ✅ Track progress in DOC_TRACKER.md
- ✅ PM commits docs periodically (`git add docs/ && git commit`)

---

## 🔀 Git (Automatic)

**PM handles Git automatically. Human never thinks about it.**

PM commits:
- When starting (any uncommitted docs)
- After creating prompts
- After checking progress (if new docs exist)
- When sprint completes

---

## 📝 Key Files

| File | Who Updates | Purpose |
|------|-------------|---------|
| `FEATURE_INVENTORY.md` | PM | Master list of features |
| `DOC_TRACKER.md` | Doc Agents + PM | Completion tracking |
| `PM_DOCS_SOP.md` | - | PM instructions |
| `DOC_AGENT_SOP.md` | - | Doc agent instructions |
| `prompts/active/doc-agent-*.md` | PM creates | Active assignments |
| `features/**/*.md` | Doc Agents | Output docs |

---

## 🗄️ Archived (Old Workflow)

The previous multi-agent workflow (Dev/QA/Review/Strategy) is archived in:
```
docs/workflow/archive/
```

These are NOT in use for the documentation sprint.
