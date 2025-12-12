# Dev Agent: TKT-075 - Add Redis for Shared Cache Across Instances

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-075-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-075: Add Redis for Shared Cache Across Instances**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-075
**Priority:** Medium
**Difficulty:** Hard
**Branch:** `agent/tkt-075-add-redis-for-shared-cache-acr`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/lib/cache.ts` | Implement required changes |
| `apps/server/package.json` | Implement required changes |

---

## What to Implement

1. Add Redis client with fallback to in-memory
2. Make cache storage backend configurable via CACHE_DRIVER env var
3. Add Redis connection to health check

---

## Acceptance Criteria

- [ ] Cache can use Redis when REDIS_URL is set
- [ ] Falls back to in-memory when Redis unavailable
- [ ] F-438 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-075 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-075.md` then `./scripts/agent-cli.sh update-ticket TKT-075 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

