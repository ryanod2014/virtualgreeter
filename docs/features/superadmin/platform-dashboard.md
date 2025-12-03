# Feature: Platform Dashboard (SA1)

## Quick Summary
The Platform Dashboard is a super admin-only command center providing platform-wide business metrics including MRR, NRR, churn analytics, funnel performance, organization health scores, retargeting configuration, PMF surveys, and detailed cancellation analysis across all organizations.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Provides platform administrators with comprehensive visibility into the business health of the entire SaaS platform. Enables data-driven decisions for growth, retention, customer success interventions, and marketing optimization.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Platform Admin | Understand revenue health | Total MRR, NRR, Quick Ratio displayed prominently |
| Platform Admin | Identify churn risks | At-risk organizations flagged with health scores |
| Platform Admin | Analyze conversion funnel | Step-by-step funnel metrics with date filtering |
| Platform Admin | Manage retargeting | Configure Facebook pixel for B2B retargeting across orgs |
| Platform Admin | Understand product-market fit | PMF survey responses aggregated by role |
| Platform Admin | Learn from churn | Detailed exit survey analysis with cohort breakdowns |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Platform admin logs into dashboard
2. System checks `is_platform_admin` flag on user profile
3. If true, `/platform` route is accessible
4. Admin sees Overview tab with MRR, NRR, churn metrics
5. Admin can navigate to Funnel, Organizations, Retargeting, Feedback, or Cancellations tabs
6. Each tab fetches relevant data server-side and renders client-side interactive features

### Navigation Structure
```
/platform
├── /platform (Overview) - Revenue & churn metrics
├── /platform/funnel - Conversion funnel analytics
├── /platform/organizations - All orgs with health scores
├── /platform/retargeting - Facebook pixel configuration
├── /platform/feedback - Bug reports, feature requests, PMF surveys
└── /platform/cancellations - Exit survey analysis
```

