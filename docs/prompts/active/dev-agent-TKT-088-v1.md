# Dev Agent: TKT-088 - Add Warning for Empty Allowlist Mode

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-088-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-088: Add Warning for Empty Allowlist Mode**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-088
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-088-add-warning-for-empty-allowlis`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Implement required changes |

---

## What to Implement

1. Add explicit warning banner when allowlist mode is active but list is empty
2. Warning text: "Your allowlist is empty. All visitors are currently allowed. Add countries to restrict access."
3. Use warning/alert styling to make it prominent
4. Show warning only in ALLOWLIST mode when country list is empty

---

## Acceptance Criteria

- [ ] Warning appears when allowlist is empty
- [ ] Warning disappears when countries are added or mode is changed
- [ ] Warning text clearly explains the current behavior
- [ ] F-034 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-088 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-088.md` then `./scripts/agent-cli.sh update-ticket TKT-088 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

