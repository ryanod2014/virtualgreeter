# Doc Agent: API1 - Agent API

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-API1.md`

---

You are a Documentation Agent. Your job is to document **API1: Agent API** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** API1
**Feature Name:** Agent API
**Category:** api
**Output File:** `docs/features/api/agent-api.md`

---

## Feature Description

REST API endpoints for agent CRUD operations including list, create, update, delete, and status management.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/agents/route.ts` | Agent list/create endpoints |
| `apps/dashboard/src/app/api/agents/[id]/route.ts` | Agent get/update/delete |
| `apps/server/src/features/agents/agent-repository.ts` | Agent data operations |
| `apps/server/src/features/agents/agent-service.ts` | Agent business logic |
| `apps/server/src/db/schema/agents.ts` | Agent schema |
| `apps/dashboard/src/lib/api/agents.ts` | Client-side API helpers |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What endpoints exist for agents?
2. What request/response formats are used?
3. What authentication is required?
4. What validation is performed?
5. What permissions are enforced?
6. How is pagination handled?
7. What filters are available on list?
8. How are soft vs hard deletes handled?
9. What triggers are fired on CRUD operations?
10. How do pool assignments work?

---

## Specific Edge Cases to Document

- Create agent at seat limit
- Delete agent with active calls
- Update agent currently in call
- List agents with no results
- Invalid agent ID format
- Unauthorized API access attempt
- Concurrent updates to same agent
- Agent status change validation

---

## Output Requirements

1. Create: `docs/features/api/agent-api.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

