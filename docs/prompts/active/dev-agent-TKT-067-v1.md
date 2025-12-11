# Dev Agent: TKT-067 - Add Exponential Backoff to Widget Verification Polling

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-067-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-067: Add Exponential Backoff to Widget Verification Polling**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-067
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-067-add-exponential-backoff-to-wid`
**Version:** v1

---

## The Problem

Dashboard polls every 5 seconds indefinitely until widget is verified, causing unnecessary load. Quote: 'Polls forever until verified' with ⚠️ flag. This wastes server resources and creates unnecessary database queries for installations that take hours or days to complete.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/sites/[siteId]/verification-status.tsx` | Implement required changes |

**Feature Documentation:**
- `docs/features/admin/sites-setup.md`

---

## What to Implement

1. Implement exponential backoff: Start at 5s, then 10s, 30s, 60s
2. After 5 minutes of polling, stop automatic polling
3. Show 'Click to check again' button after polling stops
4. Preserve current behavior for first 5 minutes (fast feedback)

---

## Acceptance Criteria

- [ ] Polling starts at 5 second intervals
- [ ] After 1 minute, increases to 10s intervals
- [ ] After 3 minutes, increases to 30s intervals
- [ ] After 5 minutes, increases to 60s intervals
- [ ] After 10 minutes, polling stops and shows manual check button
- [ ] Button click triggers immediate check and resumes polling

---

## Out of Scope

- ❌ Do NOT change the verification endpoint logic
- ❌ Do NOT modify how widget installation works

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't break fast verification UX for quick installations | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Leave widget unverified and monitor polling intervals. Verify button appears and works after timeout.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-067-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-067-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-067-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-067-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
