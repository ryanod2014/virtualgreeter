# Feature: Coverage Stats (STATS2)

## Quick Summary
Coverage Stats calculate when agents are available to serve website visitors, identify coverage gaps (missed opportunities), and provide staffing recommendations. This helps organizations understand when visitors arrive with no agent available and optimize their agent schedules accordingly.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Coverage Stats measure the alignment between visitor traffic and agent availability. When a visitor lands on a website, they can only be served if an agent is online and available. If no agent is available, that's a "missed opportunity" - the visitor couldn't connect even if they wanted to. This feature helps organizations:
- Identify staffing gaps by time of day and day of week
- Quantify missed business opportunities
- Generate data-driven staffing recommendations
- Monitor organization health (for platform admins)

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Know when visitors go unserved | Shows missed opportunities count and coverage rate |
| Admin | Optimize agent schedules | Heatmap shows problem hours needing coverage |
| Admin | Justify hiring more agents | Quantifies missed business with hard numbers |
| Platform Admin | Monitor customer health | Coverage rate factors into organization health scores |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Visitor lands on website → widget pageview is recorded
2. System checks if an agent is available → records `agent_id` on pageview (or null if none)
3. When admin views stats, system queries pageviews within date range
4. Calculates: total pageviews, pageviews with agent, missed opportunities
5. For hourly/daily views, groups data by time buckets
6. Compares against agent session data to show agent availability patterns
7. Generates staffing recommendations for problem hours

### State Machine
There is no state machine for this feature - it's a read-only analytics feature that processes historical data.

### Data Flow Diagram

```
VISITOR LANDS ON PAGE
    │
    ├─► Widget loads
    │
    ├─► Server checks for available agent
    │   └─► PoolManager.findAvailableAgent()
    │
    ├─► Records pageview to database
    │   └─► INSERT INTO widget_pageviews (
    │           organization_id,
    │           pool_id,
    │           visitor_id,
    │           page_url,
    │           agent_id,        ← NULL if no agent available
    │           visitor_country_code
    │       )
    │
    └─► Widget displays (with or without agent video)


ADMIN VIEWS STATS (Calls Page or Agents Page)
    │
    ├─► Server fetches pageviews for date range
    │   └─► SELECT * FROM widget_pageviews 
    │       WHERE created_at BETWEEN from AND to
    │
    ├─► Apply blocklist/allowlist country filtering
    │   └─► Filter out blocked countries before calculating
    │
    ├─► Calculate coverage metrics
    │   ├─► totalPageviews = count(all)
    │   ├─► pageviewsWithAgent = count(WHERE agent_id IS NOT NULL)
    │   └─► missedOpportunities = total - withAgent
    │
    ├─► Fetch agent sessions for same period
    │   └─► SELECT started_at, ended_at FROM agent_sessions
    │
    ├─► Calculate hourly coverage
    │   └─► calculateHourlyCoverage() → 24 HourlyStats objects
    │
    ├─► Calculate daily-hourly coverage (for heatmap)
    │   └─► calculateDailyHourlyCoverage() → 7×24 grid
    │
    └─► Render UI with charts and recommendations
```

### Key Data Structures

**HourlyStats** - Coverage for a single hour (0-23):
```typescript
interface HourlyStats {
  hour: number;              // 0-23
  totalPageviews: number;    // Total visitors this hour
  pageviewsWithAgent: number; // Visitors when agent was available
  missedOpportunities: number; // Visitors with no agent
  avgAgentsOnline: number;   // Average agents online during this hour
}
```

**DayHourStats** - Coverage for specific day + hour combination:
```typescript
interface DayHourStats {
  dayOfWeek: number;         // 0=Sunday, 6=Saturday
  dayName: string;           // "Sun", "Mon", etc.
  hour: number;              // 0-23
  totalPageviews: number;
  pageviewsWithAgent: number;
  missedOpportunities: number;
  avgAgentsOnline: number;
  coverageGap: number;       // Ratio of missed/total (0-1)
}
```

---

## 3. DETAILED LOGIC

### Coverage Calculation Algorithm

**`calculateHourlyCoverage(pageviews, sessions, fromDate, toDate)`**

1. Initialize 24 hour buckets (0-23) with zero values
2. For each pageview:
   - Extract hour from `created_at`
   - Increment `totalPageviews` for that hour
   - If `agent_id` is not null: increment `pageviewsWithAgent`
   - Else: increment `missedOpportunities`
3. Calculate number of days in range: `numDays = ceil((to - from) / (1 day))`
4. For each hour and each agent session:
   - Calculate overlap between session and hour slot
   - Sum total agent-minutes across all days
   - Average: `avgAgentsOnline = totalAgentMinutes / (60 * numDays)`

**`calculateDailyHourlyCoverage(pageviews, sessions, fromDate, toDate)`**

