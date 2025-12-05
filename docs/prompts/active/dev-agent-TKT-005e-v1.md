# Dev Agent: TKT-005e - Force Agents Offline on Payment Failure

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-005e-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-005e: Force Agents Offline on Payment Failure**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-005e
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-005e-force-agents-offline-on-paymen`
**Version:** v1

---

## The Problem

Agents remain available when org has payment failure - widget shows them as options.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/agents/agentStatus.ts` | Implement required changes |
| `apps/widget/src/Widget.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/bullpen-states.md`



**Similar Code:**
- apps/server/src/features/agents/agentStatus.ts - agent state management


---

## What to Implement

1. Force all agents to 'offline' when org becomes past_due
2. Prevent agents from going 'available' while past_due
3. Widget shows no available agents for past_due orgs

---

## Acceptance Criteria

- [ ] All agents forced offline when org status becomes past_due
- [ ] Agents cannot toggle to 'available' while past_due
- [ ] Widget shows 'no agents available' for past_due orgs
- [ ] When payment resolved, agents can go available again

---

## Out of Scope

- ❌ Do NOT modify payment blocker UI
- ❌ Do NOT modify webhook handlers
- ❌ Do NOT modify email logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't break in-progress calls - let them complete | Follow existing patterns |
| Clear messaging for agents about why they can't go available | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Set org to past_due, verify agents forced offline

---

## QA Notes

Test agent availability toggle. Verify widget behavior on customer site.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-005e-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-005e-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-005e-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-005e-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
