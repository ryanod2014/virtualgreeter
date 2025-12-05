# Dev Agent: TKT-019 - Sync Incoming Call Countdown with RNA Timeout

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-019-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-019: Sync Incoming Call Countdown with RNA Timeout**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-019
**Priority:** High
**Difficulty:** Easy
**Branch:** `agent/tkt-019-sync-incoming-call-countdown-w`
**Version:** v1

---

## The Problem

Incoming call modal shows hardcoded 30-second countdown, but RNA timeout fires at 15 seconds (org-configured). Agents think they have more time and get unexpectedly marked away.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/incoming-call/incoming-call-modal.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/incoming-call.md`
- `docs/features/agent/rna-timeout.md`



**Similar Code:**
- apps/dashboard/src/features/incoming-call/incoming-call-modal.tsx - current modal


---

## What to Implement

1. Fetch org's RNA timeout value when call comes in
2. Use org timeout value for countdown display instead of hardcoded 30s

---

## Acceptance Criteria

- [ ] Countdown matches org's RNA timeout setting
- [ ] Countdown and RNA timeout fire at the same moment
- [ ] Works correctly for different org configurations (15s, 25s, 30s)

---

## Out of Scope

- ❌ Do NOT modify RNA timeout logic on server
- ❌ Do NOT change org settings for timeout
- ❌ Do NOT add countdown customization UI

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Simple fix - just syncing UI with existing server value | Follow existing patterns |
| Ensure countdown starts at correct value | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Set org timeout to 15s, verify countdown shows 15s

---

## QA Notes

Test with various org timeout settings (15s, 20s, 30s). Verify countdown accuracy.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-019-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-019-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-019-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-019-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
