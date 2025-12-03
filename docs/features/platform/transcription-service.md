# Feature: Transcription Service (SVC2)

## Quick Summary
The Transcription Service automatically converts call recording audio to text using Deepgram Nova-2, and optionally generates AI-powered summaries using OpenAI GPT-4o-mini. Transcriptions and summaries are stored in the call log and displayed in the Call Logs UI for both agents and admins.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Transcription Service enables organizations to automatically transcribe recorded video calls to searchable text and generate AI-powered summaries for quick call review. This helps with:
- Quick call review without watching entire recordings
- Compliance and record-keeping
- Quality analysis and training
- Sales call documentation with structured summaries

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Quick overview of all calls | AI summaries provide structured call highlights |
| Admin | Control transcription costs | Toggle feature on/off per organization |
| Admin | Custom summary format | Configurable AI summary prompt template |
| Agent | Review their own calls | Expandable transcription in call logs |
| Agent | Understand call outcomes | AI summary with key discussion points |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Call recording is uploaded to Supabase storage after call ends
2. `use-call-recording.ts` fires POST to `/api/transcription/process` (fire-and-forget)
3. Server checks if transcription is enabled for the organization
4. Server marks call as `transcription_status: "processing"`
5. Audio is sent to Deepgram API for transcription
6. Transcription saved to `call_logs.transcription`
7. If AI summary enabled, transcription sent to OpenAI
8. AI summary saved to `call_logs.ai_summary`
9. Usage recorded in `usage_records` table for billing

### State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSCRIPTION FLOW                        │
└─────────────────────────────────────────────────────────────┘

Call Ends
    │
    ▼
Recording Uploaded
    │
    ├──► Transcription Disabled? ───► STOP (no transcription)
    │
    ▼
[pending] ───► [processing] ───┬──► [completed] ───► AI Summary?
                               │                          │
                               └──► [failed]              ├──► Yes ───► AI Processing
                                                          │
                                                          └──► No ───► DONE

