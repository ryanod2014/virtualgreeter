# Feature: Feedback Dashboard (SA3)

## Quick Summary
Platform-wide administrative view of all user feedback including bug reports, feature requests, and PMF (Product-Market Fit) surveys collected from users across all organizations. Enables platform admins to monitor product sentiment and track issues.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [x] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Feedback Dashboard provides platform administrators with a centralized view of all user-submitted feedback across the entire platform. This enables:
- Monitoring bug reports from all organizations
- Tracking feature requests and their popularity (vote counts)
- Analyzing PMF survey responses to gauge product-market fit
- Understanding user sentiment across different subscription plans
- Identifying trends and patterns in user feedback

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Platform Admin | View all bug reports | Tabbed interface shows all bugs with priority/status |
| Platform Admin | Track feature request popularity | Vote counts and sorting by votes |
| Platform Admin | Measure product-market fit | PMF survey responses with disappointment levels |
| Platform Admin | Understand org context | Shows org name, plan, and subscription status |
| Platform Admin | Find specific feedback | Search across title, description, email, org name |
| Platform Admin | Filter by time period | Date range picker for temporal analysis |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Platform Admin navigates to `/platform/feedback`
2. Server fetches all `feedback_items` and `pmf_surveys` from database
3. Server enriches data with organization and user details
4. Client renders tabbed interface (Bug Reports, Feature Requests, PMF Surveys)
5. Admin can search, filter by status, and filter by date range
6. Admin clicks item to view full details in modal

### State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FEEDBACK DASHBOARD                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Tab Selection]                                                    │
│       │                                                             │
│       ├── Bug Reports Tab (default)                                 │
│       │       │                                                     │
│       │       └── List View ──► Item Click ──► Detail Modal         │
│       │                                                             │
│       ├── Feature Requests Tab                                      │
│       │       │                                                     │
│       │       └── List View ──► Item Click ──► Detail Modal         │
│       │                                                             │
│       └── PMF Surveys Tab                                           │
│               │                                                     │
│               └── List View ──► Survey Click ──► Detail Modal       │
│                                                                     │
│  [Filters Applied at Each Tab]                                      │
│  • Search query (title, description, org, email, user name)         │
│  • Status filter (Bug/Feature only)                                 │
│  • Date range filter (all tabs)                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Bug Reports Tab | Viewing bug reports list | Click "Bug Reports" tab or page load | Click another tab |
| Feature Requests Tab | Viewing feature requests list | Click "Feature Requests" tab | Click another tab |
| PMF Surveys Tab | Viewing PMF survey responses | Click "PMF Surveys" tab | Click another tab |
| Detail Modal Open | Viewing full feedback details | Click on any feedback item | Click outside modal or X button |
| Survey Modal Open | Viewing full PMF survey details | Click on any survey item | Click outside modal or X button |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | Server component | Fetches all feedback + PMF surveys | Parallel Supabase queries |
| Tab click | Client | Switches displayed content | Updates `activeTab` state |
| Search input | Client | Filters visible items | Client-side filtering |
| Status select | Client | Filters by feedback status | Client-side filtering (bug/feature only) |
| Date range change | Client | Filters by created_at date | Client-side filtering |
| Item click | Client | Opens detail modal | Sets `selectedItem` or `selectedSurvey` |
| Modal backdrop click | Client | Closes modal | Clears selected state |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `PlatformFeedbackPage` | `apps/dashboard/src/app/(app)/platform/feedback/page.tsx` | Server component - fetches data |
| `FeedbackClient` | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | Client component - renders UI |
| `filteredItems` | `feedback-client.tsx` (useMemo) | Filters feedback by type, search, status, date |
| `filteredSurveys` | `feedback-client.tsx` (useMemo) | Filters PMF surveys by search and date |
| `DateRangePicker` | `@/lib/components/date-range-picker` | Date range selection component |

### Data Flow

