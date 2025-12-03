# Feature: Sites Setup (D12)

## Quick Summary
The Sites Setup feature provides administrators with a complete widget installation experience including embed code generation, automatic installation verification, and a dashboard showing all detected sites where the widget is active. It tracks pageviews per domain and provides real-time feedback when the widget is successfully installed.

## Affected Users
- [ ] Website Visitor
- [x] Admin
- [ ] Agent
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Enables website owners to install the GreetNow video widget on their websites through a streamlined setup process. The feature:
- Generates a unique embed code with the organization's credentials
- Auto-detects when the widget is successfully installed
- Tracks all domains where the widget is deployed
- Shows pageview statistics per domain
- Provides widget appearance customization

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Quick widget installation | One-click copy of complete embed code |
| Admin | Know if installation worked | Auto-detection shows "Installed" status immediately |
| Admin | See where widget is deployed | List of detected domains with pageview counts |
| Admin | Customize widget behavior | Visual settings for size, position, timing, theme |
| Admin | Test on localhost first | Works on any domain including localhost |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Embed Code (Sites page)
2. System displays unique embed code with orgId and serverUrl
3. Admin clicks "Copy Code" button
4. Admin pastes code into their website's HTML
5. Visitor loads the website page
6. Widget initializes and connects to signaling server
7. Server records pageview to `widget_pageviews` table
8. Server records embed verification (first time only) to `organizations` table
9. Dashboard polls every 5 seconds until verification detected
10. Dashboard updates to show "Installed" status with detected domains

### Installation Verification State Machine

```
┌─────────────────────────────────────┐
│         NOT INSTALLED               │
│   "Waiting for installation..."     │
│   (Spinner animation)               │
└────────────────┬────────────────────┘
                 │
                 │  Either:
                 │  1. embed_verified_at set in DB
                 │  OR
                 │  2. widget_pageviews exist for org
                 │
                 ▼
┌─────────────────────────────────────┐
│           INSTALLED                 │
│   "Installed" (green dot)           │
│   + List of detected domains        │
└─────────────────────────────────────┘
```

### State Definitions

| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Not Installed | No widget connections detected | Initial state for new orgs | Widget connects or pageviews detected |
| Installed | Widget successfully loaded on at least one page | First VISITOR_JOIN event OR pageview recorded | N/A (permanent) |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Page load | Dashboard Sites page | Fetches org settings, embed verification status, pageviews | Queries 3 tables |
| Copy Code click | Dashboard UI | Copies embed snippet to clipboard | Shows "Copied!" for 2s |
| Verification poll | Dashboard (every 5s) | Checks `embed_verified_at` OR `widget_pageviews` | Updates UI when verified |
| Widget VISITOR_JOIN | Widget → Server | Records embed verification (first time) | DB: sets `embed_verified_at`, `embed_verified_domain` |
| Widget WIDGET_PAGEVIEW | Widget → Server | Records pageview with agent assignment | DB: inserts to `widget_pageviews` |
| Settings change | Dashboard UI | Updates preview in real-time | No DB call yet |
| Save Settings click | Dashboard UI | Saves `default_widget_settings` to org | DB: updates organizations |

### Key Functions/Components

| Function/Component | File | Purpose |
|-------------------|------|---------|
| `SitesPage` (server) | `apps/dashboard/src/app/(app)/admin/sites/page.tsx` | Fetches org data, aggregates detected sites |
| `SiteSetupClient` | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Main embed code UI, settings, preview |
| `WidgetPreview` | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Live visual preview of widget settings |
| `recordEmbedVerification` | `apps/server/src/lib/embed-tracker.ts` | Records first successful install to DB |
| `recordPageview` | `apps/server/src/lib/pageview-logger.ts` | Logs widget impressions to `widget_pageviews` |
| `validateConfig` | `apps/widget/src/main.tsx` | Validates embed configuration on widget load |
| `init` | `apps/widget/src/main.tsx` | Initializes widget with Shadow DOM |

### Data Flow

