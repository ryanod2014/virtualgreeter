# Dev Agent: TKT-051 - Add Gzip Compression for Co-Browse DOM Snapshots

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-051-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-051: Add Gzip Compression for Co-Browse DOM Snapshots**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-051
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-051-add-gzip-compression-for-co-br`
**Version:** v1

---

## The Problem

Large DOM snapshots (>1MB) are sent uncompressed over WebSocket, causing latency and lag in agent co-browse view on complex pages. Mobile/slow connections suffer most.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/widget/src/features/cobrowse/cobrowseSender.ts` | Implement required changes |
| `apps/server/src/features/cobrowse/cobrowseHandler.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/cobrowse-viewer.md`
- `docs/features/visitor/cobrowse-sender.md`



**Similar Code:**
- apps/widget/src/features/cobrowse/cobrowseSender.ts - existing snapshot transmission


---

## What to Implement

1. Add gzip compression to DOM snapshot before sending via WebSocket
2. Add decompression on server/viewer side
3. Add DOM size monitoring to log large payloads

---

## Acceptance Criteria

- [ ] DOM snapshots are gzip compressed before transmission
- [ ] Server correctly decompresses snapshots
- [ ] Agent viewer displays decompressed content correctly
- [ ] Payload size reduced by ~70% for typical pages
- [ ] Large DOM (>500KB) logged for monitoring

---

## Out of Scope

- ❌ Do NOT implement delta/diff encoding (separate ticket)
- ❌ Do NOT modify canvas capture
- ❌ Do NOT change snapshot frequency

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Compression adds CPU overhead - test on mobile devices | Follow existing patterns |
| Browser compatibility for compression APIs | Follow existing patterns |
| Ensure fallback for browsers without CompressionStream | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Load complex page, verify compressed payloads in Network tab

---

## QA Notes

Test with data-heavy dashboards and chart-heavy pages. Compare payload sizes before/after.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-051-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-051-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-051-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-051-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
