# Doc Agent: D4 - Agent Management

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D4.md`

---

You are a Documentation Agent. Your job is to document **D4: Agent Management** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D4
**Feature Name:** Agent Management
**Category:** admin
**Output File:** `docs/features/admin/agent-management.md`

---

## Feature Description

Admin functionality to invite new agents, remove existing agents, manage seat allocation, and view agent status. Includes invite email sending and seat limit enforcement.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/admin/agents/agents-client.tsx` | Main agent management UI |
| `apps/dashboard/src/app/admin/agents/page.tsx` | Agent list page |
| `apps/dashboard/src/app/api/invites/route.ts` | Invite creation API |
| `apps/dashboard/src/app/api/agents/route.ts` | Agent CRUD operations |
| `apps/dashboard/src/app/api/agents/[id]/route.ts` | Individual agent operations |
| `apps/server/src/features/billing/seat-management.ts` | Seat limit logic |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How does an admin invite a new agent?
2. What happens when the seat limit is reached?
3. How are agent invites tracked (pending vs accepted)?
4. What information is shown in the agent list?
5. How does an admin remove an agent?
6. What happens to active calls when an agent is removed?
7. How does seat proration work when adding/removing agents?
8. What permissions control who can manage agents?
9. How are invite emails sent and tracked?
10. What happens if an invite expires?

---

## Specific Edge Cases to Document

- Admin tries to invite agent when at seat limit
- Invite sent to already-existing user
- Agent removal while agent is in active call
- Re-inviting a previously removed agent
- Multiple pending invites to same email
- Admin removes themselves (last admin)
- Invite link used after expiration
- Seat count reduced below current agent count

---

## Output Requirements

1. Create: `docs/features/admin/agent-management.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

