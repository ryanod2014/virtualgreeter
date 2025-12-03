# Feature: B2B Retargeting Pixel (SA6)

## Quick Summary
The B2B Retargeting Pixel feature allows platform administrators to configure GreetNow's own Facebook pixel to retarget website visitors who interacted with the GreetNow widget. It fires server-side events via Facebook's Conversions API to build custom audiences for ad campaigns promoting GreetNow to business owners.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [x] Platform Admin (Superadmin)

---

## 1. WHAT IT DOES

### Purpose
This feature enables GreetNow (the platform) to run retargeting ad campaigns targeting visitors who saw or used the GreetNow widget on customer websites. It creates two distinct audiences:
1. **All Visitors**: Everyone who saw the widget (broad retargeting)
2. **B2B Visitors**: Visitors on organizations marked as B2B (targeted business owner retargeting)

**Note:** This is NOT an analytics dashboard. Analytics are viewed in Facebook Events Manager. This feature is a configuration interface for setting up the pixel and enabling it per-organization.

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Platform Admin | Run retargeting ads to acquire new customers | Configures pixel to track widget interactions |
| Platform Admin | Target B2B business owners specifically | Enables per-org B2B targeting flags |
| Platform Admin | See which orgs have retargeting enabled | Shows org list with toggle states |
| Platform Admin | Monitor engagement context | Displays pageviews/calls per org for context |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Platform admin navigates to `/platform/retargeting`
2. Admin configures Facebook Pixel ID and Access Token
3. Admin enables the pixel globally
4. Admin toggles on retargeting for specific B2B organizations
5. When visitors interact with widget on enabled orgs:
   - Server fires `GreetNow_WidgetView` event (all orgs)
   - Server fires `GreetNow_CallStarted` + `Lead` events (all orgs)
   - Server fires `_B2B` variants for B2B-enabled orgs
6. Admin views resulting audiences in Facebook Events Manager

### State Machine

```
PIXEL CONFIGURATION STATE
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌──────────────┐    Configure    ┌──────────────┐       │
│    │ Not          │ ─────────────►  │ Configured   │       │
│    │ Configured   │                 │ (Disabled)   │       │
│    └──────────────┘                 └──────┬───────┘       │
│                                            │               │
│                                       Enable               │
│                                            │               │
│                                            ▼               │
│                                     ┌──────────────┐       │
│                                     │ Configured   │       │
│                                     │ (Active)     │       │
│                                     └──────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

ORG RETARGETING STATE
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌──────────────┐    Toggle On    ┌──────────────┐       │
│    │ Disabled     │ ─────────────►  │ Enabled      │       │
│    │              │ ◄─────────────  │ (B2B)        │       │
│    └──────────────┘    Toggle Off   └──────────────┘       │
│                                                             │
│    * Requires pixel to be configured + active first        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Not Configured | No pixel ID or token set | Initial state | Configure pixel settings |
| Configured (Disabled) | Settings saved but pixel disabled | Save with enabled=false | Enable toggle |
| Configured (Active) | Pixel firing events | Enable toggle + save | Disable toggle |
| Org Disabled | Org not firing B2B events | Default state | Admin toggles on |
| Org Enabled (B2B) | Org fires additional B2B events | Admin toggles on | Admin toggles off |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Save pixel settings | Admin UI | Upserts to `platform_settings` table | Invalidates server cache after 5min |
| Toggle org retargeting | Admin UI | Updates `organizations.greetnow_retargeting_enabled` | Invalidates server cache after 2min |
| Widget view | Server (widget connects) | Calls `trackWidgetView()` | Fires FB CAPI events |
| Call started | Server (call accepted) | Calls `trackCallStarted()` | Fires FB CAPI events + Lead |

### Facebook Events Fired

| Event Name | Audience | Trigger | Custom Data |
|------------|----------|---------|-------------|
| `GreetNow_WidgetView` | All visitors | Widget popup shown | content_name, content_category |
| `GreetNow_WidgetView_B2B` | B2B orgs only | Widget popup shown | content_name, content_category |
| `GreetNow_CallStarted` | All visitors | Call begins | content_name, content_category, call_id |
| `Lead` (standard FB event) | All visitors | Call begins | content_name, content_category |
| `GreetNow_CallStarted_B2B` | B2B orgs only | Call begins | content_name, content_category, call_id |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `RetargetingClient` | `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx` | Main UI component |
| `PlatformRetargetingPage` | `apps/dashboard/src/app/(app)/platform/retargeting/page.tsx` | Server component, data fetching |
| `trackWidgetView` | `apps/server/src/lib/greetnow-retargeting.ts` | Fires widget view events |
| `trackCallStarted` | `apps/server/src/lib/greetnow-retargeting.ts` | Fires call started events |
| `getPixelSettings` | `apps/server/src/lib/greetnow-retargeting.ts` | Fetches cached pixel config |
| `isB2BOrg` | `apps/server/src/lib/greetnow-retargeting.ts` | Checks org B2B status |
| `sendToFacebookCAPI` | `apps/server/src/lib/greetnow-retargeting.ts` | HTTP call to Facebook API |
| `hashSHA256` | `apps/server/src/lib/greetnow-retargeting.ts` | Hashes visitor IDs for privacy |

### Data Flow

```
ADMIN CONFIGURATION FLOW
========================

