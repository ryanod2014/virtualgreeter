# Feature: Agent Call Logs (A7)

## Quick Summary
Agent Call Logs provides agents with a personal view of their own call history, including performance statistics, call filtering, recording playback, transcriptions, and AI summaries. Agents can only see calls they personally handled, not other team members' calls.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [ ] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Agent Call Logs gives agents a dedicated interface to:
- Review their personal call performance metrics
- Browse their own call history with filtering
- Play back recordings from their past calls
- Access transcriptions and AI summaries of their conversations
- Track their answer rates, talk time, and disposition patterns

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | Track personal performance | Shows individual stats: total rings, answers, missed, answer rate |
| Agent | Review past calls | Searchable/filterable table of own call history |
| Agent | Learn from recordings | Playback their own call recordings |
| Agent | Quick call recap | Access to transcriptions and AI-generated summaries |
| Agent | Understand disposition patterns | Shows breakdown of call outcomes they've set |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Agent navigates to `/dashboard/calls` (or redirected from legacy `/dashboard/call-logs`)
2. Server verifies agent has a valid `agent_profile`
3. Server fetches call data from `call_logs` table filtered by `agent_id` (default: last 30 days)
4. Server calculates personal statistics from the fetched data
5. Client renders statistics cards, filter panel, and call table
6. Agent can apply filters (date, status, disposition, URL, duration, country)
7. Agent can play recordings, view transcriptions, expand AI summaries

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGENT CALL LOGS DATA FLOW                              │
│                                                                             │
│  ┌────────────┐    Navigate to      ┌────────────┐   Auth Check   ┌──────┐ │
│  │ Agent      │    /dashboard/calls │ page.tsx   │ ──────────────►│Auth  │ │
│  │ Dashboard  │ ──────────────────► │ (Server    │                │Helper│ │
│  │            │                     │  Component)│◄───────────────│      │ │
│  └────────────┘                     └────────────┘   agentProfile │      │ │
│       ▲                                  │           + orgId      └──────┘ │
│       │                                  │                                 │
│       │                                  ▼                                 │
│       │                           ┌────────────┐                           │
│       │                           │  Supabase  │                           │
│       │                           │  Query     │                           │
│       │                           │  call_logs │                           │
│       │                           │  WHERE     │                           │
│       │                           │  agent_id= │                           │
│       │                           │  [agentId] │                           │
│       │                           └────────────┘                           │
│       │                                  │                                 │
│       │                                  ▼                                 │
│       │    Render UI      ┌─────────────────────────────┐                  │
│       │◄──────────────────│ agent-calls-client.tsx      │                  │
│                           │ (Client Component)          │                  │
│                           │ - Personal stats cards      │                  │
│                           │ - Filter panel              │                  │
│                           │ - Call table (own calls)    │                  │
│                           │ - Recording player          │                  │
│                           │ - Transcription viewer      │                  │
│                           └─────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Machine
N/A - This is a read-only view of historical call data. The call states are managed by the [Call Lifecycle (P3)](../platform/call-lifecycle.md) feature.

### State Definitions
Calls displayed can be in these final states:

| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `completed` | Call finished normally | Call ended by either party | Final state |
| `accepted` | Call currently in progress | Agent accepted call | Becomes completed |
| `missed` | RNA timeout, agent didn't answer | RNA timeout expires | Final state |
| `rejected` | Agent declined the call | Agent clicked reject | Final state |
| `pending` | Call ringing (rare to see) | Call request created | Accept/reject/miss |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | Browser navigation | Fetches agent's call data for date range | DB query with agent_id filter |
| Date range change | DateRangePicker component | Re-fetches data for new range | URL params updated, page reload |
| Filter apply | Apply button click | Re-fetches with new filters | URL params updated, page reload |
| Recording play | Play button click | Opens video modal or plays audio | Audio/video playback |
| Transcription expand | Transcribed badge click | Expands row to show transcription | Local state change |
| AI Summary expand | AI Summary badge click | Expands row to show summary | Local state change |
| Filter clear | X button click | Removes all active filters | URL params reset, page reload |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AgentCallsPage` | `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | Server component - auth check, fetches agent's calls |
| `AgentCallsClient` | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | Client component - renders UI, handles interactions |
| `CallLogsPage` (redirect) | `apps/dashboard/src/app/(app)/dashboard/call-logs/page.tsx` | Redirects legacy URL to `/dashboard/calls` |
| `calculateAgentStats` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Calculates all call statistics from call data |
| `formatDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Formats seconds as "Xh Xm Xs" |
| `formatShortDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Formats seconds as "X:XX" |

