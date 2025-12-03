# Feature: Agent Stats Detail (A6)

## Quick Summary
Individual agent performance detail page showing comprehensive statistics, call history, activity sessions, disposition breakdown, and utilization metrics. Accessed from the admin agent list by clicking the stats icon, this page provides a deep-dive into a single agent's performance over a customizable date range.

## Affected Users
- [ ] Website Visitor
- [x] Agent (can view their own stats if admin)
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Agent Stats Detail page gives admins a comprehensive view of an individual agent's performance. It enables:
- Monitoring call handling performance (rings, answers, misses, rejections)
- Tracking time-based metrics (answer time, call duration, total talk time)
- Analyzing agent availability and utilization patterns
- Reviewing session-by-session activity logs
- Understanding disposition breakdown per agent

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Evaluate individual agent performance | Shows answer rates, call counts, durations |
| Admin | Identify training opportunities | Shows missed calls, rejection rates, slow answer times |
| Admin | Track agent availability patterns | Activity tab shows logged time, utilization |
| Admin | Understand call outcomes | Disposition breakdown shows outcome distribution |
| Admin | Export or analyze specific periods | Date range picker allows custom analysis windows |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Agents page
2. Admin clicks the stats icon (BarChart3) on an agent row
3. Agent detail page loads at `/admin/agents/[agentId]`
4. Default date range is last 30 days
5. Server fetches agent profile, call_logs, agent_sessions, and dispositions
6. Client calculates derived metrics and renders two tabs
7. Admin can switch between Performance and Activity tabs
8. Admin can change date range using DateRangePicker

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Stats Detail Page                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Header: [← Back] [Avatar] Agent Name / Email    [Date Picker]  │
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │ Performance    │ ◄─────► │   Activity     │                  │
│  │   (default)    │   Tab   │                │                  │
│  └───────┬────────┘ Switch  └───────┬────────┘                  │
│          │                          │                            │
│          ▼                          ▼                            │
│  ┌────────────────────┐     ┌────────────────────┐              │
│  │ PERFORMANCE TAB    │     │ ACTIVITY TAB       │              │
│  │                    │     │                    │              │
│  │ Stats Cards:       │     │ Stats Cards:       │              │
│  │ - Total Rings      │     │ - Active Hours     │              │
│  │ - Total Answers    │     │ - Sessions Count   │              │
│  │ - Missed Calls     │     │ - Time on Calls    │              │
│  │ - Answer Rate %    │     │ - Utilization %    │              │
│  │                    │     │                    │              │
│  │ Time Metrics:      │     │ Time Breakdown:    │              │
│  │ - Avg Answer Time  │     │ - In Call (bar)    │              │
│  │ - Avg Duration     │     │ - Available (bar)  │              │
│  │ - Total Talk Time  │     │ - Away (bar)       │              │
│  │ - Rejected Calls   │     │                    │              │
│  │                    │     │ Session Log Table: │              │
│  │ Disposition Chart: │     │ - Date             │              │
│  │ (colored bars)     │     │ - Start/End Time   │              │
│  └────────────────────┘     │ - Duration         │              │
│                             │ - In Call Time     │              │
│                             │ - Ended By         │              │
│                             └────────────────────┘              │
│                                                                  │
│  Empty State: "No calls/sessions in this period"                │
│              "Try selecting a different date range"             │
└─────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Performance Tab | Shows call-related metrics | Default state or click "Performance" | Click "Activity" tab |
| Activity Tab | Shows session/time metrics | Click "Activity" tab | Click "Performance" tab |
| Loading | Fetching data for new date range | Change date range (URL params) | Data loads |
| Empty State (Calls) | No calls for selected period | Query returns 0 calls | Change date range |
| Empty State (Sessions) | No sessions for selected period | Query returns 0 sessions | Change date range |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `/admin/agents/[agentId]` | Server fetches agent, calls, sessions, dispositions | None |
| Date range change | DateRangePicker selection | Updates URL params `?from=&to=` | Triggers full page refresh |
| Tab switch | Tab button click | Changes `activeTab` state | None, client-side only |
| Preset click (Today, 7d, 30d, 90d) | DateRangePicker sidebar | Sets specific date range | URL updates, page refreshes |
| Back link click | "Back to Agents" link | Navigates to `/admin/agents` | None |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `AgentStatsPage` | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/page.tsx` | Server component - auth check, data fetching |
| `AgentStatsClient` | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Client component - renders tabs and metrics |
| `calculateAgentStats` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Computes call performance metrics |
| `calculateActivityStats` | `agent-stats-client.tsx:149-183` | Computes session/activity metrics |
| `formatDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Formats seconds to human-readable (e.g., "2h 15m") |
| `DateRangePicker` | `apps/dashboard/src/lib/components/date-range-picker.tsx` | Date range selection with presets |
| `StatCard` | `agent-stats-client.tsx:531-579` | Reusable stat display card component |
| `PerformanceContent` | `agent-stats-client.tsx:186-311` | Performance tab content |
| `ActivityContent` | `agent-stats-client.tsx:314-432` | Activity tab content |
| `TimeBreakdownBar` | `agent-stats-client.tsx:435-481` | Visual progress bar for time metrics |
| `SessionRow` | `agent-stats-client.tsx:484-527` | Individual session table row |

