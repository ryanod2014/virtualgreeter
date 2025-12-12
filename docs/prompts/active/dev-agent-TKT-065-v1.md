# Dev Agent: TKT-065 - Geo-Failure Handling Toggle in Blocklist Settings

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-065-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-065: Geo-Failure Handling Toggle in Blocklist Settings**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-065
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-065-geo-failure-handling-toggle-in`
**Version:** v1

---

## The Problem

When geolocation fails, behavior differs by mode (blocklist=allow, allowlist=block). Admins have no control over this. Need a toggle to let admins choose what happens when location can't be determined, plus display geolocation failure rate so admins can make informed decisions.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/blocklist/page.tsx` | Implement required changes |
| `apps/server/src/features/blocklist/geoCheck.ts` | Implement required changes |

**Feature Documentation:**
- `docs/features/admin/blocklist-settings.md`

---

## What to Implement

1. Add toggle to blocklist settings: 'When location cannot be determined: Allow / Block'
2. Store setting in org settings
3. Apply setting in geoCheck logic
4. Track and display geolocation failure rate percentage in UI

---

## Acceptance Criteria

- [ ] Toggle appears in blocklist settings UI
- [ ] Toggle default matches current behavior (blocklist=allow, allowlist=block)
- [ ] Geolocation failures respect admin's toggle choice
- [ ] Failure rate percentage displayed to help admin decide

---

## Out of Scope

- ❌ Do NOT change geolocation provider (that's TKT-062)
- ❌ Do NOT modify other blocklist logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Changing default behavior could break existing orgs - default must match current behavior | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Test with VPN/unknown IP to trigger geolocation failure. Verify toggle works in both modes.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-065 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-065.md` then `./scripts/agent-cli.sh update-ticket TKT-065 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

