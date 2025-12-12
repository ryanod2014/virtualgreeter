# Dev Agent: TKT-072 - Fix Health Endpoint Documentation Mismatch

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-072-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-072: Fix Health Endpoint Documentation Mismatch**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-072
**Priority:** Critical
**Difficulty:** Easy
**Branch:** `agent/tkt-072-fix-health-endpoint-documentat`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `docs/features/external-uptime-monitoring.md` | Implement required changes |

---

## What to Implement

1. Change all references from "status": "ok" to "status": "healthy"
2. Update monitor configuration example to check for "healthy"
3. Verify other status values match (unhealthy, degraded)

---

## Acceptance Criteria

- [ ] Documentation matches actual /health endpoint response
- [ ] Monitor configuration examples are correct
- [ ] F-655 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-072 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-072.md` then `./scripts/agent-cli.sh update-ticket TKT-072 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

