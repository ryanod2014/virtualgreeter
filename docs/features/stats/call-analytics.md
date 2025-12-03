# Feature: Call Analytics (STATS3)

## Quick Summary
Call Analytics provides administrators and agents with comprehensive call performance metrics, including total calls, outcomes, duration trends, answer rates, and coverage statistics. It serves as the primary dashboard analytics view for tracking visitor engagement and agent performance.

## Affected Users
- [ ] Website Visitor
- [x] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Call Analytics enables organizations to understand their call performance, identify staffing gaps, and track agent effectiveness. It answers critical questions like "Are we staffed enough?", "How fast do agents answer?", and "What are our call outcomes?"

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Understand overall call performance | Displays aggregate metrics (total calls, answer rate, duration) |
| Admin | Identify staffing gaps | Coverage card shows missed opportunities when no agents available |
| Admin | Track call outcomes | Disposition breakdown shows how calls are categorized |
| Admin | Filter and analyze call data | Multi-filter system with date range, agent, status, pool, URL, country |
| Admin | Export call data | CSV download for external analysis |
| Agent | View personal performance | My Calls page shows individual agent stats |
| Agent | Review past calls | Call log table with recording playback |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Calls (or Agent to Dashboard → Calls)
2. Page loads with default 30-day date range
3. Server fetches `call_logs`, `dispositions`, `agent_sessions`, `widget_pageviews` from Supabase
4. Statistics are calculated server-side (coverage) and client-side (call metrics)
5. UI displays stat cards, coverage card, disposition breakdown, and call logs table
6. User can apply filters, change date range, or export data

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ADMIN CALLS PAGE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────────┐   │
│  │  Date Range   │    │   Filters     │    │   Export CSV      │   │
│  │   Picker      │    │   Panel       │    │   Button          │   │
│  └───────┬───────┘    └───────┬───────┘    └───────────────────┘   │
│          │                    │                                     │
│          ▼                    ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    SERVER COMPONENT                         │    │
│  │  1. Fetch call_logs (with joins: agent, site, disposition) │    │
│  │  2. Fetch dispositions, agents, pools for filter options   │    │
│  │  3. Fetch agent_sessions for team activity                 │    │
│  │  4. Fetch widget_pageviews for coverage stats              │    │
│  │  5. Calculate hourly coverage via calculateHourlyCoverage()│    │
│  └────────────────────────────┬───────────────────────────────┘    │
│                               │                                     │
│                               ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    CLIENT COMPONENT                         │    │
│  │  1. Apply client-side URL condition filtering               │    │
│  │  2. Calculate stats via calculateAgentStats()               │    │
│  │  3. Render stat cards, coverage card, disposition breakdown │    │
│  │  4. Render call logs table with expandable rows             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Metrics Calculated

| Metric | Formula | Source |
|--------|---------|--------|
| Total Rings | Count of all call_logs | `calls.length` |
| Total Answers | Count where status = "accepted" OR "completed" | Filter on status |
| Missed Calls | Count where status = "missed" | Filter on status |
| Rejected Calls | Count where status = "rejected" | Filter on status |
| Answer Rate | (Total Answers / Total Rings) × 100 | Calculated |
| Avg Answer Time | Sum(answer_time_seconds) / Count(calls with answer_time) | `answer_time_seconds` column |
| Avg Call Duration | Sum(duration_seconds) / Count(completed calls) | `duration_seconds` column |
| Total Talk Time | Sum(duration_seconds) for completed calls | `duration_seconds` column |
| Coverage Rate | (Pageviews with agent / Total pageviews) × 100 | `widget_pageviews` table |
| Missed Opportunities | Pageviews where agent_id = null | `widget_pageviews` table |
| Conversion | (Total Answers / Pageviews with agent) × 100 | Calculated |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `/admin/calls` or `/dashboard/calls` | Fetches all data, calculates stats | Database queries |
| Date range change | DateRangePicker | URL params update, triggers re-fetch | Server-side re-query |
| Filter apply | Filter panel | URL params update, triggers re-fetch | Server + client filtering |
| Filter clear | Clear button | Resets to date range only | URL params reset |
| CSV export | Export button | Generates CSV from filtered calls | File download |
| Recording play | Play button | Opens video modal or plays audio | Audio/video playback |
| Transcription expand | Badge click | Toggles row expansion | UI state change |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `CallsClient` | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Admin calls dashboard UI |
| `AgentCallsClient` | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | Agent personal calls UI |
| `calculateAgentStats` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Calculates call metrics from call array |
| `calculateHourlyCoverage` | `apps/dashboard/src/lib/stats/coverage-stats.ts` | Calculates 24-hour coverage grid |
| `calculateDailyHourlyCoverage` | `apps/dashboard/src/lib/stats/coverage-stats.ts` | 7×24 day/hour coverage heatmap |
| `findProblemHours` | `apps/dashboard/src/lib/stats/coverage-stats.ts` | Identifies hours with low coverage |
| `formatDuration` | `apps/dashboard/src/lib/stats/agent-stats.ts` | Formats seconds as "Xm Ys" or "Xh Ym" |
| `StatCard` | Inside client components | Reusable stat display card |
| `CallLogRow` | Inside client components | Table row with expandable transcription |

