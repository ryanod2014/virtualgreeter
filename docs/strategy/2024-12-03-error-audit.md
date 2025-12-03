# Strategy Report: Error Monitoring Audit
**Date:** 2024-12-03  
**Agent:** Strategy Agent 4  
**Focus:** Error Handling & Silent Failures

## TL;DR for PM (Pre-Triaged)

🔴 **URGENT:** None - system has solid error foundations

🟡 **IMPORTANT:**
- Silent fire-and-forget operations (analytics, pageviews, retargeting) - 15+ locations swallow errors
- Widget has no error reporting to Sentry - user-facing errors never reach monitoring
- Missing error boundaries on most dashboard pages - only 2 of ~30 pages have them
- WebRTC TURN server has no health check - calls could silently fail

🟢 **ROUTINE:**
- API route error logs lack request context (user/org ID)
- Database operations log errors but don't report to Sentry
- Hardcoded TURN credentials (security debt)

📝 **NOTED:**
- Sentry is properly configured for server and dashboard
- Health check system is well-designed with critical/non-critical separation
- Global unhandled exception handlers are in place

## Silent Failure Analysis

| Scenario | Current Behavior | Risk Level |
|----------|------------------|------------|
| Redis disconnects mid-operation | Logged, marked unhealthy, falls back to in-memory | ✅ Low |
| Supabase is slow/down | Logged as degraded, operations return null, call continues | ✅ Low |
| Stripe webhook fails | Returns 500, logged, no retry/alert | 🟡 Medium |
| WebRTC TURN server unreachable | User sees "Connection failed", no server-side visibility | 🟡 Medium |
| Pageview tracking fails | Silently ignored - no logging | 🟡 Medium |
| Retargeting pixel fails | Silently ignored - no logging | 🟢 Low |
| Embed verification fails | Silently ignored - no logging | 🟢 Low |
| Session tracking fails | Logged, continues without tracking | ✅ Low |
| Geolocation lookup fails | Silently caught, continues without location | ✅ Low |

## Missing Error Handling

| File | Location | Issue |
|------|----------|-------|
| `apps/server/src/features/signaling/socket-handlers.ts` | Lines 111, 239, 251, 277 | `.catch(() => {})` swallows errors silently |
| `apps/server/src/features/signaling/redis-socket-handlers.ts` | Lines 121, 225, 233, 253 | `.catch(() => {})` swallows errors silently |
| `apps/widget/src/Widget.tsx` | Entire file | No Sentry integration - errors only shown via toast |
| `apps/widget/src/features/signaling/useSignaling.ts` | Lines 57-59, 83-88 | localStorage errors only warn, no tracking |
| `apps/dashboard/src/app/(app)/admin/*` | Most pages | No route-specific error boundaries |
| `apps/dashboard/src/app/(app)/dashboard/*` | Most pages except videos | No route-specific error boundaries |
| `apps/server/src/lib/call-logger.ts` | All database operations | Errors logged but not sent to Sentry |
| `apps/server/src/lib/session-tracker.ts` | All database operations | Errors logged but not sent to Sentry |

## Detailed Findings

### 1. Sentry Configuration ✅ Good
**Status:** Well implemented

The server has proper Sentry initialization with:
- Global `uncaughtException` handler (`apps/server/src/index.ts:507-509`)
- Global `unhandledRejection` handler (`apps/server/src/index.ts:512-514`)
- Environment tagging
- 100% traces sample rate

Dashboard has:
- Client config with Session Replay (`apps/dashboard/sentry.client.config.ts`)
- Server config (`apps/dashboard/sentry.server.config.ts`)
- Edge config (`apps/dashboard/sentry.edge.config.ts`)
- Global error boundary with Sentry reporting (`apps/dashboard/src/app/global-error.tsx`)

### 2. Fire-and-Forget Operations 🟡 Needs Attention
**Risk:** Medium - Silent data loss

Multiple operations use `.catch(() => {})` pattern which completely swallows errors:

```typescript
// apps/server/src/features/signaling/socket-handlers.ts:111
recordEmbedVerification(data.orgId, data.pageUrl).catch(() => {
  // Silently ignore - verification is best-effort
});

// apps/server/src/features/signaling/socket-handlers.ts:239
recordPageview({...}).catch(() => {
  // Silently ignore - pageview tracking is best-effort
});

// apps/server/src/features/signaling/socket-handlers.ts:251
trackWidgetView({...}).catch(() => {
  // Silently ignore - retargeting is best-effort
});
```

**Impact:** If these services fail systematically, we'd never know. Analytics data could be silently lost.

**Recommendation:** Log errors at WARN level even for "best-effort" operations:
```typescript
recordPageview({...}).catch((err) => {
  console.warn("[Pageview] Failed to record:", err.message);
  // Optionally: Sentry.captureException(err, { level: 'warning', tags: { operation: 'pageview' } });
});
```

### 3. Widget Error Reporting 🟡 Gap
**Risk:** Medium - No visibility into widget errors

The widget (`apps/widget/src/Widget.tsx`) catches errors and displays them to users via `ErrorToast`, but:
- No Sentry integration in widget bundle
- WebRTC errors only logged to console
- Connection failures not tracked server-side

**Impact:** User-facing issues in the widget go undetected unless reported manually.

**Recommendation:** Add lightweight error reporting to widget:
- Either use Sentry's minimal bundle for browser
- Or emit errors to signaling server which can log/report them

