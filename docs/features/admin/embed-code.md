# Feature: Embed Code (D6)

## Quick Summary
The Embed Code feature provides administrators with a JavaScript snippet to install the GreetNow video widget on their website. The embed code loads asynchronously, connects to the signaling server, and displays a live video greeter when agents are online. The feature includes copy-to-clipboard functionality, installation verification, and widget appearance customization.

## Affected Users
- [ ] Website Visitor
- [x] Admin
- [ ] Agent
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Enables website owners to add the GreetNow live video widget to their websites with a single code snippet. The embed code:
- Loads the widget asynchronously without blocking page rendering
- Connects visitors to available agents for video calls
- Tracks installation verification automatically
- Applies configurable appearance and behavior settings

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Quick widget installation | One-click copy of complete embed code |
| Admin | Verify installation works | Auto-detection shows "Installed" status with domain |
| Admin | Customize widget appearance | Visual settings for size, position, theme, timing |
| Admin | Control widget behavior | Configure trigger delay, auto-hide, device targeting |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Admin → Embed Code (Sites page)
2. Admin clicks "Copy Code" to copy the embed snippet
3. Admin pastes snippet into their website's `<head>` or before `</body>`
4. Visitor loads the website page
5. Embed code creates async script tag to load widget JS from CDN
6. Widget initializes with `orgId` and `serverUrl` from config
7. Widget connects to signaling server via WebSocket
8. Server records embed verification (first time only)
9. Widget appears when an agent is online and assigned

### Embed Code Structure

```javascript
<!-- GreetNow Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['GreetNow']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','gg','${widgetCdnUrl}'));
  gg('init', { orgId: '${organizationId}', serverUrl: '${serverUrl}' });
</script>
```

### State Machine (Installation Verification)

```
┌─────────────────┐
│   NOT INSTALLED │
│   (waiting...)  │
└────────┬────────┘
         │ Widget connects + sends VISITOR_JOIN
         ▼
┌─────────────────┐
│    INSTALLED    │◄── OR pageviews detected
│   (verified)    │
└─────────────────┘
```

### State Definitions

| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| Not Installed | No widget connections detected | Initial state | Widget connects OR pageviews exist |
| Installed | Widget successfully loaded on at least one page | First successful VISITOR_JOIN event | N/A (permanent) |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Copy Code click | Dashboard UI | Copies embed snippet to clipboard | Shows "Copied!" toast |
| Widget script load | Customer website | Loads widget JS from CDN | Creates `gg` global function |
| `gg('init', config)` | Customer website | Initializes widget with org settings | Validates config, creates Shadow DOM |
| VISITOR_JOIN | Widget → Server | Registers visitor connection | Server calls `recordEmbedVerification()` |
| Verification poll | Dashboard | Checks install status every 5s | Updates UI when verified |
| Settings save | Dashboard UI | Saves widget settings to database | Updates `default_widget_settings` |

### Key Functions/Components

| Function/Component | File | Purpose |
|-------------------|------|---------|
| `SiteSetupClient` | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Main embed code UI component |
| `SitesPage` | `apps/dashboard/src/app/(app)/admin/sites/page.tsx` | Server component fetching org data |
| `validateConfig` | `apps/widget/src/main.tsx` | Validates embed configuration |
| `init` | `apps/widget/src/main.tsx` | Initializes widget with config |
| `processQueue` | `apps/widget/src/main.tsx` | Processes queued `gg()` commands |
| `recordEmbedVerification` | `apps/server/src/lib/embed-tracker.ts` | Records first successful install |
| `WidgetPreview` | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Live preview of widget settings |

### Data Flow

