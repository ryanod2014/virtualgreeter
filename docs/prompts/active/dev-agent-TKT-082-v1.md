# Dev Agent: TKT-082 - Add Visitor-Side Co-Browse Privacy Controls

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-082-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-082: Add Visitor-Side Co-Browse Privacy Controls**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-082
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-082-add-visitor-side-co-browse-pri`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/widget/src/features/cobrowse/CobrowseProvider.tsx` | Implement required changes |
| `apps/widget/src/features/webrtc/LiveCallView.tsx` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/settings/organization/organization-settings-client.tsx` | Implement required changes |
| `packages/database/src/schema.ts` | Implement required changes |

---

## What to Implement

1. Add visitor-side toggle "Allow screen viewing" in call UI that defaults to enabled
2. Add organization-level setting to disable co-browse entirely
3. Show clear indicator to visitor when co-browse is active
4. Store co-browse consent preference in session

---

## Acceptance Criteria

- [ ] Visitors can disable co-browse during calls via UI toggle
- [ ] Organizations can disable co-browse feature via admin settings
- [ ] Visitor co-browse state is clearly communicated in UI
- [ ] F-004 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-082 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-082.md` then `./scripts/agent-cli.sh update-ticket TKT-082 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

