# Dev Agent: TKT-074 - Add Error Handling for Fire-and-Forget Events

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-074-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-074: Add Error Handling for Fire-and-Forget Events**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-074
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-074-add-error-handling-for-fire-an`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/events/eventEmitter.ts` | Implement required changes |

---

## What to Implement

1. Add error logging for failed fire-and-forget events
2. Consider retry queue for critical events
3. Add metrics for event failure rate

---

## Acceptance Criteria

- [ ] Failed events are logged with context
- [ ] Event failure metrics available
- [ ] F-197 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-074-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-074-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-074-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-074-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
