# Feature: Cancellations Dashboard (SA2)

## Quick Summary
The Cancellations Dashboard is a platform-wide analytics tool for super admins to view all subscription cancellations across organizations. It shows cancellation reasons weighted by MRR impact, exit survey responses, cohort analysis, and churn metrics.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Cancellations Dashboard provides platform administrators with actionable intelligence about why customers are churning. By weighting cancellation reasons by MRR impact rather than simple counts, it helps prioritize product improvements that will have the biggest revenue impact.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Platform Admin | Understand why customers leave | Aggregated view of all cancellation reasons |
| Platform Admin | Identify revenue-impacting issues | MRR-weighted reason breakdown |
| Platform Admin | Track churn trends over time | Date range filtering and cohort analysis |
| Platform Admin | Read verbatim customer feedback | Exit survey responses section |
| Platform Admin | Identify competitive threats | Competitor mention tracking |
| Platform Admin | Predict re-engagement opportunities | "Would Return" tracking with conditions |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Platform admin navigates to `/platform/cancellations`
2. Server fetches all `cancellation_feedback` records from database
3. Server enriches data with organization details (name, plan, signup date)
4. Server enriches data with user details (email, name)
5. Server fetches total org count for churn rate calculation
6. Client receives cancellations data and renders analytics dashboard
7. Admin can filter by date range (default: last 90 days)
8. Admin can switch between 4 view modes to analyze data
9. Admin can click individual cancellations to see full detail modal