AI Summary Flow:
[pending] ───► [processing] ───┬──► [completed] ───► DONE
                               │
                               └──► [failed]
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `null` | Transcription not started | Initial state | Transcription triggered |
| `processing` | Transcription in progress | API call started | API response received |
| `completed` | Transcription successful | API returned transcript | Terminal state |
| `failed` | Transcription failed | API error or no result | Terminal state |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Recording Upload Complete | `use-call-recording.ts:283-295` | POST to `/api/transcription/process` | Fire-and-forget, non-blocking |
| transcription_enabled check | API route | Validates org settings | Skips if disabled |
| Deepgram API call | `transcribeWithDeepgram()` | Sends audio URL to Deepgram | External API call |
| OpenAI API call | `generateAISummary()` | Sends transcript to GPT-4o-mini | External API call |
| Usage record insert | After each successful step | Records cost for billing | DB write to `usage_records` |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `transcribeWithDeepgram()` | `apps/server/src/lib/transcription-service.ts` | Calls Deepgram API |
| `generateAISummary()` | `apps/server/src/lib/transcription-service.ts` | Calls OpenAI API |
| `processCallRecording()` | `apps/server/src/lib/transcription-service.ts` | Main orchestration function |
| `POST /api/transcription/process` | `apps/dashboard/src/app/api/transcription/process/route.ts` | Dashboard API endpoint |
| `useCallRecording` | `apps/dashboard/src/features/webrtc/use-call-recording.ts` | Triggers processing after upload |
| `RecordingSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | Admin settings UI |
| `CallLogRow` | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Displays transcription/summary |

### Data Flow

```
CALL ENDS & RECORDING UPLOADED
    │
    ├─► useCallRecording.stopRecording()
    │   ├─► Upload blob to Supabase storage (recordings bucket)
    │   ├─► Update call_logs.recording_url
    │   └─► Fire POST /api/transcription/process (fire-and-forget)
    │
    └─► API Route: /api/transcription/process
        │
        ├─► Fetch call_logs with organizations.recording_settings
        │
        ├─► Check: transcription_enabled?
        │   └─► If false: return "Transcription not enabled for org"
        │
        ├─► Check: already processed/processing?
        │   └─► If yes: return early with current status
        │
        ├─► Update: transcription_status = "processing"
        │
        ├─► Call Deepgram API
        │   URL: https://api.deepgram.com/v1/listen
        │   Params: model=nova-2&smart_format=true&diarize=true&punctuate=true
        │   Body: { url: recording_url }
        │
        ├─► On Success:
        │   ├─► Calculate cost: duration_minutes * $0.01
        │   ├─► Update call_logs:
        │   │   - transcription = result text
        │   │   - transcription_status = "completed"
        │   │   - transcription_duration_seconds
        │   │   - transcription_cost
        │   │   - transcribed_at
        │   └─► Insert usage_records (type: "transcription")
        │
        ├─► On Failure:
        │   └─► Update call_logs:
        │       - transcription_status = "failed"
        │       - transcription_error = error message
        │
        └─► If ai_summary_enabled:
            │
            ├─► Update: ai_summary_status = "processing"
            │
            ├─► Call OpenAI API
            │   Model: gpt-4o-mini
            │   System: Summary format instructions
            │   User: Transcription + format template
            │   Temperature: 0.3
            │   Max tokens: 2000
            │
            ├─► On Success:
            │   ├─► Calculate cost: duration_minutes * $0.02
            │   ├─► Update call_logs:
            │   │   - ai_summary = result text
            │   │   - ai_summary_status = "completed"
            │   │   - ai_summary_cost
            │   │   - summarized_at
            │   └─► Insert usage_records (type: "ai_summary")
            │
            └─► On Failure:
                └─► Update call_logs:
                    - ai_summary_status = "failed"
                    - ai_summary_error = error message
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - transcription only | Recording uploaded, AI disabled | Transcription saved | ✅ | |
| 2 | Happy path - with AI summary | Recording uploaded, both enabled | Both saved | ✅ | |
| 3 | Transcription disabled for org | Recording uploaded | Skipped entirely | ✅ | Returns early |
| 4 | Recording already processed | Duplicate request | Returns current status | ✅ | Prevents duplicates |
| 5 | Recording already processing | Duplicate request | Returns "processing" | ✅ | |
| 6 | No recording URL on call_log | Process requested | Returns error | ✅ | |
| 7 | Deepgram API key missing | Process requested | Returns error | ✅ | Env var check |
| 8 | OpenAI API key missing | Summary requested | Summary fails only | ✅ | Transcription succeeds |
| 9 | Deepgram returns empty transcript | Poor audio quality | Marks as failed | ✅ | "No transcription returned" |
| 10 | Deepgram API timeout/error | Network issue | Marks as failed | ✅ | Error logged |
| 11 | OpenAI API error | Rate limit/error | Summary fails, transcription OK | ✅ | Independent |
| 12 | Very long call (>30 min) | Extended conversation | Processes normally | ✅ | Linear cost scaling |
| 13 | Custom AI summary format | Admin configured | Uses custom format | ✅ | Falls back to default |
| 14 | Empty/null custom format | Admin cleared it | Uses default format | ✅ | `customFormat \|\| DEFAULT` |
| 15 | Call log not found | Invalid callLogId | Returns 404 | ✅ | |
| 16 | Missing callLogId in request | Bad request | Returns 400 | ✅ | Validation |
| 17 | Multiple speakers/crosstalk | Complex conversation | Diarization enabled | ✅ | `diarize=true` |
| 18 | Background noise | Noisy environment | Smart format helps | ⚠️ | Accuracy may vary |
| 19 | Non-English audio | Foreign language | Transcribed | ⚠️ | Nova-2 multilingual |
| 20 | Technical jargon | Industry terms | Best-effort | ⚠️ | No custom vocabulary |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| DEEPGRAM_API_KEY not configured | Server startup | transcription_status: "failed" | Admin adds API key |
| OPENAI_API_KEY not configured | Summary requested | ai_summary_status: "failed" | Admin adds API key |
| Deepgram API error | API returns non-200 | transcription_status: "failed" | Retry (manual) |
| OpenAI API error | API returns non-200 | ai_summary_status: "failed" | Retry (manual) |
| No transcription returned | Empty/silent audio | transcription_status: "failed" | None - audio issue |
| No summary returned | OpenAI returned empty | ai_summary_status: "failed" | Retry (manual) |
| Call log not found | Invalid ID | API returns 404 | None - data issue |
| Supabase not configured | Missing env vars | Process fails silently | Admin fixes config |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Admin Call Logs (`/admin/calls`):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View call logs table | See Transcription/AI Summary columns | ✅ | |
| 2 | See "Processing" badge | Spinner + "Transcribing" text | ✅ | |
| 3 | See "Completed" badge | Clickable "Transcription" button | ✅ | |
| 4 | Click transcription button | Expandable row shows full text | ✅ | |
| 5 | See "AI Summary" button | Expandable row with formatted summary | ✅ | |
| 6 | See "Failed" badge | Red warning badge | ✅ | No retry button |

**Agent Call Logs (`/dashboard/calls`):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View own calls | Same transcription/summary columns | ✅ | |
| 2 | Expand transcription | Full text view | ✅ | |
| 3 | Expand AI summary | Formatted summary | ✅ | |

**Admin Settings (`/admin/settings/recordings`):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Toggle transcription on/off | Switch changes state | ✅ | |
| 2 | Toggle AI summary on/off | Requires transcription enabled | ✅ | |
| 3 | Edit custom format | Large text area | ✅ | |
| 4 | See pricing info | $0.01/min + $0.02/min shown | ✅ | |
| 5 | Save settings | Success toast | ✅ | |

### Accessibility
- Keyboard navigation: ⚠️ Not verified
- Screen reader support: ⚠️ Not verified
- Color contrast: ✅ Status badges have distinct colors
- Loading states: ✅ Spinner shown during processing

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| API latency | Fire-and-forget pattern | ✅ Non-blocking |
| Long audio processing | Background async | ✅ No user waiting |
| Database writes | Sequential updates | ✅ Acceptable |
| Usage record inserts | Per-operation | ✅ Acceptable |

