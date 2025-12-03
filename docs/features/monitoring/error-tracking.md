# Feature: Error Tracking (M2)

## Quick Summary
Sentry integration provides centralized error tracking, stack traces, session replay, and performance monitoring across the dashboard (Next.js) and signaling server (Node.js). The widget intentionally has no error tracking to minimize bundle size for customer site embeds.

## Affected Users
- [x] Website Visitor (indirectly — errors affecting their experience are captured)
- [x] Agent (dashboard errors captured)
- [x] Admin (dashboard errors captured)
- [x] Platform Admin (server errors captured, can view Sentry dashboard)

---

## 1. WHAT IT DOES

### Purpose
Error Tracking enables developers and platform administrators to:
- Automatically capture JavaScript errors, unhandled exceptions, and promise rejections
- View detailed stack traces with source-mapped line numbers
- Replay user sessions when errors occur to understand context
- Monitor application performance with distributed tracing
- Get alerted to new and recurring errors in production

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| Developer | Know when errors occur | Automatic capture and alerting in Sentry |
| Developer | Debug production errors | Source-mapped stack traces + session replay |
| Platform Admin | Monitor system health | Performance traces and error dashboards |
| Developer | Understand error context | Breadcrumbs, user context, and session replay |

---

## 2. HOW IT WORKS

### High-Level Flow (Happy Path)
1. Error occurs in dashboard (client/server/edge) or signaling server
2. Sentry SDK captures error with context (stack trace, breadcrumbs, user info)
3. SDK batches and sends error to Sentry backend
4. Sentry processes error, symbolizes stack traces using uploaded source maps
5. Error appears in Sentry dashboard with full context
6. If configured, alerts fire via email/Slack/PagerDuty

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GHOST-GREETER SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DASHBOARD (Next.js)                          │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐   │   │
│  │  │ Browser Client  │  │   Server (SSR)   │  │  Edge (Middleware)│   │   │
│  │  │                 │  │                 │  │                  │   │   │
│  │  │ @sentry/nextjs  │  │ @sentry/nextjs  │  │ @sentry/nextjs   │   │   │
│  │  │ + Session Replay│  │                 │  │                  │   │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘   │   │
│  │           │                    │                    │             │   │
│  └───────────┼────────────────────┼────────────────────┼─────────────┘   │
│              │                    │                    │                  │
│              ▼                    ▼                    ▼                  │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                         SENTRY CLOUD                              │   │
│  │                                                                   │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │   │
│  │   │  Errors  │  │  Traces  │  │ Sessions │  │ Source Maps  │    │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│              ▲                                                            │
│              │                                                            │
│  ┌───────────┴────────────────────────────────────────────────────────┐  │
│  │                   SIGNALING SERVER (Node.js)                        │  │
│  │                                                                     │  │
│  │                       @sentry/node                                  │  │
│  │           + uncaughtException / unhandledRejection handlers         │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        WIDGET (Preact)                              │   │
│  │                                                                     │   │
│  │                   ❌ NO SENTRY INTEGRATION                          │   │
│  │              (Intentional - keeps bundle minimal)                   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Sentry Package | Config File | What It Captures |
|-----------|---------------|-------------|------------------|
| Dashboard Client | `@sentry/nextjs` | `sentry.client.config.ts` | Browser errors, user interactions, session replay |
| Dashboard Server | `@sentry/nextjs` | `sentry.server.config.ts` | SSR errors, API route errors |
| Dashboard Edge | `@sentry/nextjs` | `sentry.edge.config.ts` | Middleware errors |
| Signaling Server | `@sentry/node` | inline in `index.ts` | WebSocket errors, unhandled exceptions |
| Widget | None | N/A | ❌ Not captured (by design) |

---

## 3. DETAILED LOGIC

### Triggers & Events

| Event/Trigger | Where It Fires | What It Does | Side Effects |
|--------------|---------------|--------------|--------------|
| JavaScript Error | Dashboard Browser | Auto-captured by Sentry client SDK | Sent to Sentry + Session Replay triggered |
| Unhandled Promise Rejection | Dashboard Browser | Auto-captured | Sent to Sentry |
| Server-Side Error | Dashboard Server | Captured via instrumentation | Sent to Sentry |
| API Route Error | Dashboard Server | Captured via `captureRequestError` | Request context attached |
| Middleware Error | Dashboard Edge | Captured via edge config | Sent to Sentry |
| Uncaught Exception | Signaling Server | `process.on('uncaughtException')` | Logged + sent to Sentry |
| Unhandled Rejection | Signaling Server | `process.on('unhandledRejection')` | Logged + sent to Sentry |

### Key Functions/Components

