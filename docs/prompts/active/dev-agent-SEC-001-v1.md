# Dev Agent: SEC-001 - API Authentication Enforcement

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-SEC-001-v1.md`

---

You are a Dev Agent. Your job is to implement **SEC-001: API Authentication Enforcement**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** SEC-001
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/sec-001-api-authentication-enforcement`
**Version:** v1

---

## The Problem

The signaling server has routes and socket handlers that need proper authentication verification. /metrics endpoint has optional API key protection. Socket handlers verify agent tokens but some code paths may skip verification.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/index.ts` | Implement required changes |
| `apps/server/src/lib/auth.ts` | Implement required changes |
| `apps/server/src/features/signaling/socket-handlers.ts` | Implement required changes |

**Similar Code:**
- apps/server/src/lib/auth.ts - existing auth helpers

---

## What to Implement

1. Audit all HTTP routes and enforce auth in production
2. Audit socket handlers for auth verification
3. Enforce METRICS_API_KEY in production with warning if missing
4. Add requireAgentAuth() helper for socket auth checks

---

## Acceptance Criteria

- [ ] /metrics requires API key in production (401 without, 403 with wrong key)
- [ ] Warning logged if METRICS_API_KEY not set in production
- [ ] All agent socket operations verify socket.data.agentId is set
- [ ] Security model documented in socket-handlers.ts
- [ ] No breaking changes to existing functionality
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build passes

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Breaking existing auth flow | Follow existing patterns |
| Locking out legitimate internal requests | Follow existing patterns |

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket SEC-001 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/SEC-001.md` then `./scripts/agent-cli.sh update-ticket SEC-001 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

