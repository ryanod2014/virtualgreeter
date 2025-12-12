# Dev Agent: TKT-016 - WebRTC ICE Restart on Connection Failure

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-016-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-016: WebRTC ICE Restart on Connection Failure**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-016
**Priority:** High
**Difficulty:** Hard
**Branch:** `agent/tkt-016-webrtc-ice-restart-on-connecti`
**Version:** v1

---

## The Problem

When WebRTC connection fails mid-call (network glitch, NAT timeout), agent must manually end and start new call. Customer may be lost.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/call/useWebRTC.ts` | Implement required changes |
| `apps/widget/src/features/call/useWebRTC.ts` | Implement required changes |
| `apps/server/src/features/signaling/handleIceRestart.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/agent-active-call.md`
- `docs/features/platform/webrtc-signaling.md`



**Similar Code:**
- apps/dashboard/src/features/call/useWebRTC.ts - existing WebRTC hook


---

## What to Implement

1. Detect ICE connection failure state
2. Attempt ICE restart up to 3 times before showing error
3. Show 'Reconnecting...' status during restart attempts
4. Log all reconnection attempts for debugging

---

## Acceptance Criteria

- [ ] ICE failure triggers automatic restart attempt
- [ ] Up to 3 restart attempts before showing error
- [ ] User sees 'Reconnecting...' status during attempts
- [ ] If all attempts fail, graceful error message shown
- [ ] Reconnection events logged for debugging

---

## Out of Scope

- ❌ Do NOT modify initial call setup
- ❌ Do NOT change TURN server configuration
- ❌ Do NOT add call quality metrics

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| ICE restart has browser-specific quirks - test Chrome, Safari, Firefox | Follow existing patterns |
| Set max retry attempts to avoid infinite loop | Follow existing patterns |
| May need TURN server failover for some cases | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Simulate network disconnect during call, verify reconnection

---

## QA Notes

Test with actual network disconnect (airplane mode on mobile). Test across browsers.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-016 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-016.md` then `./scripts/agent-cli.sh update-ticket TKT-016 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

