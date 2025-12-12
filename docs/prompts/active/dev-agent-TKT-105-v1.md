# Dev Agent: TKT-105 - TypeScript Type Missing past_due Status

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-105-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-105: TypeScript Type Missing past_due Status**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-105
**Priority:** High
**Difficulty:** Low
**Branch:** `agent/tkt-105-typescript-type-missing-past-d`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `packages/domain/src/database.types.ts` | Implement required changes |

---

## What to Implement

1. Update SubscriptionStatus type to include past_due
2. Verify all code handling subscription_status accounts for past_due
3. Update any type guards or switch statements
4. Run type checking to ensure no breaking changes

---

## Acceptance Criteria

- [ ] SubscriptionStatus type includes past_due
- [ ] TypeScript compilation succeeds
- [ ] No type errors related to subscription_status
- [ ] F-296 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-105 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-105.md` then `./scripts/agent-cli.sh update-ticket TKT-105 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

