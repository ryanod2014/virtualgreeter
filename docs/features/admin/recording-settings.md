# Feature: Recording Settings (D11)

## Quick Summary
Recording Settings allows admins to configure call recording, transcription, and AI-powered call summarization for their organization. When enabled, all video calls are automatically recorded, stored, and can optionally be transcribed with AI summaries generated.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Recording Settings provides organization admins control over call recording behavior, enabling them to:
- Capture video calls for quality assurance and training
- Auto-transcribe calls for searchability and review
- Generate AI summaries of calls in customizable formats
- Manage storage costs through retention policies
- Comply with data privacy regulations via consent notices

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Review calls for quality assurance | Enable recording to capture all calls |
| Admin | Search call content | Enable transcription to convert audio to searchable text |
| Admin | Quick call summaries | Enable AI summary with custom format |
| Admin | Control storage costs | Set retention period (7 days to forever) |
| Admin | Meet compliance requirements | Privacy warning displayed when recording enabled |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Settings → Call Recording
2. Admin toggles "Enable Recording" on
3. Admin reviews privacy notice
4. Admin selects retention period (default 30 days)
5. Admin optionally enables transcription ($0.01/min)
6. Admin optionally enables AI summary ($0.02/min)
7. Admin customizes AI summary format (optional)
8. Admin clicks "Save Changes"
9. Settings stored in `organizations.recording_settings`
10. All subsequent calls are recorded automatically

### State Machine

```
                       ┌──────────────┐
                       │   Disabled   │
                       │ (recording:  │
                       │   false)     │
                       └──────┬───────┘
                              │ Admin enables
                              ▼
                       ┌──────────────┐
                       │   Enabled    │ ◄──── Recording only
                       │ (recording:  │       No transcription
                       │   true)      │
                       └──────┬───────┘
                              │ Admin enables transcription
                              ▼
                       ┌──────────────┐
                       │ Transcription│ ◄──── Recording + Transcription
                       │   Enabled    │       $0.01/min
                       └──────┬───────┘
                              │ Admin enables AI summary
                              ▼
                       ┌──────────────┐
                       │  AI Summary  │ ◄──── Full features
                       │   Enabled    │       $0.03/min total
                       └──────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Disabled | No recording | Initial state / toggle off | Toggle "Enable Recording" on |
| Recording Only | Calls recorded, no transcription | Enable recording | Enable transcription or disable recording |
| Transcription Enabled | Calls recorded and transcribed | Enable transcription toggle | Enable AI summary or disable transcription |
| AI Summary Enabled | Full feature set active | Enable AI summary toggle | Disable AI summary |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Save Settings | Recording Settings UI | Updates `organizations.recording_settings` | Cache cleared server-side |
| Call Ends | Agent dashboard | `stopRecording()` called | Recording uploaded to storage |
| Recording Upload | `/api/recordings/upload` | Uploads WebM with random UUID to private bucket | Updates `call_logs.recording_url` with UUID only |
| Transcription Trigger | Recording upload completion | POST to `/api/transcription/process` | Deepgram API called |
| Transcription Complete | API route | Stores transcription in call_logs | Usage record created |
| AI Summary Trigger | After transcription | OpenAI API called | Summary stored in call_logs |
| Retention Cleanup | Daily cron (3 AM UTC) | `delete_expired_recordings()` runs | Old recording URLs cleared |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `RecordingSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | Settings UI component |
| `useCallRecording` | `apps/dashboard/src/features/webrtc/use-call-recording.ts` | Recording hook for agent dashboard |
| `startRecording` | `use-call-recording.ts` | Starts MediaRecorder with video composite |
| `stopRecording` | `use-call-recording.ts` | Stops recording, uploads to storage |
| `POST /api/transcription/process` | `apps/dashboard/src/app/api/transcription/process/route.ts` | API route for transcription processing |
| `transcribeWithDeepgram` | `transcription-service.ts` | Deepgram API integration |
| `generateAISummary` | `transcription-service.ts` | OpenAI API integration |
| `delete_expired_recordings` | Database function | Cron job for retention cleanup |

### Data Flow

