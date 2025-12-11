# Dev Agent: TKT-079 - Add Maximum Recording Duration and File Size Limits

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-079-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-079: Add Maximum Recording Duration and File Size Limits**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-079
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-079-add-maximum-recording-duration`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/webrtc/use-call-recording.ts` | Implement required changes |
| `apps/server/src/features/recordings/recordingManager.ts` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | Implement required changes |

---

## What to Implement

1. Add configurable maximum recording duration (default 4 hours)
2. Display warning when approaching duration limit during active call
3. Add file size monitoring and warnings in recording settings
4. Consider auto-stop or chunking for very long calls

---

## Acceptance Criteria

- [ ] Recording duration limits are configurable per org
- [ ] Users see warnings before hitting limits
- [ ] Storage exhaustion risk is mitigated
- [ ] F-130 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-079-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-079-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-079-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-079-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
