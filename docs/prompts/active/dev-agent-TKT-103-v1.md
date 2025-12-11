# Dev Agent: TKT-103 - No Auto-Resume Functionality for Paused Subscriptions

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-103-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-103: No Auto-Resume Functionality for Paused Subscriptions**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-103
**Priority:** Critical
**Difficulty:** High
**Branch:** `agent/tkt-103-no-auto-resume-functionality-f`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/billing/autoResume.ts` | Implement required changes |
| `apps/server/src/lib/scheduler/pauseScheduler.ts` | Implement required changes |

---

## What to Implement

1. Implement scheduled task using Supabase Edge Function, Railway cron, or Vercel cron
2. Query organizations where pause_ends_at <= NOW()
3. Call resumeAccount for each expired pause
4. Add logging and error handling
5. Add monitoring/alerting for failed resumes

---

## Acceptance Criteria

- [ ] Scheduler runs periodically to check for expired pauses
- [ ] Accounts are automatically resumed when pause_ends_at is reached
- [ ] Failed resumes are logged and alerted
- [ ] F-284 is resolved

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

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-103-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-103-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-103-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-103-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