### State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CANCELLATIONS DASHBOARD                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  VIEW MODES (tab selection):                                         │
│                                                                      │
│  ┌──────────┐   ┌────────────┐   ┌─────────┐   ┌──────────────────┐ │
│  │ Overview │◄──┤ Responses  │◄──┤ Cohorts │◄──┤ All Cancellations│ │
│  └────┬─────┘   └─────┬──────┘   └────┬────┘   └────────┬─────────┘ │
│       │               │               │                  │           │
│       ▼               ▼               ▼                  ▼           │
│  • Reason chart   • Feedback     • Signup month    • Full list      │
│  • Avg churn time • Return cond  • Top reasons     • Detail modal   │
│  • Retention rate • Competitors  • Days to churn                    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  STATS ROW (always visible):                                         │
│  Churn Rate | Cancellations | Would Return | To Competitors | Lost MRR │
└─────────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `overview` | Default view showing reason breakdown and key metrics | Initial load, click "Overview" tab | Click another tab |
| `responses` | Shows detailed feedback, return conditions, competitor mentions | Click "Exit Survey Responses" tab | Click another tab |
| `cohorts` | Shows churn analysis grouped by signup month | Click "Cohort Analysis" tab | Click another tab |
| `list` | Shows all cancellations in a list with detail access | Click "All Cancellations" tab | Click another tab |
| `modal_open` | Detail modal showing single cancellation | Click any cancellation row in list view | Click X or outside modal |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | Server component | Fetches all cancellation_feedback data | DB queries for orgs, users |
| Date range change | DateRangePicker | Filters displayed cancellations client-side | Re-calculates all metrics |
| Tab click | View mode buttons | Switches between overview/responses/cohorts/list | None |
| Row click | List view | Opens detail modal for that cancellation | Sets `selectedItem` state |
| Modal backdrop click | Detail modal | Closes modal | Clears `selectedItem` state |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `PlatformCancellationsPage` | `apps/dashboard/src/app/(app)/platform/cancellations/page.tsx` | Server component that fetches data |
| `CancellationsClient` | `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | Client component rendering all UI |
| `reasonBreakdown` (useMemo) | cancellations-client.tsx | Calculates MRR-weighted reason distribution |
| `cohortData` (useMemo) | cancellations-client.tsx | Aggregates data by signup month cohort |
| `filteredCancellations` (useMemo) | cancellations-client.tsx | Filters by date range |
| `DateRangePicker` | `@/lib/components/date-range-picker` | Date range selector component |

### Data Flow

```
PAGE LOAD
    │
    ├─► Server: createClient() → Supabase client
    │
    ├─► Server: SELECT * FROM cancellation_feedback ORDER BY created_at DESC
    │   └─► Returns: id, org_id, user_id, primary_reason, additional_reasons,
    │                detailed_feedback, competitor_name, would_return,
    │                return_conditions, agent_count, monthly_cost,
    │                subscription_duration_days, created_at
    │
    ├─► Server: SELECT id, name, plan, created_at FROM organizations WHERE id IN (...)
    │   └─► Maps org details to cancellations
    │
    ├─► Server: SELECT id, email, full_name FROM users WHERE id IN (...)
    │   └─► Maps user details to cancellations
    │
    ├─► Server: SELECT COUNT(*) FROM organizations (total orgs)
    │
    ├─► Server: SELECT id FROM organizations WHERE subscription_status = 'active'
    │   └─► Active org count for retention calculation
    │
    └─► Client: CancellationsClient receives props:
        │   - cancellations (enriched array)
        │   - totalOrganizations
        │   - activeOrganizations
        │
        ├─► filteredCancellations (useMemo)
        │   └─► Filters by dateFrom/dateTo
        │
        ├─► reasonBreakdown (useMemo)
        │   └─► Groups by primary_reason
        │   └─► Calculates count, MRR, percentages
        │   └─► Sorts by MRR (highest first)
        │
        ├─► cohortData (useMemo)
        │   └─► Groups by organization_signup_date month
        │   └─► Calculates churned, avgDaysToChurn, lostMRR, topReason
        │
        └─► Renders stats + view mode content
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | No cancellations in system | New platform | Empty state messages in each view | ✅ | Shows "No data in selected period" |
| 2 | No cancellations in date range | Filter adjustment | Empty state with "No cancellations in selected period" | ✅ | "This is good news!" message |
| 3 | Cancellation without feedback | User skipped text fields | Shows reason, empty feedback section | ✅ | Only required field is primary_reason |
| 4 | Cancellation without competitor name | Not switching competitor | Excluded from competitor section | ✅ | Only shows when competitor_name filled |
| 5 | Very high cancellation volume | Many cancellations | All rendered in list view | ⚠️ | No pagination implemented |
| 6 | Cancelled then resubscribed | User returns | Both cancellation and new sub exist | ✅ | Cancellation history preserved |
| 7 | Organization deleted after cancel | Cascade delete | org_id still in feedback, org name = "Unknown" | ✅ | Graceful fallback |
| 8 | User deleted after cancel | User removed | user_id still in feedback, user email = "Unknown" | ✅ | Graceful fallback |
| 9 | Zero monthly_cost | Free plan cancelled | $0 shown in MRR | ✅ | Correctly weighted at 0 |
| 10 | Filtering with no results | Date range too narrow | Empty state shown | ✅ | Clear messaging |
| 11 | Multiple additional reasons | User selected many | All displayed as chips | ✅ | Array handled correctly |
| 12 | would_return is null | User didn't answer | Not shown in return section | ✅ | Filters by `c.would_return !== null` |
| 13 | Very long feedback text | User wrote essay | Full text shown, whitespace preserved | ✅ | `whitespace-pre-wrap` applied |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Database fetch error | Supabase unavailable | Console error, empty data | Page refresh |
| No organizations table data | Missing orgs | "Unknown" for org name | Data integrity check |
| No users table data | Missing users | "Unknown" for user name | Data integrity check |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to /platform/cancellations | Dashboard loads with 90-day default | ✅ | Good default range |
| 2 | View stats row | See 5 key metrics at glance | ✅ | Clear icons and labels |
| 3 | Read reason breakdown | See MRR-weighted bars | ✅ | Good: sorted by impact not count |
| 4 | Click "Exit Survey Responses" | View verbatim feedback | ✅ | Well-organized sections |
| 5 | Click "Cohort Analysis" | View signup month breakdown | ✅ | Table format is clear |
| 6 | Click "All Cancellations" | View full list | ✅ | Clickable rows for detail |
| 7 | Click a cancellation row | Modal opens with full detail | ✅ | Comprehensive view |
| 8 | Adjust date range | Data filters immediately | ✅ | Client-side filtering is fast |

### Key Metrics Displayed
| Metric | Calculation | Location |
|--------|-------------|----------|
| Churn Rate | `(total cancellations / total organizations) * 100` | Stats row |
| Cancellations | Count of filtered cancellations | Stats row |
| Would Return | `(would_return=true / total) * 100` | Stats row |
| To Competitors | Count with `competitor_name` filled | Stats row |
| Lost MRR | Sum of `monthly_cost` for filtered cancellations | Stats row |
| Retention Rate | `100 - churn_rate` | Overview view |
| Avg Time to Churn | Average `subscription_duration_days` | Overview view |

