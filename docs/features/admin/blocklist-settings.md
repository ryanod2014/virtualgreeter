# Feature: Blocklist Settings (D9)

## Quick Summary
Country-based access control for the widget. Admins can restrict widget visibility by geographic location using either a blocklist (block specific countries) or an allowlist (only allow specific countries).

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Allows organization admins to control which countries can see and interact with the widget. This enables:
- Compliance with regional regulations
- Reducing spam/abuse from specific regions
- Focusing resources on target markets
- Blocking high-risk countries

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Block visitors from unwanted countries | Add countries to blocklist - those visitors won't see widget |
| Admin | Only serve specific markets | Use allowlist mode - only listed countries see widget |
| Admin | Block entire regions quickly | One-click region selection (Americas, Europe, Asia-Pacific, Middle East & Africa) |
| Admin | Block developing countries (cost control) | One-click "Developing Countries" special group selection |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to Settings → Country Restrictions
2. Admin selects mode: Blocklist (default) or Allowlist
3. Admin configures geolocation failure handling: Allow (default) or Block
4. Admin adds countries using the dropdown selector
5. Admin clicks "Save Changes"
6. Changes are persisted to `organizations.blocked_countries`, `organizations.country_list_mode`, and `organizations.geo_failure_handling`
7. When visitors connect, server checks their IP-based country against the list
8. Blocked visitors are silently disconnected (no widget shown)

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                     BLOCKLIST MODE (default)                     │
├─────────────────────────────────────────────────────────────────┤
│  Empty List → All visitors allowed worldwide                     │
│  Countries in List → Those countries BLOCKED, all others ALLOWED │
│  Unknown Country (geo fail) → Depends on geo_failure_handling   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       ALLOWLIST MODE                             │
├─────────────────────────────────────────────────────────────────┤
│  Empty List → All visitors allowed (lenient default)            │
│  Countries in List → Only those countries ALLOWED, others BLOCKED │
│  Unknown Country (geo fail) → Depends on geo_failure_handling   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              GEO FAILURE HANDLING (applies to both modes)        │
├─────────────────────────────────────────────────────────────────┤
│  Allow (default) → Unknown visitors are allowed through          │
│  Block → Unknown visitors are blocked                           │
└─────────────────────────────────────────────────────────────────┘
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| blocklist (default) | Block listed countries | Select "Blocklist" mode | Select "Allowlist" mode |
| allowlist | Only allow listed countries | Select "Allowlist" mode | Select "Blocklist" mode |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Admin saves changes | Dashboard UI | Updates `organizations` table | Invalidates server-side cache |
| Visitor connects | Socket `VISITOR_JOIN` | Server checks country | Blocks/allows connection |
| Mode change | Dashboard UI | Clears country list | UI reset to prevent confusion |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `BlocklistSettingsClient` | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Main UI component |
| `BlocklistSettingsPage` | `apps/dashboard/src/app/(app)/admin/settings/blocklist/page.tsx` | Server component, auth check |
| `getCountryListSettings` | `apps/server/src/lib/country-blocklist.ts` | Fetch org's country settings with cache |
| `isCountryBlocked` | `apps/server/src/lib/country-blocklist.ts` | Check if country should be blocked |
| `getLocationFromIP` | `apps/server/src/lib/geolocation.ts` | Resolve IP → country via ip-api.com |
| `getClientIP` | `apps/server/src/lib/geolocation.ts` | Extract client IP from socket handshake |
| `COUNTRIES` | `apps/dashboard/src/lib/utils/countries.ts` | Country data (196 countries) |

### Data Flow

