# Dev Agent: TKT-104 - Widget Not Disabled During Pause

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-104-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-104: Widget Not Disabled During Pause**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-104
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-104-widget-not-disabled-during-pau`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/socket/socket-handlers.ts` | Implement required changes |
| `apps/widget/src/features/webrtc/LiveCallView.tsx` | Implement required changes |

---

## What to Implement

1. Add subscription_status check in VISITOR_JOIN handler
2. Reject widget initialization for paused organizations
3. Return appropriate error message to widget
4. Add test coverage for paused organization widget behavior

---

## Acceptance Criteria

- [ ] Widget does not show for paused organizations
- [ ] VISITOR_JOIN handler checks subscription_status
- [ ] Appropriate error message shown to visitors
- [ ] F-285 is resolved

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| (Low risk) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-104-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-104-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-104-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-104-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