### Filter Parameters (URL Query String)
| Parameter | Type | Description | Applied |
|-----------|------|-------------|---------|
| `from` | string (YYYY-MM-DD) | Start of date range | Server |
| `to` | string (YYYY-MM-DD) | End of date range | Server |
| `agent` | string (comma-separated UUIDs) | Filter by agent(s) | Server |
| `status` | string (comma-separated) | Filter by call status | Server |
| `disposition` | string (comma-separated UUIDs) | Filter by disposition(s) | Server |
| `pool` | string (comma-separated UUIDs) | Filter by pool(s) | Server |
| `minDuration` | number | Minimum duration in seconds | Server |
| `maxDuration` | number | Maximum duration in seconds | Server |
| `country` | string (comma-separated ISO codes) | Filter by visitor country | Server |
| `urlConditions` | JSON string | Complex URL pattern matching | Client |

### URL Conditions Filter (Client-Side)
The `urlConditions` filter supports advanced URL pattern matching:

| Condition Type | Match Types | Example |
|---------------|-------------|---------|
| `domain` | is_exactly, contains, starts_with, ends_with, does_not_contain | Domain = "example.com" |
| `path` | is_exactly, contains, starts_with, ends_with, does_not_contain | Path contains "/pricing" |
| `query_param` | is_exactly, contains, starts_with, ends_with, does_not_contain | Param "utm_source" contains "google" |

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | No call data for period | Empty date range | Shows "No calls found" empty state | ✅ | Clear messaging |
| 2 | Very high call volume | 500+ calls | Limited to 500 results, shows "(limit reached)" | ✅ | Pagination not implemented |
| 3 | Call with 0 duration | Immediate hang-up | Included in stats, duration shows "-" | ✅ | |
| 4 | Call duration outliers | Very long calls | Included in average (no capping) | ⚠️ | May skew averages |
| 5 | No dispositions configured | New org | Empty disposition breakdown | ✅ | Section hidden |
| 6 | Calls without agent | Orphaned records | Agent shows "Unknown" | ✅ | |
| 7 | Timezone transitions | DST changes | Uses local date parsing | ✅ | `parseLocalDate()` helper |
| 8 | All filters active | Complex query | Server applies most, client applies URL | ✅ | Hybrid approach |
| 9 | Very short calls (<10s) | Quick calls | Included in all metrics | ✅ | |
| 10 | Large CSV export | Export 500 calls | Generates complete CSV with all columns | ✅ | |
| 11 | Coverage 100% | Always staffed | Shows "Full Coverage" green card | ✅ | |
| 12 | Coverage 0% | Never staffed | Shows missed opportunities amber card | ✅ | |
| 13 | Recording playback | Video/audio | Opens modal for video, inline audio | ✅ | Detects .webm extension |
| 14 | Transcription pending | Processing | Shows "Processing" badge with spinner | ✅ | |
| 15 | Transcription failed | Error | Shows "Failed" red badge | ✅ | |
| 16 | AI Summary available | Completed | Expandable row with summary content | ✅ | |
| 17 | Blocklist filtering | Country blocked | Excluded from coverage calculation | ✅ | Respects org settings |
| 18 | Deleted pool in calls | Historical data | Pool filter still works | ✅ | Pool ID preserved |
| 19 | Rapid filter changes | User spam clicks | Each triggers server refresh | ⚠️ | No debounce visible |
| 20 | Date range > 1 year | Long analysis | Works but slow | ⚠️ | No limit enforced |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Supabase query fails | Database issue | Empty results, no explicit error | Page refresh |
| Recording URL expired | Old S3 links | Video/audio won't play | No recovery (data lost) |
| Invalid filter params | Manual URL edit | Silently ignored | Clear filters |
| CSV generation fails | Browser memory | Export may truncate | Try smaller date range |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Admin Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Calls | Page loads with 30-day data | ✅ | |
| 2 | View coverage card | See missed opportunities count | ✅ | Clear CTA "Add More Agents" |
| 3 | Review stat cards | 10 metrics displayed in grid | ✅ | |
| 4 | Open filters | Panel expands with all options | ✅ | |
| 5 | Select multiple agents | Multi-select dropdown | ✅ | |
| 6 | Apply filters | Button shows "Apply" → "Applied" | ✅ | Clear state feedback |
| 7 | View call row | All data visible in table | ✅ | Truncated URL with tooltip |
| 8 | Play recording | Modal opens for video | ✅ | |
| 9 | Expand transcription | Row expands below | ✅ | |
| 10 | Export CSV | File downloads | ✅ | |