Same as above but creates a 7×24 grid (day of week × hour) for heatmap visualization.

**`findProblemHours(hourlyStats)`**

Returns hours where `missedOpportunities > pageviewsWithAgent` (majority missed).

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Widget popup shown | Widget → Server | Records pageview with agent_id | DB: creates widget_pageviews row |
| Agent connects | Dashboard → Server | Session started | DB: creates agent_sessions row |
| Agent disconnects | Dashboard/Server | Session ended | DB: updates ended_at on session |
| Admin views Calls page | Dashboard | Calculates coverage stats | None (read-only) |
| Admin views Agents page | Dashboard | Calculates hourly/daily coverage | None (read-only) |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `calculateHourlyCoverage` | `apps/dashboard/src/lib/stats/coverage-stats.ts` | Calculate 24-hour coverage breakdown |
| `calculateDailyHourlyCoverage` | `apps/dashboard/src/lib/stats/coverage-stats.ts` | Calculate 7×24 day/hour grid for heatmap |
| `findProblemHours` | `apps/dashboard/src/lib/stats/coverage-stats.ts` | Identify hours needing more coverage |
| `CallsClient` | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Renders coverage card with rate + bar |
| `CoverageHoursChart` | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Renders heatmap and staffing recommendations |
| `HourlyGapChart` | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 24-hour stacked bar chart |
| `DayOfWeekChart` | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Day-of-week horizontal bars |
| `DayHourHeatmap` | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 7×24 grid heatmap visualization |

### Data Sources

**widget_pageviews table:**
- `organization_id` - Links to org
- `pool_id` - Which pool the visitor was routed to
- `visitor_id` - Unique visitor identifier
- `page_url` - URL where widget appeared
- `agent_id` - Agent assigned (NULL = no agent available)
- `visitor_country_code` - For geo filtering
- `created_at` - Timestamp of pageview

**agent_sessions table:**
- `agent_id` - Which agent
- `organization_id` - Links to org
- `started_at` - When agent connected
- `ended_at` - When agent disconnected (NULL = still online)
- `idle_seconds`, `in_call_seconds`, `away_seconds` - Time breakdown

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Pool with no agents assigned | Visitor arrives | Pageview recorded with agent_id=NULL | ✅ | Shows as missed opportunity |
| 2 | All agents in calls | Visitor arrives | May still assign (if max_simultaneous > 0) or agent_id=NULL | ✅ | Depends on agent config |
| 3 | New pool with no data | Admin views stats | Shows 0 pageviews, 100% coverage rate | ✅ | No traffic = no misses |
| 4 | Coverage gaps < 5 minutes | Brief agent offline | Still counts as missed if visitor arrives | ✅ | No minimum gap threshold |
| 5 | Very high traffic period | Surge in visitors | All recorded normally | ✅ | No throttling on pageview recording |
| 6 | Blocked country visitor | Filtered out | Not included in coverage calculation | ✅ | Blocklist applied before calculation |
| 7 | Agent offline at midnight | Day boundary | Session spans multiple days correctly | ✅ | Overlap calculation handles day boundaries |
| 8 | 24/7 coverage | Agent always online | 100% coverage rate, no missed | ✅ | Shows "Full Coverage" state |
| 9 | Date range spans timezone change | DST transition | Uses server timezone consistently | ⚠️ | May have 1 hour discrepancy |
| 10 | Empty date range | From > To | Returns 0 data | ✅ | numDays calculated as 1 minimum |
| 11 | Single day range | Same from/to date | Works correctly with 1 day | ✅ | numDays = 1 |
| 12 | Active session at query time | Agent still online | ended_at = null, uses NOW() | ✅ | Includes current session coverage |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| widget_pageviews query fails | Missing column (migration not run) | Fallback query without visitor_country_code | Automatic retry |
| No sessions in range | Org has no agent activity | Charts show "No coverage data" | Add agents, have them log in |
| Database timeout | Large data volume | Loading spinner, then error | Reduce date range |

---

## 5. UI/UX REVIEW

### Coverage Card (Calls Page)
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Admin → Calls | Coverage card shows at top | ✅ | |
| 2 | View coverage stats | Shows: total visitors, covered, missed | ✅ | |
| 3 | See coverage rate | Progress bar + percentage | ✅ | |
| 4 | Has missed opportunities | Amber/warning color, CTA to add agents | ✅ | |
| 5 | Full coverage | Green/success color, "Great Coverage!" badge | ✅ | |

### Staffing Guide (Agents Page)
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Admin → Agents | Coverage chart shows below agent list | ✅ | |
| 2 | View date range picker | Can filter coverage data by date | ✅ | |
| 3 | Switch views | Tabs: "By Hour", "By Day", "Heatmap" | ✅ | |
| 4 | View heatmap | 7×24 grid with color intensity | ✅ | Red = missed, Green = covered |
| 5 | Hover on cell | Tooltip shows visitors + missed count | ✅ | |
| 6 | View staffing gaps | Cards showing when more agents needed | ✅ | Priority: critical/high/medium/low |