| Function/Component | File | Purpose |
|-------------------|------|---------|
| `Sentry.init()` | `sentry.client.config.ts` | Initialize browser SDK with replay |
| `Sentry.init()` | `sentry.server.config.ts` | Initialize Node SDK for SSR |
| `Sentry.init()` | `sentry.edge.config.ts` | Initialize SDK for Edge Runtime |
| `Sentry.init()` | `apps/server/src/index.ts` | Initialize SDK for signaling server |
| `register()` | `instrumentation.ts` | Next.js hook to load correct config |
| `onRequestError` | `instrumentation.ts` | Capture API/page request errors |
| `Sentry.captureException()` | `apps/server/src/index.ts` | Manual error capture |
| `withSentryConfig()` | `next.config.js` | Webpack wrapper for source maps |
| `Sentry.replayIntegration()` | `sentry.client.config.ts` | Session replay on errors |

### Data Flow

```
ERROR OCCURS IN DASHBOARD BROWSER
    │
    ├─► Sentry SDK intercepts via window.onerror / Promise rejection
    │
    ├─► SDK collects context:
    │   ├─► Stack trace (unminified via source maps)
    │   ├─► Breadcrumbs (recent user actions, console logs, network)
    │   ├─► User agent, browser, OS
    │   └─► Session replay buffer (if replaysOnErrorSampleRate triggered)
    │
    ├─► SDK batches and sends to Sentry:
    │   ├─► POST https://sentry.io/api/{project_id}/envelope/
    │   └─► Includes DSN for authentication
    │
    └─► Sentry processes:
        ├─► Symbolicate stack traces using uploaded source maps
        ├─► Group similar errors (fingerprinting)
        ├─► Store session replay if captured
        └─► Trigger alerts if configured

ERROR OCCURS IN SIGNALING SERVER
    │
    ├─► process.on('uncaughtException') OR process.on('unhandledRejection')
    │
    ├─► console.error() logs locally
    │
    ├─► Sentry.captureException(error) sends to Sentry
    │
    └─► Sentry processes with environment: "production" | "development"
```

---

## 4. EDGE CASES

### Complete Scenario Matrix

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Dashboard browser error | JS exception | Captured with stack trace + replay | ✅ | |
| 2 | Dashboard SSR error | Server exception | Captured via server config | ✅ | |
| 3 | Dashboard middleware error | Edge exception | Captured via edge config | ✅ | |
| 4 | Signaling server crash | Uncaught exception | Captured + logged before exit | ✅ | |
| 5 | Server promise rejection | Unhandled rejection | Captured + logged | ✅ | |
| 6 | Widget error on customer site | JS exception | ❌ NOT captured | ✅ | By design |
| 7 | Error during WebRTC | Peer connection fail | Dashboard side captured only | ⚠️ | Widget errors lost |
| 8 | Network timeout to Sentry | No connectivity | Events queued in browser, lost on server | ⚠️ | No offline queue on server |
| 9 | High error volume | Thousands of errors | All sent (no rate limiting configured) | ⚠️ | Could hit Sentry quota |
| 10 | Sentry DSN not configured | Missing env var | SDK initialized but silent | ✅ | Graceful fallback |
| 11 | Source map upload fails | CI build issue | Errors show minified stack | ⚠️ | Build continues |
| 12 | Sensitive data in error | PII in exception message | Sent to Sentry as-is | ⚠️ | No scrubbing configured |
| 13 | Session replay captures form | User types password | Text masked (maskAllText: true) | ✅ | Privacy protected |
| 14 | Error in development | Local testing | Captured with env: "development" | ✅ | Can filter in Sentry |

### Error States

| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| Sentry SDK load failure | Network block (ad blocker) | Nothing - silent fail | App continues normally |
| Invalid DSN | Misconfigured env var | Console warning | Fix env var |
| Quota exceeded | Too many events | Events dropped by Sentry | Upgrade plan or reduce sample rate |
| Source map mismatch | Version drift | Incorrect line numbers | Re-deploy with fresh build |

---

## 5. UI/UX REVIEW

### User Experience Audit

Error tracking is invisible to end users. This audit covers the developer experience:

| Step | Developer Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| 1 | Configure SENTRY_DSN | SDK initializes | ✅ | Console log confirms |
| 2 | Trigger error | Error appears in Sentry | ✅ | ~1-2 second delay |
| 3 | View stack trace | Source-mapped lines shown | ✅ | If source maps uploaded |
| 4 | Watch session replay | See user actions before error | ✅ | 10% baseline, 100% on error |
| 5 | Find error in logs | Search by error message | ✅ | Standard Sentry UI |

### Accessibility
- N/A - Error tracking has no user-facing UI

---

## 6. TECHNICAL CONCERNS

### Performance