### Data Flow

```
URL: /admin/agents/{agentId}?from={YYYY-MM-DD}&to={YYYY-MM-DD}
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER COMPONENT (page.tsx)                                     │
│                                                                  │
│  1. Auth Check                                                   │
│     ├─► getCurrentUser() - must be logged in                    │
│     ├─► isAdmin check - must be admin                           │
│     └─► Redirect if unauthorized                                 │
│                                                                  │
│  2. Parse URL Params                                             │
│     ├─► from: start date (default: 30 days ago)                 │
│     └─► to: end date (default: today)                           │
│                                                                  │
│  3. Supabase Queries                                             │
│     ├─► agent_profiles (single agent by id + org match)         │
│     │   └─► JOIN users (email, full_name)                       │
│     │                                                            │
│     ├─► call_logs (by agent_id, date range)                     │
│     │   └─► Fields: id, status, duration_seconds,               │
│     │       ring_started_at, answered_at, answer_time_seconds,  │
│     │       disposition_id, created_at                          │
│     │                                                            │
│     ├─► dispositions (by org_id, active only)                   │
│     │   └─► Fields: id, name, color                             │
│     │                                                            │
│     └─► agent_sessions (by agent_id, date range)                │
│         └─► Fields: id, started_at, ended_at, duration_seconds, │
│             idle_seconds, in_call_seconds, away_seconds,        │
│             ended_reason                                         │
│                                                                  │
│  4. Return AgentStatsClient with props                           │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT COMPONENT (agent-stats-client.tsx)                       │
│                                                                  │
│  1. Calculate Performance Stats                                  │
│     ├─► calculateAgentStats(calls, dispositions)                │
│     │   ├─► totalRings = calls.length                           │
│     │   ├─► totalAnswers = count(accepted OR completed)         │
│     │   ├─► totalMissed = count(missed)                         │
│     │   ├─► totalRejected = count(rejected)                     │
│     │   ├─► avgAnswerTime = avg(answer_time_seconds)            │
│     │   ├─► answerPercentage = (answers / rings) * 100          │
│     │   ├─► avgCallDuration = avg(duration) for completed       │
│     │   ├─► totalTalkTime = sum(duration) for completed         │
│     │   └─► dispositionBreakdown = grouped by disposition       │
│     │                                                            │
│     └─► calculateActivityStats(sessions)                        │
│         ├─► totalSessions = sessions.length                     │
│         ├─► totalLoggedSeconds = sum(duration) for ended        │
│         ├─► totalIdleSeconds = sum(idle_seconds)                │
│         ├─► totalInCallSeconds = sum(in_call_seconds)           │
│         ├─► totalAwaySeconds = sum(away_seconds)                │
│         ├─► activeSeconds = idle + in_call (NOT away)           │
│         ├─► avgSessionLength = logged / completed count         │
│         └─► utilization = (in_call / active) * 100              │
│                                                                  │
│  2. Render UI                                                    │
│     ├─► Header (back link, avatar, name, email, date picker)    │
│     ├─► Tabs (Performance | Activity)                           │
│     └─► Tab Content (stats cards, charts, tables)               │
└─────────────────────────────────────────────────────────────────┘
```

### Metric Definitions

#### Performance Metrics (from call_logs)
| Metric | Calculation | Display | Notes |
|--------|-------------|---------|-------|
| Total Rings | `calls.length` | Integer | All calls assigned in period |
| Total Answers | Count where `status = "accepted" OR "completed"` | Integer | Includes ongoing calls |
| Missed Calls | Count where `status = "missed"` | Integer | RNA timeout calls |
| Answer Rate | `(totalAnswers / totalRings) * 100` | `XX.X%` | |
| Avg. Answer Time | `avg(answer_time_seconds)` where not null | `Xm Xs` | Time to click accept |
| Avg. Call Duration | `avg(duration_seconds)` where completed | `Xm Xs` | Completed calls only |
| Total Talk Time | `sum(duration_seconds)` where completed | `Xh Xm` | |
| Rejected Calls | Count where `status = "rejected"` | Integer | Agent clicked reject |

