# Dev Agent: TKT-071 - Make Cache TTL Configurable with Monitoring

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-071-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-071: Make Cache TTL Configurable with Monitoring**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-071
**Priority:** Low
**Difficulty:** Easy
**Branch:** `agent/tkt-071-make-cache-ttl-configurable-wi`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/lib/cache.ts` | Implement required changes |
| `apps/server/src/config/env.ts` | Implement required changes |

---

## What to Implement

1. Add CACHE_TTL_SECONDS environment variable
2. Add cache hit rate metrics (log or expose via /metrics)
3. Document TTL tuning guidelines

---

## Acceptance Criteria

- [ ] Cache TTL is configurable via environment variable
- [ ] Cache hit rate is logged or exposed
- [ ] F-001 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-071-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-071-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-071-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-071-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
