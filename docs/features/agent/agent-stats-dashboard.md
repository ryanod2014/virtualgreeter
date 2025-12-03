# Feature: Agent Stats Dashboard (F3)

## Quick Summary
The agent's personal statistics dashboard showing their own call history, performance metrics, and call recordings. Agents access this at `/dashboard/calls` to track their rings, answers, talk time, and browse their historical call logs with filtering capabilities.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [ ] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Agent Stats Dashboard gives individual agents visibility into their own performance without requiring admin access. It enables agents to:
- View personal call statistics (rings, answers, missed, rejected)
- Track answer times and call durations
- Browse historical call logs with detailed information
- Filter calls by date, status, disposition, country, URL, and duration
- Play back call recordings (audio/video)
- View transcriptions and AI summaries of calls
- See disposition breakdown of their calls

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Agent | See how many calls I handled | Shows total rings, answers, missed counts |
| Agent | Understand my answer performance | Displays answer rate percentage and avg answer time |
| Agent | Track my total productivity | Shows total talk time across all calls |
| Agent | Review specific calls | Browsable call log with recordings and transcriptions |
| Agent | Find calls by criteria | Powerful filtering by date, status, disposition, location, URL |
| Agent | Re-watch call recordings | Inline video playback and download |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Agent navigates to Dashboard → My Calls (or `/dashboard/calls`)
2. Server validates agent has an active agent profile
3. Server fetches call_logs for this agent in date range (default: 30 days)
4. Client calculates stats using `calculateAgentStats()`
5. Page renders with stat cards, disposition breakdown, and call log table
6. Agent can filter by date, status, disposition, country, URL patterns, or duration
7. Agent can expand calls to view transcriptions and AI summaries
8. Agent can play/download recordings

### State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Agent Stats Dashboard                               │
│                        /dashboard/calls                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐      ┌────────────────┐      ┌────────────────┐    │
│  │  Date Range    │──────│    Filters     │──────│  Applied View  │    │
│  │   Selected     │      │   Expanded     │      │    Active      │    │
│  └────────────────┘      └────────────────┘      └────────────────┘    │
│                                                                          │
│  Stats Display:                                                          │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐             │
│  │ Total Rings │ Total       │ Missed      │ Answer      │             │
│  │             │ Answers     │ Calls       │ Rate        │             │
│  ├─────────────┼─────────────┼─────────────┼─────────────┤             │
│  │ Rejected    │ Avg Answer  │ Avg Call    │ Total Talk  │             │
│  │             │ Time        │ Duration    │ Time        │             │
│  └─────────────┴─────────────┴─────────────┴─────────────┘             │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Disposition Breakdown                          │   │
│  │    [======== Sale 45% ========] [=== Follow-up 30% ===] [No 25%] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       Call Log Table                              │   │
│  │  Date | Status | Duration | Location | URL | Disposition |        │   │
│  │  Recording | Transcription | AI Summary                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Default View | Stats and calls for last 30 days | Navigate to `/dashboard/calls` | Apply filters |
| Filters Expanded | Filter panel visible | Click "Filters" button | Click "Filters" again |
| Filtered View | Stats recalculated for filtered calls | Apply filters | Clear filters |
| Recording Playing | Audio/video recording playback | Click play button | Click pause or recording ends |
| Video Modal | Full-screen video playback | Click video recording | Close modal |
| Transcription Expanded | Call transcription visible | Click "Transcribed" badge | Click again to collapse |
| AI Summary Expanded | AI summary visible | Click "AI Summary" badge | Click again to collapse |
| No Agent Profile | Error state | Agent profile not configured | Admin configures profile |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `/dashboard/calls` | Fetches agent's calls, renders stats | None |
| Date range change | DateRangePicker | Updates URL params, refetches | URL updates |
| Filter apply | "Apply" button | Updates URL params, refetches | URL updates, stats recalculated |
| Filter clear | "X" button | Removes filter params from URL | Refetches unfiltered |
| Play recording | Play button | Opens video modal or plays audio | Audio/video state |
| Toggle transcription | "Transcribed" badge | Shows/hides transcription row | None |
| Toggle AI summary | "AI Summary" badge | Shows/hides summary row | None |
| Download recording | Download button | Fetches blob, triggers download | File saved |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AgentCallsPage` | `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | Server component - auth, data fetching |
| `AgentCallsClient` | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | Client component - UI rendering |
| `calculateAgentStats` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Core stats calculation logic |
| `formatDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Seconds to human-readable format |
| `formatShortDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Compact duration format (e.g., "3:45") |
| `DateRangePicker` | `apps/dashboard/src/lib/components/date-range-picker.tsx` | Date selection component |
| `MultiSelectDropdown` | `apps/dashboard/src/lib/components/multi-select-dropdown.tsx` | Multi-select filter dropdowns |
| `CountrySelector` | `apps/dashboard/src/lib/components/country-selector.tsx` | Country filter with flags |
| `CallLogFilterConditions` | `apps/dashboard/src/lib/components/call-log-filter-conditions.tsx` | URL pattern matching filters |
| `StatCard` | Inline in agent-calls-client.tsx | Individual stat display card |
| `CallLogRow` | Inline in agent-calls-client.tsx | Expandable call log table row |

