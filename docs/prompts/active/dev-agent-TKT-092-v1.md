# Dev Agent: TKT-092 - Move URL Filtering to Server-Side for Agent Stats

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-092-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-092: Move URL Filtering to Server-Side for Agent Stats**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-092
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-092-move-url-filtering-to-server-s`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Implement required changes |
| `apps/server/src/app/api/agents/[agentId]/calls/route.ts` | Implement required changes |
| `apps/dashboard/src/lib/stats/agent-stats.ts` | Implement required changes |

---

## What to Implement

1. Move URL filtering logic from client to server-side query
2. Update API endpoint to accept URL filter parameters
3. Filter calls before applying the 500 limit
4. Update client to pass URL filters to API
5. Remove client-side URL filtering logic

---

## Acceptance Criteria

- [ ] URL filtering works on full call history, not just first 500
- [ ] Agents can find calls by URL patterns regardless of total call count
- [ ] Server-side filtering performs efficiently
- [ ] F-052 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-092-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-092-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-092-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-092-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
