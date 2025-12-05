# Dev Agent: TKT-015 - Secure Recording URLs with Signed Access

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-015-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-015: Secure Recording URLs with Signed Access**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-015
**Priority:** High
**Difficulty:** Hard
**Branch:** `agent/tkt-015-secure-recording-urls-with-sig`
**Version:** v1

---

## The Problem

Recording uploads go to public Supabase bucket with predictable URL patterns. Anyone who guesses the pattern can access recordings without auth. HIPAA/GDPR compliance risk.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/recordings/uploadRecording.ts` | Implement required changes |
| `apps/server/src/features/recordings/getRecordingUrl.ts` | Implement required changes |
| `apps/dashboard/src/features/recordings/RecordingPlayer.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/video-recordings.md`



**Similar Code:**
- apps/server/src/features/recordings/uploadRecording.ts - current upload logic


---

## What to Implement

1. Create new private Supabase bucket for recordings
2. Upload new recordings to private bucket with randomized UUIDs
3. Generate signed URLs with 1-hour expiration for playback
4. Add URL refresh mechanism for long viewing sessions

---

## Acceptance Criteria

- [ ] New recordings go to private bucket
- [ ] Recording URLs are signed with 1-hour expiration
- [ ] URLs contain randomized UUIDs (not predictable org/call pattern)
- [ ] Playback works with signed URLs
- [ ] URL refreshes automatically if user watches longer than 1 hour

---

## Out of Scope

- ❌ Do NOT migrate existing recordings (separate migration task)
- ❌ Do NOT modify recording playback UI beyond URL handling

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Signed URLs must have reasonable expiration (not too short/long) | Follow existing patterns |
| Handle URL refresh for long viewing sessions | Follow existing patterns |
| Test download functionality still works | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Upload recording, verify URL is signed and expires

---

## QA Notes

Test playback after URL expiration. Verify refresh mechanism works. Test download button.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-015-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-015-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-015-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-015-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