### Accessibility
- Keyboard navigation: ⚠️ Tab buttons are not keyboard-focusable
- Screen reader support: ⚠️ No ARIA labels on interactive elements
- Color contrast: ✅ Good contrast on text and colored elements
- Loading states: ⚠️ No loading skeleton during SSR fetch

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large dataset | All data loaded at once | ⚠️ Could be slow with many cancellations |
| Client filtering | useMemo for date filtering | ✅ Efficient re-render |
| Multiple DB queries | 4 separate queries on page load | ⚠️ Could be combined |

### Security
| Concern | Mitigation |
|---------|------------|
| Platform admin only | Route protection via middleware (presumed) |
| Cross-org data exposure | Dashboard shows all orgs (intentional for platform admin) |
| RLS on cancellation_feedback | Platform admins have SELECT policy |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Missing org/user data | Fallback to "Unknown" strings |
| Empty states | Clear messaging for no data scenarios |
| Database errors | Console logging (no user-facing error UI) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Cancellations organized by reason, time, and detail
2. **Is the control intuitive?** ✅ Yes - Tab-based navigation, date picker
3. **Is feedback immediate?** ✅ Yes - Client-side filtering is instant
4. **Is the flow reversible?** ✅ Yes - Can switch between views freely
5. **Are errors recoverable?** ⚠️ Partial - No retry mechanism for failed loads
6. **Is the complexity justified?** ✅ Yes - Multiple views serve different analytical needs

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No pagination on list view | Slow with many cancellations | 🟡 Medium | Add virtual scrolling or pagination |
| No export functionality | Can't analyze data externally | 🟢 Low | Add CSV export button |
| Four separate DB queries | Slower page load | 🟢 Low | Combine into single query with joins |
| No loading state | Flash of empty content | 🟢 Low | Add skeleton UI |
| Churn rate uses ALL cancellations | Not filtered by date | 🟡 Medium | Should use filtered count for consistency |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Server data fetching | `apps/dashboard/src/app/(app)/platform/cancellations/page.tsx` | 1-81 | SSR data loading |
| Client UI component | `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | 1-892 | Main dashboard UI |
| View mode state | `cancellations-client.tsx` | 87, 94 | `ViewMode` type, `viewMode` state |
| Date range state | `cancellations-client.tsx` | 97-104 | Default 90 days, handler |
| Reason breakdown calc | `cancellations-client.tsx` | 118-140 | MRR-weighted calculation |
| Cohort analysis calc | `cancellations-client.tsx` | 143-193 | Signup month grouping |
| Stats calculations | `cancellations-client.tsx` | 196-210 | wouldReturn, competitors, avgDuration, churnRate |
| Overview view | `cancellations-client.tsx` | 358-428 | Reason chart, key metrics |
| Responses view | `cancellations-client.tsx` | 431-605 | Feedback, return conditions, competitors |
| Cohorts view | `cancellations-client.tsx` | 608-666 | Cohort table |
| List view | `cancellations-client.tsx` | 669-744 | All cancellations list |
| Detail modal | `cancellations-client.tsx` | 747-888 | Full cancellation detail |
| Cancellation reasons enum | `packages/domain/src/database.types.ts` | 19-30 | 11 reason types |
| CancellationFeedback type | `packages/domain/src/database.types.ts` | 410-428 | Table row type |
| Cancel modal (feedback collection) | `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.tsx` | 1-623 | Where feedback is collected |
| DB schema | `supabase/migrations/20251127700000_cancellation_feedback.sql` | - | Table definition |

---

## 9. RELATED FEATURES
- [Cancel Subscription](../billing/cancel-subscription.md) - Where cancellation feedback is collected
- [Seat Management](../billing/seat-management.md) - Agent count tracked in feedback
- [Subscription Creation](../billing/subscription-creation.md) - subscription_duration_days calculated from this
- [Organization Settings](../admin/organization-settings.md) - Organization plan and status

---

## 10. OPEN QUESTIONS

1. **Should the churn rate use filtered cancellations?** Currently uses ALL cancellations divided by total orgs, even when date filter is applied. This could be confusing.

2. **Is there a need for data export?** Platform admins may want to export cancellation data to CSV for external analysis or reporting.

3. **Should there be pagination?** With high cancellation volumes, the list view could become slow. Virtual scrolling or pagination would help.

4. **Are there notification/alert features planned?** Could platform admins be notified of spikes in cancellations or competitor mentions?

5. **Should cohort analysis include total signups per cohort?** Currently only shows churned count, not the denominator for calculating true cohort churn rate.

6. **Is there a need to track involuntary cancellations separately?** Payment failure cancellations vs voluntary cancellations may need different analysis.



