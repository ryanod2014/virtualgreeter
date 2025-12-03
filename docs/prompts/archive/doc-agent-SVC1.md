# Doc Agent: SVC1 - Geolocation Service

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SVC1.md`

---

You are a Documentation Agent. Your job is to document **SVC1: Geolocation Service** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SVC1
**Feature Name:** Geolocation Service
**Category:** platform
**Output File:** `docs/features/platform/geolocation-service.md`

---

## Feature Description

Server-side geolocation service that determines visitor location from IP address. Used for country blocking, routing decisions, and analytics.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/server/src/lib/geolocation.ts` | Geolocation logic |
| `apps/server/src/lib/geolocation.test.ts` | Geolocation tests |
| `apps/server/src/lib/country-blocklist.ts` | Country blocking |
| `apps/server/src/features/signaling/socket-handlers.ts` | Geo usage in handlers |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What geolocation provider/database is used?
2. What data is extracted (country, region, city)?
3. How accurate is IP geolocation?
4. How is geolocation cached?
5. What happens when geolocation fails?
6. How is VPN/proxy handled?
7. Is there IPv6 support?
8. What's the performance impact?
9. How is geolocation data used in routing?
10. Is there manual location override?

---

## Specific Edge Cases to Document

- Unknown/private IP addresses
- VPN/proxy detection
- Geolocation API rate limits
- Database update frequency
- IPv4 vs IPv6 handling
- Location data accuracy issues
- Caching stale location data
- Server-side vs client-side location

---

## Output Requirements

1. Create: `docs/features/platform/geolocation-service.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

