# Doc Agent: D1 - Pool Management

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D1.md`

---

You are a Documentation Agent. Your job is to document **D1: Pool Management** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/admin/routing-rules.md`

---

## Your Assignment

**Feature ID:** D1
**Feature Name:** Pool Management
**Category:** admin
**Output File:** `docs/features/admin/pool-management.md`

---

## Feature Description

The admin interface for creating, editing, and deleting visitor pools. Pools are containers that group agents and routing rules together.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/admin/pools/page.tsx` | Pool list page |
| `apps/dashboard/src/app/(app)/admin/pools/pools-client.tsx` | Main pool management UI |
| `apps/dashboard/src/app/(app)/admin/pools/[poolId]/page.tsx` | Pool detail/edit page |
| Database: `pools` table | Pool data structure |
| Database: `pool_members` table | Agent-pool assignments |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How do admins create a new pool?
2. What fields are required/optional for a pool?
3. How is the catch-all pool different from regular pools?
4. How do admins add/remove agents from a pool?
5. What happens when a pool is deleted?
6. How does priority ordering work for pool members?
7. Can an agent be in multiple pools?
8. What validation exists (empty names, duplicate names, etc.)?

---

## Specific Edge Cases to Document

- Creating first pool vs subsequent pools
- Deleting a pool with active visitors
- Catch-all pool special rules (no routing rules allowed)
- Removing last agent from a pool
- Pool with no agents assigned
- Editing pool while visitors are assigned to it
- Duplicate pool names (if allowed/blocked)

---

## Output Requirements

1. Create: `docs/features/admin/pool-management.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/admin/routing-rules.md` for formatting (same category)

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

