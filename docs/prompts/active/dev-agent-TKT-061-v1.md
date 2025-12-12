# Dev Agent: TKT-061 - Missing Incident Response Runbook

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-061-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-061: Missing Incident Response Runbook**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-061
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-061-missing-incident-response-runb`
**Version:** v1

---

## The Problem

The document covers how to set up monitoring and receive alerts, but provides no guidance on what to do when an alert fires. There is no incident response runbook linking to debugging steps, rollback procedures, or escalation paths beyond "call this number". When a 3 AM alert wakes someone up, they need actionable next steps.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| (see ticket for files) | |



---

## What to Implement

1. Custom response
2. Note: sure create a simple 1 pager

---

## Acceptance Criteria

- [ ] Issue described in F-647 is resolved
- [ ] Change is tested and verified

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| (Low risk) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-061 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-061.md` then `./scripts/agent-cli.sh update-ticket TKT-061 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

