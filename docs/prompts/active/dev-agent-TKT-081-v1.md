# Dev Agent: TKT-081 - Add Pagination to Agent Stats Call List

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-081-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-081: Add Pagination to Agent Stats Call List**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-081
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-081-add-pagination-to-agent-stats`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/dashboard/stats/page.tsx` | Implement required changes |
| `apps/dashboard/src/lib/stats/agent-stats.ts` | Implement required changes |
| `apps/server/src/app/api/agents/stats/route.ts` | Implement required changes |

---

## What to Implement

1. Implement pagination for call list (50-100 calls per page)
2. Add separate stats-only endpoint that calculates across ALL calls (not limited to 500)
3. Update UI to show accurate stats even when call list is paginated
4. Remove or clarify '(limit reached)' message with pagination

---

## Acceptance Criteria

- [ ] Agents can access all their calls via pagination
- [ ] Statistics are accurate across all calls regardless of pagination
- [ ] UI clearly indicates pagination state
- [ ] F-184 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-081-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-081-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-081-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-081-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