```
ADMIN SAVES BLOCKLIST
    │
    ├─► Dashboard: supabase.update("organizations", {
    │       blocked_countries: ["CN", "RU"],
    │       country_list_mode: "blocklist",
    │       geo_failure_handling: "allow"
    │   })
    │
    └─► Database: organizations table updated
        └─► Server cache: Expires after 60s (dev) / 5min (prod)

VISITOR CONNECTS
    │
    ├─► Widget: socket.emit("VISITOR_JOIN", { orgId, pageUrl })
    │
    ├─► Server: getClientIP(socket.handshake)
    │   └─► Checks x-forwarded-for, x-real-ip, then socket.address
    │
    ├─► Server: getLocationFromIP(ipAddress)
    │   ├─► Check cache (1 hour TTL)
    │   ├─► Skip if private IP (localhost, 10.x, 192.168.x, etc.)
    │   └─► Call http://ip-api.com/json/{ip}?fields=status,city,regionName,country,countryCode
    │
    ├─► Server: isCountryBlocked(orgId, countryCode)
    │   ├─► Fetch settings from cache/DB
    │   ├─► If countryCode is null (geo failed): use geo_failure_handling setting
    │   ├─► If blocklist mode: block if IN list
    │   └─► If allowlist mode: block if NOT in list
    │
    ├─► If BLOCKED:
    │   └─► socket.disconnect(true) ← Silent disconnect, no error shown
    │
    └─► If ALLOWED:
        └─► Continue with visitor registration (poolManager.registerVisitor)
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path - blocklist mode | Admin blocks CN, visitor from CN connects | Visitor silently disconnected | ✅ | |
| 2 | Happy path - allowlist mode | Admin allows US only, visitor from US connects | Visitor allowed | ✅ | |
| 3 | Empty blocklist | No countries in list | All visitors allowed worldwide | ✅ | |
| 4 | Empty allowlist | No countries in list | All visitors allowed (lenient) | ✅ | Could be stricter but prevents lockout |
| 5 | Geolocation fails - geo_failure_handling=allow | IP lookup returns null | Visitor ALLOWED | ✅ | Admin configured lenient |
| 6 | Geolocation fails - geo_failure_handling=block | IP lookup returns null | Visitor BLOCKED | ✅ | Admin configured strict |
| 7 | Private IP (localhost) | 127.0.0.1, 192.168.x | Geolocation skipped, returns null | ✅ | |
| 8 | Case sensitivity | "cn" vs "CN" in list | Case-insensitive comparison | ✅ | Both match |
| 9 | Mode change | Switch blocklist → allowlist | Country list cleared | ✅ | Prevents accidental blocking |
| 10 | Database error | Supabase unreachable | Returns empty list (fail-safe) | ✅ | Visitors not blocked |
| 11 | VPN user | Visitor uses VPN to US | Visitor appears from US | ⚠️ | Cannot detect VPN |
| 12 | Switching modes with existing list | Change mode | List is cleared | ✅ | Clear warning in UI |
| 13 | Select entire region | Click "Europe" | All 40 European countries added | ✅ | |
| 14 | Select developing countries | Click "Developing Countries" | 70+ countries added | ✅ | |
| 15 | Deselect entire region | Click selected "Europe" | All European countries removed | ✅ | |
| 16 | Concurrent requests | Multiple visitors same IP | Uses cached geolocation (1hr TTL) | ✅ | |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Database save failed | Supabase unreachable | "Failed to save changes. Please try again." | Retry button |
| Geolocation API down | ip-api.com unreachable | Nothing (silent fail) | Visitor allowed through |
| Database read failed | Supabase unreachable on connect | Nothing (silent fail) | Visitor allowed through |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Country Restrictions | Page loads with current settings | ✅ | |
| 2 | Select mode (Blocklist/Allowlist) | Mode toggles, list clears | ✅ | Warning in info box |
| 3 | Configure geo-failure handling (Allow/Block) | Toggle highlights, updates immediately | ✅ | Info note about failure rates |
| 4 | Open country dropdown | Shows search + region buttons + country list | ✅ | |
| 5 | Search for country | Filters list in real-time | ✅ | |
| 6 | Click region button | Toggles all countries in region | ✅ | Visual feedback |
| 7 | Select individual country | Country added with badge | ✅ | |
| 8 | Remove country | Click X on badge | ✅ | |
| 9 | Save changes | Loading spinner → success message | ✅ | 3s auto-dismiss |
| 10 | No changes | Save button disabled | ✅ | |

### Visual Design
- **Mode Selection:** Two large cards with icons (Ban for blocklist, CheckCircle2 for allowlist)
- **Geo-Failure Handling:** Two toggle cards with icons (CheckCircle2 for allow, Ban for block) and explanatory text
- **Country Selector:** Dropdown with search, region quick-buttons, grouped country list
- **Selected Countries:** Color-coded badges (red for blocklist, green for allowlist)
- **Info Box:** Orange warning explaining how blocking works, VPN caveat
- **Failure Rate Note:** Informational box explaining typical 2-5% failure rate to help admins decide

### Accessibility
- Keyboard navigation: ⚠️ Dropdown requires mouse interaction
- Screen reader support: ⚠️ Not verified
- Color contrast: ✅ Good - red/green on appropriate backgrounds
- Loading states: ✅ Spinner during save

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| Database calls per visitor | Country settings cached 60s/5min | ✅ Optimized |
| Geolocation API calls | IP results cached 1 hour | ✅ Optimized |
| Large country list in memory | String array comparison | ✅ Negligible |
| ip-api.com rate limit | 45 requests/minute | ⚠️ Could hit at scale |

### Security
| Concern | Mitigation |
|---------|------------|
| Blocklist exposure | Silent disconnect - no error reveals blocking |
| IP spoofing | Cannot fully prevent; relies on proxy headers |
| Admin auth | Page requires admin role (redirect if not) |
| Database access | Uses Supabase RLS policies |

### Reliability
| Concern | Mitigation |
|---------|------------|
| Geolocation API down | Fail-safe: allow visitor through |
| Database down | Fail-safe: return empty list, allow all |
| Cache stale data | Short TTL (60s dev, 5min prod) |
| Private IPs | Skipped (no API call) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Blocklist blocks, Allowlist allows. Info box explains.
2. **Is the control intuitive?** ✅ Yes - Region buttons for bulk selection, search for specific countries.
3. **Is feedback immediate?** ✅ Yes - Countries appear/disappear instantly, save shows loading.
4. **Is the flow reversible?** ✅ Yes - Can remove countries, change modes.
5. **Are errors recoverable?** ✅ Yes - Fail-safe defaults allow visitors through on errors.
6. **Is the complexity justified?** ✅ Yes - Dual mode (block/allow) covers all use cases.

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| VPN bypass | Visitors can use VPN to appear from allowed country | 🟡 Medium | Document limitation (done in info box) |
| No IP-specific blocking | Can only block by country, not specific IPs | 🟢 Low | Future enhancement if needed |
| No real-time enforcement | Currently connected visitors not affected | 🟢 Low | Acceptable - affects new connections only |
| Cache invalidation | 60s/5min delay for changes to take effect | 🟢 Low | Acceptable tradeoff |
| ip-api.com free tier limit | 45 req/min could bottleneck at scale | 🟡 Medium | Consider paid plan or MaxMind |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main UI component | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | 1-733 | Full settings UI |
| Mode selection UI | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | 330-381 | Blocklist/Allowlist toggle |
| Geo-failure handling UI | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | 387-447 | Allow/Block toggle for unknown locations |
| Country dropdown | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | 449-680 | Portal-based dropdown |
| Save handler | `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | 198-224 | Supabase update with geo_failure_handling |
| Server page component | `apps/dashboard/src/app/(app)/admin/settings/blocklist/page.tsx` | 1-43 | Auth check, data fetch |
| Country blocking logic | `apps/server/src/lib/country-blocklist.ts` | 94-136 | `isCountryBlocked()` with geo_failure_handling |
| Geo-failure handling logic | `apps/server/src/lib/country-blocklist.ts` | 105-114 | Uses admin's geo_failure_handling setting |
| Settings cache | `apps/server/src/lib/country-blocklist.ts` | 22-24, 31-74 | Cache management with geo_failure_handling |
| IP geolocation | `apps/server/src/lib/geolocation.ts` | 21-67 | `getLocationFromIP()` |
| Client IP extraction | `apps/server/src/lib/geolocation.ts` | 110-130 | `getClientIP()` |
| Socket enforcement | `apps/server/src/features/signaling/socket-handlers.ts` | 132-140 | Block check on VISITOR_JOIN |
| Redis socket enforcement | `apps/server/src/features/signaling/redis-socket-handlers.ts` | 137-142 | Same for Redis mode |
| Countries data | `apps/dashboard/src/lib/utils/countries.ts` | 50-233 | 196 countries with flags |
| Unit tests | `apps/server/src/lib/country-blocklist.test.ts` | 1-443 | Comprehensive test coverage |

---

## 9. RELATED FEATURES
- [Widget Settings (D5)](./widget-settings.md) - Other widget configuration options
- [Organization Settings (D8)](./organization-settings.md) - Parent settings page
- [Widget Lifecycle (V1)](../visitor/widget-lifecycle.md) - How widget loads and shows

---

## 10. OPEN QUESTIONS

1. **Should we support IP range blocking?** Currently only country-level blocking is supported. IP ranges would require different UI and storage.

2. **Should cache be invalidated immediately on save?** Currently relies on TTL expiry (60s/5min). Could add cache invalidation webhook, but adds complexity.

3. **What happens to visitors already connected when blocklist changes?** Currently: nothing - they remain connected. Only new connections are checked. Is this acceptable?

4. **Should we log blocked connection attempts?** Currently just logged to console. Could persist for analytics/compliance.

5. **Should we support time-based blocking?** E.g., block certain countries during off-hours. Not currently implemented.

6. **Should we warn about empty allowlist?** Empty allowlist currently allows everyone (lenient). Could be confusing - admin might expect it to block everyone.

7. **Should we track actual geo-failure rates per organization?** Currently we show a typical 2-5% estimate. Could provide org-specific stats to help admins make more informed decisions about their geo_failure_handling setting.