### Data Flow

```
PAGE LOAD
    │
    ├─► URL: /dashboard/calls?from={date}&to={date}&[filters]
    │
    ├─► Server Component (page.tsx)
    │   ├─► getCurrentUser() → Validate auth
    │   ├─► Get agentId from auth.agentProfile.id
    │   │   └─► If no agentId → Show "No Agent Profile" message
    │   │
    │   ├─► Parse URL params
    │   │   ├─► from/to → Date range (default: last 30 days)
    │   │   ├─► urlConditions → JSON-encoded filter conditions
    │   │   ├─► minDuration/maxDuration → Duration bounds
    │   │   ├─► disposition → Disposition IDs (comma-separated)
    │   │   ├─► status → Call statuses (comma-separated)
    │   │   └─► country → ISO country codes (comma-separated)
    │   │
    │   ├─► Supabase query: call_logs
    │   │   ├─► Filter: agent_id = agentId
    │   │   ├─► Filter: created_at in date range
    │   │   ├─► Filter: Apply optional filters (duration, disposition, status, country)
    │   │   ├─► Select: id, status, page_url, duration_seconds, recording_url,
    │   │   │   created_at, ring_started_at, answered_at, answer_time_seconds,
    │   │   │   disposition_id, visitor_city, visitor_region, visitor_country,
    │   │   │   visitor_country_code, transcription, transcription_status,
    │   │   │   ai_summary, ai_summary_status
    │   │   ├─► Join: sites (id, name, domain)
    │   │   └─► Join: dispositions (id, name, color)
    │   │   └─► Limit: 500 calls
    │   │
    │   └─► Supabase query: dispositions (for filter options)
    │       └─► Filter: organization_id, is_active = true
    │
    └─► Client Component (agent-calls-client.tsx)
        │
        ├─► URL Condition Filtering (client-side)
        │   └─► filters.urlConditions applied to calls array
        │       ├─► domain matching
        │       ├─► path matching
        │       ├─► query param matching
        │       └─► Match types: is_exactly, contains, does_not_contain,
        │           starts_with, ends_with
        │
        ├─► calculateAgentStats(filteredCalls, dispositions)
        │   ├─► totalRings = filteredCalls.length
        │   ├─► totalAnswers = filter(accepted OR completed).length
        │   ├─► totalMissed = filter(missed).length
        │   ├─► totalRejected = filter(rejected).length
        │   ├─► avgAnswerTime = avg(answer_time_seconds) where not null
        │   ├─► answerPercentage = (totalAnswers / totalRings) * 100
        │   ├─► avgCallDuration = avg(duration_seconds) for completed
        │   ├─► totalTalkTime = sum(duration_seconds) for completed
        │   └─► dispositionBreakdown = group by disposition, calc percentages
        │
        └─► Render UI
            ├─► Header: "My Calls" title
            ├─► Filter bar: DateRangePicker + Filters toggle
            ├─► Expanded filters (when visible)
            ├─► Stats grid: 8 StatCards (2x4)
            ├─► Disposition breakdown (if any dispositions set)
            ├─► Results count
            └─► Call log table with CallLogRow components
```

### URL Filter Logic (Client-Side)

The URL conditions filtering uses a custom matching system:

