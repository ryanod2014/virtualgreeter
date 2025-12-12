# Dev Agent: TKT-090 - Consolidate DEFAULT_WIDGET_SETTINGS to Single Source of Truth

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-090-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-090: Consolidate DEFAULT_WIDGET_SETTINGS to Single Source of Truth**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-090
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-090-consolidate-default-widget-set`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `packages/domain/src/types.ts` | Implement required changes |
| `apps/server/src/lib/widget-settings.ts` | Implement required changes |
| `apps/widget/src/lib/default-settings.ts` | Implement required changes |

---

## What to Implement

1. Define DEFAULT_WIDGET_SETTINGS once in packages/domain/src/types.ts
2. Export as const alongside WidgetSettings type
3. Update all other files to import from domain package
4. Remove duplicate definitions
5. Add comment warning against recreating this constant elsewhere

---

## Acceptance Criteria

- [ ] DEFAULT_WIDGET_SETTINGS exists in only one location
- [ ] All imports reference the domain package
- [ ] No duplicate definitions exist
- [ ] All existing functionality works unchanged
- [ ] F-043 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-090 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-090.md` then `./scripts/agent-cli.sh update-ticket TKT-090 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

