# Feature: Agent Stats (STATS1)

## Quick Summary
Per-agent performance metrics including calls handled, average duration, answer rates, and session activity. Allows admins to view detailed agent performance in the admin dashboard with customizable date ranges.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Agent Stats provides comprehensive performance analytics for individual agents. It enables admins to:
- Monitor agent call handling performance (rings, answers, misses, rejections)
- Track time-based metrics (answer time, call duration, total talk time)
- Analyze agent availability and utilization patterns
- Review session-by-session activity logs
- Understand disposition breakdown per agent

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Evaluate agent performance | Shows answer rates, call counts, durations per agent |
| Admin | Identify top performers | Provides metrics to compare across agents |
| Admin | Spot training opportunities | Shows missed calls, rejection rates, slow answer times |
| Admin | Understand scheduling effectiveness | Activity tab shows logged time, utilization |
| Platform Admin | Monitor customer success | Access to all org agent stats |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Agents
2. Admin clicks on an agent row to view their stats
3. Page loads with default date range (last 30 days)
4. Server fetches call_logs and agent_sessions for the agent in date range
5. Client calculates derived metrics using `calculateAgentStats()` and `calculateActivityStats()`
6. Stats display in Performance tab (default) or Activity tab
7. Admin can change date range using DateRangePicker component
8. Page re-fetches data with new date range on URL change

### State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Stats Page                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Performance Tab │ ◄─────► │   Activity Tab   │         │
│  │    (default)     │         │                  │         │
│  └──────────────────┘         └──────────────────┘         │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ - Total Rings    │         │ - Active Hours   │         │
│  │ - Total Answers  │         │ - Sessions Count │         │
│  │ - Missed Calls   │         │ - Time on Calls  │         │
│  │ - Answer Rate    │         │ - Utilization %  │         │
│  │ - Avg Answer Time│         │ - Time Breakdown │         │
│  │ - Avg Duration   │         │ - Session Log    │         │
│  │ - Total Talk Time│         │                  │         │
│  │ - Rejected Calls │         │                  │         │
│  │ - Dispositions   │         │                  │         │
│  └──────────────────┘         └──────────────────┘         │
│                                                             │
│           Date Range: [Picker ▼]                            │
│           Presets: Today | 7 days | 30 days | 90 days      │
└─────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Performance Tab | Shows call-related metrics | Default state or click "Performance" | Click "Activity" tab |
| Activity Tab | Shows session/time metrics | Click "Activity" tab | Click "Performance" tab |
| Loading | Fetching data for new date range | Change date range | Data loads |
| Empty State | No data for selected period | Query returns 0 calls/sessions | Change date range |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `/admin/agents/[agentId]` | Fetches agent data, calls, sessions | None |
| Date range change | DateRangePicker | Updates URL params, triggers refetch | URL updates |
| Tab switch | Tab buttons | Changes activeTab state | None |
| Preset click | DateRangePicker | Sets specific date range | URL updates |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AgentStatsPage` | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/page.tsx` | Server component that fetches data |
| `AgentStatsClient` | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Client component rendering stats UI |
| `calculateAgentStats` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Core calculation function for call metrics |
| `calculateActivityStats` | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Session/activity metric calculations |
| `formatDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Formats seconds to human-readable string |
| `DateRangePicker` | `apps/dashboard/src/lib/components/date-range-picker.tsx` | Date selection UI component |

### Data Flow

```
PAGE LOAD
    │
    ├─► URL: /admin/agents/{agentId}?from={date}&to={date}
    │
    ├─► Server Component (page.tsx)
    │   ├─► Parse URL params (default: last 30 days)
    │   ├─► Supabase query: agent_profiles (single agent)
    │   ├─► Supabase query: call_logs (by agent_id, date range)
    │   │   └─► Fields: id, status, duration_seconds, ring_started_at,
    │   │       answered_at, answer_time_seconds, disposition_id, created_at
    │   ├─► Supabase query: dispositions (by org_id, active only)
    │   └─► Supabase query: agent_sessions (by agent_id, date range)
    │       └─► Fields: id, started_at, ended_at, duration_seconds,
    │           idle_seconds, in_call_seconds, away_seconds, ended_reason
    │
    └─► Client Component (agent-stats-client.tsx)
        ├─► calculateAgentStats(calls, dispositions)
        │   ├─► totalRings = calls.length
        │   ├─► totalAnswers = filter(accepted OR completed).length
        │   ├─► totalMissed = filter(missed).length
        │   ├─► totalRejected = filter(rejected).length
        │   ├─► avgAnswerTime = avg(answer_time_seconds) where not null
        │   ├─► answerPercentage = (totalAnswers / totalRings) * 100
        │   ├─► avgCallDuration = avg(duration_seconds) for completed calls
        │   ├─► totalTalkTime = sum(duration_seconds) for completed calls
        │   └─► dispositionBreakdown = group by disposition, calc percentages
        │
        ├─► calculateActivityStats(sessions)
        │   ├─► totalSessions = sessions.length
        │   ├─► totalLoggedSeconds = sum(duration_seconds) where ended_at exists
        │   ├─► totalIdleSeconds = sum(idle_seconds)
        │   ├─► totalInCallSeconds = sum(in_call_seconds)
        │   ├─► totalAwaySeconds = sum(away_seconds)
        │   ├─► activeSeconds = idle + in_call (NOT including away)
        │   ├─► avgSessionLength = totalLoggedSeconds / completedSessions
        │   └─► utilizationPercentage = (in_call / activeSeconds) * 100
        │
        └─► Render UI
            ├─► Header: Agent name, email, date picker
            ├─► Tabs: Performance | Activity
            ├─► Performance Tab: StatCards + Disposition breakdown
            └─► Activity Tab: StatCards + Time breakdown + Session log table
