# Dev Agent: TKT-004d - Widget and Agent Status for Paused Orgs

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-004d-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-004d: Widget and Agent Status for Paused Orgs**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-004d
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-004d-widget-and-agent-status-for-pa`
**Version:** v1

---

## The Problem

Widget and agents remain active when org is paused - should be disabled.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/widget/src/Widget.tsx` | Implement required changes |
| `apps/server/src/features/agents/agentStatus.ts` | Implement required changes |
| `apps/server/src/lib/organization.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/visitor/widget-lifecycle.md`
- `docs/features/agent/bullpen-states.md`



**Similar Code:**
- apps/widget/src/Widget.tsx - see org status checks
- apps/server/src/features/agents/agentStatus.ts - agent state management


---

## What to Implement

1. Widget checks org status on load - shows 'temporarily unavailable' if paused
2. Force all agents to 'offline' status when org pauses
3. Prevent agents from going 'available' while org is paused

---

## Acceptance Criteria

- [ ] Widget shows 'temporarily unavailable' message for paused orgs
- [ ] All agents forced to 'offline' when org pauses
- [ ] Agents cannot toggle to 'available' while paused
- [ ] When org resumes, agents can go available again

---

## Out of Scope

- ❌ Do NOT modify Stripe integration (TKT-004a/b/c)
- ❌ Do NOT modify pause/resume UI

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't break existing availability logic | Follow existing patterns |
| Message should be user-friendly, not error-like | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Pause org, verify widget shows unavailable message

---

## QA Notes

Test widget on customer site with paused org. Verify agent dashboard shows correct status.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-004d-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-004d-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-004d-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-004d-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
