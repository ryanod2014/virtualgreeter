# Feature: Widget Settings (D5)

## Quick Summary
Widget Settings allows admins to configure the appearance and behavior of the widget that visitors see on their website. Settings can be configured at the organization level (defaults) and overridden per-pool for URL-specific customization.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Widget Settings provides a centralized configuration system for controlling how the widget appears and behaves on customer websites. This enables:
- Consistent branding across all pages (org-level defaults)
- Page-specific customization (pool-level overrides)
- Device targeting for desktop/mobile experiences
- Timing control for when the widget appears and auto-hides

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Consistent widget appearance | Org-level default settings apply to all pools |
| Admin | Different widget behavior on different pages | Pool-level overrides for specific URL patterns |
| Admin | Target specific devices | Device visibility setting (all/desktop/mobile) |
| Admin | Control widget intrusiveness | Trigger delay and auto-hide settings |
| Admin | Match website branding | Theme selection (light/dark/liquid-glass) |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Admin navigates to **Admin → Embed Code** to configure organization defaults
2. Admin adjusts settings (size, position, devices, theme, delays, minimize button)
3. Admin clicks "Save Changes" - settings saved to `organizations.default_widget_settings`
4. Optionally, admin navigates to **Admin → Pools** to configure pool-specific overrides
5. In pool settings, admin enables "Use custom settings" and configures overrides
6. Pool override saved to `agent_pools.widget_settings`
7. Visitor connects → Server fetches settings via `getWidgetSettings(orgId, poolId)`
8. Server sends settings to widget via `agent:assigned` or `agent:unavailable` event
9. Widget applies settings to control appearance and behavior

### Settings Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                   VISITOR CONNECTS                   │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
          ┌───────────────────────────────┐
          │  Does visitor match a pool?   │
          └───────────────┬───────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
           ▼ YES                         ▼ NO
┌─────────────────────┐     ┌─────────────────────┐
│ Pool has custom     │     │ Use org defaults    │
│ widget_settings?    │     │                     │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
    ┌──────┴──────┐                    │
    │             │                    │
    ▼ YES         ▼ NO                 │
┌──────────┐  ┌──────────┐             │
│ Use pool │  │ Use org  │             │
│ settings │  │ defaults │◄────────────┘
└──────────┘  └──────────┘
```

### State Definitions
| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| `size` | "small" \| "medium" \| "large" | Widget dimensions | "medium" |
| `position` | "bottom-right" \| "bottom-left" \| "top-right" \| "top-left" \| "center" | Screen position | "bottom-right" |
| `devices` | "all" \| "desktop" \| "mobile" | Device visibility | "all" |
| `trigger_delay` | number (seconds) | Delay before widget appears | 3 |
| `auto_hide_delay` | number \| null (seconds) | Auto-hide after inactivity (null = never) | null |
| `show_minimize_button` | boolean | Allow visitors to minimize widget | false |
| `theme` | "light" \| "dark" \| "liquid-glass" | Widget color theme | "dark" |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| Settings page load | Dashboard | Fetches current org settings | None |
| Save Changes click | Dashboard | Updates `organizations.default_widget_settings` | Cache invalidated on next request |
| Pool settings toggle | Pools page | Enables/disables custom pool settings | Updates `agent_pools.widget_settings` |
| `visitor:join` | Server | Fetches settings for visitor | Sends settings in `agent:assigned` |
| `agent:unavailable` | Server | Sends settings even when no agent | Widget uses for trigger_delay tracking |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `getWidgetSettings` | `apps/server/src/lib/widget-settings.ts` | Fetch settings with caching and fallback |
| `getOrgDefaultSettings` | `apps/server/src/lib/widget-settings.ts` | Fetch org defaults with cache |
| `getPoolSettings` | `apps/server/src/lib/widget-settings.ts` | Fetch pool overrides with cache |
| `SiteSetupClient` | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Org-level settings UI |
| `PoolWidgetSettings` | `apps/dashboard/src/app/(app)/admin/pools/pools-client.tsx` | Pool-level override UI |
| `WidgetPreview` | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Live preview component |
| `DEFAULT_WIDGET_SETTINGS` | Multiple files | Fallback defaults |

### Data Flow

```
ADMIN SAVES ORG SETTINGS
    │
    ├─► Dashboard: supabase.from("organizations").update({ default_widget_settings })
    │   └─► DB: organizations.default_widget_settings = {...}
    │
    └─► Cache NOT immediately invalidated (TTL-based expiry)

ADMIN SAVES POOL OVERRIDE
    │
    ├─► Dashboard: supabase.from("agent_pools").update({ widget_settings })
    │   └─► DB: agent_pools.widget_settings = {...} OR null
    │
    └─► Cache NOT immediately invalidated (TTL-based expiry)