```
ADMIN COPIES EMBED CODE
    │
    ├─► Dashboard builds snippet with:
    │   ├─► orgId: organization UUID
    │   ├─► serverUrl: from NEXT_PUBLIC_SIGNALING_SERVER
    │   └─► widgetCdnUrl: from NEXT_PUBLIC_WIDGET_CDN_URL
    │
    └─► Admin pastes in website HTML

VISITOR LOADS PAGE
    │
    ├─► Embed snippet executes immediately:
    │   ├─► Creates window.gg queue function
    │   ├─► Creates <script> tag with async=1
    │   ├─► Sets src to widgetCdnUrl (e.g., cdn.ghost-greeter.com/widget.js)
    │   └─► Queues gg('init', { orgId, serverUrl })
    │
    ├─► Browser loads widget.js from CDN
    │   └─► Vercel rewrites /widget.js → /ghost-greeter.iife.js
    │
    ├─► Widget JS processes queue:
    │   ├─► Finds queued 'init' command
    │   ├─► validateConfig() checks orgId, serverUrl
    │   ├─► Creates #greetnow-widget container
    │   ├─► Creates Shadow DOM for style isolation
    │   └─► Renders <Widget config={config} />
    │
    └─► Widget connects to signaling server
        ├─► Emits VISITOR_JOIN { orgId, pageUrl }
        └─► Server: recordEmbedVerification(orgId, pageUrl)
            └─► DB: UPDATE organizations 
                SET embed_verified_at, embed_verified_domain
                WHERE id = orgId AND embed_verified_at IS NULL

DASHBOARD VERIFICATION POLLING
    │
    ├─► Every 5 seconds (until verified):
    │   ├─► Query organizations.embed_verified_at
    │   └─► Query widget_pageviews (alternative verification)
    │
    └─► When verified:
        ├─► setIsVerified(true)
        ├─► setVerifiedDomain(domain)
        └─► Stop polling
```

---

## 4. EDGE CASES

### Complete Scenario Matrix

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path installation | Copy, paste, refresh | Widget appears, verification shows | ✅ | |
| 2 | Embed code in `<head>` | Standard placement | Works - async loading | ✅ | Recommended |
| 3 | Embed code before `</body>` | Alternative placement | Works - slightly faster initial render | ✅ | Valid alternative |
| 4 | Embed code in `<body>` early | Non-standard placement | Works - DOM is ready | ✅ | |
| 5 | Multiple embeds same page | Copy/paste error | Only first initializes; warns in console | ✅ | Prevents duplicate widgets |
| 6 | Widget on SPA (React/Vue) | Dynamic routing | Widget persists across route changes | ✅ | Socket stays connected |
| 7 | Old embed code after update | Version mismatch | CDN serves latest; may break if API changes | ⚠️ | Breaking changes rare |
| 8 | Cross-origin embed | Different domain | Works - CORS headers allow all origins | ✅ | `Access-Control-Allow-Origin: *` |
| 9 | Localhost testing | `http://localhost` | Works - serverUrl defaults to localhost:3001 | ✅ | Dev mode |
| 10 | Widget blocked by ad blocker | Browser extension | Widget fails to load; no error shown to visitor | ⚠️ | Silent failure |
| 11 | Embed code copied incorrectly | Partial copy | Syntax error; widget doesn't load | ❌ | User error - not recoverable |
| 12 | Missing orgId in config | Invalid config | Console error: "orgId is required" | ✅ | Clear error message |
| 13 | Invalid serverUrl | Wrong URL format | Console error: "serverUrl must be a valid URL" | ✅ | Config validation |
| 14 | Empty serverUrl | Omitted | Uses default localhost:3001 | ✅ | Dev fallback |
| 15 | GTM/Tag Manager install | Via GTM container | Works - standard script injection | ✅ | |
| 16 | Verification polling timeout | Widget never connects | Keeps polling until verified | ⚠️ | Could add max attempts |
| 17 | Page with CSP headers | Content-Security-Policy | May block widget if script-src not configured | ⚠️ | Admin must whitelist CDN |
| 18 | Widget script 404 | CDN unavailable | Silent failure; widget doesn't appear | ⚠️ | No user feedback |
| 19 | Signaling server unavailable | Server down | Widget loads but no agents available | ✅ | Graceful degradation |
| 20 | Legacy embed code (GhostGreeter) | Old snippet | Still works - legacy global supported | ✅ | Backwards compatible |

