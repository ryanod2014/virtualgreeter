# Dispatch Agent (DEPRECATED)

> **One-liner to launch:**
> ⚠️ **Do not launch this.** Dispatch has been replaced by: **Pipeline Runner + Inbox Agent + Ticket Agent**.

---

## Your Role
This role is **deprecated**. The workflow is now status-driven and automated.

Use these instead:
- **Pipeline orchestration**: `scripts/pipeline-runner.js` (watch mode)
- **Human Q&A / decisions (one thread at a time)**: `docs/workflow/INBOX_AGENT_SOP.md`
- **Ticket creation / continuations**: `docs/workflow/TICKET_AGENT_SOP.md`
- **Findings gate (“top 5 to inbox”)**: `docs/workflow/TRIAGE_AGENT_SOP.md`

---

## Before You Start
Read the workflow hub:
- `docs/workflow/README.md`

---

## What To Do Instead (Replacement Flow)

### 1) Run the pipeline orchestrator

Ensure the PM dashboard server is up, then run:

```bash
node scripts/pipeline-runner.js --watch
```

### 2) If a human is waiting on a thread → launch Inbox Agent (one thread)

Follow: `docs/workflow/INBOX_AGENT_SOP.md`

### 3) If a decision is made and needs a ticket → run Ticket Agent

Follow: `docs/workflow/TICKET_AGENT_SOP.md`

---

## Why This Exists

This file remains only to avoid broken links in old references. Prefer `docs/workflow/README.md`.

