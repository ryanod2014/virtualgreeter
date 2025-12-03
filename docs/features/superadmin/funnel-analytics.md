# Feature: Funnel Analytics (SA4)

## Quick Summary
Funnel Analytics provides conversion funnel analysis showing the user journey from landing page through activation (dashboard), including drop-off points, conversion rates, billing selection breakdown, and buyer transaction tracking. Accessible only to platform admins at `/platform/funnel`.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Funnel Analytics feature enables platform admins to:
- Track user progression through the signup/purchase funnel
- Identify drop-off points where users abandon the funnel
- Measure conversion rates at each stage
- Analyze billing plan selection patterns (Annual vs Monthly vs 6-Month)
- View individual buyer transactions with revenue attribution
- Filter analytics by date range

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Platform Admin | Understand conversion bottlenecks | Shows pageviews vs conversions at each funnel step with drop-off counts |
| Platform Admin | Optimize pricing/billing strategy | Displays billing selection breakdown with revenue per plan type |
| Platform Admin | Track revenue attribution | Lists individual buyer transactions with seats, billing type, and value |
| Platform Admin | Analyze trends over time | Date range filtering with URL persistence for bookmarkable views |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. User lands on marketing page → `landing` pageview tracked
2. User navigates to signup → `signup` pageview tracked
3. User creates account → `signup_complete` conversion tracked
4. User enters payment card → `paywall_complete` conversion tracked
5. User selects seats → `seats_complete` conversion tracked (with seat count)
6. User selects billing plan → `billing_annual`, `billing_6month`, or `billing_monthly` conversion tracked (with value)
7. User reaches dashboard → `dashboard_reached` conversion tracked

### Funnel Stages

```
LANDING PAGE
    ↓
SIGNUP PAGE ─────────► signup_complete (conversion)
    ↓
PAYWALL PAGE ────────► paywall_complete (conversion)
    ↓
SEATS PAGE ──────────► seats_complete (conversion)
    ↓
BILLING PAGE
    ├──► billing_annual   (35% off, annual commitment)
    ├──► billing_6month   (40% off, 6-month downsell)
    └──► billing_monthly  (full price, month-to-month)
    ↓
DASHBOARD ───────────► dashboard_reached (conversion)
```

### State Definitions
| State | Description | Tracked As | is_conversion |
|-------|-------------|------------|---------------|
| Landing View | User sees marketing/landing page | `landing` | false |
| Signup View | User navigates to signup form | `signup` | false |
| Account Created | User completes signup form | `signup_complete` | true |
| Paywall View | User sees card entry form | `paywall` | false |
| Card Entered | User successfully saves payment card | `paywall_complete` | true |
| Seats View | User sees seat selection page | `seats` | false |
| Seats Selected | User confirms seat count | `seats_complete` | true |
| Billing View | User sees billing plan options | `billing` | false |
| Annual Selected | User chooses annual billing | `billing_annual` | true |
| 6-Month Selected | User accepts downsell offer | `billing_6month` | true |
| Monthly Selected | User stays with monthly | `billing_monthly` | true |
| Dashboard View | User sees admin dashboard | `dashboard` | false |
| Dashboard Reached | User completes entire funnel | `dashboard_reached` | true |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | Signup page | Tracks `signup` pageview | DB: insert funnel_events |
| Form submit success | Signup page | Tracks `signup_complete` conversion | DB: insert funnel_events |
| Page load | Paywall page | Tracks `paywall` pageview | DB: insert funnel_events |
| Card setup success | Paywall page | Tracks `paywall_complete` conversion | DB: insert funnel_events |
| Page load | Seats page | Tracks `seats` pageview | DB: insert funnel_events |
| Continue button click | Seats page | Tracks `seats_complete` with seat count | DB: insert funnel_events |
| Billing selection | Billing page | Tracks billing type with value | DB: insert funnel_events |
| Page load | Admin dashboard | Tracks `dashboard` + `dashboard_reached` | DB: insert funnel_events (2 events) |
| Date range change | Funnel dashboard | Filters displayed data | URL params updated, no DB write |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `trackFunnelEvent()` | `apps/dashboard/src/lib/funnel-tracking.ts` | Core tracking function, sends events to API |
| `getVisitorId()` | `apps/dashboard/src/lib/funnel-tracking.ts` | Retrieves/creates persistent visitor ID from localStorage |
| `getSessionId()` | `apps/dashboard/src/lib/funnel-tracking.ts` | Retrieves/creates session ID from sessionStorage |
| `getUtmParams()` | `apps/dashboard/src/lib/funnel-tracking.ts` | Extracts UTM parameters from URL |
| `FunnelTracker` | `apps/dashboard/src/lib/components/FunnelTracker.tsx` | Reusable component for automatic pageview tracking |
| `DashboardTracker` | `apps/dashboard/src/app/(app)/admin/dashboard-tracker.tsx` | Dashboard-specific tracker (fires once per session) |
| `POST /api/funnel/track` | `apps/dashboard/src/app/api/funnel/track/route.ts` | API endpoint to persist events to database |
| `FunnelDashboardClient` | `apps/dashboard/src/app/(app)/platform/funnel/funnel-client.tsx` | Main analytics dashboard UI |
| `PlatformFunnelPage` | `apps/dashboard/src/app/(app)/platform/funnel/page.tsx` | Server component, fetches data from Supabase |
| `FUNNEL_STEPS` | `apps/dashboard/src/lib/funnel-tracking.ts` | Constants for all funnel step names |

