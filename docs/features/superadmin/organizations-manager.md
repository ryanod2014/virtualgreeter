# Feature: Organizations Manager (SA5)

## Quick Summary
Platform-wide organization management dashboard that provides super admins with visibility into all organizations, their health metrics, risk levels, and key performance indicators. Enables filtering, searching, and sorting to identify at-risk customers and monitor platform-wide statistics.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [x] Platform Admin (Super Admin)

---

## 1. WHAT IT DOES

### Purpose
The Organizations Manager gives platform super admins a comprehensive view of all organizations on the platform. It enables:
- Monitoring organization health and identifying at-risk customers
- Viewing platform-wide performance metrics (ring rates, answer rates)
- Filtering and sorting organizations by various criteria
- Tracking MRR at risk from unhealthy organizations
- Identifying coverage and engagement issues across the platform

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Super Admin | Identify struggling customers | Health scores and risk levels highlight problems |
| Super Admin | Monitor platform health | Platform-wide totals show aggregate performance |
| Super Admin | Find specific organizations | Search by name/slug with instant filtering |
| Super Admin | Prioritize support outreach | At-risk MRR calculation shows revenue impact |
| Super Admin | Understand customer engagement | Coverage rates and call trends per org |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Super admin navigates to `/platform/organizations`
2. Server fetches all organizations from database
3. Server queries related data (users, agents, calls, pageviews)
4. Server calculates health metrics for each organization
5. Server computes platform-wide aggregate statistics
6. Client renders organizations table with filtering controls
7. Super admin searches, filters, or sorts to find relevant orgs
8. Super admin reviews health scores and metrics

### Data Aggregation Flow