Admin visits /platform/retargeting
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Server Component (page.tsx)                                 │
│                                                             │
│   ┌──────────────────┐    ┌──────────────────┐             │
│   │ platform_settings │    │ organizations    │             │
│   │ key: greetnow_    │    │ greetnow_        │             │
│   │ facebook_pixel    │    │ retargeting_     │             │
│   └────────┬─────────┘    │ enabled          │             │
│            │              └────────┬─────────┘             │
│            │                       │                        │
│            │    ┌─────────────────┐│                        │
│            │    │ call_logs       ││                        │
│            │    │ (count per org) ││                        │
│            │    └────────┬────────┘│                        │
│            │             │         │                        │
│            │    ┌────────┴────────┐│                        │
│            │    │ widget_pageviews ││                       │
│            │    │ (count per org) ││                        │
│            │    └─────────────────┘│                        │
│            │                       │                        │
│            └───────────┬───────────┘                        │
│                        │                                    │
│                        ▼                                    │
│              Build orgsWithStats                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Client Component (retargeting-client.tsx)                   │
│                                                             │
│   ┌─────────────────┐   ┌───────────────────────────────┐  │
│   │ Summary Cards   │   │ Pixel Configuration           │  │
│   │ - Pixel Status  │   │ - Enable Toggle               │  │
│   │ - Orgs Enabled  │   │ - Pixel ID                    │  │
│   │ - Events Types  │   │ - Access Token                │  │
│   └─────────────────┘   │ - Test Event Code             │  │
│                         │ - Save Button                 │  │
│                         └───────────────────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ Organizations Table                                  │  │
│   │ - Search / Filter (show only enabled)               │  │
│   │ - Name, Status, Pageviews, Calls, Retargeting Toggle │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘


EVENT FIRING FLOW (Server-Side)
===============================

Widget Interaction (e.g., popup shown)
         │
         ▼
trackWidgetView({ orgId, visitorId, pageUrl, ip, ua })
         │
         ├─► getPixelSettings() ──► Check cache (5min TTL)
         │           │                    │
         │           │              ┌─────┴─────┐
         │           │              │ Cache Hit │ ──► Return cached
         │           │              └───────────┘
         │           │              ┌─────┴─────┐
         │           │              │ Cache Miss│ ──► Query platform_settings
         │           │              └───────────┘
         │           │
         │           ▼
         │   settings.enabled && pixel_id && access_token?
         │           │
         │     NO    │    YES
         │     ▼     │    ▼
         │   Return  │   Continue
         │           │
         ├───────────┴─────────────────────┐
         │                                 │
         ▼                                 ▼
Fire GreetNow_WidgetView               isB2BOrg(orgId)
to Facebook CAPI                             │
         │                                   │
         │                             ┌─────┴─────┐
         │                             │  is B2B?  │
         │                             └─────┬─────┘
         │                           NO      │      YES
         │                           ▼       │       ▼
         │                         Done      │    Fire GreetNow_
         │                                   │    WidgetView_B2B
         │                                   │
         ▼                                   ▼
       Done                                Done


FACEBOOK CAPI REQUEST
=====================

