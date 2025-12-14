# Feature: Video Recordings (A8)

## Quick Summary
Video Recordings captures video calls for playback, automatically transcribes them, and generates AI-powered summaries. Recordings are stored securely with randomized UUIDs and accessed via signed URLs with automatic refresh. Agents and admins can review call recordings from their respective call logs pages with inline playback, download options, expandable transcriptions, and AI summaries.

## Affected Users
- [x] Website Visitor (recorded, but cannot access recordings)
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Video Recordings enables organizations to capture, store, and review all video calls for quality assurance, training, and compliance purposes. The feature includes:
- Automatic video recording of both agent and visitor streams
- Secure cloud storage with randomized UUIDs (not predictable org/call patterns)
- Signed URLs with 1-hour expiration and automatic refresh
- Configurable retention periods
- Automatic transcription via Deepgram
- AI-powered call summaries via OpenAI
- Playback interface with native video controls

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | Review past conversations | Access recordings from "My Calls" page |
| Agent | Remember call details | Read transcriptions and AI summaries |
| Admin | Quality assurance | Review any agent's call recordings |
| Admin | Training material | Download recordings for coaching |
| Admin | Compliance | Configurable retention periods |
| Admin | Quick insights | AI summaries highlight key points |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin enables recording in Settings → Call Recording
2. Agent accepts call; recording starts automatically
3. Both video streams are composited side-by-side on canvas
4. Audio from both parties is mixed together
5. Call ends; recording stops and uploads via `/api/recordings/upload`
6. Server generates random UUID and stores file in private bucket
7. Recording ID (not full URL) saved to `call_logs` table
8. If transcription enabled: background job transcribes audio via Deepgram
9. If AI summary enabled: summary generated from transcription via OpenAI
10. Agent/Admin views recordings in respective Call Logs page
11. Click play → RecordingPlayer fetches signed URL from `/api/recordings/url`
12. Video modal opens with native controls and automatic URL refresh

### State Machine

```
Recording States:
┌──────────────┐
│   DISABLED   │ (recording_settings.enabled = false)
└──────┬───────┘
       │ Admin enables recording
       ▼
┌──────────────┐
│    IDLE      │ (waiting for call)
└──────┬───────┘
       │ Call accepted
       ▼
┌──────────────┐
│  RECORDING   │ (MediaRecorder active)
└──────┬───────┘
       │ Call ends
       ▼
┌──────────────┐
│  UPLOADING   │ (to Supabase Storage)
└──────┬───────┘
       │ Upload complete
       ▼
┌──────────────┐
│  PROCESSING  │ (transcription + AI summary)
└──────┬───────┘
       │ Processing complete
       ▼
┌──────────────┐
│   COMPLETE   │ (available for playback)
└──────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `disabled` | Recording feature off | Admin disables in settings | Admin enables in settings |
| `idle` | Ready to record | Feature enabled, no active call | Call accepted |
| `recording` | Capturing video/audio | `startRecording()` called | Call ends |
| `uploading` | Saving to storage | Recording stopped | Upload complete/error |
| `processing` | Transcription/summary | Upload complete | Processing complete/failed |
| `complete` | Ready for playback | Processing done | N/A (permanent state) |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| `recording_settings.enabled = true` | Admin Settings | Enables recording globally | Agents will record all calls |
| `call:accepted` | Server socket | Triggers `startRecording()` | MediaRecorder starts |
| `call:ended` | Server socket | Triggers `stopRecording()` | Upload begins |
| Recording upload complete | `/api/recordings/upload` | Updates call_logs.recording_url with UUID | Triggers `/api/transcription/process` |
| Signed URL requested | RecordingPlayer mount | Fetches from `/api/recordings/url` | Returns signed URL with 1hr expiry |
| URL about to expire | RecordingPlayer timer (45 min) | Auto-refreshes signed URL | Maintains playback position |
| Transcription complete | `transcription-service.ts` | Saves to call_logs.transcription | May trigger AI summary |
| AI summary complete | `transcription-service.ts` | Saves to call_logs.ai_summary | N/A |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `useCallRecording` | `apps/dashboard/src/features/webrtc/use-call-recording.ts` | Recording hook for WebRTC |
| `startRecording` | `use-call-recording.ts` | Initializes canvas composite, MediaRecorder |
| `stopRecording` | `use-call-recording.ts` | Stops recording, uploads via API, triggers processing |
| `POST /api/recordings/upload` | `apps/dashboard/src/app/api/recordings/upload/route.ts` | Server-side upload with UUID generation |
| `POST /api/recordings/url` | `apps/dashboard/src/app/api/recordings/url/route.ts` | Generates signed URLs with 1hr expiry |
| `RecordingPlayer` | `apps/dashboard/src/features/recordings/RecordingPlayer.tsx` | Video player with auto URL refresh |
| `processCallRecording` | `apps/server/src/lib/transcription-service.ts` | Orchestrates transcription + AI summary |
| `transcribeWithDeepgram` | `transcription-service.ts` | Calls Deepgram API |
| `generateAISummary` | `transcription-service.ts` | Calls OpenAI API |
| `CallsClient` | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Admin call logs UI with RecordingPlayer |
| `AgentCallsClient` | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | Agent call logs UI with RecordingPlayer |
| `CallLogRow` | Both client files | Table row with playback controls |
| `RecordingSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | Admin settings UI |

