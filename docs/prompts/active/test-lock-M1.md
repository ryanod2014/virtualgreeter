# TEST LOCK Agent: M1

> **Feature:** Uptime Monitoring
> **Priority:** Medium
> **Doc:** `docs/features/monitoring/UPTIME_MONITORING.md`

---

## Your Task

Lock in current behavior for all code in the Uptime Monitoring feature by writing behavior-level tests.

---

## Feature Overview

Uptime Monitoring is configured via external service (Better Uptime) to monitor endpoint health. This is primarily documentation/configuration, not code.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/server/src/lib/health.ts` | Health check endpoint | High |

---

## Behaviors to Capture

### health.ts

| Function | Behaviors to Test |
|----------|-------------------|
| Health endpoint | 1. Returns 200 when healthy, 2. Includes version/timestamp, 3. Includes dependency status if checked |

---

## Note

This feature is primarily external configuration (Better Uptime). Focus on the health check endpoint that monitoring hits.

---

## Output

- `apps/server/src/lib/health.test.ts`
- Completion report: `docs/agent-output/test-lock/M1-[TIMESTAMP].md`






