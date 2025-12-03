# Doc Agent: F2 - Idle Timer

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-F2.md`

---

You are a Documentation Agent. Your job is to document **F2: Idle Timer** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** F2
**Feature Name:** Idle Timer
**Category:** agent
**Output File:** `docs/features/agent/idle-timer.md`

---

## Feature Description

Agent idle detection that warns and eventually auto-logs-out inactive agents. Protects against abandoned sessions affecting routing and availability.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/features/workbench/hooks/useIdleTimer.ts` | Idle timer hook |
| `apps/widget/src/Widget.tsx` | Widget idle handling |
| `apps/widget/src/constants.ts` | Idle timeout constants |
| `apps/server/src/features/routing/pool-manager.ts` | Server-side idle handling |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How long until idle warning appears?
2. How long after warning until logout?
3. What activities reset the idle timer?
4. What is the warning UI?
5. Can agents dismiss the warning?
6. What happens on auto-logout?
7. Is idle timeout configurable?
8. How does idle affect agent status?
9. Is there audio/visual notification?
10. How does idle work during active calls?

---

## Specific Edge Cases to Document

- Idle during incoming call
- Multiple browser tabs
- Browser minimized vs hidden
- Idle timer during call
- Network disconnect vs idle
- Idle reset edge cases
- Mobile browser idle behavior
- Idle and heartbeat interaction

---

## Output Requirements

1. Create: `docs/features/agent/idle-timer.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

