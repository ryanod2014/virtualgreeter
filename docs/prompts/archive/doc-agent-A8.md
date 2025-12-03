# Doc Agent: A8 - Video Recordings

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-A8.md`

---

You are a Documentation Agent. Your job is to document **A8: Video Recordings** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** A8
**Feature Name:** Video Recordings
**Category:** agent
**Output File:** `docs/features/agent/video-recordings.md`

---

## Feature Description

Video recordings playback page where agents (and admins) can watch recorded calls. Includes playback controls, quality options, and synced transcription.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/dashboard/videos/page.tsx` | Videos page |
| `apps/dashboard/src/features/webrtc/use-call-recording.ts` | Recording hook |
| `apps/server/src/lib/transcription-service.ts` | Transcription service |
| `apps/server/src/lib/call-logger.ts` | Call/recording metadata |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How does the video playback interface work?
2. What playback controls are available?
3. Is there transcription synchronized with video?
4. How are videos stored and accessed?
5. Can videos be downloaded?
6. What quality options exist?
7. How long are recordings retained?
8. Are there access controls on recordings?
9. Can recordings be shared?
10. How is playback performance optimized?

---

## Specific Edge Cases to Document

- Recording not yet processed
- Poor quality recording playback
- Very long recording handling
- Transcription sync issues
- Recording from deleted call
- Mobile playback
- Buffering/streaming issues
- Recording access denied

---

## Output Requirements

1. Create: `docs/features/agent/video-recordings.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