```

### Metric Definitions

#### Performance Metrics (from call_logs)
| Metric | Formula | Notes |
|--------|---------|-------|
| Total Rings | `calls.length` | All calls assigned to agent in period |
| Total Answers | Count where `status = "accepted" OR "completed"` | Includes ongoing calls |
| Missed Calls | Count where `status = "missed"` | RNA timeout calls |
| Rejected Calls | Count where `status = "rejected"` | Agent clicked reject |
| Answer Rate | `(totalAnswers / totalRings) * 100` | Percentage |
| Avg Answer Time | `avg(answer_time_seconds)` | Only calls with value |
| Avg Call Duration | `avg(duration_seconds)` where `status = "completed"` | Completed only |
| Total Talk Time | `sum(duration_seconds)` where `status = "completed"` | In seconds |

#### Activity Metrics (from agent_sessions)
| Metric | Formula | Notes |
|--------|---------|-------|
| Active Hours | `idle_seconds + in_call_seconds` | Excludes away time |
| Total Sessions | `sessions.length` | All sessions in period |
| Time on Calls | `sum(in_call_seconds)` | Direct from DB |
| Utilization | `(in_call_seconds / activeSeconds) * 100` | Call time vs available time |
| Avg Session Length | `totalLoggedSeconds / completedSessions.length` | Only completed sessions |

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Agent with zero calls in period | Query returns empty | Shows empty state with "No calls in this period" | ✅ | Suggests changing date range |
| 2 | Stats for newly created agent | First day, no data | Shows zero stats, empty state | ✅ | Activity will show active session if logged in |
| 3 | Agent in active session | Session has `ended_at = null` | Active session shown with "Active" badge | ✅ | Duration not counted in averages |
| 4 | Calls with null agent_id | Deleted agent's calls | Excluded from query (filtered by agent_id) | ✅ | Handled at query level |
| 5 | Very long call (ongoing) | Duration not yet recorded | Excluded from duration averages | ✅ | Only completed calls have duration |
| 6 | Agent transferred between pools | Different pool_ids on calls | All calls counted regardless of pool | ✅ | Agent stats are pool-agnostic |
| 7 | Stats for deleted/deactivated agent | Agent soft-deleted | Page returns 404 (notFound) | ✅ | Query filters by org_id match |
| 8 | Large date range (1+ year) | User selects wide range | All data loaded, no pagination | ⚠️ | May be slow for high-volume agents |
| 9 | Zero answer_time_seconds | Calls without timing data | Excluded from avg calculation | ✅ | Division by zero protected |
| 10 | All calls rejected | 100% rejection rate | Answer rate shows 0% | ✅ | Edge case handled |
| 11 | Timezone boundaries | Midnight crossing | Uses ISO timestamps from DB | ✅ | Server handles UTC conversion |
| 12 | No dispositions set | Calls without disposition_id | Excluded from disposition breakdown | ✅ | Only shows dispositions with count > 0 |
| 13 | Session with 0 duration | Immediate logout | Excluded from avg session length | ✅ | Completed sessions only |
| 14 | Multiple sessions same day | Agent logs in/out | Each session listed separately | ✅ | Shows in session log |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Agent not found | Invalid agentId or wrong org | 404 page | Navigate back to agents list |
| Auth redirect | Not logged in | Redirect to /login | Login |
| Permission denied | Non-admin accessing page | Redirect to /dashboard | Use admin account |
| Database error | Supabase query fails | Error boundary | Refresh page |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Agents | Agent list loads | ✅ | |
| 2 | Click agent row | Individual stats page loads | ✅ | |
| 3 | View Performance tab | See call metrics | ✅ | Good stat card design |
| 4 | Switch to Activity tab | See session metrics | ✅ | Clear tab switch |
| 5 | Change date range | Page reloads with new data | ✅ | URL updates for bookmarking |
| 6 | Click date preset | Quick date range selection | ✅ | Good presets |
| 7 | View disposition breakdown | Color-coded bars | ✅ | Visual percentage display |
| 8 | View session log | Table with all sessions | ✅ | Clear columns |

### Accessibility
- Keyboard navigation: ⚠️ Not verified
- Screen reader support: ⚠️ Not verified
- Color contrast: ✅ Uses consistent design system colors
- Loading states: ⚠️ No explicit loading spinner during date change

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large dataset queries | No pagination, fetches all calls in range | ⚠️ May be slow for >1000 calls |
| Client-side calculation | Stats computed on client from raw data | ✅ Fast for typical datasets |
| Re-fetch on date change | Full page navigation via URL params | ✅ Simple, cacheable |

### Security
| Concern | Mitigation |
|---------|------------|
| Cross-org data access | Query filters by organization_id |
| Auth bypass | Server component validates getCurrentUser() |
| Admin-only access | Redirect to /dashboard if not isAdmin |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Null value handling | Filters and defaults prevent NaN/division-by-zero |
| Empty data | Empty state UI with helpful message |
| Missing relations | Supabase joins handle null gracefully |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Performance vs Activity is intuitive separation
2. **Is the control intuitive?** ✅ Yes - Date picker is standard, tabs are clear
3. **Is feedback immediate?** ⚠️ Mostly - No loading indicator during date change
4. **Is the flow reversible?** ✅ Yes - Can navigate back, change dates freely
5. **Are errors recoverable?** ✅ Yes - 404 allows navigation, empty state guides action
6. **Is the complexity justified?** ✅ Yes - Essential metrics for agent management

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No loading state on date change | User may think click didn't register | 🟢 Low | Add loading spinner |
| No export functionality | Cannot download data for external analysis | 🟢 Low | Add CSV export option |
| No comparison view | Cannot compare agents side-by-side | 🟢 Low | Future feature: comparison mode |
| Large date ranges slow | Performance degrades with >1000 calls | 🟡 Medium | Add pagination or date limits |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Server data fetching | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/page.tsx` | 1-99 | Supabase queries |
| Client stats display | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | 1-580 | Full client component |
| Call stats calculation | `apps/dashboard/src/lib/stats/agent-stats.ts` | 44-125 | `calculateAgentStats()` |
| Activity stats calculation | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | 149-183 | `calculateActivityStats()` |
| Duration formatting | `apps/dashboard/src/lib/stats/agent-stats.ts` | 127-145 | `formatDuration()`, `formatShortDuration()` |
| Date picker component | `apps/dashboard/src/lib/components/date-range-picker.tsx` | 1-204 | DateRangePicker |
| Database types | `packages/domain/src/database.types.ts` | 282-317 | CallLog type |
| Session types | `packages/domain/src/database.types.ts` | 444-460 | AgentSession type |

---

## 9. RELATED FEATURES
- [Agent Management (D4)](../admin/agent-management.md) - Agent list page links to stats
- [Coverage Stats (STATS2)](./coverage-stats.md) - Org-level coverage analysis
- [Call Analytics (STATS3)](./call-analytics.md) - Call-level analytics
- [Agent Sessions](../platform/heartbeat-staleness.md) - Session tracking system
- [RNA Timeout (A3)](../agent/rna-timeout.md) - Affects missed call counting

---

## 10. OPEN QUESTIONS
1. **Should stats be cached?** Currently all queries hit DB fresh on each page load. Consider caching for performance.
2. **What's the max supported date range?** No explicit limit - very long ranges may timeout.
3. **Should utilization include away time?** Current calculation excludes away time - is this the right definition?
4. **Are there plans for real-time stats?** Current implementation requires page refresh.
5. **Should deleted agents retain historical stats?** Currently, stats page 404s for deleted agents.

