# Doc Agent: D11 - Recording Settings

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D11.md`

---

You are a Documentation Agent. Your job is to document **D11: Recording Settings** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D11
**Feature Name:** Recording Settings
**Category:** admin
**Output File:** `docs/features/admin/recording-settings.md`

---

## Feature Description

Call recording configuration including enabling/disabling recordings, storage settings, retention policies, and compliance options.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | Recording settings UI |
| `apps/dashboard/src/app/(app)/admin/settings/recordings/page.tsx` | Recording settings page |
| `apps/dashboard/src/features/webrtc/use-call-recording.ts` | Recording implementation |
| `apps/server/src/lib/call-settings.ts` | Call settings including recording |
| `apps/server/src/lib/call-logger.ts` | Call logging with recording status |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How does an admin enable/disable call recording?
2. Is recording per-pool or org-wide?
3. Where are recordings stored?
4. What is the retention policy?
5. How large are typical recordings?
6. Is there a consent notification for visitors?
7. Can agents pause/resume recording?
8. How are recordings accessed/downloaded?
9. What formats are recordings saved in?
10. Are there compliance features (HIPAA, GDPR)?

---

## Specific Edge Cases to Document

- Recording fails mid-call
- Storage quota exceeded
- Long call recording handling
- Recording with poor connection quality
- Simultaneous recording and cobrowse
- Recording deleted before retention period
- Recording access audit trail
- Recording playback with transcription sync

---

## Output Requirements

1. Create: `docs/features/admin/recording-settings.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

