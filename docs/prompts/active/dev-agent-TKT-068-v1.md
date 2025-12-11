# Dev Agent: TKT-068 - Allow Pageview Tracking Without Agent Online

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-068-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-068: Allow Pageview Tracking Without Agent Online**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-068
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-068-allow-pageview-tracking-withou`
**Version:** v1

---

## The Problem

Pageviews are only tracked when an agent is online (agent_id is required). This means organizations without 24/7 agent coverage have inaccurate pageview counts, making install verification unreliable and analytics misleading.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/pageviews/track.ts` | Implement required changes |
| `database/migrations/XXXX-make-agent-id-nullable.sql` | Implement required changes |

**Feature Documentation:**
- `docs/features/admin/sites-setup.md`

---

## What to Implement

1. Make agent_id nullable in pageviews table
2. Update pageview tracking to allow null agent_id
3. Track unassigned pageviews separately for analytics
4. Update dashboard stats to include both assigned and unassigned pageviews
5. Update verification logic to count all pageviews (not just assigned ones)

---

## Acceptance Criteria

- [ ] Pageviews are recorded even when no agents are online
- [ ] agent_id field is null when no agent available
- [ ] Dashboard shows total pageviews (assigned + unassigned)
- [ ] Verification succeeds based on any pageview, not just assigned ones
- [ ] Existing pageview tracking still works for assigned pageviews

---

## Out of Scope

- ❌ Do NOT change missed_opportunity tracking logic
- ❌ Do NOT modify agent assignment logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Database migration must be backwards compatible | Follow existing patterns |
| Ensure analytics queries handle null agent_id correctly | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Test with all agents offline. Load widget and verify pageview is tracked. Check dashboard analytics.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-068-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-068-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-068-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-068-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
