# Dev Agent: TKT-024 - Visitor Call Reconnection Window

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-024-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-024: Visitor Call Reconnection Window**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-024
**Priority:** High
**Difficulty:** Hard
**Branch:** `agent/tkt-024-visitor-call-reconnection-wind`
**Version:** v1

---

## The Problem

If visitor disconnects mid-call (browser crash, accidental close), call ends permanently. No way to rejoin. Different from TKT-016 (WebRTC) which handles network blips.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/calls/callLifecycle.ts` | Implement required changes |
| `apps/widget/src/features/call/useCallSession.ts` | Implement required changes |
| `apps/widget/src/features/call/RejoinPrompt.tsx` | Implement required changes |
| `apps/server/src/features/signaling/handleRejoin.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/visitor/visitor-call.md`
- `docs/features/platform/call-lifecycle.md`
- `docs/features/visitor/call-reconnection.md`



**Similar Code:**
- apps/widget/src/features/call/useCallSession.ts - call state management


---

## What to Implement

1. Store session token in localStorage on call start
2. Add 60-second reconnection window on disconnect
3. Show RejoinPrompt when returning with valid session
4. Agent sees 'Visitor disconnected - waiting for reconnection' status

---

## Acceptance Criteria

- [ ] Visitor who crashes browser can rejoin within 60 seconds
- [ ] Session token persists in localStorage
- [ ] Agent sees 'Visitor disconnected - waiting' status
- [ ] After 60 seconds, call truly ends
- [ ] Rejoin continues from same call state (not new call)

---

## Out of Scope

- ❌ Do NOT modify WebRTC ICE restart (TKT-016 handles that)
- ❌ Do NOT add call history feature

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Session token security - ensure it's unique and expires | Follow existing patterns |
| Handle agent ending call during reconnection window | Follow existing patterns |
| Clear localStorage token after call ends | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Start call, close browser, reopen within 60s, verify rejoin

---

## QA Notes

Test actual browser crash/close scenarios. Test timeout behavior at exactly 60 seconds.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-024-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-024-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-024-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-024-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
