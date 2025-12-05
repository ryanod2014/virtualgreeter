# Dev Agent: TKT-014 - Recording Consent Indicator for Visitors

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-014-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-014: Recording Consent Indicator for Visitors**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-014
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-014-recording-consent-indicator-fo`
**Version:** v1

---

## The Problem

Visitors are recorded with NO indication. No 'This call may be recorded' message. Compliance risk for GDPR, CCPA, two-party consent states.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/widget/src/features/call/CallUI.tsx` | Implement required changes |
| `apps/widget/src/features/call/RecordingBadge.tsx` | Implement required changes |
| `apps/widget/src/styles.css` | Implement required changes |


**Feature Documentation:**
- `docs/features/admin/recording-settings.md`
- `docs/features/visitor/visitor-call.md`



**Similar Code:**
- apps/widget/src/features/call/CallUI.tsx - see Live badge implementation


---

## What to Implement

1. Create RecordingBadge.tsx component
2. Show badge in same location as 'Live' badge during video preview
3. Badge only appears after call connects AND org has recording enabled
4. Badge text: 'Recording' with red dot indicator

---

## Acceptance Criteria

- [ ] 'Recording' indicator appears after call connects
- [ ] Indicator is in same location as 'Live' badge was
- [ ] Only shows when org has recording enabled
- [ ] Badge is visible but not intrusive

---

## Out of Scope

- ❌ Do NOT add consent dialog (just indicator)
- ❌ Do NOT modify recording logic
- ❌ Do NOT add org-level toggle (just use existing recording enabled setting)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Badge should be clearly visible for compliance | Follow existing patterns |
| Don't show badge if recording is disabled for org | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Start call with recording enabled, verify badge shows

---

## QA Notes

Test with recording enabled and disabled orgs. Verify badge visibility on mobile.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-014-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-014-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-014-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-014-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
