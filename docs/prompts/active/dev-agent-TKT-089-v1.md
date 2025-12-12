# Dev Agent: TKT-089 - Add Confirmation Dialog for Blocklist Mode Changes

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-089-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-089: Add Confirmation Dialog for Blocklist Mode Changes**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-089
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-089-add-confirmation-dialog-for-bl`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Implement required changes |
| `apps/dashboard/src/features/blocklist/ModeChangeConfirmationModal.tsx` | Implement required changes |

---

## What to Implement

1. Create confirmation modal component
2. Show modal when switching modes if current country list is non-empty
3. Modal message: "Switching modes will clear your current list of X countries. Continue?"
4. Include Cancel and Confirm buttons
5. Only clear list after explicit confirmation

---

## Acceptance Criteria

- [ ] Confirmation dialog appears when switching modes with non-empty list
- [ ] Dialog shows count of countries that will be lost
- [ ] Canceling preserves current mode and list
- [ ] Confirming switches mode and clears list
- [ ] F-038 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-089 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-089.md` then `./scripts/agent-cli.sh update-ticket TKT-089 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