### Error States

| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| CONFIG_INVALID | Missing/invalid orgId | Console error only | Fix embed code configuration |
| WIDGET_DUPLICATE | Multiple embeds | Console warning | Remove duplicate script tags |
| SCRIPT_BLOCKED | Ad blocker active | Nothing (widget hidden) | Whitelist domain in ad blocker |
| CSP_VIOLATION | Strict CSP policy | Console error | Add CDN to script-src directive |
| NETWORK_ERROR | CDN/server unreachable | Widget doesn't appear | Check connectivity; try later |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Admin Flow (Embed Code Page):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Embed Code | Page loads with code snippet visible | ✅ | |
| 2 | Click "Copy Code" | Code copied, button shows "Copied!" | ✅ | 2s feedback |
| 3 | Paste in website | N/A (external action) | - | |
| 4 | Return to dashboard | Shows "Waiting for installation" | ✅ | Spinner animation |
| 5 | Widget connects | Status changes to "Installed" | ✅ | Auto-update via polling |
| 6 | Modify widget settings | Preview updates in real-time | ✅ | Instant feedback |
| 7 | Click "Save Changes" | Settings saved, shows "Saved!" | ✅ | 2s feedback |

**Widget Settings Controls:**
| Setting | Options | Default | Feedback |
|---------|---------|---------|----------|
| Size | Small / Medium / Large | Medium | Live preview |
| Position | 5 positions (corners + center) | Bottom-right | Live preview |
| Show On | All / Desktop / Mobile | All | Live preview |
| Theme | Light / Dark / Glass | Dark | Live preview |
| Show After | Instantly / 3s / 10s / 30s / Custom | 3s | Description text |
| Disappear After | Never / 1m / 2m / 5m / Custom | Never | Description text |
| Allow minimize | Toggle | Off | Toggle animation |

### Accessibility
- Keyboard navigation: ✅ All controls are keyboard accessible
- Screen reader support: ⚠️ Code block may need aria-label
- Color contrast: ✅ Follows design system
- Loading states: ✅ Spinner for "Waiting", green dot for "Installed"

---

## 6. TECHNICAL CONCERNS

### Performance

| Concern | Implementation | Status |
|---------|----------------|--------|
| Widget bundle size | ~50KB IIFE bundle, gzipped | ✅ Small enough |
| Async loading | `async=1` attribute on script tag | ✅ Non-blocking |
| CDN caching | `Cache-Control: max-age=31536000, immutable` | ✅ 1 year cache |
| Shadow DOM | Style isolation prevents host page conflicts | ✅ No style leaks |
| Settings cache | 5-minute cache on server for org/pool settings | ✅ Reduces DB calls |

### Security

| Concern | Mitigation |
|---------|------------|
| XSS via config | Config values validated; no innerHTML usage |
| CORS exposure | Widget serves `Access-Control-Allow-Origin: *` (intentional for embedding) |
| Org ID exposure | UUID in embed code; not sensitive (only identifies org) |
| Server URL exposure | Public endpoint; authentication via WebSocket connection |
| Shadow DOM bypass | Style isolation is defense-in-depth, not security boundary |

### Reliability

| Concern | Mitigation |
|---------|------------|
| CDN downtime | Vercel edge network with 99.99% uptime |
| Script load failure | Widget silently fails; page continues working |
| Config validation | Early validation prevents runtime errors |
| Duplicate init | Checks for existing `#greetnow-widget` before creating |
| Legacy support | Both `GreetNow` and `GhostGreeter` globals supported |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Copy code → Paste → Widget appears. Standard embed pattern.

2. **Is the control intuitive?** ✅ Yes - Big "Copy Code" button, numbered instructions, visual preview.