### Data Fields Retrieved
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique call identifier |
| `status` | enum | pending, accepted, rejected, completed, missed |
| `page_url` | string | URL where visitor initiated call |
| `duration_seconds` | number | Call length (completed calls only) |
| `recording_url` | string | S3 URL to recording file |
| `created_at` | timestamp | When call request was made |
| `ring_started_at` | timestamp | When ring began |
| `answered_at` | timestamp | When agent answered |
| `answer_time_seconds` | number | Seconds from ring to answer |
| `disposition_id` | UUID | Call outcome category |
| `visitor_city` | string | GeoIP city |
| `visitor_region` | string | GeoIP state/region |
| `visitor_country` | string | GeoIP country name |
| `visitor_country_code` | string | ISO country code |
| `transcription` | text | Full call transcription |
| `transcription_status` | enum | pending, processing, completed, failed |
| `ai_summary` | text | AI-generated call summary |
| `ai_summary_status` | enum | pending, processing, completed, failed |
| `site` | relation | Site info (id, name, domain) |
| `disposition` | relation | Disposition (id, name, color) |

### Statistics Calculated
| Statistic | Calculation | Notes |
|-----------|-------------|-------|
| Total Rings | Count of all agent's calls | Every call counts as a ring |
| Total Answers | Count where status = accepted OR completed | Answered calls |
| Missed Calls | Count where status = missed | RNA timeouts |
| Rejected | Count where status = rejected | Agent declined |
| Answer Rate | (Total Answers / Total Rings) × 100 | Percentage |
| Avg Answer Time | Average of `answer_time_seconds` | Only for answered calls |
| Avg Call Duration | Average of `duration_seconds` | Only for completed calls |
| Total Talk Time | Sum of `duration_seconds` | All completed calls |
| Disposition Breakdown | Count per disposition / Total with disposition | Percentage per outcome |