```
PAGE LOAD
    │
    ├─► Server: createClient() → Supabase client
    │
    ├─► Server: Promise.all([
    │       feedback_items.select(...).order(created_at DESC),
    │       pmf_surveys.select(*).eq(dismissed, false).order(created_at DESC)
    │   ])
    │
    ├─► Server: Get unique org IDs from feedback + surveys
    │       └─► organizations.select(id, name, plan, subscription_status)
    │
    ├─► Server: Get unique user IDs from feedback + surveys
    │       └─► users.select(id, email, full_name, role)
    │
    ├─► Server: Enrich feedback items with org/user details
    │       {
    │         ...item,
    │         organization_name, organization_plan, organization_status,
    │         user_email, user_name, user_role
    │       }
    │
    ├─► Server: Enrich PMF surveys with org/user details
    │       {
    │         ...survey,
    │         organization_name, organization_plan, organization_status,
    │         user_email, user_name
    │       }
    │
    └─► Client: FeedbackClient receives enriched data
            │
            ├─► Renders tab buttons with counts
            ├─► Renders search input
            ├─► Renders status filter (non-PMF tabs)
            ├─► Renders date range picker
            └─► Renders filtered list based on active tab
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - view bugs | Page load | Shows bug reports tab | ✅ | Default tab |
| 2 | View feature requests | Click tab | Shows feature list with vote counts | ✅ | |
| 3 | View PMF surveys | Click tab | Shows surveys with disappointment levels | ✅ | |
| 4 | Search feedback | Type in search | Filters by title, description, org, email, name | ✅ | |
| 5 | Filter by status | Select status | Shows only matching items | ✅ | Bug/feature only |
| 6 | Filter by date range | Change dates | Shows items within range | ✅ | |
| 7 | Very long feedback | View item | Text truncated with line-clamp | ✅ | Full text in modal |
| 8 | No results found | Search/filter | Shows empty state with icon | ✅ | "No bug reports found" etc |
| 9 | Feedback from deleted user | View item | Shows "Unknown" for user details | ✅ | Fallback values |
| 10 | Feedback from deleted org | View item | Shows "Unknown" for org name | ✅ | Fallback values |
| 11 | Feedback with screenshot | View item | Shows Image icon indicator | ✅ | Full image in modal |
| 12 | Feedback with recording | View item | Shows Video icon indicator | ✅ | Video player in modal |
| 13 | PMF survey dismissed=true | Page load | Excluded from results | ✅ | Server-side filter |
| 14 | PMF survey with no follow-up | View survey | Just shows disappointment level | ✅ | Optional field |
| 15 | Cross-org feedback comparison | View list | Shows org name + plan for each | ✅ | Visual differentiation |
| 16 | High volume (many items) | Scroll list | All items rendered | ⚠️ | No virtualization |
| 17 | Offensive content | View item | Content shown as-is | ⚠️ | No content moderation |
| 18 | Date range with no results | Filter dates | Empty state shown | ✅ | |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Supabase fetch error | Database unavailable | Console error logged, empty list | Page refresh |
| Org lookup fails | Org deleted after feedback | "Unknown" org name | N/A (graceful fallback) |
| User lookup fails | User deleted after feedback | "Unknown" user details | N/A (graceful fallback) |
| Invalid date range | to < from | Still renders but empty results | Correct the date range |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to /platform/feedback | Dashboard loads with bug reports tab | ✅ | |
| 2 | Click Feature Requests tab | Tab switches, shows features | ✅ | |
| 3 | Click PMF Surveys tab | Tab switches, shows surveys | ✅ | |
| 4 | Type in search box | List filters in real-time | ✅ | |
| 5 | Select status filter | List updates immediately | ✅ | |
| 6 | Change date range | List filters by date | ✅ | |
| 7 | Click on feedback item | Detail modal opens | ✅ | Nice animation |
| 8 | Click outside modal | Modal closes | ✅ | |
| 9 | View long description | Text truncated in list | ✅ | Full text in modal |
| 10 | View attachments | Screenshot/video shown in modal | ✅ | |

### Visual Design
| Element | Implementation | Notes |
|---------|---------------|-------|
| Bug tab color | Red (bg-red-500/10) | Matches bug severity |
| Feature tab color | Amber (bg-amber-500/10) | Lighter, less urgent |
| PMF tab color | Purple (bg-purple-500/10) | Distinct from feedback |
| Status badges | Color-coded by status | Open=blue, In Progress=amber, Completed=green |
| Priority badges | Color-coded | Low=slate, Medium=blue, High=amber, Critical=red |
| Plan badges | Color-coded | Free=slate, Starter=blue, Pro=purple, Enterprise=amber |
| PMF levels | Icon + color coded | Very disappointed=rose/Heart, Somewhat=amber/Meh, Not=slate/Frown |

### Accessibility
- Keyboard navigation: ⚠️ Tab navigation works, but modal not keyboard-trapped
- Screen reader support: ⚠️ Limited - missing ARIA labels
- Color contrast: ✅ Good contrast ratios
- Loading states: ⚠️ No loading indicator during data fetch

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| All feedback fetched at once | No pagination | ⚠️ Could be slow with many items |
| Client-side filtering | useMemo for filtered lists | ✅ Optimized |
| Org/User lookups | Batched with .in() queries | ✅ Efficient |
| Image/video loading | Native lazy loading | ⚠️ Could add explicit lazy |

### Security
| Concern | Mitigation |
|---------|------------|
| Platform admin only access | Route under /platform/ (assumed auth) |
| XSS in feedback content | React escapes by default |
| User data exposure | Full user info shown (by design for admins) |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Fetch failures | Errors logged, empty arrays used |
| Missing org data | Fallback to "Unknown" |
| Missing user data | Fallback to "Unknown" |
| Dismissed surveys | Filtered server-side |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Three distinct tabs for three types of feedback
2. **Is the control intuitive?** ✅ Yes - Standard search, filter, and date picker controls
3. **Is feedback immediate?** ⚠️ Mostly - No loading spinner during initial fetch
4. **Is the flow reversible?** ✅ Yes - Can switch tabs, clear filters, close modals
5. **Are errors recoverable?** ⚠️ Partial - No retry mechanism, page refresh needed
6. **Is the complexity justified?** ✅ Yes - Minimal complexity for read-only dashboard

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No pagination | Slow load with many items | 🟡 Medium | Add server-side pagination |
| No loading indicator | User unsure if loading | 🟢 Low | Add loading spinner |
| No response capability | Can't reply from this view | 🟢 Low | Add response functionality |
| No export | Can't extract data | 🟢 Low | Add CSV export |
| No content moderation | Offensive content visible | 🟡 Medium | Add content flags/filtering |
| No real-time updates | Stale data possible | 🟢 Low | Add polling or websocket |
| No PMF analytics | No aggregate scores | 🟡 Medium | Add PMF score calculation |
| No trend analysis | Can't see sentiment over time | 🟡 Medium | Add charts/graphs |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Server data fetching | `apps/dashboard/src/app/(app)/platform/feedback/page.tsx` | 1-99 | Parallel queries + enrichment |
| Main client component | `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | 1-737 | Full UI implementation |
| Tab state management | `feedback-client.tsx` | 101-102 | useState for activeTab |
| Filter logic (feedback) | `feedback-client.tsx` | 117-145 | useMemo for filtered items |
| Filter logic (PMF) | `feedback-client.tsx` | 148-172 | useMemo for filtered surveys |
| Status config | `feedback-client.tsx` | 78-84 | Status icons and colors |
| Priority colors | `feedback-client.tsx` | 86-91 | Priority badge colors |
| Plan colors | `feedback-client.tsx` | 93-98 | Subscription plan colors |
| PMF level config | `feedback-client.tsx` | 179-199 | Disappointment level icons |
| Feedback detail modal | `feedback-client.tsx` | 465-618 | Full detail view |
| PMF survey modal | `feedback-client.tsx` | 621-733 | Survey detail view |
| Database types | `packages/domain/src/database.types.ts` | 491-525 | feedback_items table |
| Database types | `packages/domain/src/database.types.ts` | 553-568 | pmf_surveys table |
| Feedback type enums | `packages/domain/src/database.types.ts` | 32-37 | Type, Status, Priority enums |
| PMF survey types | `packages/domain/src/database.types.ts` | 37 | DisappointmentLevel enum |