```
ADMIN LOADS SITES PAGE
    │
    ├─► Server component fetches:
    │   ├─► organizations.default_widget_settings
    │   ├─► organizations.embed_verified_at
    │   ├─► organizations.embed_verified_domain
    │   └─► widget_pageviews (all for org)
    │
    ├─► Aggregates pageviews by domain:
    │   ├─► Extract URL origin from each pageview
    │   ├─► Count pageviews per domain
    │   └─► Track first_seen, last_seen per domain
    │
    └─► Renders client component with:
        ├─► initialWidgetSettings
        ├─► initialEmbedVerified (boolean)
        ├─► initialVerifiedDomain (string | null)
        └─► detectedSites (array of domains with stats)

EMBED CODE GENERATION
    │
    ├─► Builds snippet with:
    │   ├─► widgetCdnUrl: NEXT_PUBLIC_WIDGET_CDN_URL || "https://cdn.ghost-greeter.com/widget.js"
    │   ├─► organizationId: from auth context
    │   └─► serverUrl: NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:3001"
    │
    └─► Template:
        <!-- GreetNow Widget -->
        <script>
          (function(w,d,s,o,f,js,fjs){
            w['GreetNow']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
            js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
            js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
          }(window,document,'script','gg','${widgetCdnUrl}'));
          gg('init', { orgId: '${organizationId}', serverUrl: '${serverUrl}' });
        </script>

VERIFICATION POLLING (every 5 seconds until verified)
    │
    ├─► Query 1: Check organizations.embed_verified_at
    │   └─► If set: mark verified, set domain from embed_verified_domain
    │
    └─► Query 2 (fallback): Check widget_pageviews
        └─► If any exist: mark verified, extract domain from first pageview URL

WIDGET INSTALLATION (on customer's site)
    │
    ├─► Embed snippet runs immediately:
    │   ├─► Creates window.gg queue function
    │   └─► Queues gg('init', { orgId, serverUrl })
    │
    ├─► Browser loads widget.js from CDN
    │
    ├─► Widget validates config:
    │   ├─► orgId: required, non-empty string
    │   ├─► serverUrl: optional, must be valid URL if provided
    │   └─► position: optional, "bottom-right" or "bottom-left"
    │
    ├─► Widget creates Shadow DOM container:
    │   ├─► id="greetnow-widget"
    │   └─► Attaches shadow root for style isolation
    │
    └─► Widget connects to signaling server:
        ├─► Emits VISITOR_JOIN { orgId, pageUrl }
        └─► Server: recordEmbedVerification(orgId, pageUrl)
            └─► Only updates if embed_verified_at IS NULL (first time)
```

---

## 4. EDGE CASES

### Complete Scenario Matrix

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path installation | Copy, paste, visit page | Widget appears, verification shows | ✅ | |
| 2 | Widget on localhost | `http://localhost:3000` | Works - serverUrl defaults to localhost:3001 | ✅ | Dev mode |
| 3 | Multiple domains same org | Install on multiple sites | All domains tracked in `widget_pageviews` | ✅ | Automatic |
| 4 | Same domain different paths | Various page URLs | Tracked per page, aggregated by domain | ✅ | |
| 5 | Subdomain vs root domain | `www.site.com` vs `site.com` | Tracked as separate origins | ⚠️ | URL.origin differentiates |
| 6 | Widget blocked by ad blocker | Browser extension | Widget fails silently | ⚠️ | No admin notification |
| 7 | Verification already set | Re-install after verified | DB update skipped (IS NULL check) | ✅ | Prevents overwrites |
| 8 | No agents online | Widget loads, no agent available | Pageview not tracked (agent_id required) | ⚠️ | Missed opportunity tracked instead |
| 9 | Page with CSP headers | Strict Content-Security-Policy | May block widget script | ⚠️ | Admin must whitelist CDN |
| 10 | Widget on SPA (React/Vue) | Client-side routing | Widget persists across route changes | ✅ | Socket stays connected |
| 11 | Multiple embed codes same page | Copy/paste error | Only first initializes; warns in console | ✅ | Duplicate prevention |
| 12 | Legacy embed code (GhostGreeter) | Old snippet | Still works - legacy global supported | ✅ | Backwards compatible |
| 13 | Invalid orgId in config | Wrong UUID | Console error: "orgId is required" | ✅ | Clear error message |
| 14 | Invalid serverUrl | Malformed URL | Console error: "serverUrl must be a valid URL" | ✅ | Config validation |
| 15 | Verification polling indefinite | Widget never installed | Polls forever until verified | ⚠️ | No timeout/backoff |
| 16 | Detected site no longer active | Widget removed | Still shows in list (historical data) | ⚠️ | last_seen shows staleness |
| 17 | Domain ownership transfer | Different customer uses same domain | Previous org still tracks that domain | ⚠️ | No domain validation |
| 18 | Cross-origin iframe embed | Widget in iframe | Works - CORS allows all origins | ✅ | `Access-Control-Allow-Origin: *` |
| 19 | GTM/Tag Manager install | Via GTM container | Works - standard script injection | ✅ | |
| 20 | HTTPS site with HTTP serverUrl | Protocol mismatch | Mixed content warning/block | ⚠️ | Must use HTTPS in prod |