```
DATABASE QUERIES (Server-side)
    │
    ├─► organizations table → Base org data
    │
    ├─► users table → Count users per org
    │
    ├─► agent_profiles table → Count active agents per org
    │
    ├─► call_logs table → Call counts + status + timestamps
    │
    └─► widget_pageviews table → Pageview data + agent availability

CALCULATIONS (Server-side)
    │
    ├─► Coverage Rate = pageviews_with_agent / total_pageviews
    │
    ├─► Answer Rate = answered_calls / pageviews_with_agent
    │
    ├─► Activity Score = f(days_since_last_call)
    │
    ├─► Engagement Score = f(calls_this_month)
    │
    ├─► Coverage Score = coverage_rate_this_month
    │
    ├─► Growth Score = f(call_trend)
    │
    └─► Health Score = weighted_average(activity, engagement, coverage, growth)
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| All View | Shows all organizations | Default state, click "All" tab | Apply filter |
| At-Risk View | Shows only at-risk orgs | Click "At Risk" tab | Clear filter |
| Healthy View | Shows healthy active orgs | Click "Healthy" tab | Clear filter |
| Churned View | Shows cancelled orgs | Click "Churned" tab | Clear filter |
| Filtered | Search/filter applied | Type in search or select filter | Clear search/filter |

---

## 3. DETAILED LOGIC

### Health Score Calculation

The health score is a weighted composite (0-100):

| Component | Weight | Scoring Logic |
|-----------|--------|---------------|
| Activity Score | 35% | Based on days since last call (100 if ≤1 day, down to 10 if >30 days) |
| Engagement Score | 20% | Based on calls this month (100 if ≥20, down to 20 if 0) |
| Coverage Score | 25% | Equal to coverage rate this month |
| Growth Score | 20% | 100 if increasing, 70 if stable, 30 if declining |

### Risk Level Determination

| Health Score | Risk Level | Visual Indicator |
|--------------|------------|------------------|
| ≥80 | Low | Green shield |
| 60-79 | Medium | Amber shield |
| 40-59 | High | Orange shield with alert |
| <40 | Critical | Red shield with X |

**Note:** Risk is only flagged for organizations with `subscription_status === "active"`.

### Call Trend Calculation

Compares calls in last 14 days vs previous 14 days:
- **Increasing:** >20% increase from previous period
- **Stable:** Between -20% and +20%
- **Declining:** >20% decrease from previous period

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | `/platform/organizations` | Fetches all org data | Multiple DB queries |
| Search input | Search field | Filters by name/slug | Client-side filter |
| Status filter change | Status dropdown | Filters by subscription status | Client-side filter |
| Plan filter change | Plan dropdown | Filters by plan type | Client-side filter |
| View tab click | Tab buttons | Filters by risk/health status | Client-side filter |
| Sort header click | Table headers | Sorts by column | Client-side sort, toggles asc/desc |
| At-risk card click | Summary cards | Toggles at-risk filter | Sets view filter |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `PlatformOrganizationsPage` | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | Server component, fetches and calculates all data |
| `OrganizationsClient` | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | Client component, renders UI with filtering/sorting |
| `filteredOrgs` (useMemo) | `organizations-client.tsx` | Applies all filters and sorting |
| `handleSort` | `organizations-client.tsx` | Manages sort state |
| `timeAgo` | `organizations-client.tsx` | Formats relative timestamps |
| `getHealthColor` / `getHealthBg` | `organizations-client.tsx` | Returns color classes based on score |

### Data Flow

```
PAGE LOAD
    │
    ├─► createClient() → Supabase client
    │
    ├─► Parallel queries:
    │   ├─► organizations → id, name, slug, plan, status, seat_count, mrr
    │   ├─► users → organization_id (for counting)
    │   ├─► agent_profiles → organization_id (active only)
    │   ├─► call_logs → organization_id, created_at, status
    │   └─► widget_pageviews → organization_id, agent_id, created_at
    │
    ├─► For each organization:
    │   ├─► Count users, agents, calls
    │   ├─► Calculate coverage metrics
    │   ├─► Calculate answer rates
    │   ├─► Determine call trend
    │   ├─► Calculate component scores
    │   ├─► Calculate health score
    │   └─► Determine risk level
    │
    ├─► Calculate platform totals:
    │   ├─► pageviewsThisMonth (sum)
    │   ├─► pageviewsWithAgentThisMonth (sum)
    │   ├─► callsThisMonth (sum)
    │   ├─► answeredCallsThisMonth (sum)
    │   ├─► ringRate (callsThisMonth / pageviewsWithAgentThisMonth)
    │   └─► agentAnswerRate (answeredCallsThisMonth / callsThisMonth)
    │
    └─► Render OrganizationsClient with:
        ├─► organizations (array with all calculated stats)
        ├─► atRiskCount
        ├─► criticalCount
        ├─► atRiskMRR
        └─► platformTotals
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | No organizations exist | Empty platform | Shows empty state with building icon | ✅ | |
| 2 | Search with no matches | Search for non-existent org | Shows "No organizations found" | ✅ | |
| 3 | Org with no calls ever | New org | Activity score = 20, health impacted | ✅ | |
| 4 | Org with no pageviews | Inactive widget | Coverage = 100% (not a problem) | ✅ | |
| 5 | Very long org name | Display issue | Truncated with ellipsis | ⚠️ | No explicit truncation visible |
| 6 | Cancelled org with activity | Recent calls | Not flagged as at-risk | ✅ | Risk only for active orgs |
| 7 | High calls but declining trend | Healthy but concerning | Health score accounts for both | ✅ | |
| 8 | 0 MRR organization | Free plan | Displays $0, doesn't impact at-risk MRR | ✅ | |
| 9 | Very large org count | Performance | All orgs fetched server-side | ⚠️ | No pagination visible |
| 10 | Sort by health (default) | Page load | Lowest health first (most at-risk) | ✅ | Intentional default |
| 11 | Rapid filter changes | User interaction | Client-side filtering is fast | ✅ | useMemo optimization |
| 12 | Database query failure | Network/DB issue | Error logged, empty data | ⚠️ | No user-facing error message |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Database fetch error | Supabase query fails | Empty organizations list | Refresh page |
| No user counts returned | users table issue | userCount shows 0 | Data recovered on refresh |
| Date parsing error | Invalid timestamps | timeAgo shows "Invalid Date" | Fix data in database |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to page | Full org list loads | ✅ | |
| 2 | View at-risk summary | Cards show critical/at-risk counts | ✅ | |
| 3 | Click at-risk card | Toggles at-risk filter | ✅ | |
| 4 | Search for org | Instant filtering | ✅ | |
| 5 | Change status filter | Orgs filtered immediately | ✅ | |
| 6 | Click table header | Sorts with visual indicator | ✅ | |
| 7 | View org row | Health, MRR, coverage, calls visible | ✅ | Dense but comprehensive |
| 8 | Hover org row | Row highlights | ✅ | |