| Concern | Implementation | Status |
|---------|----------------|--------|
| Bundle size impact | Tree-shaking enabled (`disableLogger: true`) | ✅ Optimized |
| Session replay overhead | 10% baseline sample rate, 100% on error | ✅ Balanced |
| Source map upload time | Only in CI builds (`silent: !process.env.CI`) | ✅ No local slowdown |
| Network requests | Batched, async, non-blocking | ✅ Minimal impact |

### Security

| Concern | Mitigation |
|---------|------------|
| Source map exposure | `hideSourceMaps: true` - not served to clients |
| Sensitive data in errors | ⚠️ No automatic scrubbing configured |
| Session replay privacy | `maskAllText: true`, `blockAllMedia: true` |
| DSN exposure | Public DSN is safe - only allows sending, not reading |

### Reliability

| Concern | Mitigation |
|---------|------------|
| Sentry unavailable | Browser SDK queues events; server SDK drops |
| SDK initialization failure | App continues without error tracking |
| High error volume | No client-side rate limiting (relies on Sentry quotas) |

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?

1. **Is the mental model clear?** ✅ Yes - Errors go to Sentry, developers view in dashboard
2. **Is the control intuitive?** ✅ Yes - Just set DSN env var to enable
3. **Is feedback immediate?** ✅ Yes - Server logs confirmation on startup
4. **Is the flow reversible?** ✅ Yes - Remove DSN to disable
5. **Are errors recoverable?** ✅ Yes - SDK failures don't crash app
6. **Is the complexity justified?** ✅ Yes - Essential for production debugging

### Identified Issues

| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| No sensitive data scrubbing | PII may leak to Sentry | 🟡 Medium | Add `beforeSend` filter |
| Widget has no error tracking | Customer-site errors invisible | 🟡 Medium | Accept as design choice |
| 100% trace sample rate | High Sentry costs | 🟢 Low | Reduce to 10-20% in prod |
| No server-side event queuing | Events lost if Sentry unreachable | 🟢 Low | Add retry logic |

---

## 8. CODE REFERENCES

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Dashboard client Sentry init | `apps/dashboard/sentry.client.config.ts` | 1-31 | Replay integration |
| Dashboard server Sentry init | `apps/dashboard/sentry.server.config.ts` | 1-19 | SSR errors |
| Dashboard edge Sentry init | `apps/dashboard/sentry.edge.config.ts` | 1-17 | Middleware errors |
| Next.js instrumentation | `apps/dashboard/instrumentation.ts` | 1-15 | Loads correct config |
| Sentry webpack config | `apps/dashboard/next.config.js` | 33-71 | Source maps, annotations |
| Server Sentry init | `apps/server/src/index.ts` | 43-51 | Conditional on DSN |
| Global error handlers | `apps/server/src/index.ts` | 514-523 | uncaughtException + unhandledRejection |
| Dashboard env example | `apps/dashboard/env.example` | 68-74 | Sentry env vars |
| Server env example | `apps/server/env.example` | 60-63 | Server Sentry DSN |

---

## 9. RELATED FEATURES

- [Uptime Monitoring (M1)](./UPTIME_MONITORING.md) - External uptime checks (separate from error tracking)
- [Call Lifecycle (P3)](../platform/call-lifecycle.md) - Errors during calls captured by server Sentry

---

## 10. OPEN QUESTIONS

1. **Should widget have error tracking?** Current decision is no (bundle size), but customer-site errors are invisible. Could use a lightweight error boundary that POSTs to server.

2. **What sensitive data scrubbing is needed?** Currently no `beforeSend` filter. Should review what PII could appear in error messages (emails, names, etc.).

3. **Is 100% tracesSampleRate sustainable?** For production at scale, 100% sampling could hit Sentry quotas. Consider reducing to 10-20%.

4. **Should server have offline event queue?** Currently server errors are lost if Sentry is unreachable. Could buffer to disk or Redis.

5. **Are Sentry alerts configured?** The code shows SDK setup but alert rules are configured in Sentry UI - not documented here what rules exist.

---

## Configuration Reference

### Dashboard Environment Variables

```bash
# Required for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Required for source map uploads (build time)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=ghost-greeter-dashboard
```

### Server Environment Variables

```bash
# Required for error tracking
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### Sample Rates Summary

| Setting | Dashboard Client | Dashboard Server | Dashboard Edge | Signaling Server |
|---------|-----------------|-----------------|----------------|------------------|
| `tracesSampleRate` | 100% | 100% | 100% | 100% |
| `replaysSessionSampleRate` | 10% | N/A | N/A | N/A |
| `replaysOnErrorSampleRate` | 100% | N/A | N/A | N/A |

### Privacy Settings (Session Replay)

| Setting | Value | Effect |
|---------|-------|--------|
| `maskAllText` | `true` | All text replaced with asterisks in replay |
| `blockAllMedia` | `true` | Images/videos replaced with placeholders |



