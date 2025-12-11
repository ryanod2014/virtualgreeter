# Dev Agent: TKT-101 - Empty Pool Falls Back to Any Agent - May Violate Pool Intent

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-101-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-101: Empty Pool Falls Back to Any Agent - May Violate Pool Intent**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-101
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-101-empty-pool-falls-back-to-any-a`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/routing/poolAssignment.ts` | Implement required changes |
| `apps/server/src/features/agents/agentStatus.ts` | Implement required changes |

---

## What to Implement

1. Either (a) show "no agents available" for strict routing, or (b) add admin toggle for "strict pool routing" vs "fallback allowed", or (c) at minimum log when cross-pool fallback occurs for audit purposes

---

## Acceptance Criteria

- [ ] Pool routing behavior is configurable or clearly logged
- [ ] Cross-pool fallback is tracked for audit purposes
- [ ] F-089 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-101-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-101-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-101-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-101-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