### Data Flow

```
CALL STARTS
    │
    ├─► startRecording(localStream, remoteStream)
    │   ├─► Create AudioContext, mix both audio streams
    │   ├─► Create canvas (1280x480) for side-by-side video
    │   ├─► Animation loop: draw remote (left) + local (right) to canvas
    │   ├─► captureStream(30fps) from canvas
    │   ├─► Combine canvas video + mixed audio into MediaStream
    │   └─► MediaRecorder.start(1000) // chunks every 1s
    │
CALL ENDS
    │
    ├─► stopRecording()
    │   ├─► MediaRecorder.stop()
    │   ├─► Combine chunks into Blob (video/webm)
    │   ├─► POST /api/recordings/upload with blob + callLogId
    │   │   ├─► Server generates randomUUID()
    │   │   ├─► Upload to private bucket: recordings/{orgId}/{uuid}.webm
    │   │   └─► Update call_logs.recording_url = uuid (not full URL)
    │   └─► POST /api/transcription/process { callLogId }
    │
TRANSCRIPTION (background)
    │
    ├─► processCallRecording(callLogId)
    │   ├─► Fetch call_log with org recording_settings
    │   ├─► Check: recording_url exists? transcription_enabled?
    │   ├─► Set transcription_status = "processing"
    │   ├─► POST Deepgram API with recording URL
    │   ├─► Save transcription to call_logs
    │   ├─► Record usage_records for billing
    │   │
    │   └─► If ai_summary_enabled:
    │       ├─► Set ai_summary_status = "processing"
    │       ├─► POST OpenAI API with transcription + format
    │       ├─► Save ai_summary to call_logs
    │       └─► Record usage_records for billing
    │
PLAYBACK
    │
    ├─► User opens Call Logs page
    ├─► Click play button on row with recording_url (UUID)
    ├─► Video modal opens with RecordingPlayer component
    │   ├─► RecordingPlayer mounts, shows loading state
    │   ├─► POST /api/recordings/url { recordingId: uuid }
    │   │   ├─► Verify user's org owns this recording
    │   │   ├─► createSignedUrl(path, 3600) // 1 hour
    │   │   └─► Return { signedUrl, expiresAt }
    │   ├─► Set video src to signed URL
    │   ├─► Schedule refresh for 45 min (15 min before expiry)
    │   └─► Display expiration time to user
    ├─► Native browser controls: play/pause, seek, fullscreen
    └─► At 45 min: Auto-refresh signed URL without interrupting playback
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path | Normal call end | Recording saved, transcribed | ✅ | |
| 2 | Recording disabled | Admin setting off | No recording captured | ✅ | |
| 3 | No call log ID | Call not logged | Recording skipped | ✅ | Guard clause in startRecording |
| 4 | Upload fails | Network error | Error logged, recording lost | ⚠️ | No retry mechanism |
| 5 | Transcription API down | Deepgram error | Status set to "failed" | ✅ | Error stored in call_log |
| 6 | AI summary API down | OpenAI error | Status set to "failed" | ✅ | Error stored in call_log |
| 7 | Empty recording | 0-byte blob | Upload skipped | ✅ | Guard clause checks blob.size |
| 8 | Very long call | Hours-long call | Large file, slow upload | ⚠️ | No chunked upload |
| 9 | Agent refreshes during call | Page refresh | Recording data lost | ⚠️ | In-memory chunks lost |
| 10 | Browser doesn't support VP9 | Old browser | Falls back to VP8 | ✅ | Codec detection |
| 11 | Transcription not enabled | Org setting | Recording saved, no transcription | ✅ | |
| 12 | AI summary only | Summary enabled, transcription off | AI summary disabled | ✅ | Dependency enforced |
| 13 | Recording playback on mobile | Small screen | Modal responsive | ✅ | Native video controls |
| 14 | Download fails | Fetch error | Opens URL in new tab | ✅ | Fallback behavior |
| 15 | Recording deleted from storage | Retention policy | 404 on playback | ⚠️ | No UI indication |
| 16 | Simultaneous playback | Multiple tabs | Both play independently | ✅ | Each gets own signed URL |
| 17 | Rapid play/pause clicks | User behavior | Handled correctly | ✅ | State managed in component |
| 18 | Transcription still processing | Immediate playback | Shows "Processing" badge | ✅ | |
| 19 | Signed URL expires during playback | > 1 hour viewing | Auto-refreshes at 45 min | ✅ | RecordingPlayer handles refresh |
| 20 | Predictable URL guessing | Security concern | Not possible | ✅ | Random UUIDs prevent guessing |
| 21 | Cross-org recording access | Security attempt | 404 error | ✅ | API validates org ownership |
| 22 | Direct storage URL access | Bypass signed URLs | Access denied | ✅ | Bucket is private |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| RECORDING_NOT_STARTED | No permissions or streams | Nothing (silent fail) | Check camera/mic permissions |
| UPLOAD_FAILED | Network error during upload | Recording lost | Manual re-call |
| TRANSCRIPTION_FAILED | Deepgram API error | "Failed" badge in table | Admin can retry via API |
| AI_SUMMARY_FAILED | OpenAI API error | "Failed" badge in table | Admin can retry via API |
| PLAYBACK_404 | Recording deleted/missing | Video fails to load | Recording is gone |
| DEEPGRAM_NOT_CONFIGURED | Missing API key | Transcription skipped | Admin adds API key |
| OPENAI_NOT_CONFIGURED | Missing API key | AI summary skipped | Admin adds API key |
| SIGNED_URL_FAILED | API error | RecordingPlayer shows error | Retry playback |
| URL_REFRESH_FAILED | Network issue at 45 min | Playback may stop at 1 hour | Manual refresh |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Recording Settings (Admin):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Settings → Call Recording | Settings page loads | ✅ | |
| 2 | Toggle "Enable Recording" | Switch animates | ✅ | Privacy warning shown |
| 3 | Select retention period | Grid selection updates | ✅ | Clear visual feedback |
| 4 | Toggle transcription | Switch animates | ✅ | Cost displayed ($0.01/min) |
| 5 | Toggle AI summary | Switch animates | ✅ | Cost displayed ($0.02/min) |
| 6 | Customize summary format | Textarea expands | ✅ | Default format shown as placeholder |
| 7 | Click Save | Loading spinner → success | ✅ | 3-second success toast |

**Call Logs Playback (Agent/Admin):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Call Logs | Table loads with recordings | ✅ | |
| 2 | See recording indicator | Video icon + Play button | ✅ | Red color indicates video |
| 3 | Click play button | Loading spinner → Modal opens | ✅ | RecordingPlayer fetches signed URL |
| 4 | See loading state | "Loading recording..." message | ✅ | Clear feedback during URL fetch |
| 5 | Video loads | Video autoplays with controls | ✅ | Seek, volume, fullscreen |
| 6 | See expiration info | Small text shows URL expiry time | ✅ | User knows when refresh happens |
| 7 | Watch > 45 minutes | URL auto-refreshes seamlessly | ✅ | No playback interruption |
| 8 | Click close/backdrop | Modal closes | ✅ | |
| 9 | Expand transcription | Row expands with text | ✅ | Scrollable if long |
| 10 | Expand AI summary | Row expands with formatted text | ✅ | Styled differently from transcription |

### Accessibility
- Keyboard navigation: ⚠️ Modal close via Escape not implemented
- Screen reader support: ⚠️ Video controls are native (browser-dependent)
- Color contrast: ✅ Badges use accessible color pairs
- Loading states: ✅ Spinners shown during processing

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large video files | VP9 codec at 2.5Mbps | ✅ Reasonable quality/size |
| Canvas compositing | requestAnimationFrame loop | ✅ ~30fps |
| Audio mixing | Web Audio API | ✅ Native browser handling |
| Upload size | No chunked upload | ⚠️ May fail for very long calls |
| Transcription latency | Background processing | ✅ Fire-and-forget |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Recordings scoped to organization via API validation |
| Cross-org access | API checks org ownership before generating signed URLs |
| URL predictability | Random UUIDs prevent guessing recording URLs |
| Direct storage access | Private bucket requires signed URLs |
| URL expiration | 1-hour expiry with automatic refresh |
| Privacy consent | Warning shown in admin settings |
| API key exposure | Server-side only (Deepgram, OpenAI) |
| Storage access | Supabase Storage with org-based paths + RLS |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Recording data loss | In-memory until upload (no mitigation) |
| Upload failure | Error logged, no retry |
| Transcription failure | Status tracked, can retry manually |
| Storage retention | Configurable 7d-forever |
| Codec support | VP9 with VP8 fallback |
| Signed URL generation | Server-side with error handling |
| URL refresh timing | 15-minute buffer before expiry |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Record → Store → Transcribe → Summarize is intuitive
2. **Is the control intuitive?** ✅ Yes - Standard video player controls
3. **Is feedback immediate?** ⚠️ Mostly - Transcription status shown, but processing time not estimated
4. **Is the flow reversible?** ⚠️ Partially - Can't undo recording, but can delete
5. **Are errors recoverable?** ⚠️ Partially - Transcription can retry, lost recordings cannot
6. **Is the complexity justified?** ✅ Yes - Multi-step pipeline is necessary for features

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No upload retry | Lost recordings | 🟡 Medium | Add retry logic with exponential backoff |
| No chunked upload | Fails for long calls | 🟡 Medium | Use resumable uploads |
| No keyboard close | Accessibility | 🟢 Low | Add Escape key handler |
| No transcription retry UI | Admin friction | 🟢 Low | Add retry button in call logs |
| Recording chunks in memory | Page refresh = loss | 🟡 Medium | Consider IndexedDB buffering |
| No estimated processing time | User confusion | 🟢 Low | Show estimated time based on duration |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Recording hook | `apps/dashboard/src/features/webrtc/use-call-recording.ts` | 1-321 | Main recording logic |
| Start recording | `use-call-recording.ts` | 36-196 | Canvas composite, MediaRecorder setup |
| Stop recording | `use-call-recording.ts` | 198-312 | Upload via API + trigger transcription |
| Upload API endpoint | `apps/dashboard/src/app/api/recordings/upload/route.ts` | 1-116 | Server-side upload with UUID generation |
| Signed URL API endpoint | `apps/dashboard/src/app/api/recordings/url/route.ts` | 1-112 | Generate signed URLs with 1hr expiry |
| Recording player component | `apps/dashboard/src/features/recordings/RecordingPlayer.tsx` | 1-170 | Video player with auto URL refresh |
| Transcription service | `apps/server/src/lib/transcription-service.ts` | 1-367 | Deepgram + OpenAI integration |
| Process call recording | `transcription-service.ts` | 189-340 | Main processing orchestration |
| Admin calls page | `apps/dashboard/src/app/(app)/admin/calls/page.tsx` | 1-257 | Server component |
| Admin calls client | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Updated | Client with RecordingPlayer integration |
| Agent calls page | `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | 1-146 | Server component |
| Agent calls client | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | Updated | Client with RecordingPlayer integration |
| Recording settings page | `apps/dashboard/src/app/(app)/admin/settings/recordings/page.tsx` | 1-36 | Server component |
| Recording settings client | `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | 1-428 | Full settings UI |
| Call logger | `apps/server/src/lib/call-logger.ts` | 1-513 | Database integration |

---

## 9. RELATED FEATURES
- [Call Lifecycle (P3)](../platform/call-lifecycle.md) - When recordings start/stop
- [Agent Active Call (A4)](./agent-active-call.md) - Where recording hook is used
- [Call Logs (D7)](../admin/call-logs.md) - Where recordings are displayed
- [Organization Settings (D8)](../admin/organization-settings.md) - Recording configuration

---

## 10. OPEN QUESTIONS

1. **Should there be a per-call recording toggle?** Currently all-or-nothing at org level
2. **What happens when storage quota exceeded?** No handling for Supabase storage limits
3. **Should visitors be notified they're being recorded?** Currently no in-widget indicator
4. **Is 2.5Mbps bitrate appropriate?** May need adjustment for quality/size tradeoff
5. **Should failed transcriptions auto-retry?** Currently requires manual intervention
6. **What about GDPR right to deletion?** Retention policy exists but no per-recording delete UI
7. **Should we migrate existing recordings to UUID format?** Currently out of scope per TKT-015
8. **What if RecordingPlayer component fails to load?** No fallback to direct URL access



