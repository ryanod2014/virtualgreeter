# Doc Agent: M2 - Error Tracking

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-M2.md`

---

You are a Documentation Agent. Your job is to document **M2: Error Tracking** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** M2
**Feature Name:** Error Tracking
**Category:** monitoring
**Output File:** `docs/features/monitoring/error-tracking.md`

---

## Feature Description

Sentry integration for error tracking across dashboard, widget, and server. Captures errors, stack traces, user context, and enables debugging.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/sentry.client.config.ts` | Dashboard client Sentry config |
| `apps/dashboard/sentry.server.config.ts` | Dashboard server Sentry config |
| `apps/widget/src/sentry.ts` | Widget Sentry setup |
| `apps/server/src/sentry.ts` | Server Sentry setup |
| `apps/dashboard/next.config.mjs` | Sentry Next.js integration |
| `turbo.json` or `package.json` | Sentry environment variables |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What errors are captured by Sentry?
2. What user context is attached to errors?
3. How are source maps handled?
4. What is the error filtering/sampling strategy?
5. How are breadcrumbs configured?
6. What environment separation exists (dev/staging/prod)?
7. How are performance traces configured?
8. What sensitive data is scrubbed?
9. How are release versions tracked?
10. What alert rules are configured in Sentry?

---

## Specific Edge Cases to Document

- Error in widget on customer site
- Server error with sensitive data
- Error during WebRTC connection
- Source map lookup failure
- High error volume rate limiting
- Error in auth middleware
- Client-side network errors
- Unhandled promise rejections

---

## Output Requirements

1. Create: `docs/features/monitoring/error-tracking.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

