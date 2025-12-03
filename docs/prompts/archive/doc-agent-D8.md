# Doc Agent: D8 - Organization Settings

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D8.md`

---

You are a Documentation Agent. Your job is to document **D8: Organization Settings** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D8
**Feature Name:** Organization Settings
**Category:** admin
**Output File:** `docs/features/admin/organization-settings.md`

---

## Feature Description

Company-level settings including organization name, branding, billing preferences, and global defaults. Manages the overarching organization configuration.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/admin/settings/page.tsx` | Settings page |
| `apps/dashboard/src/app/admin/settings/settings-client.tsx` | Settings UI |
| `apps/dashboard/src/app/api/organizations/route.ts` | Organization API |
| `apps/server/src/db/schema/organizations.ts` | Organization schema |
| `apps/dashboard/src/app/admin/billing/page.tsx` | Billing settings section |
| `apps/dashboard/src/lib/organization-context.tsx` | Org context provider |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What organization settings are available?
2. How is organization name/branding updated?
3. What billing settings can be changed?
4. How do org settings affect all pools?
5. Who can modify organization settings?
6. How is the organization logo handled?
7. Are there timezone settings?
8. What happens when org name changes?
9. How do settings cascade to agents?
10. Is there org settings versioning/history?

---

## Specific Edge Cases to Document

- Changing org name mid-subscription
- Logo upload with invalid format
- Settings conflict with pool settings
- Last admin tries to remove admin role
- Billing settings change mid-cycle
- Organization with no pools configured
- Settings update fails mid-save
- Organization timezone vs user timezone

---

## Output Requirements

1. Create: `docs/features/admin/organization-settings.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