```
URL Condition Types:
├─► "domain"      → Match against parsedUrl.hostname
├─► "path"        → Match against parsedUrl.pathname  
└─► "query_param" → Match against parsedUrl.searchParams.get(paramName)

Match Types:
├─► "is_exactly"      → checkValue === searchValue
├─► "contains"        → checkValue.includes(searchValue)
├─► "does_not_contain" → !checkValue.includes(searchValue)
├─► "starts_with"     → checkValue.startsWith(searchValue)
└─► "ends_with"       → checkValue.endsWith(searchValue)

All conditions are AND-ed together (all must match).
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | New agent with no calls | First login, no history | Shows "No calls found" empty state | ✅ | Suggests adjusting filters |
| 2 | Agent not configured | No agent profile | Shows "No Agent Profile" message | ✅ | Agent ID check on server |
| 3 | Date range with no calls | User selects empty period | Stats show zeros, empty table | ✅ | Works correctly |
| 4 | All filters applied | Multiple filters active | Stats reflect filtered calls only | ✅ | Client-side URL filtering |
| 5 | 500+ calls in range | High volume agent | Limited to 500 calls | ⚠️ | Shows "(limit reached)" message |
| 6 | Call with no recording | Recording not enabled | "-" shown in recording column | ✅ | Graceful empty state |
| 7 | Video recording | WebM file | Opens video modal | ✅ | Detects .webm or "video" in URL |
| 8 | Audio recording | Non-video file | Inline audio player | ✅ | Uses HTML5 Audio API |
| 9 | Transcription processing | transcription_status = "processing" | Shows "Processing" spinner badge | ✅ | Real-time status |
| 10 | Transcription failed | transcription_status = "failed" | Shows "Failed" badge with warning | ✅ | Clear error indication |
| 11 | AI summary available | ai_summary_status = "completed" | Expandable summary row | ✅ | Click to reveal |
| 12 | No disposition set | disposition_id = null | "-" shown in column | ✅ | Excluded from breakdown |
| 13 | URL parsing fails | Malformed page_url | Falls back to raw URL matching | ✅ | try/catch handles errors |
| 14 | Download fails | Network error | Opens URL in new tab as fallback | ✅ | catch block fallback |
| 15 | Mobile viewport | Small screen | 2-column grid layout | ✅ | Responsive grid |
| 16 | Rapid date changes | User changing dates quickly | URL updates trigger refetch | ✅ | Server component refetches |
| 17 | Country filter with flag | ISO country code selected | Shows flag emoji in results | ✅ | formatLocationWithFlag utility |
| 18 | Unsaved filter changes | User changes filters but doesn't apply | "Apply" button enabled | ✅ | hasUnsavedChanges check |
| 19 | Agent in multiple pools | Calls from different pools | All calls shown (pool-agnostic) | ✅ | Filtered by agent_id only |
| 20 | Stats after call transfer | Transfer between agents | Original agent sees the call | ✅ | Based on agent_id on call_log |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| No agent profile | User not configured as agent | "No Agent Profile" card with explanation | Admin sets up profile |
| Auth redirect | Not logged in | Redirect to /login | Login |
| Empty results | No calls match filters | "No calls found" with suggestion | Adjust filters/date range |
| Recording download fails | Network error | New tab opens with URL | Manual download |
| Transcription unavailable | Feature not enabled or pending | "-" or processing indicator | Wait or admin enables feature |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to My Calls | Page loads with stats | ✅ | Good header explains purpose |
| 2 | View stats cards | 8 metrics displayed in 2x4 grid | ✅ | Icons and colors help scanning |
| 3 | View disposition breakdown | Color-coded progress bars | ✅ | Visual percentages |
| 4 | Click Filters button | Filter panel expands | ✅ | Active indicator dot |
| 5 | Apply URL filter | Advanced condition builder | ✅ | Powerful but may be complex |
| 6 | Select multiple statuses | Dropdown with checkboxes | ✅ | Clear multi-select |
| 7 | Click Apply | Filters applied, URL updates | ✅ | Button shows "Applied" when synced |
| 8 | Browse call log | Scrollable table | ✅ | Responsive columns |
| 9 | Play video recording | Modal opens with video | ✅ | Professional modal design |
| 10 | Expand transcription | Row expands inline | ✅ | Clear toggle chevron |
| 11 | Expand AI summary | Row expands with distinct styling | ✅ | Purple/primary highlight |
| 12 | Download recording | File downloads | ✅ | Standard download behavior |

### Accessibility
- Keyboard navigation: ⚠️ Not fully verified
- Screen reader support: ⚠️ Table structure helps, but interactive elements may need ARIA
- Color contrast: ✅ Uses design system colors
- Loading states: ⚠️ No explicit loading indicator during refetch
- Focus management: ⚠️ Modal should trap focus

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large result sets | Limited to 500 calls max | ✅ With warning message |
| Client-side filtering | URL conditions filtered after fetch | ⚠️ Could filter server-side for large datasets |
| Stats calculation | Runs on every render | ✅ Fast for ≤500 calls |
| Recording loading | On-demand when clicked | ✅ No upfront loading |
| Date range queries | Indexed on created_at | ✅ Efficient |

### Security
| Concern | Mitigation |
|---------|------------|
| Cross-agent data access | Query filters by auth.agentProfile.id |
| Recording URL exposure | Signed URLs from Supabase storage |
| Transcription data | Only shown to the assigned agent |
| AI summary privacy | Only visible to assigned agent |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Null value handling | Defensive coding with ?? and || operators |
| URL parsing errors | try/catch with fallback to raw URL |
| Download failures | Fallback to open in new tab |
| Audio state cleanup | onended callback clears state |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "My Calls" is intuitive for personal stats
2. **Is the control intuitive?** ✅ Yes - Standard filtering UX patterns
3. **Is feedback immediate?** ⚠️ Mostly - No loading spinner on date change
4. **Is the flow reversible?** ✅ Yes - Can clear filters, change dates freely
5. **Are errors recoverable?** ✅ Yes - Empty states guide toward solutions
6. **Is the complexity justified?** ✅ Yes - Agents need self-service access to their stats

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No loading state | User may not know refetch is happening | 🟢 Low | Add loading spinner |
| 500 call limit | High-volume agents may miss data | 🟡 Medium | Add pagination |
| No data export | Cannot export call history | 🟢 Low | Add CSV export |
| URL filter complexity | Advanced feature may confuse some users | 🟢 Low | Add help tooltip |
| No real-time updates | New calls require page refresh | 🟢 Low | Consider websocket updates |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Server page component | `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | 1-147 | Auth, query building |
| Client component | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | 1-1041 | Full UI implementation |
| Stats calculation | `apps/dashboard/src/lib/stats/agent-stats.ts` | 44-125 | `calculateAgentStats()` |
| Duration formatting | `apps/dashboard/src/lib/stats/agent-stats.ts` | 127-145 | Format utilities |
| StatCard component | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | 722-747 | Inline stat display |
| CallLogRow component | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | 750-1039 | Expandable row |
| URL filter conditions | `apps/dashboard/src/lib/components/call-log-filter-conditions.tsx` | - | Advanced URL filtering |
| Country flag util | `apps/dashboard/src/lib/utils/country-flag.ts` | - | Flag emoji mapping |
| Stats redirect (legacy) | `apps/dashboard/src/app/(app)/dashboard/stats/page.tsx` | 1-7 | Redirects to /dashboard/calls |

---

## 9. RELATED FEATURES
- [Agent Stats (STATS1)](../stats/agent-stats.md) - Admin view of agent stats (different from agent's self-view)
- [Call Logs (D7)](../admin/call-logs.md) - Admin view of all calls
- [Call Analytics (STATS3)](../stats/call-analytics.md) - Org-wide call analytics
- [Incoming Call (A2)](./incoming-call.md) - How calls arrive to agents
- [Agent Active Call (A4)](./agent-active-call.md) - The call experience itself
- [RNA Timeout (A3)](./rna-timeout.md) - Affects missed call counts

---

## 10. OPEN QUESTIONS
1. **Should pagination be added?** 500 call limit may be insufficient for high-volume agents over long date ranges.
2. **Should URL filtering move server-side?** Currently client-side, which means all 500 calls are fetched even if only a few match.
3. **Is 30-day default the right period?** Some agents may prefer weekly or monthly views by default.
4. **Should there be a "today" quick view?** Many agents may only care about today's calls.
5. **Should completed transcriptions trigger notifications?** Agents may want to know when transcriptions are ready.
6. **Is answer rate the right metric?** Some organizations may prefer different KPIs.
7. **Should agents be able to add notes to their own calls?** Currently disposition is the only annotation.