3. **Is feedback immediate?** ✅ Yes - Copy confirmation, live preview, verification polling.

4. **Is the flow reversible?** ✅ Yes - Remove embed code to uninstall; change settings anytime.

5. **Are errors recoverable?** ⚠️ Partial - Config errors show in console, but visitors don't see feedback when widget fails to load.

6. **Is the complexity justified?** ✅ Yes - Async loader pattern is industry standard; queue system handles timing.

### Identified Issues

| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No visitor feedback on widget failure | Visitors don't know widget exists if blocked | 🟡 Medium | N/A - intentional silent failure |
| Verification polling has no timeout | Dashboard polls forever if never installed | 🟢 Low | Add max poll count (e.g., 100) |
| Ad blockers block widget | Some visitors never see widget | 🟡 Medium | Document for admins; consider alternate domain |
| CSP documentation missing | Admins may not know to whitelist CDN | 🟡 Medium | Add CSP instructions in UI |
| Settings only apply to new sessions | Live visitors don't get updated settings | 🟢 Low | Expected behavior; document it |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Embed code UI (main) | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 1-878 | Complete admin interface |
| Embed code snippet generation | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 136-154 | Template string with config |
| Widget settings preview | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 733-877 | `WidgetPreview` component |
| Verification polling | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 50-91 | 5-second interval |
| Sites page (server) | `apps/dashboard/src/app/(app)/admin/sites/page.tsx` | 1-74 | Fetches org data, detected sites |
| Widget initialization | `apps/widget/src/main.tsx` | 86-124 | `init()` function |
| Config validation | `apps/widget/src/main.tsx` | 34-80 | `validateConfig()` function |
| Queue processor | `apps/widget/src/main.tsx` | 180-219 | `processQueue()` function |
| Legacy support | `apps/widget/src/main.tsx` | 154-166 | Both globals exposed |
| Embed verification | `apps/server/src/lib/embed-tracker.ts` | 1-45 | `recordEmbedVerification()` |
| Verification trigger | `apps/server/src/features/signaling/redis-socket-handlers.ts` | 120 | Called on VISITOR_JOIN |
| Widget config defaults | `apps/widget/src/constants.ts` | 266-272 | `CONFIG_DEFAULTS` |
| CDN configuration | `apps/widget/vercel.json` | 1-30 | Rewrites & CORS headers |
| Widget build config | `apps/widget/vite.config.ts` | 1-35 | IIFE output format |
| Widget settings types | `packages/domain/src/database.types.ts` | 105-118 | `WidgetSettings` interface |
| DB migration | `supabase/migrations/20251128300000_embed_verification.sql` | 1-13 | Added verification columns |

---

## 9. RELATED FEATURES

- [Widget Lifecycle (V1)](../visitor/widget-lifecycle.md) - What happens after widget loads
- [Pool Management (D1)](./pool-management.md) - URL-based routing rules
- [Widget Settings (D5)](./widget-settings.md) - Detailed widget customization
- [Routing Rules (D2)](./routing-rules.md) - How pools are matched to URLs

---

## 10. OPEN QUESTIONS

1. **Should there be a "test mode" for installation?** Currently no way to test without actually connecting. Could add a `testMode: true` option that shows UI without server connection.

2. **How should CSP requirements be communicated?** Admins with strict CSP policies may not know to whitelist the CDN. Could add CSP snippet to copy.

3. **Is infinite verification polling acceptable?** Currently polls every 5 seconds forever until verified. Should there be a timeout or exponential backoff?

4. **Should widget settings apply to existing sessions?** Currently only new visitors get updated settings. Real-time settings push would require WebSocket message.

5. **What's the upgrade path for embed code changes?** If embed code format changes, how do existing customers know to update? Consider versioned endpoints.

6. **Should GTM installation be explicitly documented?** Many customers use Google Tag Manager. Could add specific GTM instructions.

