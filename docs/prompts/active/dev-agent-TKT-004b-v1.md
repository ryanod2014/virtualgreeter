# Dev Agent: TKT-004b - Add Auto-Resume Scheduler for Paused Subscriptions

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-004b-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-004b: Add Auto-Resume Scheduler for Paused Subscriptions**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-004b
**Priority:** Critical
**Difficulty:** Hard
**Branch:** `agent/tkt-004b-add-auto-resume-scheduler-for`
**Version:** v1

---

## The Problem

No auto-resume when pause_ends_at is reached - subscriptions stay paused forever.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/scheduler/resumePausedOrgs.ts` | Implement required changes |
| `apps/server/src/index.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/cancel-subscription.md`



**Similar Code:**
- apps/server/src/features/transcription/processTranscription.ts - see queue-based job pattern


---

## What to Implement

1. Create scheduled job that runs every hour
2. Query organizations where pause_ends_at <= now AND status = 'paused'
3. Call resumeSubscription() for each matching org
4. Update org status to 'active' in database

---

## Acceptance Criteria

- [ ] Scheduler runs every hour (configurable)
- [ ] Orgs with expired pause_ends_at are automatically resumed
- [ ] Stripe billing restarts on auto-resume
- [ ] Logs capture all auto-resume events for debugging

---

## Out of Scope

- ❌ Do NOT modify Stripe API calls (TKT-004a handles this)
- ❌ Do NOT add webhook handlers (TKT-004c)
- ❌ Do NOT modify widget/agent status

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Missed resume job = extended pause (use reliable scheduler) | Follow existing patterns |
| Race condition if user manually resumes while job runs | Follow existing patterns |
| Handle payment failure on resume gracefully | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Set pause_ends_at to past, run scheduler, verify resume happens

---

## QA Notes

Test with org paused for 1 minute. Verify auto-resume triggers correctly. Check logs for job execution.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-004b-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-004b-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-004b-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-004b-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
