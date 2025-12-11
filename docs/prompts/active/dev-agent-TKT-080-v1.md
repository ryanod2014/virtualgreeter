# Dev Agent: TKT-080 - Unify Pool Routing Logic Across All Reassignment Triggers

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-080-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-080: Unify Pool Routing Logic Across All Reassignment Triggers**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-080
**Priority:** Medium
**Difficulty:** Hard
**Branch:** `agent/tkt-080-unify-pool-routing-logic-acros`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/reassignment/reassignmentManager.ts` | Implement required changes |
| `apps/server/src/features/pools/poolMatcher.ts` | Implement required changes |

---

## What to Implement

1. Audit all reassignment trigger paths
2. Ensure all triggers consistently respect pool routing rules
3. Add integration tests for each trigger type with pool routing
4. Document unified routing behavior

---

## Acceptance Criteria

- [ ] All reassignment triggers respect pool routing consistently
- [ ] Integration tests verify behavior for all trigger types
- [ ] Documentation updated with unified behavior
- [ ] F-173 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-080-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-080-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-080-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-080-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
