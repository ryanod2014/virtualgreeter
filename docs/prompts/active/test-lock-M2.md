# TEST LOCK Agent: M2

> **Feature:** Error Tracking
> **Priority:** Medium
> **Doc:** `docs/features/monitoring/error-tracking.md`

---

## Your Task

Lock in current behavior for all code in the Error Tracking feature by writing behavior-level tests.

---

## Feature Overview

Error Tracking uses Sentry to capture and report errors across dashboard, widget, and server applications.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/sentry.client.config.ts` | Sentry client config | Medium |
| `apps/dashboard/sentry.server.config.ts` | Sentry server config | Medium |
| `apps/server/sentry.server.config.ts` | Server Sentry config | Medium |

---

## Behaviors to Capture

### Sentry Configuration

| Area | Behaviors to Test |
|------|-------------------|
| **Initialization** | 1. Sentry initializes with DSN, 2. Environment is set correctly, 3. Sample rate is configured |
| **Error Capture** | 4. Errors are captured to Sentry (mock) |

---

## Note

Error tracking is primarily configuration. Tests should verify config values and that Sentry.init is called with expected options.

---

## Output

- `apps/dashboard/sentry.client.config.test.ts`
- `apps/server/sentry.server.config.test.ts`
- Completion report: `docs/agent-output/test-lock/M2-[TIMESTAMP].md`



