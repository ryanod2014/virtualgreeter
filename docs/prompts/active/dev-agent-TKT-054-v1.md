# Dev Agent: TKT-054 - Move CSV Export to Web Worker

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-054-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-054: Move CSV Export to Web Worker**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-054
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-054-move-csv-export-to-web-worker`
**Version:** v1

---

## The Problem

CSV generation happens client-side and blocks the UI thread. Large exports (1000+ rows) may freeze the browser and show "page unresponsive" warnings.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/call-logs/exportCSV.ts` | Implement required changes |
| `apps/dashboard/src/features/call-logs/csvWorker.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/call-logs.md`



---

## What to Implement

1. Create Web Worker for CSV generation
2. Move row formatting logic to worker
3. Show progress indicator during export
4. Handle worker errors gracefully

---

## Acceptance Criteria

- [ ] Export button remains responsive during CSV generation
- [ ] Progress indicator shows export status
- [ ] Large exports (5000+ rows) complete without UI freeze
- [ ] Error handling shows user-friendly message if export fails

---

## Out of Scope

- ❌ Do NOT change CSV format or columns
- ❌ Do NOT modify call logs data fetching

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Worker bundling may require vite/webpack config changes | Follow existing patterns |
| Progress tracking adds complexity | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Export 1000+ rows, verify no UI freeze

---

## QA Notes

Test with org that has many call logs. Verify export completes and download starts.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-054-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-054-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-054-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-054-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