**Agent Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to My Calls | Own calls loaded | ✅ | |
| 2 | Review performance | 8 stat cards for personal metrics | ✅ | |
| 3 | Filter by status | Multi-select works | ✅ | |

### Accessibility
- Keyboard navigation: ⚠️ Table rows not focusable
- Screen reader support: ⚠️ Icons lack aria-labels
- Color contrast: ✅ Good contrast on stat cards
- Loading states: ⚠️ No skeleton loaders during fetch

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large query results | 500 row limit | ✅ Mitigated |
| Coverage calculation | Iterates all pageviews/sessions | ⚠️ O(n×m) complexity |
| Hourly coverage | Loops 24×days×sessions | ⚠️ Could be slow for long ranges |
| Client-side filtering | URL conditions applied after fetch | ✅ Small overhead |
| Re-renders on filter change | Full page refresh | ⚠️ No optimistic UI |

### Security
| Concern | Mitigation |
|---------|------------|
| Data isolation | RLS on Supabase tables ensures org isolation |
| Recording URLs | Signed URLs from storage |
| Admin-only access | `auth.isAdmin` check on server |
| Agent data access | Agent can only see own calls |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Database timeout | 500 row limit prevents long queries |
| Missing columns | Fallback query for `visitor_country_code` |
| Null handling | All stats calculations handle null values |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "Calls page shows my call performance and history"
2. **Is the control intuitive?** ✅ Yes - Standard filter/table pattern
3. **Is feedback immediate?** ⚠️ Mostly - No loading indicators during filter apply
4. **Is the flow reversible?** ✅ Yes - Clear filters button, back navigation
5. **Are errors recoverable?** ⚠️ Mostly - No explicit error states shown
6. **Is the complexity justified?** ✅ Yes - Multi-filter needed for real analysis

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| 500 row limit not paginated | Can't see older calls | 🟡 Medium | Add pagination or infinite scroll |
| No loading indicators | User confused on slow queries | 🟢 Low | Add skeleton loaders |
| Outliers in averages | Skewed metrics | 🟢 Low | Consider median or trim outliers |
| Coverage calculation expensive | Slow for long date ranges | 🟡 Medium | Pre-aggregate or cache |
| No saved filter presets | Repetitive filter setup | 🟢 Low | Add filter presets |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Admin calls page (server) | `apps/dashboard/src/app/(app)/admin/calls/page.tsx` | 1-258 | Data fetching, filter application |
| Admin calls client | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | 1-1320 | UI, filtering, stats display |
| Agent calls page | `apps/dashboard/src/app/(app)/dashboard/calls/page.tsx` | 1-147 | Agent-specific data fetch |
| Agent calls client | `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | 1-1041 | Personal stats UI |
| Agent stats calculator | `apps/dashboard/src/lib/stats/agent-stats.ts` | 1-145 | `calculateAgentStats()` |
| Coverage calculator | `apps/dashboard/src/lib/stats/coverage-stats.ts` | 1-265 | `calculateHourlyCoverage()`, `calculateDailyHourlyCoverage()` |
| Call analytics migration | `supabase/migrations/20251126040000_add_call_analytics.sql` | 1-129 | Dispositions table, analytics columns |
| Agent detail stats | `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | 1-580 | Individual agent performance |

---

## 9. RELATED FEATURES
- [Call Lifecycle](../platform/call-lifecycle.md) - How calls are created, tracked, ended
- [Agent Stats (STATS1)](./agent-stats.md) - Individual agent performance metrics
- [Coverage Stats (STATS2)](./coverage-stats.md) - Visitor coverage analysis
- [Call Logs (D7)](../admin/call-logs.md) - Admin call management
- [Dispositions](../admin/dispositions.md) - Call outcome categories

---

## 10. OPEN QUESTIONS

1. **Should we implement pagination?** Currently limited to 500 rows with no way to see more.
2. **Should averages exclude outliers?** A single 4-hour call can skew average duration significantly.
3. **Should coverage be pre-calculated?** The hourly coverage calculation is O(n×m×d) and could be slow for long date ranges.
4. **Should we add real-time updates?** Currently requires page refresh to see new calls.
5. **Should filter presets be saved?** Admins analyzing the same segments repeatedly would benefit.
6. **Should there be alerts for low coverage?** Currently just displays data, no proactive notifications.

