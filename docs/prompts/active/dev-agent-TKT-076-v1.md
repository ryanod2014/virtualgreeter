# Dev Agent: TKT-076 - Handle No Catch-All Pool Gracefully

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-076-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-076: Handle No Catch-All Pool Gracefully**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-076
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-076-handle-no-catch-all-pool-grace`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/pools/poolMatcher.ts` | Implement required changes |

---

## What to Implement

1. Return meaningful error or default pool when no match found
2. Log warning when no catch-all pool exists
3. Add validation in pool configuration UI

---

## Acceptance Criteria

- [ ] No crashes when catch-all pool missing
- [ ] Clear error message for admins
- [ ] F-110 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-076-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-076-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-076-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-076-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