### Filter Options Available
| Filter | Type | Applied |
|--------|------|---------|
| Date Range | DateRangePicker | Server-side |
| Status | Multi-select dropdown | Server-side |
| Disposition | Multi-select dropdown | Server-side |
| Country | Country selector | Server-side |
| Min Duration | Number input | Server-side |
| Max Duration | Number input | Server-side |
| URL Conditions | Complex filter builder | Client-side (domain/path/query) |

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Agent with no call history | New agent views page | Empty state with "No calls found" message | ✅ | |
| 2 | Agent without profile | Missing agent_profile | Shows "No Agent Profile" message | ✅ | Specific error handling |
| 3 | Very old call access | Viewing calls from months ago | Shows normally if within date range | ✅ | No explicit data retention |
| 4 | Recording unavailable/deleted | S3 object deleted | Shows "-" in recording column | ✅ | Graceful null handling |
| 5 | Call from deleted pool | Pool soft-deleted | Call still shows, pool_id orphaned | ⚠️ | pool_id not used in agent view anyway |
| 6 | Agent's calls across multiple pools | Agent in multiple pools | All calls shown regardless of pool | ✅ | Filtered only by agent_id |
| 7 | Filtering with no results | Strict filters | Empty state shown | ✅ | "No calls found" message |
| 8 | Loading large call history | 500+ calls in range | Shows first 500 with warning | ✅ | "(limit reached)" message |
| 9 | Call log during timezone change | DST or travel | Uses browser's locale | ✅ | toLocaleTimeString |
| 10 | Very long call (>1hr) | Duration exceeds 1 hour | Displayed as "1h 23m" | ✅ | formatDuration handles |
| 11 | Transcription processing | In-progress transcription | Shows "Processing" with spinner | ✅ | Animated loading state |
| 12 | Transcription failed | Processing error | Shows "Failed" badge | ✅ | Error state displayed |
| 13 | AI summary failed | Processing error | Shows "Failed" badge | ✅ | Error state displayed |
| 14 | No recording URL | Call without recording | Shows dash "-" | ✅ | Graceful fallback |
| 15 | URL parsing fails in filter | Malformed URL | Falls back to raw string match | ✅ | try/catch in filter logic |
| 16 | Legacy URL redirect | Visit /dashboard/call-logs | Redirects to /dashboard/calls | ✅ | Automatic redirect |
| 17 | Call in progress (accepted) | Currently on call | Appears with status "Accepted", no duration | ✅ | Real-time not updated |
| 18 | Disposition not set | Call without disposition | Shows "-" in disposition column | ✅ | Null handling |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| No agent profile | Profile not created | "No Agent Profile" message | Admin must set up agent profile |
| DB query failure | Supabase unavailable | Empty table / error | Refresh page |
| Recording URL expired | S3 presigned URL timeout | Playback fails | Re-fetch page |
| Invalid date range | from > to | Empty results | Fix date selection |
| Auth failure | Session expired | Redirect to /login | Re-authenticate |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to /dashboard/calls | Page loads with last 30 days of own calls | ✅ | |
| 2 | View header | "My Calls" title with description | ✅ | Personal context clear |
| 3 | View stats cards | 8 personal stat cards in 2×4 grid | ✅ | |
| 4 | Click Filters button | Filter panel expands below | ✅ | |
| 5 | Select date range | Picker opens with presets | ✅ | |
| 6 | Select status filter | Multi-select dropdown with icons | ✅ | |
| 7 | Select disposition | Multi-select dropdown with colors | ✅ | |
| 8 | Apply filters | Page reloads with results | ✅ | URL params persist |
| 9 | View disposition breakdown | Progress bars with colors | ✅ | Only if dispositions exist |
| 10 | Click Play on recording | Video modal opens (for .webm) | ✅ | Auto-plays |
| 11 | Click Transcribed badge | Row expands with text | ✅ | Scrollable if long |
| 12 | Click AI Summary badge | Row expands with formatted summary | ✅ | Purple styling |
| 13 | Download recording | Download button click | ✅ | Downloads as .webm |
| 14 | Clear filters | X button in filter panel | ✅ | Resets to defaults |

### Statistics Cards (8 cards in 2×4 grid)
| Card | Metric | Icon | Description |
|------|--------|------|-------------|
| 1 | Total Rings | PhoneIncoming | All calls routed to agent |
| 2 | Total Answers | Phone | Accepted + completed calls |
| 3 | Missed Calls | PhoneMissed | RNA timeout calls |
| 4 | Answer Rate | TrendingUp | Rings → Answers percentage |
| 5 | Rejected | PhoneOff | "Calls you declined" |
| 6 | Avg. Answer Time | Timer | "Time to click answer" |
| 7 | Avg. Call Duration | Clock | "For completed calls" |
| 8 | Total Talk Time | BarChart3 | "All time on calls" |

### Call Table Columns
| Column | Content | Notes |
|--------|---------|-------|
| Date/Time | Date + time in user's locale | Two-line display |
| Status | Icon + status text | Color-coded icons |
| Duration | Formatted time or "-" | For completed calls only |
| Location | Flag emoji + city, region | GeoIP data with tooltip |
| URL | Truncated URL + external link | Hover for full URL |
| Disposition | Colored badge or "-" | Organization's dispositions |
| Recording | Play/Download buttons or "-" | Video modal for .webm |
| Transcription | Status badge, expandable | Processing/Completed/Failed |
| AI Summary | Status badge, expandable | Processing/Completed/Failed |

### Accessibility
- Keyboard navigation: ⚠️ Table rows not focusable, filter inputs are
- Screen reader support: ⚠️ Icons lack aria-labels in some places
- Color contrast: ✅ Status badges have sufficient contrast
- Loading states: ⚠️ No loading spinner during page transitions (server components)

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large data sets | 500 record limit per query | ✅ Mitigated |
| Simple query | Single agent_id filter, no complex joins | ✅ Efficient |
| Client-side URL filtering | URL conditions filtered after fetch | ⚠️ Could be slow with 500 records |
| Stats calculation | Done on full result set client-side | ✅ Fast for 500 records |