### State Machine
```
[User Login]
    │
    ├─► Check auth.isPlatformAdmin
    │   ├─► false → Redirect to /dashboard
    │   └─► true → Allow access to /platform
    │
    └─► Platform Dashboard Access
        ├─► Overview Tab (default)
        ├─► Funnel Tab
        ├─► Organizations Tab
        ├─► Retargeting Tab
        ├─► Feedback Tab
        └─► Cancellations Tab
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `not_authenticated` | User not logged in | Initial state | Login successfully |
| `not_authorized` | User lacks platform admin flag | Login without is_platform_admin | N/A - redirected |
| `overview` | Viewing MRR/churn dashboard | Load /platform or click Overview | Navigate to other tab |
| `funnel` | Viewing conversion funnel | Click Funnel tab | Navigate to other tab |
| `organizations` | Viewing org list/health | Click Organizations tab | Navigate to other tab |
| `retargeting` | Configuring FB pixel | Click Retargeting tab | Navigate to other tab |
| `feedback` | Viewing feedback/PMF | Click Feedback tab | Navigate to other tab |
| `cancellations` | Viewing churn analysis | Click Cancellations tab | Navigate to other tab |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page Load | `/platform/*` | Fetches all metrics from Supabase | Multiple parallel DB queries |
| Date Range Change | Funnel/Cancellations | Re-filters client-side data | URL params updated |
| View Filter Click | Organizations | Filters orgs by risk level | Local state change |
| Retargeting Toggle | Retargeting page | Updates `greetnow_retargeting_enabled` | DB update |
| Pixel Save | Retargeting page | Upserts `platform_settings` | DB upsert |
| Org Sort Click | Organizations | Reorders table | Local state change |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `PlatformLayout` | `layout.tsx` | Auth guard + common header |
| `getCurrentUser` | `lib/auth/actions.ts` | Checks `isPlatformAdmin` flag |
| `PlatformNav` | `platform-nav.tsx` | Tab navigation component |
| `PlatformOverviewPage` | `page.tsx` | Revenue/churn metrics |
| `FunnelDashboardClient` | `funnel-client.tsx` | Funnel analytics UI |
| `OrganizationsClient` | `organizations-client.tsx` | Org health table |
| `RetargetingClient` | `retargeting-client.tsx` | FB pixel config |
| `FeedbackClient` | `feedback-client.tsx` | Bug/feature/PMF views |
| `CancellationsClient` | `cancellations-client.tsx` | Exit survey analysis |

### Data Flow

```
PLATFORM OVERVIEW PAGE LOAD
    │
    ├─► supabase.from("organizations").select(...)
    │   └─► Returns: id, subscription_status, plan, seat_count, mrr, created_at
    │
    ├─► supabase.from("pmf_surveys").select(...)
    │   └─► Returns: disappointment_level, user_role (for PMF score)
    │
    ├─► supabase.from("cancellation_feedback").select(...)
    │   └─► Returns: monthly_cost, created_at (for churn metrics)
    │
    └─► Server-side calculations:
        ├─► totalMRR = sum of active orgs' mrr
        ├─► nrr = (starting - churn - contraction + expansion) / starting * 100
        ├─► quickRatio = (new + expansion) / (contraction + churn)
        ├─► revenueChurnRate = churnedMRR / startingMRR * 100
        ├─► arpu = totalMRR / activeOrgs.length
        ├─► ltv = arpu * avgLifetimeMonths
        ├─► cohortRetention = per-month signup cohort analysis
        └─► pmfScore = veryDisappointed / totalResponses * 100

ORGANIZATIONS PAGE LOAD
    │
    ├─► Fetch organizations with stats
    │
    └─► Calculate per-org health score:
        ├─► activityScore (0-100): based on days since last call
        ├─► engagementScore (0-100): based on calls this month
        ├─► coverageScore (0-100): % pageviews with agent available
        ├─► growthScore (0-100): call trend analysis
        └─► healthScore = weighted average (35% activity, 20% engagement, 25% coverage, 20% growth)
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | No organizations yet | Empty platform | Shows $0 MRR, empty tables | ✅ | |
| 2 | No cancellations | No churn data | Shows 0% churn, infinite LTV | ✅ | Displays ∞ for avg lifetime |
| 3 | No PMF surveys | No survey responses | Shows 0% PMF score, "No responses" | ✅ | |
| 4 | Negative MRR changes | Downgrades exceed upgrades | Shows negative net change | ✅ | |
| 5 | Very large data volumes | Many orgs/calls | Pagination not implemented | ⚠️ | May slow with 1000+ orgs |
| 6 | Non-platform admin access | Direct URL to /platform | Redirects to /dashboard | ✅ | |
| 7 | Session expired mid-view | Auth timeout | Redirects to /login | ✅ | |
| 8 | Pixel save without ID | Missing pixel_id | Save succeeds but pixel inactive | ✅ | UI shows "Not Configured" |
| 9 | Date range with no data | Future dates selected | Empty results, "No data" message | ✅ | |
| 10 | Quick Ratio with no churn | No cancellations | Shows ∞ (infinity) | ✅ | "Perfect! Adding revenue, no churn" |
| 11 | Organization health = 0 | Critical risk org | Red highlighting, critical badge | ✅ | |
| 12 | Funnel events not tracked | Before funnel tracking | Falls back to organization data | ✅ | |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Not logged in | Session invalid | Redirect to /login | Login again |
| Not platform admin | User lacks flag | Redirect to /dashboard | Contact platform admin |
| Database error | Supabase unavailable | Console error, partial data | Refresh page |
| Pixel save fails | DB write error | Error message toast | Retry save |
| Date parse error | Invalid URL params | Falls back to default dates | Clear URL params |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Overview Tab:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View dashboard | MRR prominently displayed | ✅ | Gradient card highlights |
| 2 | Scan metrics | NRR, Churn, Quick Ratio cards | ✅ | Color-coded (green/amber/red) |
| 3 | View LTV section | Predicted LTV with tooltip | ✅ | Info icons explain calculations |
| 4 | View MRR movement | Monthly breakdown table | ✅ | +/- clearly color-coded |
| 5 | View churn trend | Bar chart last 6 months | ✅ | Bars color-coded by severity |
| 6 | View cohort retention | Retention table with bars | ✅ | Visual bar shows retention % |
| 7 | View PMF by role | Agent vs Admin PMF cards | ✅ | Separated for clear analysis |

**Funnel Tab:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View funnel | Step-by-step conversion table | ✅ | |
| 2 | Select date range | Data re-filters instantly | ✅ | |
| 3 | View billing breakdown | Annual/Monthly/6-Month split | ✅ | |
| 4 | View buyer list | Transaction table with details | ✅ | |

**Organizations Tab:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | View orgs | Table with health scores | ✅ | |
| 2 | Click At-Risk button | Filters to at-risk orgs | ✅ | |
| 3 | Sort by column | Table reorders | ✅ | |
| 4 | Search orgs | Live filtering | ✅ | |
| 5 | View org health | Mini health bar with score | ✅ | |

### Accessibility
- Keyboard navigation: ⚠️ Not fully verified (tables may need ARIA)
- Screen reader support: ⚠️ Not verified (charts need alt text)
- Color contrast: ✅ Uses high-contrast color coding
- Loading states: ⚠️ No skeleton loaders, server-rendered data

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Multiple DB queries | `Promise.all()` for parallel fetching | ✅ Optimized |
| Large org lists | No pagination | ⚠️ May slow at scale |
| Client-side filtering | useMemo for derived data | ✅ Optimized |
| Date range filtering | Client-side on pre-fetched data | ✅ Fast |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | `isPlatformAdmin` check in layout |
| Data exposure | Server-side auth before any data fetch |
| Pixel credentials | Access token stored in platform_settings |
| Cross-org data | No org scoping needed - platform view intended |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Missing data | Defensive null checks throughout |
| Calculation errors | Division by zero checks (returns 0 or null) |
| Failed saves | Error states with retry messaging |
| Stale data | Full page refresh reloads all data |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Dashboard metaphor with tabs for different metric categories
2. **Is the control intuitive?** ✅ Yes - Tab navigation, filters, date pickers are standard patterns
3. **Is feedback immediate?** ⚠️ Mostly - Client filters instant, server loads can be slow
4. **Is the flow reversible?** ✅ Yes - Tab navigation preserves URL state
5. **Are errors recoverable?** ✅ Yes - Can retry saves, refresh for data errors
6. **Is the complexity justified?** ✅ Yes - Platform admins need comprehensive metrics

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No pagination for large org lists | Slow load with 500+ orgs | 🟡 Medium | Add virtual scrolling or pagination |
| No skeleton loaders | No visual feedback during SSR | 🟢 Low | Add loading states |
| Expansion/Contraction hardcoded to $0 | Missing upgrade/downgrade tracking | 🟡 Medium | Implement mrr_changes table |
| No data export | Can't extract metrics | 🟢 Low | Add CSV export button |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Auth check & layout | `apps/dashboard/src/app/(app)/platform/layout.tsx` | 1-52 | Guards with isPlatformAdmin |
| Navigation tabs | `apps/dashboard/src/app/(app)/platform/platform-nav.tsx` | 1-72 | 6 nav items |
| Overview page (server) | `apps/dashboard/src/app/(app)/platform/page.tsx` | 1-767 | All metrics calculations |
| Funnel page (server) | `apps/dashboard/src/app/(app)/platform/funnel/page.tsx` | 1-45 | Fetches funnel_events + orgs |
| Funnel client | `apps/dashboard/src/app/(app)/platform/funnel/funnel-client.tsx` | 1-653 | Funnel analysis UI |
| Organizations page | `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | 1-276 | Health score calculations |
| Organizations client | `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | 1-667 | Org table with sorting/filtering |
| Retargeting page | `apps/dashboard/src/app/(app)/platform/retargeting/page.tsx` | 1-76 | Pixel settings + org list |
| Retargeting client | `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx` | 1-505 | Pixel config + org toggles |
| Feedback page | `apps/dashboard/src/app/(app)/platform/feedback/page.tsx` | 1-99 | Bugs, features, PMF surveys |
| Feedback client | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | 1-737 | Tabbed feedback UI |
| Cancellations page | `apps/dashboard/src/app/(app)/platform/cancellations/page.tsx` | 1-81 | Exit survey data |
| Cancellations client | `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | 1-891 | Churn analysis views |
| isPlatformAdmin check | `apps/dashboard/src/lib/auth/actions.ts` | 104 | profile.is_platform_admin |

---

## 9. RELATED FEATURES
- [Billing API](../api/billing-api.md) - Source of MRR/subscription data
- [Subscription Creation](../billing/subscription-creation.md) - Creates org MRR records
- [Cancel Subscription](../billing/cancel-subscription.md) - Creates cancellation_feedback records
- [Organization Settings](../admin/organization-settings.md) - Org-level settings

---

## 10. OPEN QUESTIONS

1. **Should expansion/contraction MRR be tracked?** Currently hardcoded to $0. Would require an `mrr_changes` table to track seat additions/removals mid-subscription.

2. **Is there a need for real-time updates?** Current implementation is server-rendered on page load. Consider WebSocket updates for MRR changes.

3. **Should health scores trigger automated actions?** Currently display-only. Could trigger automated emails to at-risk org admins.

4. **What's the data retention policy for funnel_events?** If this table grows large, may need archival strategy.

5. **Should retargeting events be tracked in this dashboard?** Currently shows config only, not event volumes sent to Facebook.