```
RECORDING SETTINGS SAVE
    │
    ├─► RecordingSettingsClient: setSettings(newSettings)
    │
    ├─► Supabase: UPDATE organizations SET recording_settings = {...}
    │       ├─► enabled: boolean
    │       ├─► retention_days: number (-1 = forever)
    │       ├─► transcription_enabled: boolean
    │       ├─► ai_summary_enabled: boolean
    │       └─► ai_summary_prompt_format: string | null
    │
    └─► UI: Show success toast

CALL RECORDING FLOW
    │
    ├─► Agent accepts call
    │
    ├─► useCallRecording.startRecording(localStream, remoteStream)
    │   ├─► Check isRecordingEnabled (from org settings)
    │   ├─► Create AudioContext for mixing
    │   ├─► Create canvas (1280x480) for side-by-side video
    │   │       ├─► Left side (0-640): Remote video (Visitor)
    │   │       └─► Right side (640-1280): Local video (Agent)
    │   ├─► Create MediaRecorder (WebM/VP9, 2.5 Mbps)
    │   └─► Start recording with 1s chunk intervals
    │
    ├─► Call ends
    │
    └─► stopRecording()
        ├─► Stop MediaRecorder
        ├─► Create Blob from chunks
        ├─► POST /api/recordings/upload with blob
        │       └─► Server generates UUID, stores at: {orgId}/{uuid}.webm
        ├─► Update call_logs.recording_url with UUID only (not full path)
        └─► Trigger transcription (fire-and-forget POST)

TRANSCRIPTION FLOW
    │
    ├─► POST /api/transcription/process { callLogId }
    │
    ├─► Fetch call_log with org settings
    │
    ├─► Check: recording_url exists?
    │       └─► No: return early
    │
    ├─► Check: transcription_enabled?
    │       └─► No: return "not enabled"
    │
    ├─► Update: transcription_status = "processing"
    │
    ├─► Deepgram API call
    │   ├─► model: nova-2
    │   ├─► smart_format: true
    │   ├─► diarize: true (speaker identification)
    │   └─► punctuate: true
    │
    ├─► On success:
    │   ├─► Store transcription text
    │   ├─► Calculate cost: duration_minutes × $0.01
    │   ├─► Update call_logs (transcription, status, cost)
    │   └─► Insert usage_record
    │
    └─► If ai_summary_enabled:
        ├─► Update: ai_summary_status = "processing"
        ├─► OpenAI API call (gpt-4o-mini)
        │   ├─► System prompt: Follow format exactly
        │   └─► User prompt: Transcription + Format template
        ├─► Calculate cost: duration_minutes × $0.02
        ├─► Update call_logs (ai_summary, status, cost)
        └─► Insert usage_record
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - recording only | Enable recording, save | All calls recorded | ✅ | |
| 2 | Happy path - with transcription | Enable both, save | Recording + transcription | ✅ | |
| 3 | Happy path - full features | Enable all three, save | Recording + transcription + AI summary | ✅ | |
| 4 | Enable transcription without recording | Toggle transcription | Toggle disabled (greyed out) | ✅ | Transcription depends on recording |
| 5 | Enable AI summary without transcription | Toggle AI summary | Toggle disabled (greyed out) | ✅ | AI summary depends on transcription |
| 6 | Disable transcription when AI summary enabled | Toggle transcription off | AI summary auto-disabled | ✅ | Cascading disable |
| 7 | Disable recording when both enabled | Toggle recording off | All features disabled | ✅ | Cascading disable |
| 8 | Save without changes | Click save | Button disabled | ✅ | `hasChanges` check |
| 9 | Retention set to "Forever" | Select -1 retention | No auto-deletion | ✅ | Special case in cleanup function |
| 10 | Recording fails mid-call | MediaRecorder error | Error logged, recording state reset | ✅ | `onerror` handler |
| 11 | Recording upload fails | Storage upload error | `recordingError` state set, URL null | ✅ | Returns null |
| 12 | Transcription API fails | Deepgram error | `transcription_status = "failed"`, error stored | ✅ | |
| 13 | AI Summary API fails | OpenAI error | `ai_summary_status = "failed"`, error stored | ✅ | Transcription still saved |
| 14 | No callLogId available | Call not logged | Recording skipped | ✅ | Check in `startRecording` |
| 15 | Already transcribed call | Re-trigger processing | Returns "Already processed" | ✅ | Status check prevents duplicates |
| 16 | Very long call (2+ hours) | Max duration timeout | Recording continues until call ends | ✅ | No recording limit |
| 17 | Empty recording (0 bytes) | Recording error | Upload skipped | ✅ | Size check before upload |
| 18 | Custom AI format with empty text | Save blank format | Uses default format | ✅ | Null coalescing |
| 19 | Non-admin accesses page | Direct URL | Redirected to /dashboard | ✅ | Auth check in page.tsx |
| 20 | Agent refreshes during recording | Page refresh | Recording lost | ⚠️ | No recovery mechanism |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| SAVE_FAILED | Supabase update error | "Failed to save settings. Please try again." | Retry save |
| RECORDING_FAILED | MediaRecorder error | Error logged in console | Next call works normally |
| UPLOAD_FAILED | Storage upload error | Recording lost, no URL in call log | No recovery |
| TRANSCRIPTION_FAILED | Deepgram API error | "Failed" badge in call logs | Manual re-trigger possible |
| AI_SUMMARY_FAILED | OpenAI API error | "Summary Failed" badge | Transcription still available |
| DEEPGRAM_NOT_CONFIGURED | Missing API key | Processing skipped | Configure env variable |
| OPENAI_NOT_CONFIGURED | Missing API key | AI summary skipped | Configure env variable |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Settings | Shows settings page | ✅ | |
| 2 | Click "Call Recording" card | Opens recording settings page | ✅ | |
| 3 | Toggle Enable Recording | Toggle animates, warning appears | ✅ | Privacy notice helpful |
| 4 | Select retention period | Button grid highlights selection | ✅ | Visual feedback good |
| 5 | Toggle Transcription | Toggle + cost indicator | ✅ | Cost visible |
| 6 | Toggle AI Summary | Toggle + cost indicator | ✅ | Requires transcription (clear) |
| 7 | Edit AI format | Textarea expands | ✅ | Placeholder shows default |
| 8 | Click Save | Button shows loading | ✅ | Success toast appears |
| 9 | View recording in Call Logs | Play button visible | ✅ | Video modal opens |
| 10 | View transcription | Click "Transcribed" badge | ✅ | Expands inline |
| 11 | View AI summary | Click "AI Summary" badge | ✅ | Expands inline |

### Accessibility
- Keyboard navigation: ✅ All toggles and buttons focusable
- Screen reader support: ⚠️ Role="switch" added, but no explicit ARIA labels
- Color contrast: ✅ Good contrast on toggles and text
- Loading states: ✅ Spinner on save, status badges during processing

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large recording files | 2.5 Mbps bitrate, WebM/VP9 compression | ✅ Reasonable |
| Transcription latency | Fire-and-forget async processing | ✅ Non-blocking |
| UI blocking on save | Async Supabase call | ✅ Non-blocking |
| Canvas rendering | requestAnimationFrame loop | ✅ 30fps capture |
| Settings cache | 60s dev / 5min prod TTL | ✅ Server-side cache |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Admin-only route guard in page.tsx |
| Cross-org recording access | API validates org ownership before generating signed URLs |
| Recording URL exposure | Private bucket + signed URLs with 1-hour expiry |
| URL predictability | Random UUIDs prevent guessing recording paths |
| API key exposure | Server-side only (env variables) |
| Transcription data privacy | Org-isolated, RLS on call_logs |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Recording lost on page refresh | None - recording lost ⚠️ |
| Storage upload failure | Returns null, logs error |
| Transcription service down | Status = "failed", error stored |
| Retention cleanup failure | Cron retries daily |
| Supabase down | Fire-and-forget logging, graceful degradation |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Enable → Set options → Save is intuitive
2. **Is the control intuitive?** ✅ Yes - Toggle switches with visual feedback
3. **Is feedback immediate?** ✅ Yes - Success toast, loading states
4. **Is the flow reversible?** ✅ Yes - Can disable at any time
5. **Are errors recoverable?** ⚠️ Mostly - Save errors recoverable, recording loss not
6. **Is the complexity justified?** ✅ Yes - Per-minute pricing and cascading dependencies make sense

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Recording lost on agent page refresh | Recording data lost mid-call | 🟡 Medium | Periodic upload chunks to storage |
| No recording indicator for visitors | Visitors unaware they're recorded | 🟡 Medium | Widget badge when recording enabled |
| No manual re-transcription button | Can't retry failed transcriptions | 🟢 Low | Add "Retry" button in call logs |
| No cost estimation before enabling | Unexpected bills possible | 🟢 Low | Add estimated monthly cost calculator |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Recording Settings UI | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | 1-428 | Full settings form |
| Settings page loader | `apps/dashboard/src/app/(app)/admin/settings/recordings/page.tsx` | 1-36 | Server component, auth check |
| Recording hook | `apps/dashboard/src/features/webrtc/use-call-recording.ts` | 1-321 | Start/stop recording, upload |
| Transcription API | `apps/dashboard/src/app/api/transcription/process/route.ts` | 1-340 | POST endpoint |
| Transcription service | `apps/server/src/lib/transcription-service.ts` | 1-366 | Deepgram + OpenAI integration |
| Call settings cache | `apps/server/src/lib/call-settings.ts` | 1-98 | Server-side settings fetch |
| RecordingSettings type | `packages/domain/src/database.types.ts` | 49-60 | TypeScript interface |
| Recording bucket migration | `supabase/migrations/20251127200000_recording_settings.sql` | 1-109 | Initial recording setup |
| Storage bucket setup | `supabase/migrations/20251127600000_recordings_bucket.sql` | 1-97 | Private bucket + RLS policies |
| Transcription columns | `supabase/migrations/20251130000000_add_transcription_summary.sql` | 1-92 | call_logs schema |
| Retention cron setup | `supabase/migrations/20251130110000_setup_recording_cleanup_cron.sql` | 1-36 | Daily cleanup job |
| Call logs display | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | 993-1317 | Recording/transcription UI |

---

## 9. RELATED FEATURES
- [Call Logs (D7)](./call-logs.md) - Where recordings are displayed and accessed
- [Call Lifecycle (P3)](../platform/call-lifecycle.md) - When recording starts/stops
- [Agent Active Call (A4)](../agent/agent-active-call.md) - Agent-side recording integration
- [Organization Settings (D8)](./organization-settings.md) - Parent settings page
- [Billing API (API2)](../api/billing-api.md) - Usage tracking for transcription costs

---

## 10. OPEN QUESTIONS

1. **What is the maximum recording file size?** - No explicit limit found; depends on call duration and bitrate (~300MB/hour at 2.5Mbps)
2. **Is there visitor consent notification?** - Only admin-side privacy warning; no automatic visitor notification
3. **Can agents pause/resume recording?** - No, recording is fully automatic when enabled
4. **How are recordings accessed by agents (non-admin)?** - Not currently accessible to non-admin roles
5. **Is there a way to batch-transcribe old recordings?** - No batch processing endpoint exists
6. **What happens to recordings when an org is deleted?** - Cascade delete via foreign key (needs verification)
7. **Is there GDPR-compliant data export for recordings?** - No dedicated export functionality
8. **Can transcription be requested on-demand rather than automatic?** - No, it's automatic when enabled

---

## RecordingSettings Type Reference

```typescript
interface RecordingSettings {
  enabled: boolean;                    // Master toggle
  retention_days: number;              // -1 = forever, or days (7-365)
  transcription_enabled: boolean;      // $0.01/min
  ai_summary_enabled: boolean;         // $0.02/min (requires transcription)
  ai_summary_prompt_format: string | null;  // Custom format or null for default
  rna_timeout_seconds: number;         // Also stored here (15s default)
  max_call_duration_minutes: number;   // Also stored here (120min default)
}
```

## Pricing

| Feature | Cost | Billing |
|---------|------|---------|
| Recording Storage | Free (Supabase storage limits apply) | N/A |
| Transcription | $0.01/minute | Per-call usage record |
| AI Summary | $0.02/minute | Per-call usage record |

## Retention Options

| Value | Label | Behavior |
|-------|-------|----------|
| 7 | 7 days | Auto-delete after 7 days |
| 14 | 14 days | Auto-delete after 14 days |
| 30 | 30 days | Auto-delete after 30 days (default) |
| 60 | 60 days | Auto-delete after 60 days |
| 90 | 90 days | Auto-delete after 90 days |
| 180 | 180 days | Auto-delete after 180 days |
| 365 | 1 year | Auto-delete after 365 days |
| -1 | Forever | Never auto-delete |



