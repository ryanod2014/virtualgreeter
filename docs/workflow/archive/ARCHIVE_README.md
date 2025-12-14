# Archived Workflow Files

These files are from previous versions of the workflow system and have been replaced.

## Archived on 2025-12-12

### DISPATCH_AGENT_SOP.md
**Replaced by:** `INBOX_AGENT_SOP.md` + `TICKET_AGENT_SOP.md` + `pipeline-runner.js`

The Dispatch Agent had too many responsibilities:
- Routing blockers → Now automated in `pipeline-runner.js`
- Answering questions → Now handled by `INBOX_AGENT_SOP.md`
- Creating tickets → Now handled by `TICKET_AGENT_SOP.md`
- Creating continuations → Now automated in `pipeline-runner.js`

### DISPATCH_QA_SOP.md
**Replaced by:** `QA_REVIEW_AGENT_SOP.md` + `pipeline-runner.js`

QA routing is now handled by the pipeline runner, not a separate agent.

---

## Why These Were Archived

1. **Dispatch had 6+ responsibilities** - Too complex for one agent
2. **JSON file manipulation** - Replaced by CLI/API calls to SQLite database
3. **Manual ticket creation** - Now automated with prompt file generation
4. **Unclear handoffs** - New pipeline has explicit status-based transitions