### Security
| Concern | Mitigation |
|---------|------------|
| Agent sees other agent's calls | Query filters by `agent_id` from authenticated session |
| Cross-org data access | `agent_id` is org-scoped via `agent_profiles` table |
| Recording URL exposure | Supabase storage presigned URLs |
| SQL injection | Supabase parameterized queries |
| XSS in URLs/transcriptions | React escapes by default |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Missing agent profile | Explicit check with user-friendly error |
| DB connection failure | Page shows error, user can refresh |
| Recording storage down | Recording buttons fail gracefully |
| Transcription service down | Shows "Processing" or "Failed" status |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "My Calls" clearly indicates personal data
2. **Is the control intuitive?** ✅ Yes - Standard date picker, dropdowns, table patterns
3. **Is feedback immediate?** ⚠️ Partial - Filter changes require Apply button, URL updates trigger reload
4. **Is the flow reversible?** ✅ Yes - Can clear filters, change date range
5. **Are errors recoverable?** ✅ Yes - Can retry filters, refresh page
6. **Is the complexity justified?** ✅ Yes - Filters necessary for agents with many calls

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No real-time updates | Must refresh to see new calls | 🟢 Low | Could poll or use websockets |
| No server-side pagination | 500 record limit cuts off data | 🟡 Medium | Add cursor-based pagination |
| URL filter is client-side | Can't search >500 calls by URL | 🟢 Low | Move to server-side |
| No CSV export for agents | Admins can export, agents cannot | 🟢 Low | Add agent export option |
| No sorting options | Can't sort by duration, etc. | 🟢 Low | Add column sorting |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Agent page server component | `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | 1-147 | Auth check, query construction |
| Agent page client component | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | 1-1040 | Full UI with filters, stats, table |
| Legacy redirect | `apps/dashboard/src/app/(app)/dashboard/call-logs/page.tsx` | 1-7 | Redirects to /dashboard/calls |
| Statistics calculation | `apps/dashboard/src/lib/stats/agent-stats.ts` | 1-145 | All stat calculations |
| Call logger (server) | `apps/server/src/lib/call-logger.ts` | 1-512 | How call logs are created/updated |
| Date range picker | `apps/dashboard/src/lib/components/date-range-picker.tsx` | - | Shared component |
| Multi-select dropdown | `apps/dashboard/src/lib/components/multi-select-dropdown.tsx` | - | Shared component |
| Country selector | `apps/dashboard/src/lib/components/country-selector.tsx` | - | Shared component |
| URL filter conditions | `apps/dashboard/src/lib/components/call-log-filter-conditions.tsx` | - | Complex filter builder |
| Database types | `packages/domain/src/database.types.ts` | 282-317 | call_logs table schema |

---

## 9. RELATED FEATURES
- [Call Logs - Admin (D7)](../admin/call-logs.md) - Organization-wide call logs (admin view)
- [Call Lifecycle (P3)](../platform/call-lifecycle.md) - How calls are created and tracked
- [Agent Active Call (A4)](./agent-active-call.md) - The active call experience before it becomes a log
- [Incoming Call (A2)](./incoming-call.md) - How incoming calls are received
- [RNA Timeout (A3)](./rna-timeout.md) - How missed calls are recorded

---

## 10. OPEN QUESTIONS

1. **Should agents have CSV export?** - Currently only admins can export. Agents might benefit from exporting their own call history.

2. **Data retention for old calls?** - No explicit retention period found. Call logs appear to be kept indefinitely. Should there be limits for agent view?

3. **Real-time updates?** - Agent call logs don't update in real-time after a call ends. Should new calls auto-appear?

4. **Call notes/internal comments?** - No field for agents to add private notes to calls. Would this be useful?

5. **Pagination vs limit?** - 500 record limit could hide older calls. Should proper pagination be added for agents with high call volumes?

6. **Why no pool filter for agents?** - Agents in multiple pools can't filter by pool. Is this intentional to simplify the UI?