#### Activity Metrics (from agent_sessions)
| Metric | Calculation | Display | Notes |
|--------|-------------|---------|-------|
| Active Hours | `idle_seconds + in_call_seconds` | `Xh Xm` | Excludes away time |
| Sessions | `sessions.length` | Integer | Login count in period |
| Time on Calls | `sum(in_call_seconds)` | `Xh Xm` | Direct from DB |
| Utilization | `(in_call / active) * 100` | `XX%` | Call time vs available |

#### Time Breakdown (visual bars)
| Category | Color | Calculation |
|----------|-------|-------------|
| In Call | Green | `in_call_seconds / totalLogged * 100%` |
| Available (Idle) | Blue | `idle_seconds / totalLogged * 100%` |
| Away | Amber | `away_seconds / totalLogged * 100%` |

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Agent with no calls in period | Query returns empty | Shows empty state "No calls in this period" | ✅ | Suggests changing date range |
| 2 | Newly created agent | First day, no history | Shows zero stats, empty state | ✅ | Activity shows active session if logged in |
| 3 | Agent transferred between pools | Different pool_ids on calls | All calls counted regardless of pool | ✅ | Agent stats are pool-agnostic |
| 4 | Stats during timezone changes (DST) | User in different timezone | Uses ISO timestamps from server | ✅ | Server handles UTC, client displays local |
| 5 | Very long call affecting averages | Multi-hour call | Included in averages like any other call | ✅ | May skew avg duration significantly |
| 6 | Stats for deactivated agent | Agent soft-deleted | Page returns 404 (notFound) | ✅ | org_id match fails for deactivated |
| 7 | Partial day statistics | Stats near date boundaries | Calls filtered by created_at | ✅ | Includes calls started in range |
| 8 | Agent with no answer_time_seconds | Older calls without tracking | Excluded from avg answer time calculation | ✅ | Division by zero protected |
| 9 | Agent in active session | Session has `ended_at = null` | Session shown with "Active" badge in green | ✅ | Duration not counted in averages |
| 10 | All calls rejected | 100% rejection rate | Answer rate shows 0%, rejected count high | ✅ | Edge case handled |
| 11 | No dispositions set | Calls without disposition_id | Disposition breakdown hidden entirely | ✅ | Only shows if count > 0 |
| 12 | Large date range (1+ year) | User selects very wide range | All data loaded, may be slow | ⚠️ | No pagination implemented |
| 13 | Multiple sessions same day | Agent logs in/out repeatedly | Each session listed separately | ✅ | Session log shows all |
| 14 | Session with 0 duration | Immediate logout | Excluded from avg session length | ✅ | Completed sessions only |
| 15 | Agent viewing own stats | Admin who is also agent | Full access to own stats page | ✅ | No special self-view mode |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Agent not found (404) | Invalid agentId or wrong org | Next.js 404 page | Navigate back to agents list |
| Auth redirect | Not logged in | Redirect to /login | Login |
| Permission denied | Non-admin accessing page | Redirect to /dashboard | Use admin account |
| Database error | Supabase query fails | Error boundary | Refresh page |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Click stats icon on agent row | Navigate to detail page | ✅ | Icon tooltip says "View Stats" |
| 2 | View Performance tab | Stats cards with metrics | ✅ | Good visual hierarchy |
| 3 | View disposition breakdown | Colored progress bars | ✅ | Percentage shown per disposition |
| 4 | Switch to Activity tab | Session metrics and log | ✅ | Smooth tab transition |
| 5 | View time breakdown bars | Visual representation of time | ✅ | Clear color coding |
| 6 | View session log table | All sessions with details | ✅ | Sortable by date |
| 7 | Change date range | Click picker, select range | ✅ | Multiple preset options |
| 8 | Navigate back | Click "Back to Agents" | ✅ | Clear back navigation |

### Visual Design
| Element | Implementation | Notes |
|---------|---------------|-------|
| Agent avatar | Circular with Users icon | Primary color background |
| Stats cards | Glass-morphism style | Colored icons by category |
| Tab switcher | Pill-style toggles | Active state highlighted |
| Progress bars | Rounded, colored | Smooth transitions |
| Session table | Hover highlight | Alternating row styles |
| Empty state | Centered with icon | Helpful guidance message |

### Accessibility
- Keyboard navigation: ⚠️ Not fully verified
- Screen reader support: ⚠️ Not fully verified
- Color contrast: ✅ Uses design system semantic colors
- Loading states: ⚠️ No explicit loading spinner during date change (full page navigation)

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large dataset queries | No pagination, fetches all calls/sessions in range | ⚠️ May be slow for >1000 records |
| Client-side calculation | Stats computed on client from raw data | ✅ Fast for typical datasets |
| Re-fetch on date change | Full page navigation via URL params | ✅ Simple, uses Next.js caching |
| Multiple DB queries | 4 parallel queries (agent, calls, dispositions, sessions) | ✅ Server-side, fast |

