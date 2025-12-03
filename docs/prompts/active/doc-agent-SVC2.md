# Doc Agent: SVC2 - Transcription Service

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SVC2.md`

---

You are a Documentation Agent. Your job is to document **SVC2: Transcription Service** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SVC2
**Feature Name:** Transcription Service
**Category:** platform
**Output File:** `docs/features/platform/transcription-service.md`

---

## Feature Description

Automatic call transcription service that converts recorded call audio to text. Used for call searchability, compliance, and quality analysis.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/server/src/lib/transcription-service.ts` | Transcription logic |
| `apps/dashboard/src/app/api/transcription/process/route.ts` | Transcription API |
| `apps/dashboard/src/app/(app)/dashboard/videos/page.tsx` | Transcription display |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What transcription provider is used?
2. When is transcription triggered?
3. How long does transcription take?
4. What languages are supported?
5. How accurate is transcription?
6. Is there speaker diarization?
7. How is transcription stored?
8. Can transcription be edited/corrected?
9. Is transcription searchable?
10. What's the cost per minute?

---

## Specific Edge Cases to Document

- Poor audio quality transcription
- Multiple speakers/crosstalk
- Technical jargon handling
- Very long call transcription
- Transcription processing failure
- Multiple languages in one call
- Background noise handling
- Transcription access controls

---

## Output Requirements

1. Create: `docs/features/platform/transcription-service.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

