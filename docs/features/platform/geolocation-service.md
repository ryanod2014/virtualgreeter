# Feature: Geolocation Service (SVC1)

## Quick Summary
Server-side geolocation service that resolves visitor IP addresses to location data (city, region, country), enables country-based access control (blocklist/allowlist), and provides location context for analytics and routing decisions.

## Affected Users
- [x] Website Visitor
- [ ] Agent
- [x] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
The Geolocation Service provides two key capabilities:
1. **IP Resolution**: Converts visitor IP addresses into human-readable location data (city, region, country)
2. **Country Blocking**: Enforces geographic access control by blocking or allowing visitors based on their country

This enables organizations to:
- Block traffic from specific countries (spam/fraud prevention)
- Allow only specific countries (geo-restricted services)
- Provide location context to agents during calls
- Enrich analytics with geographic data

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Admin | Block visitors from specific countries | Blocklist mode prevents connections from selected country codes |
| Admin | Allow only visitors from certain countries | Allowlist mode restricts access to selected countries only |
| Agent | Know where visitors are calling from | Location displayed on incoming call modal |
| Visitor | Not be blocked incorrectly | Caching and lenient unknown-country handling prevent false blocks |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Visitor connects to signaling server via WebSocket
2. Server extracts client IP from socket handshake (handling proxy headers)
3. Server checks in-memory cache for existing location lookup
4. If cache miss, server queries ip-api.com with the IP address
5. Server receives location data (city, region, country, countryCode)
6. Server caches result for 1 hour
7. Server checks if visitor's countryCode is blocked for this org
8. If blocked → Silent disconnect (visitor doesn't see widget)
9. If allowed → Register visitor, store location in session

### State Machine

```
VISITOR CONNECTS
    │
    ├─► Extract IP from handshake
    │   ├─► Check x-forwarded-for header (proxy/load balancer)
    │   ├─► Check x-real-ip header (nginx)
    │   └─► Fall back to socket.address
    │
    ├─► Check if Private IP?
    │   ├─► YES → Skip geolocation (return null)
    │   └─► NO → Continue
    │
    ├─► Check Location Cache
    │   ├─► HIT & NOT EXPIRED → Use cached location
    │   └─► MISS/EXPIRED → Query ip-api.com
    │
    ├─► Query ip-api.com
    │   ├─► SUCCESS → Cache result (1 hour TTL)
    │   └─► FAILURE → Cache null (1 hour TTL), continue with null location
    │
    └─► Check Country Blocklist
        ├─► BLOCKLIST MODE
        │   ├─► Country in list → BLOCK (disconnect)
        │   ├─► Country NOT in list → ALLOW
        │   └─► Unknown country → ALLOW
        │
        └─► ALLOWLIST MODE
            ├─► Country in list → ALLOW
            ├─► Country NOT in list → BLOCK (disconnect)
            └─► Unknown country → BLOCK (disconnect)
```

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| `cache_check` | Checking local cache for IP | IP received | Cache hit or miss |
| `api_lookup` | Querying ip-api.com | Cache miss | Response received or error |
| `country_check` | Evaluating blocklist/allowlist | Location resolved (or null) | Allow or block decision |
| `allowed` | Visitor proceeds to registration | Passed country check | N/A |
| `blocked` | Visitor disconnected silently | Failed country check | N/A |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| `visitor:join` | Widget → Server | Triggers geolocation lookup | IP extracted, location resolved |
| Cache hit | `getLocationFromIP()` | Returns cached location | No API call |
| Cache miss | `getLocationFromIP()` | Calls ip-api.com | Network request, cache write |
| API success | ip-api.com response | Returns location object | Result cached |
| API failure | ip-api.com error | Returns null | Null cached to prevent retry storm |
| Country blocked | `isCountryBlocked()` | Socket disconnected | Visitor never sees widget |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| `getLocationFromIP` | `apps/server/src/lib/geolocation.ts` | Main IP-to-location resolver |
| `getClientIP` | `apps/server/src/lib/geolocation.ts` | Extract real IP from handshake with proxy support |
| `isPrivateIP` | `apps/server/src/lib/geolocation.ts` | Skip localhost/private ranges |
| `getCountryListSettings` | `apps/server/src/lib/country-blocklist.ts` | Fetch org's country list config |
| `isCountryBlocked` | `apps/server/src/lib/country-blocklist.ts` | Evaluate if country should be blocked |
| `clearBlocklistCache` | `apps/server/src/lib/country-blocklist.ts` | Clear cache when admin updates settings |
| `VISITOR_JOIN` handler | `apps/server/src/features/signaling/socket-handlers.ts` | Orchestrates geolocation + blocking |

### Data Flow

```
VISITOR_JOIN EVENT
    │
    ├─► getClientIP(socket.handshake)
    │   │
    │   ├─► headers["x-forwarded-for"] exists?
    │   │   └─► YES: Extract first IP from comma-separated list
    │   │
    │   ├─► headers["x-real-ip"] exists?
    │   │   └─► YES: Use that IP
    │   │
    │   └─► Fall back to socket.handshake.address
    │
    ├─► getLocationFromIP(ipAddress)
    │   │
    │   ├─► locationCache.get(ip)
    │   │   └─► Cache hit & not expired? → Return cached.location
    │   │
    │   ├─► isPrivateIP(ip)?
    │   │   └─► YES: Log, return null
    │   │
    │   ├─► fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode`)
    │   │
    │   ├─► Response OK?
    │   │   ├─► NO: Log error, return null
    │   │   └─► YES: Continue
    │   │
    │   ├─► data.status === "success"?
    │   │   ├─► NO: Cache null, return null
    │   │   └─► YES: Build location object
    │   │
    │   └─► Cache result with 1-hour TTL, return location
    │
    ├─► isCountryBlocked(orgId, countryCode)
    │   │
    │   ├─► getCountryListSettings(orgId)
    │   │   ├─► Check countryListCache for org
    │   │   ├─► Cache miss: Query supabase organizations table
    │   │   └─► Return { countries: string[], mode: "blocklist" | "allowlist" }
    │   │
    │   ├─► Empty countries list? → Return false (allow all)
    │   │
    │   ├─► countryCode is null (geolocation failed)?
    │   │   ├─► ALLOWLIST mode: Return true (block unknown)
    │   │   └─► BLOCKLIST mode: Return false (allow unknown)
    │   │
    │   └─► Check if countryCode in countries (case-insensitive)
    │       ├─► ALLOWLIST mode: Return !isInList (block if NOT in list)
    │       └─► BLOCKLIST mode: Return isInList (block if IN list)
    │
    └─► countryBlocked?
        ├─► YES: socket.disconnect(true) - Silent, no error message
        └─► NO: Continue with registration, store location in VisitorSession
