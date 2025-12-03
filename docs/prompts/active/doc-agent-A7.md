# Doc Agent: A7 - Agent Call Logs

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-A7.md`

---

You are a Documentation Agent. Your job is to document **A7: Agent Call Logs** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** A7
**Feature Name:** Agent Call Logs
**Category:** agent
**Output File:** `docs/features/agent/agent-call-logs.md`

---

## Feature Description

Agent's personal call history view. Shows their own calls with details, filtering, and ability to access recordings and notes from past calls.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/dashboard/call-logs/page.tsx` | Agent call logs page |
| `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | Active calls view |
| `apps/server/src/lib/call-logger.ts` | Call logging |
| `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Reference: admin call logs |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What information is shown in the agent's call log?
2. How can agents filter their call history?
3. Can agents access call recordings from here?
4. Are call notes/dispositions shown?
5. How far back does call history go?
6. Is there pagination for long histories?
7. Can agents search their calls?
8. What details are shown for each call?
9. How does this differ from admin call logs?
10. Can agents export their call history?

---

## Specific Edge Cases to Document

- Agent with no call history
- Very old call access
- Recording unavailable/deleted
- Call from deleted pool
- Agent's calls across multiple pools
- Filtering with no results
- Loading large call history
- Call log during timezone change

---

## Output Requirements

1. Create: `docs/features/agent/agent-call-logs.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

