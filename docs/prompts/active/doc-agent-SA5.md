# Doc Agent: SA5 - Organizations Manager

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-SA5.md`

---

You are a Documentation Agent. Your job is to document **SA5: Organizations Manager** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** SA5
**Feature Name:** Organizations Manager
**Category:** superadmin
**Output File:** `docs/features/superadmin/organizations-manager.md`

---

## Feature Description

Platform-wide organization management. View all orgs, access org details, impersonate users, manage subscriptions, and handle support operations.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | Orgs manager UI |
| `apps/dashboard/src/app/(app)/platform/organizations/page.tsx` | Organizations page |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How are organizations listed?
2. What filtering/search options exist?
3. What details are shown for each org?
4. Can super admins impersonate org users?
5. What actions can be taken on orgs?
6. How is subscription status displayed?
7. Can orgs be manually modified?
8. Is there an org activity log?
9. How are problem orgs flagged?
10. What support tools are available?

---

## Specific Edge Cases to Document

- Very large number of organizations
- Org with billing issues
- Searching for specific org
- Impersonation audit trail
- Org data export
- Bulk org operations
- Org deletion/archival
- Org migration between plans

---

## Output Requirements

1. Create: `docs/features/superadmin/organizations-manager.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