### Error States

| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| CONFIG_INVALID | Missing/invalid orgId | Console error only | Fix embed code configuration |
| WIDGET_DUPLICATE | Multiple embeds on same page | Console warning | Remove duplicate script tags |
| SCRIPT_BLOCKED | Ad blocker active | Nothing (widget hidden) | Whitelist domain in ad blocker |
| CSP_VIOLATION | Strict CSP policy | Console error | Add CDN to script-src directive |
| NETWORK_ERROR | CDN/server unreachable | Widget doesn't appear | Check connectivity; try later |
| DB_ERROR | Supabase unavailable | Pageview not logged | Retry automatic on next page |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Sites Page Layout:**
| Section | What It Shows | Position |
|---------|---------------|----------|
| Header | "Embed Code" title + description | Top |
| Code Block | Embed snippet with Copy button | Main area, left |
| Instructions | 3-step numbered guide | Main area, right |
| Installation Status | "Installed" or "Waiting..." | Below code block |
| Detected Sites | List of domains with stats | Below status |
| Widget Settings | Size, position, theme, timing | Separate card |
| Preview | Desktop + Mobile widget preview | Above settings |
| Routing CTA | Link to Pool configuration | Bottom |

**Admin Flow:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Sites page | Page loads with code visible | ✅ | |
| 2 | Click "Copy Code" | Copies to clipboard, shows "Copied!" | ✅ | 2s feedback |
| 3 | Paste in website HTML | N/A (external action) | - | |
| 4 | Visit instrumented page | Widget appears (if agent online) | ✅ | |
| 5 | Return to dashboard | Shows "Installed" + domain | ✅ | Auto-updates via polling |
| 6 | View detected sites | List shows all domains + stats | ✅ | Sorted by last_seen |
| 7 | Modify widget settings | Preview updates in real-time | ✅ | Instant feedback |
| 8 | Save settings | Shows "Saved!" confirmation | ✅ | 2s feedback |

**Widget Settings Controls:**
| Setting | Options | Default | Live Preview |
|---------|---------|---------|--------------|
| Size | Small / Medium / Large | Medium | ✅ |
| Position | 5 positions (corners + center) | Bottom-right | ✅ |
| Show On | All / Desktop / Mobile | All | ✅ Shows "Hidden" badge |
| Theme | Light / Dark / Glass | Dark | ✅ |
| Show After | Instantly / 3s / 10s / 30s / Custom | 3 seconds | Text description |
| Disappear After | Never / 1m / 2m / 5m / Custom | Never | Text description |
| Allow minimize | Toggle on/off | Off | ✅ Toggle animation |

**Detected Sites Display:**
| Column | Content | Indicator |
|--------|---------|-----------|
| Status | Green dot if active today | Color-coded |
| Domain | URL origin without protocol | Clickable link |
| Pageviews | Count with locale formatting | Number |
| Activity | "Active today" or date | Text |

### Accessibility
- Keyboard navigation: ✅ All controls keyboard accessible
- Screen reader support: ⚠️ Code block may need aria-label
- Color contrast: ✅ Follows design system
- Loading states: ✅ Spinner for "Waiting", green dot for "Installed"
- Focus indicators: ✅ Visible focus rings on buttons

---

## 6. TECHNICAL CONCERNS

### Performance

| Concern | Implementation | Status |
|---------|----------------|--------|
| Page load queries | 3 parallel queries (org, pageviews) | ✅ Server component |
| Polling frequency | 5 seconds until verified | ⚠️ Could add backoff |
| Pageview aggregation | In-memory Map grouping | ✅ O(n) complexity |
| Preview rendering | CSS-only, no re-render on change | ✅ Optimized |
| Settings save | Single DB update | ✅ Minimal write |

### Security

| Concern | Mitigation |
|---------|------------|
| Org ID exposure | UUID in embed code; not sensitive (only identifies org) |
| Server URL exposure | Public endpoint; auth via WebSocket |
| XSS via config | Config values validated; no innerHTML |
| CORS exposure | Widget serves `Access-Control-Allow-Origin: *` (intentional) |
| Domain spoofing | No validation - any domain can use any org's code |

### Reliability

