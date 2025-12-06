# Dev Agent: TKT-NaN - Algorithm May Select Busy Agent Over Idle Agent

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-NaN-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-NaN: Algorithm May Select Busy Agent Over Idle Agent**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-NaN
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-nan-algorithm-may-select-busy-agen`
**Version:** v1

---

## The Problem

The pseudocode shows two selection strategies: round-robin for idle agents (via `oldestOrder`) and least-connections for busy agents (via `lowestLoad`). However, both paths update the same `bestAgent` variable. If an idle agent is processed first (updating `bestAgent`), then a busy agent with `load=1` is processed later, the condition `load < lowestLoad` (1 < Infinity) is true and overwrites `bestAgent` with the busy agent. This means an idle agent could lose to a busy agent despite being preferable.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| (see ticket for files) | |

---

## What to Implement

1. Prefer idle agents by only entering the least-connections path if no idle agents were found: `if (!bestAgent && load < lowestLoad)` or track `hasIdleCandidate` flag.

---

## Acceptance Criteria

- [ ] Issue described in F-088 is resolved
- [ ] Change is tested and verified

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
- **Start:** Write to `docs/agent-output/started/TKT-NaN-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-NaN-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-NaN-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-NaN-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
