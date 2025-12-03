# Doc Agent: D7 - Call Logs

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D7.md`

---

You are a Documentation Agent. Your job is to document **D7: Call Logs** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D7
**Feature Name:** Call Logs
**Category:** admin
**Output File:** `docs/features/admin/call-logs.md`

---

## Feature Description

Historical call records and analytics for admins. Shows call duration, outcome, agent, visitor info, and allows filtering and export. Primary reporting interface for call data.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/admin/calls/page.tsx` | Call logs page |
| `apps/dashboard/src/app/admin/calls/calls-client.tsx` | Call logs UI component |
| `apps/dashboard/src/app/api/calls/route.ts` | Call data API |
| `apps/server/src/db/schema/calls.ts` | Call data schema |
| `apps/server/src/features/calls/call-repository.ts` | Call data queries |
| `apps/dashboard/src/lib/stats/call-stats.ts` | Call statistics helpers |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What data is shown for each call?
2. How are calls filtered (by date, agent, pool)?
3. What call outcomes/statuses exist?
4. Is call duration calculated or stored?
5. How is pagination handled?
6. Can call logs be exported?
7. What visitor info is captured?
8. How long is call data retained?
9. Are there real-time updates to logs?
10. What permissions control call log access?

---

## Specific Edge Cases to Document

- Call log for call that ended abnormally
- Very long call duration display
- Call with no agent assigned (abandoned)
- Filtering produces zero results
- Call log during high volume periods
- Call data from deleted agent
- Call data from deleted pool
- Timezone handling in call timestamps

---

## Output Requirements

1. Create: `docs/features/admin/call-logs.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