```

---

## 4. EDGE CASES

### Complete Scenario Matrix
| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Public IP with successful lookup | Normal visitor | Location resolved, stored | ✅ | Happy path |
| 2 | Localhost (127.0.0.1) | Dev environment | Returns null, skips API call | ✅ | Proper dev handling |
| 3 | IPv6 localhost (::1) | IPv6 local | Returns null, skips API call | ✅ | |
| 4 | IPv4-mapped IPv6 localhost (::ffff:127.0.0.1) | Mixed env | Returns null, skips API call | ✅ | |
| 5 | Private IP (10.x.x.x) | Internal network | Returns null, skips API call | ✅ | |
| 6 | Private IP (192.168.x.x) | Internal network | Returns null, skips API call | ✅ | |
| 7 | Private IP (172.16-31.x.x) | Docker/internal | Returns null, skips API call | ✅ | All 172.16-31 covered |
| 8 | VPN with public IP | VPN user | Resolves to VPN exit node location | ⚠️ | IP-based geo limitation |
| 9 | Proxy with x-forwarded-for | Behind CDN/LB | First IP in chain extracted | ✅ | Trusts proxy header |
| 10 | Nginx with x-real-ip | nginx reverse proxy | Uses x-real-ip | ✅ | nginx compatible |
| 11 | Multiple IPs in x-forwarded-for | Multi-hop proxy | Uses first (original client) IP | ✅ | |
| 12 | API rate limit exceeded (HTTP 429) | High traffic burst | Returns null, logs error | ✅ | Graceful degradation |
| 13 | API network error | ip-api.com down | Returns null, logs error | ✅ | Best-effort design |
| 14 | API returns "fail" status | Reserved/invalid IP | Caches null, returns null | ✅ | Prevents retry storm |
| 15 | Country in blocklist | Blocked country visitor | Silent disconnect | ✅ | No error revealed |
| 16 | Country NOT in allowlist | Non-allowed country | Silent disconnect | ✅ | |
| 17 | Unknown country + blocklist mode | Geolocation failed | Allowed through | ✅ | Lenient for blocklist |
| 18 | Unknown country + allowlist mode | Geolocation failed | Blocked | ✅ | Strict for allowlist |
| 19 | Empty blocklist | No countries blocked | All countries allowed | ✅ | |
| 20 | Empty allowlist | No countries in allowlist | All countries allowed | ⚠️ | Lenient, could block all |
| 21 | Case mismatch (us vs US) | Admin typo | Case-insensitive match | ✅ | Uppercase normalization |
| 22 | Repeated lookups same IP | Multiple visitors | Cache hit, no API call | ✅ | 1-hour cache TTL |
| 23 | Cache entry expired | After 1 hour | New API call | ✅ | |
| 24 | Country list updated by admin | Settings change | Need manual cache clear | ⚠️ | `clearBlocklistCache()` exists |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| API rate limit | >45 req/min sustained | Nothing (location null) | Auto-recovers, visitor allowed (blocklist mode) |
| Network timeout | ip-api.com unreachable | Nothing (location null) | Auto-recovers on retry |
| Invalid IP format | Malformed address | Nothing (location null) | Visitor allowed (blocklist mode) |
| Supabase error | Can't fetch blocklist | All countries allowed | Logs warning, fails open |
| Country blocked | Visitor from blocked country | Widget never appears | Contact org, use VPN, or wait |

---

## 5. UI/UX REVIEW

### User Experience Audit
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Visitor loads page | IP extracted silently | ✅ | No visible latency |
| 2 | Geolocation lookup | Background async call | ✅ | Non-blocking |
| 3 | If blocked | Silent disconnect | ✅ | Intentionally no error shown |
| 4 | If allowed | Widget appears normally | ✅ | Seamless |
| 5 | Agent sees location | Displayed on incoming call | ✅ | City, Region, Country shown |

### Admin Experience
| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Navigate to Blocklist Settings | Shows current countries | ✅ | |
| 2 | Toggle blocklist/allowlist mode | Mode saved to DB | ✅ | Clear labels |
| 3 | Add/remove countries | Countries saved | ✅ | Multi-select UI |
| 4 | Save changes | Cache cleared for org | ⚠️ | May need server restart for immediate effect |

### Accessibility
- Keyboard navigation: N/A (backend service)
- Screen reader support: N/A (backend service)
- Color contrast: N/A (backend service)
- Loading states: ✅ Geolocation is async, non-blocking

---

## 6. TECHNICAL CONCERNS

### Performance
| Concern | Implementation | Status |
|---------|----------------|--------|
| API rate limits (45 req/min) | 1-hour cache per IP | ✅ Mitigated |
| Latency on cache miss | ~100-300ms for API call | ⚠️ Acceptable |
| Memory usage | Map-based cache, grows with unique IPs | ⚠️ No eviction policy |
| Database calls for blocklist | 60s (dev) / 5min (prod) cache | ✅ Minimal DB load |

### Security
| Concern | Mitigation |
|---------|------------|
| IP spoofing via headers | Trusts x-forwarded-for (assumes trusted proxy) |
| Revealing geo-blocking to blocked users | Silent disconnect, no error message |
| VPN/proxy bypass | Known limitation of IP-based geolocation |
| Rate limiting from single IP | Cache prevents repeated lookups |

### Reliability
| Concern | Mitigation |
|---------|------------|
| ip-api.com downtime | Graceful degradation - returns null, visitor allowed (blocklist mode) |
| Cache invalidation | `clearBlocklistCache(orgId)` and `clearAllBlocklistCaches()` available |
| Server restart | In-memory caches cleared, will rebuild from API/DB |
| IPv6 support | Partial - localhost handled, public IPv6 goes to API |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
1. **Is the mental model clear?** ✅ Yes - IP → Location → Allow/Block is straightforward
2. **Is the control intuitive?** ✅ Yes - Blocklist blocks selected, allowlist allows selected
3. **Is feedback immediate?** ⚠️ Mostly - Blocked visitors get no feedback (by design)
4. **Is the flow reversible?** ✅ Yes - Admin can change blocklist/allowlist anytime
5. **Are errors recoverable?** ✅ Yes - Fails open in blocklist mode (safest default)
6. **Is the complexity justified?** ✅ Yes - Two modes cover most business needs

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No cache eviction policy | Memory grows unbounded over time | 🟡 Medium | Add LRU or max-size limit |
| VPN/proxy bypasses blocking | Users can circumvent blocks | 🟢 Low | Known IP geo limitation |
| Empty allowlist allows all | Counterintuitive for strict mode | 🟡 Medium | Consider blocking all if empty |
| No manual location override | Can't correct wrong geolocation | 🟢 Low | Add admin override in future |
| Cache not shared across servers | Horizontal scaling = more API calls | 🟡 Medium | Use Redis for shared cache |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main geolocation function | `apps/server/src/lib/geolocation.ts` | 21-67 | `getLocationFromIP()` |
| IP extraction from handshake | `apps/server/src/lib/geolocation.ts` | 109-130 | `getClientIP()` |
| Private IP detection | `apps/server/src/lib/geolocation.ts` | 72-105 | `isPrivateIP()` |
| Location cache definition | `apps/server/src/lib/geolocation.ts` | 4-5 | 1-hour TTL Map |
| ip-api.com response type | `apps/server/src/lib/geolocation.ts` | 8-15 | `IPApiResponse` interface |
| Country list settings fetch | `apps/server/src/lib/country-blocklist.ts` | 29-71 | `getCountryListSettings()` |
| Country blocked check | `apps/server/src/lib/country-blocklist.ts` | 91-132 | `isCountryBlocked()` |
| Blocklist cache definition | `apps/server/src/lib/country-blocklist.ts` | 20-21 | 60s/5min TTL by env |
| Cache clear functions | `apps/server/src/lib/country-blocklist.ts` | 137-146 | `clearBlocklistCache()` |
| VISITOR_JOIN handler | `apps/server/src/features/signaling/socket-handlers.ts` | 97-209 | Geo check integration |
| Blocking disconnect logic | `apps/server/src/features/signaling/socket-handlers.ts` | 134-139 | Silent disconnect |
| VisitorLocation type | `packages/domain/src/types.ts` | 49-55 | Shared type definition |
| VisitorSession with location | `packages/domain/src/types.ts` | 58-70 | Location in session |

---

## 9. RELATED FEATURES
- [Widget Lifecycle (V1)](../visitor/widget-lifecycle.md) - When geolocation is triggered
- [Call Lifecycle (P3)](./call-lifecycle.md) - Location data in call logs
- [Blocklist Settings (D9)](../admin/blocklist-settings.md) - Admin UI for country management
- [Incoming Call (A2)](../agent/incoming-call.md) - Agent sees visitor location

---

## 10. OPEN QUESTIONS

1. **Should the location cache have a maximum size?** Currently unbounded Map could grow indefinitely with unique IPs. Consider LRU cache with 10K entry limit.

2. **Should failed API lookups be cached shorter?** Currently failed lookups (null) are cached for 1 hour same as successes. Could use shorter TTL (e.g., 5 minutes) to retry sooner.

3. **Is x-forwarded-for trustworthy?** Current implementation trusts the first IP in x-forwarded-for header. If not behind a trusted proxy, this could be spoofed. May need configuration option.

4. **Should IPv6 public addresses be supported explicitly?** Currently relies on ip-api.com to handle IPv6. May need testing with IPv6-only visitors.

5. **What happens when blocklist cache is stale?** Admin updates blocklist, cache serves old data for up to 5 minutes. Is this acceptable or should updates invalidate cache immediately via webhook/pubsub?

6. **Should empty allowlist block everyone?** Current behavior allows everyone when allowlist is empty. This may be counterintuitive - should it block all instead (strict interpretation)?