### Data Flow

```
USER INTERACTION
    │
    ├─► trackFunnelEvent(step, options)
    │   ├─► getVisitorId() → localStorage ("gn_visitor_id")
    │   ├─► getSessionId() → sessionStorage ("gn_session_id")
    │   └─► getUtmParams() → URL search params
    │
    ├─► POST /api/funnel/track
    │   └─► Body: { visitor_id, session_id, step, is_conversion, value, seats, billing_type, utm_*, page_url, referrer, user_agent }
    │
    └─► Supabase: INSERT INTO funnel_events

ANALYTICS DASHBOARD LOAD
    │
    ├─► Server: SELECT * FROM funnel_events
    │
    ├─► Server: SELECT * FROM organizations (with users join)
    │
    └─► Client: FunnelDashboardClient
        ├─► Filter events by date range
        ├─► Calculate unique visitor counts per step
        ├─► Calculate conversion rates
        ├─► Build billing breakdown
        └─► Render tables + metrics
```

### Visitor/Session ID Generation
```javascript
// Visitor ID (persistent across sessions)
visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
// Stored in: localStorage["gn_visitor_id"]

// Session ID (resets on browser close)
sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
// Stored in: sessionStorage["gn_session_id"]
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path (annual) | User completes full funnel with annual | All events tracked, appears in buyers list | ✅ | |
| 2 | Happy path (monthly) | User completes funnel with monthly | All events tracked, downsell popup shown first | ✅ | |
| 3 | Happy path (6-month downsell) | User accepts downsell offer | billing_6month tracked instead of monthly | ✅ | |
| 4 | User skips stages | Direct URL to billing page | Missing intermediate events, funnel shows gaps | ⚠️ | Data accuracy affected |
| 5 | Very long time between stages | User waits days between steps | Same visitor_id links events, time not tracked | ✅ | No time-to-conversion metric |
| 6 | Multiple devices | Same user on phone then desktop | Different visitor_ids, counted as separate users | ⚠️ | No cross-device linking |
| 7 | Incognito/private mode | User in incognito | New visitor_id each session | ⚠️ | Over-counts unique visitors |
| 8 | localStorage cleared | User clears browser data | New visitor_id assigned | ✅ | Expected behavior |
| 9 | Zero conversions in period | No buyers in date range | "No buyers in this date range" message shown | ✅ | |
| 10 | Repeat funnel entry | User who churned returns | New funnel events with same visitor_id | ✅ | Historical data preserved |
| 11 | Rapid duplicate events | Double-click on continue | Duplicate events in DB | ⚠️ | No client-side debounce |
| 12 | API failure | Network error during tracking | Silent failure, console.error logged | ✅ | Non-blocking |
| 13 | No funnel events yet | New deployment | Shows org-based fallback for buyers | ✅ | |
| 14 | Missing required fields | API call without visitor_id/step | 400 error returned | ✅ | |
| 15 | Organization data fallback | No funnel_events but orgs exist | Shows buyers from organizations table | ✅ | |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| API 400 | Missing visitor_id or step | Nothing (silent) | Fix tracking call |
| API 500 | Database insert failure | Nothing (silent) | Check logs, retry |
| Network error | Offline/timeout | Nothing (silent) | Automatic - fire-and-forget |
| Empty date range | Invalid from/to params | Empty tables | Adjust date picker |
| Division by zero | No pageviews | "—" displayed instead of percentage | Expected handling |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Platform Admin Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to /platform/funnel | Dashboard loads with last 30 days | ✅ | |
| 2 | View funnel table | See pageviews, conversions, rates, dropoff | ✅ | |
| 3 | View billing breakdown | See Annual/Monthly/6-Month split | ✅ | |
| 4 | View buyer list | See individual transactions | ✅ | |
| 5 | Change date range | Tables update, URL updates | ✅ | |
| 6 | Share URL with date params | Opens to same date range | ✅ | |

### Dashboard Sections
1. **Header** - Title, description, date range picker
2. **No Data Indicator** - Shown when funnel has no events (amber warning box)
3. **Funnel Performance Table** - Step-by-step breakdown with pageviews, conversions, rates, dropoff
4. **Billing Selection Breakdown** - Annual/Monthly/6-Month buyers, seats, value, percentages
5. **Buyer Transactions** - Individual transaction list with date, name/ID, email, seats, billing type, amount
6. **Key Conversion Rates** - Landing→Account, Landing→Card, Landing→Buyer, Avg Order Value
7. **Additional Stats** - Signup→Card rate, Card→Buyer rate, Annual take rate, 6-Month downsell rate

### Visual Indicators
| Color | Meaning |
|-------|---------|
| Emerald/Green | Positive (conversions, values, annual) |
| Red | Negative (dropoff counts) |
| Violet | 6-Month plan |
| Blue | Monthly plan |
| Amber | Warning/info messages |

### Accessibility
- Keyboard navigation: ⚠️ Not verified (date picker may need testing)
- Screen reader support: ⚠️ Tables have headers but may need ARIA labels
- Color contrast: ✅ High contrast text on dark background
- Loading states: ✅ Server-side rendering, no loading spinners needed

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Large event volume | Indexes on step, created_at, visitor_id, is_conversion | ✅ |
| Client-side filtering | Events filtered in useMemo with date range | ✅ |
| Unique visitor counting | Uses Set() for deduplication | ✅ |
| Date parsing | Uses date-fns for efficient parsing | ✅ |
| Full table scan | No pagination, fetches all events | ⚠️ May need pagination at scale |

### Security
| Concern | Mitigation |
|---------|------------|
| Unauthorized access | Platform admin only (route protection assumed) |
| Anonymous tracking | RLS allows anon/authenticated inserts (needed for pre-auth tracking) |
| Read access | RLS policy restricts reads to platform admins only |
| PII exposure | Visitor IDs are opaque, email only shown if in org |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Tracking failure | Fire-and-forget pattern, errors logged but don't block user flow |
| Missing events | Organization fallback for buyer data |
| Browser storage unavailable | Returns empty string, tracking still works |
| UTM params missing | Null values stored, doesn't break tracking |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Linear funnel with clear stages
2. **Is the control intuitive?** ✅ Yes - Date picker is standard pattern
3. **Is feedback immediate?** ✅ Yes - Server-rendered, no loading states
4. **Is the flow reversible?** ✅ Yes - Can change date range freely
5. **Are errors recoverable?** ✅ Yes - No destructive actions
6. **Is the complexity justified?** ✅ Yes - Essential for conversion optimization

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No cross-device tracking | Same user on multiple devices counted separately | 🟡 Medium | Link visitor_id to user after signup |
| No time-to-conversion metric | Can't see how long users take between steps | 🟢 Low | Add timestamp delta calculations |
| No funnel visualization | Data is tabular only | 🟢 Low | Add Sankey/funnel diagram |
| No export capability | Can't download data | 🟢 Low | Add CSV export button |
| No cohort comparison | Can't compare week-over-week | 🟢 Low | Add cohort views |
| No alerts/anomaly detection | Manual monitoring required | 🟢 Low | Add threshold alerts |
| Potential duplicate events | No client-side debounce | 🟢 Low | Add 1s debounce on tracking calls |
| No attribution tracking | UTM params stored but not displayed | 🟢 Low | Add UTM breakdown view |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Tracking utilities | `apps/dashboard/src/lib/funnel-tracking.ts` | 1-101 | Core tracking functions |
| Visitor ID generation | `apps/dashboard/src/lib/funnel-tracking.ts` | 6-16 | localStorage persistence |
| Session ID generation | `apps/dashboard/src/lib/funnel-tracking.ts` | 18-28 | sessionStorage persistence |
| UTM extraction | `apps/dashboard/src/lib/funnel-tracking.ts` | 30-42 | URL param parsing |
| trackFunnelEvent | `apps/dashboard/src/lib/funnel-tracking.ts` | 44-81 | Main tracking function |
| FUNNEL_STEPS constants | `apps/dashboard/src/lib/funnel-tracking.ts` | 83-101 | Step name constants |
| FunnelTracker component | `apps/dashboard/src/lib/components/FunnelTracker.tsx` | 1-17 | Reusable pageview tracker |
| Dashboard tracker | `apps/dashboard/src/app/(app)/admin/dashboard-tracker.tsx` | 1-23 | One-time dashboard tracking |
| Tracking API | `apps/dashboard/src/app/api/funnel/track/route.ts` | 1-62 | POST endpoint |
| Funnel dashboard UI | `apps/dashboard/src/app/(app)/platform/funnel/funnel-client.tsx` | 1-652 | Full analytics UI |
| Funnel data fetching | `apps/dashboard/src/app/(app)/platform/funnel/page.tsx` | 1-45 | Server component |
| Database schema | `supabase/migrations/20251201000001_add_funnel_events.sql` | 1-56 | Table + indexes + RLS |
| Signup tracking | `apps/dashboard/src/app/(auth)/signup/page.tsx` | 19-22, 58-59 | Pageview + conversion |
| Paywall tracking | `apps/dashboard/src/app/paywall/page.tsx` | 39-40, 94-95 | Pageview + conversion |
| Seats tracking | `apps/dashboard/src/app/paywall/seats/page.tsx` | 14-16, 22-26 | Pageview + conversion |
| Billing tracking | `apps/dashboard/src/app/paywall/billing/page.tsx` | 82-104 | billing_annual/monthly/6month |

---

## 9. RELATED FEATURES
- [Subscription Creation](../billing/subscription-creation.md) - Creates subscription after billing selection
- [Signup Flow](../auth/signup-flow.md) - signup and signup_complete events
- [Call Analytics](../stats/call-analytics.md) - Post-signup analytics

---

## 10. OPEN QUESTIONS
1. **Should visitor_id be linked to user_id after signup?** - Would enable cross-session attribution
2. **Is pagination needed for funnel_events at scale?** - Currently fetches all events
3. **Should UTM attribution be displayed in the dashboard?** - Data is collected but not shown
4. **Should time-to-conversion metrics be added?** - Could show avg time between stages
5. **Should there be funnel alerts for conversion rate drops?** - Currently requires manual monitoring
6. **How far back should historical data be retained?** - No data retention policy defined
7. **Should the landing page tracker be added?** - Currently no `landing` events visible in tracked pages