VISITOR CONNECTS
    │
    ├─► Server: visitor:join received
    │
    ├─► Server: poolManager.matchPathToPool(orgId, pageUrl)
    │   └─► Returns poolId if URL matches routing rules
    │
    ├─► Server: getWidgetSettings(orgId, poolId)
    │   │
    │   ├─► Check poolSettingsCache (if poolId provided)
    │   │   ├─► Cache hit? Return cached pool settings
    │   │   └─► Cache miss? Query agent_pools.widget_settings
    │   │       └─► If pool has settings → cache & return
    │   │
    │   ├─► Check orgSettingsCache (if no pool settings)
    │   │   ├─► Cache hit? Return cached org settings
    │   │   └─► Cache miss? Query organizations.default_widget_settings
    │   │       └─► Cache & return
    │   │
    │   └─► All else fails → Return DEFAULT_WIDGET_SETTINGS
    │
    ├─► Server: emit agent:assigned OR agent:unavailable
    │   └─► Includes widgetSettings in payload
    │
    └─► Widget: Applies settings
        ├─► Position CSS class applied
        ├─► Size CSS variables set
        ├─► Theme class applied
        ├─► Device visibility check (shouldHideForDevice)
        ├─► Trigger delay timer started
        └─► Auto-hide timer started (if enabled)
