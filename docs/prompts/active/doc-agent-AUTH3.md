# Doc Agent: AUTH3 - Invite Accept

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-AUTH3.md`

---

You are a Documentation Agent. Your job is to document **AUTH3: Invite Accept** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** AUTH3
**Feature Name:** Invite Accept
**Category:** auth
**Output File:** `docs/features/auth/invite-accept.md`

---

## Feature Description

Agent invitation acceptance flow including invite link validation, account creation, and joining an organization as a new agent.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/accept-invite/page.tsx` | Accept invite page |
| `apps/dashboard/src/app/accept-invite/[token]/page.tsx` | Token-based invite page |
| `apps/dashboard/src/app/api/invites/accept/route.ts` | Accept invite API |
| `apps/server/src/features/invites/invite-validator.ts` | Invite validation |
| `apps/server/src/db/schema/invites.ts` | Invites schema |
| `apps/server/src/features/agents/agent-creation.ts` | Agent account creation |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What does the invite email contain?
2. What happens when the invite link is clicked?
3. How is the invite token validated?
4. What information is collected from the new agent?
5. How is the agent account created?
6. What organization do they join?
7. What permissions do they have by default?
8. What happens if the invite has expired?
9. Can an existing user accept an invite?
10. What welcome flow follows acceptance?

---

## Specific Edge Cases to Document

- Expired invite link clicked
- Already-used invite link clicked
- Email mismatch (invite sent to different email)
- User already has account with different org
- Invite accepted but agent at seat limit
- Invite link clicked while logged in as different user
- Multiple pending invites for same email
- Invite revoked after link sent but before acceptance

---

## Output Requirements

1. Create: `docs/features/auth/invite-accept.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

