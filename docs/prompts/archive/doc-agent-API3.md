# Doc Agent: API3 - Invites API

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-API3.md`

---

You are a Documentation Agent. Your job is to document **API3: Invites API** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** API3
**Feature Name:** Invites API
**Category:** api
**Output File:** `docs/features/api/invites-api.md`

---

## Feature Description

REST API endpoints for agent invitations including send, list, revoke, and resend functionality.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/invites/route.ts` | Invite list/create endpoints |
| `apps/dashboard/src/app/api/invites/[id]/route.ts` | Invite get/revoke |
| `apps/dashboard/src/app/api/invites/accept/route.ts` | Accept invite endpoint |
| `apps/dashboard/src/app/api/invites/resend/route.ts` | Resend invite email |
| `apps/server/src/features/invites/invite-service.ts` | Invite business logic |
| `apps/server/src/db/schema/invites.ts` | Invites schema |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What invite endpoints exist?
2. What data is required to create an invite?
3. How is the invite email sent?
4. What is the invite expiration policy?
5. How is invite status tracked?
6. What permissions control invite management?
7. How does resend work?
8. What happens on revoke?
9. How are duplicate invites prevented?
10. What invitation limits exist?

---

## Specific Edge Cases to Document

- Invite to already-registered email
- Revoke invite after acceptance
- Resend expired invite
- Create invite at seat limit
- Multiple invites to same email
- Invite with invalid email format
- List invites with filter for pending only
- Invite creation during billing pause

---

## Output Requirements

1. Create: `docs/features/api/invites-api.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