POST https://graph.facebook.com/v18.0/{pixel_id}/events
{
  "data": [{
    "event_name": "GreetNow_WidgetView",
    "event_time": 1701619200,
    "event_source_url": "https://example.com/page",
    "event_id": "gn_widgetview_{visitorId}_{timestamp}",
    "user_data": {
      "client_ip_address": "1.2.3.4",
      "client_user_agent": "Mozilla/5.0...",
      "external_id": "{sha256(visitorId)}"
    },
    "custom_data": {
      "content_name": "GreetNow Widget",
      "content_category": "Widget Impression"
    }
  }],
  "access_token": "{access_token}",
  "test_event_code": "{optional_test_code}"
}
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - pixel active | Widget view | Events fire to FB | ✅ | |
| 2 | Pixel not configured | Widget view | Events silently skipped | ✅ | No error, no tracking |
| 3 | Pixel configured but disabled | Widget view | Events silently skipped | ✅ | Settings check first |
| 4 | B2B org enabled | Widget view | Fires base + B2B events | ✅ | Two separate events |
| 5 | B2B org disabled | Widget view | Fires base event only | ✅ | No B2B event |
| 6 | Admin toggles org before pixel setup | Toggle click | Toggle disabled (grayed out) | ✅ | Tooltip explains |
| 7 | Search returns no orgs | Search input | "No organizations found" message | ✅ | |
| 8 | Save with no changes | Save button | Button disabled | ✅ | hasPixelChanges check |
| 9 | Facebook API error | CAPI call | Error logged, continues | ✅ | Non-blocking |
| 10 | Missing access token | CAPI call | silently returns false | ✅ | Early return |
| 11 | Invalid pixel ID | CAPI call | Facebook returns error, logged | ✅ | Response error handling |
| 12 | Test event code configured | CAPI call | Events appear in FB Test Events | ✅ | For debugging |
| 13 | Org toggle fails (network) | Toggle click | Error logged, UI not updated | ⚠️ | No user-facing error |
| 14 | Very high traffic org | Many events | Events fire serially | ⚠️ | Could be rate-limited |
| 15 | Cache stale after settings change | Widget view | Old settings used (up to 5min) | ⚠️ | Cache TTL design |
| 16 | Multiple calls in quick succession | Rapid events | Each fires, deduped by event_id | ✅ | FB handles dedup |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Save pixel settings failure | Supabase error | "Failed to save settings" toast | Retry save |
| Org toggle failure | Supabase error | Toggle reverts (silently) | Refresh page, retry |
| CAPI request failed | Network/FB error | Nothing (server-side) | Logs error, auto-retry not implemented |
| Invalid credentials | Wrong token/ID | Events not tracked | Check FB Events Manager, correct credentials |
| Rate limiting | Too many events | Some events dropped | Spread traffic, check FB docs |

---

## 5. UI/UX REVIEW

### User Experience Audit

| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Visit /platform/retargeting | Page loads with current settings | ✅ | |
| 2 | View summary cards | Pixel status, enabled count, events shown | ✅ | |
| 3 | Enter pixel ID | Input updates, save button enabled | ✅ | |
| 4 | Enter access token | Password field obscures value | ✅ | Good security |
| 5 | Toggle enable | Visual switch changes | ✅ | |
| 6 | Click Save | Loading spinner, success toast | ✅ | 3s auto-dismiss |
| 7 | Toggle org retargeting | Spinner on toggle, instant update | ✅ | |
| 8 | Search organizations | Instant filter | ✅ | Client-side |
| 9 | Filter "show only enabled" | Table updates | ✅ | |
| 10 | Try toggle without pixel | Toggle disabled, tooltip shown | ✅ | Good UX |

### Accessibility
- Keyboard navigation: ⚠️ Not verified (toggle buttons may need focus states)
- Screen reader support: ✅ `role="switch"` and `aria-checked` on toggles
- Color contrast: ✅ Status colors use sufficient contrast
- Loading states: ✅ Loader2 spinner and disabled states

