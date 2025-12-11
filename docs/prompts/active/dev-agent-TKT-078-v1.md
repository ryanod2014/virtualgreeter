# Dev Agent: TKT-078 - Add Logging for Malformed URL Routing Fallback

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-078-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-078: Add Logging for Malformed URL Routing Fallback**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-078
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-078-add-logging-for-malformed-url`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/routing/parseUrlContext.ts` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Implement required changes |

---

## What to Implement

1. Log malformed URL occurrences with context (visitor ID, URL string)
2. Add URL validation warning in dashboard when pageUrl patterns show malformed values
3. Consider adding URL validation metrics to admin stats

---

## Acceptance Criteria

- [ ] Malformed URLs are logged for debugging
- [ ] Dashboard shows warning for unusual URL patterns
- [ ] F-109 is resolved

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| (Low risk) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-078-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-078-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-078-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-078-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