### Accessibility
- Keyboard navigation: ✅ Date picker, view tabs accessible
- Screen reader support: ⚠️ Heatmap needs aria labels
- Color contrast: ✅ Red/green/amber clearly distinguishable
- Loading states: ✅ Shows loading indicator while fetching

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large pageview datasets | Indexed on (organization_id, created_at) | ✅ Optimized |
| Session overlap calculations | O(n × m × days) where n=sessions, m=24 | ⚠️ Could be slow for long ranges |
| Heatmap rendering | Client-side calculation from pre-fetched data | ✅ Fast |

### Database Indexes
```sql
-- widget_pageviews
CREATE INDEX idx_widget_pageviews_org_date ON widget_pageviews(organization_id, created_at DESC);
CREATE INDEX idx_widget_pageviews_agent_id ON widget_pageviews(agent_id);

-- agent_sessions
CREATE INDEX idx_agent_sessions_org_date ON agent_sessions(organization_id, started_at DESC);
```

### Security
| Concern | Mitigation |
|---------|------------|
| Cross-org data access | RLS policies enforce organization_id match |
| Admin-only access | Server-side auth check before query |
| Country blocklist bypass | Filtering applied server-side, not client |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Missing migration columns | Fallback query without new columns |
| Timezone consistency | All dates stored as TIMESTAMPTZ |
| Session overlap edge cases | Math.max/min on timestamps for overlap |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - "Coverage" = agent available when visitor arrives
2. **Is the control intuitive?** ✅ Yes - Date picker + view tabs are standard patterns
3. **Is feedback immediate?** ✅ Yes - Stats update when date range changes
4. **Is the flow reversible?** ✅ Yes - Can change date range freely
5. **Are errors recoverable?** ✅ Yes - Fallback queries, clear error states
6. **Is the complexity justified?** ✅ Yes - Staffing optimization is critical business function

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Session calculation is O(n×m×d) | Slow for 90+ day ranges with many sessions | 🟡 Medium | Pre-aggregate coverage by hour in DB |
| Heatmap lacks ARIA labels | Screen reader users can't read data | 🟡 Medium | Add aria-label to each cell |
| No real-time coverage tracking | Admin sees historical, not current | 🟢 Low | Could add live coverage indicator |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main calculation functions | `apps/dashboard/src/lib/stats/coverage-stats.ts` | 1-265 | All coverage math |
| Hourly coverage | `apps/dashboard/src/lib/stats/coverage-stats.ts` | 35-110 | 24-hour breakdown |
| Daily-hourly coverage | `apps/dashboard/src/lib/stats/coverage-stats.ts` | 159-265 | 7×24 grid |
| Calls page integration | `apps/dashboard/src/app/(app)/admin/calls/page.tsx` | 176-234 | Fetches and passes coverage data |
| Coverage card UI | `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | 674-781 | Visual coverage card |
| Agents page integration | `apps/dashboard/src/app/(app)/admin/agents/page.tsx` | 125-182 | Coverage + staffing metrics |
| Heatmap component | `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | 2405-2470 | DayHourHeatmap |
| Platform health scores | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | 56-234 | Uses coverage in health |
| Pageviews schema | `supabase/migrations/20251128400000_widget_pageviews.sql` | 1-46 | Table definition |
| Sessions schema | `supabase/migrations/20251128200000_agent_sessions.sql` | 1-186 | Session tracking |

---

## 9. RELATED FEATURES
- [Agent Assignment (P2)](../platform/agent-assignment.md) - How agents are assigned to visitors (creates pageview records)
- [Bullpen States (A1)](../agent/bullpen-states.md) - Agent availability states affect coverage
- [Widget Lifecycle (V1)](../visitor/widget-lifecycle.md) - When pageviews are recorded
- [Agent Stats (STATS1)](./agent-stats.md) - Per-agent metrics use similar data sources

---

## 10. OPEN QUESTIONS

1. **Should coverage be tracked in real-time?** Currently only historical. Could add WebSocket-based live coverage indicator.

2. **Should there be alerts for low coverage?** Currently passive reporting only. Could add email/slack alerts when coverage drops below threshold.

3. **How should timezone differences be handled?** Current implementation uses server timezone. Multi-timezone orgs might want local time grouping.

4. **Should coverage be weighted by page value?** Currently all pageviews are equal. High-value pages (pricing, contact) could be weighted higher.

5. **What retention period for pageview data?** Currently unbounded. May need archival/aggregation policy for scale.

6. **Should the heatmap show predicted vs actual?** Could overlay historical patterns to suggest optimal schedules.



