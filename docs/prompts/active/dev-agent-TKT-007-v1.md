# Dev Agent: TKT-007 - Fix Public Feedback Feature Documentation

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-007-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-007: Fix Public Feedback Feature Documentation**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-007
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-007-fix-public-feedback-feature-do`
**Version:** v1

---

## The Problem

The 'Public Feedback' feature documentation describes it as 'Post-call feedback for visitors' but the actual feature is a UserVoice-style feature request voting system for authenticated dashboard users.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `docs/features/visitor/public-feedback.md` | Implement required changes |


**Feature Documentation:**
- `docs/features/visitor/public-feedback.md`



---

## What to Implement

1. Rename to 'Feature Request Voting & Bug Reporting'
2. Update description to explain it's for authenticated dashboard users
3. Clarify that 'public' means cross-organization visibility, not anonymous access

---

## Acceptance Criteria

- [ ] Feature doc accurately describes the voting/feedback system
- [ ] No mention of 'visitors' or 'post-call' in context of feedback
- [ ] Clear that authentication is required

---

## Out of Scope

- ❌ Do NOT modify actual feature code
- ❌ Do NOT change feature behavior

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Documentation only - no production risk | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Read updated doc for accuracy
- Verify no broken links

---

## QA Notes

N/A - documentation only.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-007 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-007.md` then `./scripts/agent-cli.sh update-ticket TKT-007 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