```

### Caching Strategy
| Cache | TTL (Production) | TTL (Development) | Purpose |
|-------|------------------|-------------------|---------|
| `orgSettingsCache` | 5 minutes | 10 seconds | Reduce DB queries for org defaults |
| `poolSettingsCache` | 5 minutes | 10 seconds | Reduce DB queries for pool overrides |

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Admin saves valid settings | Save button click | Settings saved to DB | ✅ | |
| 2 | Pool has custom settings | Visitor to matching URL | Pool settings used | ✅ | |
| 3 | Pool has null settings | Visitor to matching URL | Org defaults used | ✅ | |
| 4 | No pool matches visitor | Any visitor | Org defaults used | ✅ | |
| 5 | Supabase not configured | Server startup | DEFAULT_WIDGET_SETTINGS used | ✅ | Dev/test environments |
| 6 | DB query fails | Runtime | DEFAULT_WIDGET_SETTINGS used | ✅ | Graceful fallback |
| 7 | Settings changed while visitor on site | Admin saves | Existing visitors keep old settings | ✅ | Cache TTL controls refresh |
| 8 | Invalid trigger_delay value | Form submission | Validation prevents save | ✅ | Dashboard validates 0-300 |
| 9 | Invalid auto_hide_delay value | Form submission | Validation prevents save | ✅ | Dashboard validates 1-60 min |
| 10 | Mobile visitor, devices="desktop" | Visitor connects | Widget hidden (`shouldHideForDevice=true`) | ✅ | |
| 11 | Desktop visitor, devices="mobile" | Visitor connects | Widget hidden (`shouldHideForDevice=true`) | ✅ | |
| 12 | Visitor drags widget to new position | User interaction | `draggedPosition` overrides server setting | ✅ | Session only |
| 13 | Admin resets to defaults | Reset button | All settings restored to defaults | ✅ | |
| 14 | Pool custom settings disabled | Toggle off | `widget_settings` set to null | ✅ | Falls back to org defaults |
| 15 | Cache expires | TTL elapsed | Next request fetches fresh data | ✅ | |
| 16 | trigger_delay=0 | Widget appearance | Widget shows immediately | ✅ | |
| 17 | auto_hide_delay=null | Widget behavior | Widget never auto-hides | ✅ | |
| 18 | show_minimize_button=false but had call | Widget behavior | Minimize button shown anyway | ✅ | `hasHadCall` flag overrides |
| 19 | Agent becomes available after delay | Agent logs in | Remaining trigger_delay calculated | ✅ | Uses `visitorConnectedAt` |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| DB query fails | Network/DB issues | Nothing (uses defaults) | Automatic fallback |
| Invalid settings in DB | Corrupted data | Default settings applied | Admin re-saves |
| Cache inconsistency | Settings changed | Old settings for up to 5 min | Wait for cache expiry |

---

## 5. UI/UX REVIEW

### User Experience Audit

**Organization Settings (Embed Code page):**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Admin → Embed Code | Page loads with current settings | ✅ | |
| 2 | Select size option | Preview updates immediately | ✅ | |
| 3 | Select position | Preview updates immediately | ✅ | |
| 4 | Select device visibility | Preview dims hidden device | ✅ | |
| 5 | Select theme | Preview updates colors | ✅ | |
| 6 | Adjust trigger delay | Description text updates | ✅ | |
| 7 | Adjust auto-hide delay | Description text updates | ✅ | |
| 8 | Toggle minimize button | Toggle indicator changes | ✅ | |
| 9 | Click Save Changes | Button shows "Saving..." then "Saved!" | ✅ | |
| 10 | Click Reset to Defaults | All settings revert | ✅ | |

**Pool Settings Override:**
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Admin → Pools | Pool list loads | ✅ | |
| 2 | Expand pool | Widget Settings section visible | ✅ | |
| 3 | Toggle "Use custom settings" | Settings form appears | ✅ | |
| 4 | Adjust pool-specific settings | Form updates | ✅ | |
| 5 | Click Save Custom Settings | Settings saved, section collapses | ✅ | |
| 6 | Disable custom settings | Reverts to org defaults | ✅ | |

### Accessibility
- Keyboard navigation: ✅ All controls keyboard-accessible
- Screen reader support: ⚠️ Not explicitly verified
- Color contrast: ✅ Follows theme system
- Loading states: ✅ Save button shows spinner

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| DB query per visitor | In-memory cache with TTL | ✅ Mitigated |
| Cache memory growth | Per-org and per-pool Maps | ✅ Bounded by active entities |
| Settings sync delay | Cache TTL up to 5 min | ⚠️ Acceptable trade-off |

### Security
| Concern | Mitigation |
|---------|------------|
| Settings tampering | Server-side validation + RLS on tables |
| Cross-org access | Org ID verified in all queries |
| XSS in custom settings | No user-provided HTML/JS in settings |

### Reliability
| Concern | Mitigation |
|---------|------------|
| DB unavailable | DEFAULT_WIDGET_SETTINGS fallback |
| Invalid data in DB | TypeScript interfaces enforce shape |
| Cache corruption | TTL ensures eventual refresh |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - org defaults + pool overrides is intuitive
2. **Is the control intuitive?** ✅ Yes - visual preview shows changes immediately
3. **Is feedback immediate?** ✅ Yes - preview updates instantly, save shows status
4. **Is the flow reversible?** ✅ Yes - reset to defaults available
5. **Are errors recoverable?** ✅ Yes - validation prevents bad saves, fallbacks in place
6. **Is the complexity justified?** ✅ Yes - two-tier hierarchy covers most use cases

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| Cache not invalidated on save | Settings may take 5 min to apply | 🟢 Low | Could add cache invalidation API |
| No preview for all themes in pool settings | Pool settings harder to visualize | 🟢 Low | Add preview component to pool settings |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| WidgetSettings type definition | `packages/domain/src/types.ts` | 267-280 | Source of truth for settings shape |
| Server-side settings fetcher | `apps/server/src/lib/widget-settings.ts` | 1-162 | Caching + fallback logic |
| Org settings UI | `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | 1-878 | Default settings configuration |
| Pool settings UI | `apps/dashboard/src/app/(app)/admin/pools/pools-client.tsx` | 825-1366 | Pool override component |
| Widget settings consumer | `apps/widget/src/Widget.tsx` | 13-21, 153-212 | DEFAULT_WIDGET_SETTINGS + application |
| Widget size constants | `apps/widget/src/constants.ts` | 155-215 | SIZE_DIMENSIONS for each size |
| DB schema - org defaults | `supabase/migrations/20251128100000_widget_settings.sql` | 1-24 | Initial migration |
| DB schema - theme addition | `supabase/migrations/20251128500000_widget_theme.sql` | 1-34 | Added theme field |
| Settings sent to widget | `apps/server/src/features/signaling/socket-handlers.ts` | 174-188 | agent:assigned payload |

---

## 9. RELATED FEATURES
- [Routing Rules](./routing-rules.md) - How visitors are matched to pools (which determines settings)
- [Widget Lifecycle](../visitor/widget-lifecycle.md) - How widget applies settings during its lifecycle
- [Pool Management](./pool-management.md) - Where pool-level overrides are configured

---

## 10. OPEN QUESTIONS
1. **Should cache invalidation be exposed?** Currently admins must wait up to 5 minutes for changes to propagate. Could add a "clear cache" endpoint or immediate invalidation.
2. **Should pool settings support partial overrides?** Currently pool settings fully replace org defaults. A merge strategy could allow overriding only specific fields.
3. **Should there be a settings preview on the live site?** Admins can only see preview in dashboard, not on actual customer site.
4. **Is 5-minute cache TTL optimal?** Trade-off between freshness and DB load could be tuned.



