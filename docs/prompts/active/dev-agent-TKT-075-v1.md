# Dev Agent: TKT-075 - Add Redis for Shared Cache Across Instances

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-075-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-075: Add Redis for Shared Cache Across Instances**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-075
**Priority:** Medium
**Difficulty:** Hard
**Branch:** `agent/tkt-075-add-redis-for-shared-cache-acr`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/lib/cache.ts` | Implement required changes |
| `apps/server/package.json` | Implement required changes |

---

## What to Implement

1. Add Redis client with fallback to in-memory
2. Make cache storage backend configurable via CACHE_DRIVER env var
3. Add Redis connection to health check

---

## Acceptance Criteria

- [ ] Cache can use Redis when REDIS_URL is set
- [ ] Falls back to in-memory when Redis unavailable
- [ ] F-438 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-075-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-075-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-075-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-075-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
