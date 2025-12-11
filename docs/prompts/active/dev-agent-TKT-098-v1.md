# Dev Agent: TKT-098 - Fix Tiered Routing to Prefer Idle Agents Over Least-Connections

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-098-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-098: Fix Tiered Routing to Prefer Idle Agents Over Least-Connections**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-098
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-098-fix-tiered-routing-to-prefer-i`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/routing/tieredAssignment.ts` | Implement required changes |

---

## What to Implement

1. Modify findBestAgentInTier() to prefer idle agents
2. Only use least-connections when no idle agents exist
3. Add hasIdleCandidate flag or similar tracking
4. Add unit tests for idle vs busy agent selection
5. Update algorithm documentation

---

## Acceptance Criteria

- [ ] Idle agents are always selected before busy agents in same tier
- [ ] Least-connections only activates when no idle agents available
- [ ] All existing tests still pass
- [ ] New tests verify idle agent preference
- [ ] F-088 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-098-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-098-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-098-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-098-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