### Security
| Concern | Mitigation |
|---------|------------|
| API key exposure | Server-side only via env vars |
| Recording URL access | Supabase storage with org isolation |
| Transcription access | Only visible to org members |
| AI summary content | Generated from transcription only |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Deepgram outage | Marks as failed, no retry |
| OpenAI outage | Transcription still works |
| Duplicate processing | Status check prevents re-processing |
| Lost transcription trigger | Fire-and-forget (no guaranteed delivery) |

### Potential Issues Found

#### ⚠️ Issue 1: No Retry Mechanism
If Deepgram or OpenAI fails, there's no automatic retry. Users must wait for next recording or manual intervention.

**Impact**: Medium - Failed transcriptions require manual re-trigger
**Status**: Open

#### ⚠️ Issue 2: Fire-and-Forget Delivery
The transcription trigger from `use-call-recording.ts` is fire-and-forget. If the API call fails, no record of the failure exists.

**Impact**: Low - Recording still saved, transcription can be triggered later
**Status**: Open

#### ⚠️ Issue 3: No Transcription Search
Transcriptions are stored as text but there's no UI to search across transcriptions.

**Impact**: Low - Feature gap, not a bug
**Status**: Open

#### ⚠️ Issue 4: No Transcription Editing
Users cannot correct transcription errors.

**Impact**: Low - Read-only by design
**Status**: Open

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Recording → Transcription → Summary is intuitive
2. **Is the control intuitive?** ✅ Yes - Simple toggles in settings
3. **Is feedback immediate?** ⚠️ Partially - Processing indicator shown, but async
4. **Is the flow reversible?** ⚠️ No - Cannot re-trigger failed transcriptions from UI
5. **Are errors recoverable?** ⚠️ Partially - No retry button, but can check status
6. **Is the complexity justified?** ✅ Yes - Background processing appropriate for this task

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No retry mechanism | Failed transcriptions stuck | 🟡 Medium | Add "Retry" button in UI |
| No search functionality | Can't find calls by content | 🟢 Low | Add full-text search |
| Fire-and-forget trigger | Possible missed transcriptions | 🟢 Low | Add queue/retry logic |
| No manual trigger | Can't transcribe old recordings | 🟢 Low | Add "Transcribe" button |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Transcription service core | `apps/server/src/lib/transcription-service.ts` | 1-367 | Main transcription logic |
| Deepgram API call | `apps/server/src/lib/transcription-service.ts` | 71-120 | Nova-2 with diarization |
| OpenAI API call | `apps/server/src/lib/transcription-service.ts` | 125-183 | GPT-4o-mini |
| Process orchestration | `apps/server/src/lib/transcription-service.ts` | 189-340 | Full flow |
| Dashboard API route | `apps/dashboard/src/app/api/transcription/process/route.ts` | 1-339 | POST handler |
| Transcription trigger | `apps/dashboard/src/features/webrtc/use-call-recording.ts` | 281-295 | Fire-and-forget POST |
| Admin settings UI | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | 1-428 | Config toggles |
| Admin call logs display | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | 992-1317 | CallLogRow component |
| Agent call logs display | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | 750-1039 | CallLogRow component |
| RecordingSettings type | `packages/domain/src/database.types.ts` | 49-60 | Settings interface |
| Pricing constants | `packages/domain/src/database.types.ts` | 62-64 | Cost per minute |
| Default AI format | `apps/server/src/lib/transcription-service.ts` | 14-38 | Sales call template |

---

## 9. RELATED FEATURES
- [Call Lifecycle (P3)](./call-lifecycle.md) - When calls are created and recording starts
- [Call Logs (D7)](../admin/call-logs.md) - Where transcriptions are displayed
- [Organization Settings (D8)](../admin/organization-settings.md) - Where transcription is enabled
- [Agent Active Call (A4)](../agent/agent-active-call.md) - Recording happens here

---

## 10. OPEN QUESTIONS

1. **What is the maximum audio length supported?** Deepgram has no hard limit, but cost scales linearly. Very long calls (4+ hours) may timeout.

2. **Is there a queue for processing?** No - each transcription is processed immediately on request. High volume could hit Deepgram rate limits.

3. **Should failed transcriptions be retryable from UI?** Currently no retry mechanism exists. Would improve UX.

4. **Should transcriptions be searchable?** Currently stored as text but no search UI. Full-text search would add value.

5. **Should historical recordings be transcribable?** Currently only auto-triggered after new recordings. Manual trigger would help.

6. **What happens if Supabase is down during processing?** Database writes would fail, but no retry mechanism exists.

7. **Are there plans for real-time transcription?** Current implementation is post-call only. Real-time would require different architecture.

8. **Should custom vocabulary be supported?** Deepgram supports custom vocabulary for domain-specific terms. Not currently implemented.