### 4. Missing Error Boundaries 🟡 Gap
**Risk:** Medium - Unhandled page crashes

Only 2 pages have error boundaries:
- `apps/dashboard/src/app/(app)/dashboard/videos/error.tsx`
- `apps/dashboard/src/app/(app)/admin/settings/billing/error.tsx`

Pages without error boundaries:
- `/admin` (main dashboard)
- `/admin/agents`
- `/admin/calls`
- `/admin/pools`
- `/admin/settings/organization`
- `/admin/settings/recordings`
- `/admin/sites`
- `/dashboard` (agent dashboard)
- `/dashboard/calls`
- `/dashboard/stats`
- All platform pages

**Impact:** If any of these pages throw, users see the generic global error page.

**Recommendation:** Add error boundaries to key pages, especially:
- Agent management pages (could affect operations)
- Settings pages (users expect specific error messages)
- Stats/calls pages (data loading issues are common)

### 5. WebRTC TURN Server 🟡 Blind Spot
**Risk:** Medium - Calls could fail silently

The TURN server credentials are hardcoded in `apps/widget/src/features/webrtc/useWebRTC.ts`:

```typescript
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "turn:greetnow.metered.live:80?transport=udp",
    username: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
    credential: "2y_4Rd8ZYSfsejf4FGWkHokoyuqeAi1ks2L9onnugIoW0ZlN",
  },
  // ... more TURN servers
];
```

Issues:
1. No health check for TURN server availability
2. If TURN credentials expire/change, calls silently fail
3. Users see "Connection failed" but we have no server-side visibility
4. Credentials are exposed in client-side code (security concern)

**Recommendation:**
- Add TURN server health monitoring (external ping or metered.ca API)
- Move credentials to environment variables
- Consider serving ICE configuration dynamically from server

### 6. API Error Context 🟢 Minor
**Risk:** Low - Debugging is harder

API routes log errors but without request context:

```typescript
// apps/dashboard/src/app/api/billing/create-subscription/route.ts:172
} catch (error) {
  console.error("Error creating subscription:", error);
  return NextResponse.json(
    { error: "Failed to create subscription" },
    { status: 500 }
  );
}
```

Missing:
- User ID
- Organization ID
- Request body (sanitized)
- Request headers

**Recommendation:** Create a standardized error handler:
```typescript
function logApiError(context: string, error: unknown, request: NextRequest, userId?: string) {
  console.error(`[API] ${context}:`, {
    error: error instanceof Error ? error.message : error,
    userId,
    path: request.nextUrl.pathname,
  });
  Sentry.captureException(error, {
    extra: { userId, path: request.nextUrl.pathname },
  });
}
```

### 7. Database Error Reporting 🟢 Minor
**Risk:** Low - Errors logged but not tracked

Database operations in `call-logger.ts` and `session-tracker.ts` properly log errors:

```typescript
// apps/server/src/lib/call-logger.ts:111
if (error) {
  console.error("[CallLogger] Failed to create call log:", error);
  return null;
}
```

But these aren't sent to Sentry, so:
- We'd need to check server logs to find database issues
- No aggregation/alerting on database errors

**Recommendation:** Add Sentry capture for database errors:
```typescript
if (error) {
  console.error("[CallLogger] Failed to create call log:", error);
  Sentry.captureException(error, { tags: { component: 'call-logger' } });
  return null;
}
```

## Health Check Coverage ✅

The health check system (`apps/server/src/lib/health.ts`) is well-designed:

| Component | Health Check | Critical? |
|-----------|-------------|-----------|
| Memory | ✅ Yes | Yes |
| Redis | ✅ Yes | Yes |
| Supabase | ✅ Yes | No (degraded state) |
| TURN Server | ❌ No | Should be |
| Stripe | ❌ No | Could be useful |

## Recommendations Summary

### High Priority (Should Fix Soon)
1. Add basic logging to fire-and-forget operations (5 locations in socket handlers)
2. Add error boundaries to key dashboard pages (agent management, settings)
3. Consider lightweight error reporting from widget

### Medium Priority (Plan for Next Sprint)
4. Add TURN server health monitoring
5. Move TURN credentials to environment variables
6. Add structured error logging to API routes with user context

### Low Priority (Backlog)
7. Add Sentry capture to database operation errors
8. Consider Stripe health check for billing page

## Exploration Notes

**What I examined:**
- `apps/server/src/index.ts` - Server setup, global handlers, health endpoints
- `apps/server/src/features/signaling/socket-handlers.ts` - In-memory socket handling
- `apps/server/src/features/signaling/redis-socket-handlers.ts` - Redis-backed socket handling
- `apps/server/src/lib/redis.ts` - Redis client with reconnection
- `apps/server/src/lib/call-logger.ts` - Database operations for calls
- `apps/server/src/lib/session-tracker.ts` - Agent session tracking
- `apps/server/src/lib/health.ts` - Health check system
- `apps/dashboard/src/app/global-error.tsx` - Global error boundary
- `apps/dashboard/sentry.*.config.ts` - Sentry configurations
- `apps/dashboard/src/app/api/**` - API routes
- `apps/widget/src/Widget.tsx` - Main widget component
- `apps/widget/src/features/signaling/useSignaling.ts` - Widget signaling
- `apps/widget/src/features/webrtc/useWebRTC.ts` - WebRTC implementation

**Overall Assessment:** The codebase has a solid foundation for error handling. The main gaps are visibility into "best-effort" operations and client-side error tracking in the widget. The health check system is well-designed and production-ready.