### Visual Indicators
| Metric | Visual Feedback |
|--------|-----------------|
| Health Score | Numeric score + color + mini progress bar |
| Risk Level | Icon (shield variants) + color + label |
| Call Trend | Arrow icon (up/stable/down) with color |
| Coverage Rate | Percentage + color (green/amber/red) |
| Answer Rate | Percentage + color |
| Days Since Call | Red highlight if >14 days |
| Missed Opportunities | Red text showing count |

### Accessibility
- Keyboard navigation: ⚠️ Not verified (interactive elements may need focus states)
- Screen reader support: ⚠️ Not verified
- Color contrast: ✅ High contrast color coding
- Loading states: ⚠️ No explicit loading state visible (server-rendered)

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Multiple DB queries | Run in parallel (Promise.all implicit) | ✅ |
| Large org count | All fetched at once | ⚠️ No pagination |
| Client-side filtering | useMemo for performance | ✅ |
| Large data calculations | Done server-side once | ✅ |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Platform admin route protection (assumed) |
| Sensitive data exposure | Only aggregated metrics shown |
| Cross-org data leakage | All data fetched via authenticated Supabase client |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Partial data failure | Optional chaining on counts (`?? 0`) |
| Empty states | Handled gracefully with fallback UI |
| Stale data | Server-rendered on each request |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Organizations listed with health scores is intuitive
2. **Is the control intuitive?** ✅ Yes - Standard search/filter/sort patterns
3. **Is feedback immediate?** ✅ Yes - Client-side filtering is instant
4. **Is the flow reversible?** ✅ Yes - Filters can be cleared
5. **Are errors recoverable?** ⚠️ Partial - No explicit error messages for DB failures
6. **Is the complexity justified?** ✅ Yes - Health scoring provides actionable insights

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No pagination | Performance issues at scale | 🟡 Medium | Add virtual scrolling or pagination |
| No explicit loading state | User unsure if loading | 🟢 Low | Add loading skeleton |
| No click-through to org | Can't access org details | 🟡 Medium | Add link to org dashboard |
| No impersonation | Can't act as org user | 🟡 Medium | Add impersonate button (if needed) |
| No bulk operations | Manual one-by-one actions | 🟢 Low | Future enhancement |
| No export functionality | Can't download data | 🟢 Low | Future enhancement |
| Database error not shown | User sees empty state only | 🟢 Low | Add error toast |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Server data fetching | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | 1-276 | All queries and calculations |
| Organization type | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 29-65 | OrgWithStats interface |
| Platform totals type | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 67-75 | PlatformTotals interface |
| Health calculation | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | 138-199 | Score computation logic |
| Risk level logic | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | 192-203 | Risk determination |
| Call trend logic | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | 118-136 | Trend calculation |
| Filtering logic | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 130-179 | filteredOrgs useMemo |
| Sort logic | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 163-176 | Multi-field sorting |
| At-risk summary UI | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 237-286 | Header cards |
| Platform totals UI | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 288-344 | Metrics grid |
| Organization table | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 440-663 | Main data table |
| Status colors | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 88-93 | STATUS_COLORS constant |
| Plan colors | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 95-100 | PLAN_COLORS constant |
| Risk colors | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 102-107 | RISK_COLORS constant |

---

## 9. RELATED FEATURES
- [Billing API](../api/billing-api.md) - Subscription and MRR data source
- [Coverage Stats](../stats/coverage-stats.md) - Coverage metrics methodology
- [Call Analytics](../stats/call-analytics.md) - Call data aggregation

---

## 10. OPEN QUESTIONS

1. **Is there route protection for platform admins?** - Page appears to be under `/platform/` route but access control not visible in code
2. **Should there be pagination for large org counts?** - Currently fetches all orgs; may need pagination at scale
3. **Should super admins be able to impersonate users?** - Mentioned in requirements but not implemented
4. **Is there an activity log for org actions?** - Mentioned in requirements but not visible
5. **What is the threshold for "at risk" MRR alerts?** - Currently shows any at-risk MRR, no threshold
6. **Should clicking an org row navigate to org details?** - Currently rows are not clickable



