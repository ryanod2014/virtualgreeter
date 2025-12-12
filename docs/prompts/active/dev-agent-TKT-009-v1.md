# Dev Agent: TKT-009 - Org-Level Co-Browse Disable Setting

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-009-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-009: Org-Level Co-Browse Disable Setting**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-009
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-009-org-level-co-browse-disable-se`
**Version:** v1

---

## The Problem

Visitors have no control over screen sharing during calls. Co-browse is automatic with no opt-out. May violate privacy expectations or GDPR.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/page.tsx` | Implement required changes |
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | Implement required changes |
| `apps/widget/src/features/cobrowse/cobrowseSender.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/cobrowse-viewer.md`
- `docs/features/admin/organization-settings.md`



**Similar Code:**
- apps/dashboard/src/app/(dashboard)/settings/page.tsx - see existing toggle patterns


---

## What to Implement

1. Add 'Enable Co-Browse' toggle to org settings page
2. Store setting in organization settings
3. Widget checks setting before initializing cobrowse sender

---

## Acceptance Criteria

- [ ] Org settings shows 'Enable Co-Browse' toggle
- [ ] When disabled, co-browse does not initialize for visitors
- [ ] Existing orgs default to enabled (no breaking change)
- [ ] Setting change takes effect on next call (not mid-call)

---

## Out of Scope

- ❌ Do NOT add per-visitor opt-out (different feature)
- ❌ Do NOT modify sensitive data masking (TKT-001)
- ❌ Do NOT create database migration - use existing org settings structure

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Default must be enabled to maintain current behavior | Follow existing patterns |
| Handle mid-call disable gracefully (complete current session) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Toggle setting, verify widget behavior changes

---

## QA Notes

Test with new org (should default enabled). Test toggle persistence across page refreshes.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-009 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-009.md` then `./scripts/agent-cli.sh update-ticket TKT-009 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