| Concern | Mitigation |
|---------|------------|
| CDN downtime | Vercel edge network with 99.99% uptime |
| Script load failure | Widget silently fails; page continues working |
| Supabase unavailable | Pageview logging is fire-and-forget |
| Duplicate initialization | Checks for existing `#greetnow-widget` |
| Legacy support | Both `GreetNow` and `GhostGreeter` globals |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Copy code → Paste → See verification. Standard embed pattern.

2. **Is the control intuitive?** ✅ Yes - Big "Copy Code" button, numbered instructions, visual preview.

3. **Is feedback immediate?** ✅ Yes - Copy confirmation, live preview, 5-second polling for verification.

4. **Is the flow reversible?** ✅ Yes - Remove embed code to uninstall; change settings anytime.

5. **Are errors recoverable?** ⚠️ Partial - Config errors show in console, but no admin notification for failed installs.

6. **Is the complexity justified?** ✅ Yes - Async loader pattern is industry standard; Shadow DOM prevents style conflicts.

### Identified Issues

| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No domain validation | Anyone can use any org's embed code | 🟡 Medium | Add allowed_origins setting (optional) |
| Infinite verification polling | Resources used indefinitely | 🟢 Low | Add exponential backoff after 5 min |
| Subdomain treated as separate domain | Confusing for admins | 🟢 Low | Group by root domain option |
| No "remove domain" option | Can't clean up old sites | 🟢 Low | Add archive/delete for domains |
| Pageview requires agent online | Missed installs not tracked as verified | 🟡 Medium | Track verification on any VISITOR_JOIN |
| No installation test mode | Must deploy to verify | 🟢 Low | Add "test widget" button |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Sites page (server) | `apps/dashboard/src/app/(app)/admin/sites/page.tsx` | 1-74 | Fetches org data, aggregates sites |
| Site setup UI (client) | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 1-878 | Complete admin interface |
| Embed code template | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 146-154 | Template string generation |
| Verification polling | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 50-91 | 5-second interval |
| Widget preview | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 734-877 | `WidgetPreview` component |
| Settings form | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 418-702 | Size, position, theme, timing |
| Widget initialization | `apps/widget/src/main.tsx` | 86-124 | `init()` function |
| Config validation | `apps/widget/src/main.tsx` | 34-80 | `validateConfig()` function |
| Queue processor | `apps/widget/src/main.tsx` | 180-219 | `processQueue()` function |
| Embed verification | `apps/server/src/lib/embed-tracker.ts` | 1-45 | `recordEmbedVerification()` |
| Pageview logging | `apps/server/src/lib/pageview-logger.ts` | 1-71 | `recordPageview()` |
| Widget pageviews table | `supabase/migrations/20251128400000_widget_pageviews.sql` | 1-40 | Table definition |
| Embed verification columns | `supabase/migrations/20251128300000_embed_verification.sql` | 1-13 | Added to organizations |
| Default settings type | `packages/domain/src/database.types.ts` | 105-118 | `WidgetSettings` interface |

---

## 9. RELATED FEATURES

- [Embed Code (D6)](./embed-code.md) - Detailed embed code documentation
- [Widget Lifecycle (V1)](../visitor/widget-lifecycle.md) - What happens after widget loads
- [Pool Management (D1)](./pool-management.md) - URL-based routing rules
- [Widget Settings (D5)](./widget-settings.md) - Per-pool widget customization
- [Coverage Stats (STATS2)](../stats/coverage-stats.md) - Pageview analytics

---

## 10. OPEN QUESTIONS

1. **Should there be an allowed_origins feature?** Currently any domain can embed any org's widget. Some customers may want to restrict embedding to specific domains for security.

2. **How should stale/inactive sites be handled?** Sites where the widget was removed still appear in the detected sites list. Should there be an archive or auto-cleanup feature?

3. **Should subdomains be grouped?** Currently `www.example.com` and `example.com` show as separate entries. Would admins prefer them grouped under a root domain?

4. **Is there a need for WordPress/Shopify integration guides?** Many customers use these platforms. Specific installation instructions could reduce support requests.

5. **Should verification work without agents online?** Currently, pageview tracking requires an agent to be assigned. VISITOR_JOIN events happen regardless, so embed verification works, but the pageview count may be inaccurate for orgs without 24/7 coverage.

6. **Should there be a "test widget" button?** Currently admins must deploy to production to verify the widget works. A preview/test mode could help validate settings before going live.

7. **Is infinite verification polling acceptable?** Dashboard polls every 5 seconds forever until verified. Consider exponential backoff or a "check again" button after timeout.