### UI Components
| Component | Purpose | Visual State |
|-----------|---------|--------------|
| Summary Cards | At-a-glance status | 3 glass cards with icons |
| Pixel Config Section | Settings form | Inputs + toggle + save button |
| Info Box | Explains how it works | Blue-tinted with FB link |
| Warning Box | Pixel not configured warning | Amber-tinted with icon |
| Organizations Table | Per-org toggles | Sortable, searchable table |
| Toggle Switches | Enable/disable controls | FB blue (#1877F2) when on |

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Pixel settings fetched on every event | 5-minute cache (pixelSettingsCache) | ✅ |
| Org B2B status fetched on every event | 2-minute cache (orgB2BCache) | ✅ |
| Server-side data fetch | Parallel queries for orgs, calls, pageviews | ⚠️ Could be optimized |
| Large org list rendering | All orgs loaded at once | ⚠️ Pagination not implemented |
| CAPI calls blocking | Fire-and-forget, not awaited in hot path | ✅ |

### Security
| Concern | Mitigation |
|---------|------------|
| Access token exposure | Stored server-side in platform_settings, password input in UI |
| Visitor ID privacy | Hashed with SHA256 before sending to Facebook |
| CAPI authentication | Token validated by Facebook |
| Admin-only access | Page under `/platform/` route (superadmin area) |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Facebook API downtime | Error logged, events dropped silently (non-blocking) |
| Database unavailable | Events skip, no retries, caches return null |
| Cache invalidation | TTL-based (5min pixel, 2min org) - eventual consistency |
| Event deduplication | Unique event_id per event (visitor + timestamp) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - Configure pixel → Enable orgs → Events fire → View in FB
2. **Is the control intuitive?** ✅ Yes - Standard form + toggle pattern
3. **Is feedback immediate?** ⚠️ Partial - Save shows success, but event firing is invisible
4. **Is the flow reversible?** ✅ Yes - Can disable pixel or toggle orgs off
5. **Are errors recoverable?** ⚠️ Partial - Save errors shown, but CAPI errors silent
6. **Is the complexity justified?** ✅ Yes - Two audience types (all vs B2B) is clear value

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No analytics in-app | Admin must use FB Events Manager | 🟢 Low | By design - FB has better analytics |
| No event success feedback | Admin can't verify events firing | 🟡 Medium | Add test event trigger button |
| Cache delay after changes | Up to 5min for settings to propagate | 🟢 Low | Add cache clear endpoint or shorter TTL |
| No pagination for orgs | Could slow on 1000+ orgs | 🟢 Low | Add pagination if org count grows |
| Silent CAPI failures | Events may not fire without notice | 🟡 Medium | Add error monitoring/alerting |
| No retry logic | Failed events are lost | 🟡 Medium | Add queue/retry for reliability |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main UI component | `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx` | 1-505 | Full client component |
| Server data fetching | `apps/dashboard/src/app/(app)/platform/retargeting/page.tsx` | 1-77 | Parallel DB queries |
| Retargeting logic | `apps/server/src/lib/greetnow-retargeting.ts` | 1-332 | All server-side logic |
| trackWidgetView | `apps/server/src/lib/greetnow-retargeting.ts` | 184-237 | Widget view event firing |
| trackCallStarted | `apps/server/src/lib/greetnow-retargeting.ts` | 246-321 | Call started event firing |
| sendToFacebookCAPI | `apps/server/src/lib/greetnow-retargeting.ts` | 120-175 | HTTP call to FB API |
| getPixelSettings | `apps/server/src/lib/greetnow-retargeting.ts` | 48-79 | Cached settings fetch |
| isB2BOrg | `apps/server/src/lib/greetnow-retargeting.ts` | 84-115 | Org B2B status check |
| hashSHA256 | `apps/server/src/lib/greetnow-retargeting.ts` | 41-43 | Privacy hashing |
| Cache constants | `apps/server/src/lib/greetnow-retargeting.ts` | 35-36 | TTL values |
| Type definitions | `packages/domain/src/database.types.ts` | - | GreetNowFacebookPixelSettings |

---

## 9. RELATED FEATURES
- [Widget Lifecycle](../visitor/widget-lifecycle.md) - Where trackWidgetView is called
- [Call Lifecycle](../platform/call-lifecycle.md) - Where trackCallStarted is called
- [Organization Settings](../admin/organization-settings.md) - Where greetnow_retargeting_enabled is stored

---

## 10. OPEN QUESTIONS

1. **Where exactly is `trackWidgetView` called?** - Need to trace call site in widget/server code
2. **Where exactly is `trackCallStarted` called?** - Need to trace call site in signaling handlers
3. **Is there a test event flow in the UI?** - Test Event Code field exists but no "send test" button
4. **What happens at scale?** - Facebook rate limits could affect high-volume orgs
5. **Should cache be invalidated on save?** - Currently waits for TTL expiry
6. **Is `clearRetargetingCaches()` exposed anywhere?** - Function exists but not used in UI
7. **How are events verified working?** - Admin must manually check FB Events Manager
8. **Should there be event volume monitoring?** - No visibility into event success rates

