# Dev Agent: TKT-018 - Transcription Auto-Retry with Manual Fallback

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-018-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-018: Transcription Auto-Retry with Manual Fallback**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-018
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-018-transcription-auto-retry-with`
**Version:** v1

---

## The Problem

When transcription fails (Deepgram error, timeout), there's no retry mechanism and no UI to manually retry. Failed transcriptions are stuck permanently.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/transcription/processTranscription.ts` | Implement required changes |
| `apps/dashboard/src/features/call-logs/CallLogRow.tsx` | Implement required changes |
| `apps/dashboard/src/app/api/transcription/retry/route.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/platform/transcription-service.md`



**Similar Code:**
- apps/server/src/features/transcription/processTranscription.ts - existing transcription logic


---

## What to Implement

1. Add retry logic with exponential backoff (1s, 4s, 16s)
2. Mark transcription as 'failed' after 3 attempts
3. Add 'Retry Transcription' button in call logs UI
4. Create API endpoint for manual retry

---

## Acceptance Criteria

- [ ] Failed transcription auto-retries up to 3 times
- [ ] Exponential backoff: 1s, 4s, 16s delays
- [ ] Retry button appears for permanently failed transcriptions
- [ ] Retry attempts are logged with error details
- [ ] Non-retriable errors (audio too short) skip retry logic

---

## Out of Scope

- ❌ Do NOT modify Deepgram integration beyond retry
- ❌ Do NOT change transcription storage format
- ❌ Do NOT add real-time transcription

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't retry infinitely - max 3 attempts | Follow existing patterns |
| Distinguish retriable vs non-retriable errors | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Simulate transcription failure, verify retry behavior

---

## QA Notes

Test with intentionally failed transcription. Verify retry button and logging.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-018 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-018.md` then `./scripts/agent-cli.sh update-ticket TKT-018 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