---

## 9. RELATED FEATURES
- [Feedback Buttons](../../features/feedback/) - User-facing bug report and feature request submission
- [Ellis Survey Modal](../../features/surveys/) - PMF survey collection modal
- [Public Feedback](../../app/(app)/feedback/) - User-facing feature request voting/comments
- [Billing](../billing/) - Subscription plan context shown in feedback
- [User Management](../admin/) - User role context shown in feedback

---

## 10. OPEN QUESTIONS

1. **Should there be aggregate PMF metrics?** Currently shows individual responses but no calculated PMF score (% very disappointed). Could add dashboard summary cards.

2. **Should platform admins be able to respond to feedback?** Database has `admin_response`, `admin_responded_at`, `admin_responded_by` fields but UI doesn't use them.

3. **Is there any content moderation needed?** Feedback content is shown as-is with no filtering for offensive language.

4. **Should there be real-time updates?** Currently data is fetched once on page load. No websocket/polling for new feedback.

5. **What's the expected volume of feedback?** No pagination implemented - could be slow with thousands of items.

6. **Should feedback be exportable?** No CSV/Excel export functionality currently exists.

7. **Should there be notification alerts for critical bugs?** Database has `feedback_notifications` table but not used in this dashboard.

8. **How should dismissed PMF surveys be handled?** Currently excluded from view - should they be visible with a "dismissed" flag?