### Security
| Concern | Mitigation |
|---------|------------|
| Cross-org data access | Query filters by `organization_id` |
| Auth bypass | Server component calls `getCurrentUser()` first |
| Admin-only access | Redirects to /dashboard if `!auth.isAdmin` |
| SQL injection | Uses Supabase parameterized queries |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Null value handling | Filters and defaults prevent NaN/division-by-zero |
| Empty data | Empty state UI with helpful message |
| Missing relations | Supabase joins handle null gracefully (user relation) |
| Deactivated agents | Returns 404 via `notFound()` |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Performance (calls) vs Activity (time) is intuitive
2. **Is the control intuitive?** ✅ Yes - Standard tabs, familiar date picker
3. **Is feedback immediate?** ⚠️ Mostly - Full page refresh on date change, no spinner
4. **Is the flow reversible?** ✅ Yes - Can navigate back, change dates freely
5. **Are errors recoverable?** ✅ Yes - 404 allows navigation, empty state guides action
6. **Is the complexity justified?** ✅ Yes - Essential metrics for agent management

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No loading state on date change | User may think click didn't register | 🟢 Low | Add client-side loading indicator |
| No export functionality | Cannot download data for external analysis | 🟢 Low | Add CSV export option |
| No comparison view | Cannot compare agents side-by-side | 🟢 Low | Future: comparison mode |
| Large date ranges slow | Performance degrades with >1000 calls | 🟡 Medium | Add pagination or date limits |
| No team average comparison | Cannot see how agent compares to team | 🟢 Low | Future: add benchmark metrics |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Server data fetching | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/page.tsx` | 1-99 | Auth + Supabase queries |
| Client stats display | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | 1-580 | Full client component |
| Performance stats calculation | `apps/dashboard/src/lib/stats/agent-stats.ts` | 44-125 | `calculateAgentStats()` |
| Activity stats calculation | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | 149-183 | `calculateActivityStats()` |
| Duration formatting | `apps/dashboard/src/lib/stats/agent-stats.ts` | 127-145 | `formatDuration()`, `formatShortDuration()` |
| Date picker component | `apps/dashboard/src/lib/components/date-range-picker.tsx` | 1-204 | DateRangePicker with presets |
| Reusable stats card | `apps/dashboard/src/features/workbench/stats-card.tsx` | 1-35 | StatsCard component |
| Agent list (links to detail) | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 1278-1285 | BarChart3 link |
| Call log types | `packages/domain/src/database.types.ts` | - | CallLog, CallStatus types |
| Session types | `packages/domain/src/database.types.ts` | - | AgentSession type |

---

## 9. RELATED FEATURES
- [Agent Management (D4)](../admin/agent-management.md) - Agent list page links to stats
- [Agent Stats (STATS1)](../stats/agent-stats.md) - Same feature from stats category perspective
- [Coverage Stats (STATS2)](../stats/coverage-stats.md) - Org-level coverage analysis
- [Call Analytics (STATS3)](../stats/call-analytics.md) - Call-level analytics
- [RNA Timeout (A3)](./rna-timeout.md) - Affects missed call counting
- [Heartbeat & Staleness (P6)](../platform/heartbeat-staleness.md) - Session tracking system

---

## 10. OPEN QUESTIONS
1. **Should stats be cached?** Currently all queries hit DB fresh on each page load. Consider caching for performance with high-volume agents.
2. **What's the max supported date range?** No explicit limit - very long ranges may be slow.
3. **Should utilization exclude away time?** Current calculation excludes away time - is this the right definition for "utilization"?
4. **Should agents view their own stats?** Currently admin-only. Consider self-service stats view for agents.
5. **Are team comparison metrics needed?** No benchmark against team average currently shown.
6. **Should deactivated agents retain accessible historical stats?** Currently returns 404.

---

## Session Summary

**Feature:** A6 - Agent Stats Detail  
**Date:** Dec 3, 2025  

### Feature Overview
The Agent Stats Detail page provides comprehensive performance analytics for individual agents. It displays call handling metrics (rings, answers, misses, rejections, answer rates, durations) in a Performance tab and session/availability metrics (active hours, utilization, time breakdown) in an Activity tab. Data is filtered by a customizable date range with convenient presets.

### Key Implementation Details
- Server-side data fetching with Next.js server component
- Client-side metric calculation for derived values
- URL-based date range state for bookmarking/sharing
- Two-tab layout separating call performance from activity patterns
- Disposition breakdown with colored visual bars
- Session log table showing all login/logout activity

### Confidence: High
The feature is well-implemented with clear separation of concerns, comprehensive metrics, and proper empty state handling.

