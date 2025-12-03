# Doc Agent: D9 - Blocklist Settings

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D9.md`

---

You are a Documentation Agent. Your job is to document **D9: Blocklist Settings** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D9
**Feature Name:** Blocklist Settings
**Category:** admin
**Output File:** `docs/features/admin/blocklist-settings.md`

---

## Feature Description

IP address and country-based blocklist management. Allows admins to block specific IPs, IP ranges, or entire countries from accessing the widget.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Blocklist settings UI |
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/page.tsx` | Blocklist page |
| `apps/server/src/lib/country-blocklist.ts` | Country blocklist logic |
| `apps/server/src/lib/country-blocklist.test.ts` | Blocklist tests (shows scenarios) |
| `apps/server/src/lib/geolocation.ts` | Geolocation detection |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How does an admin add an IP to the blocklist?
2. How are IP ranges specified?
3. What countries can be blocked?
4. How is geolocation determined?
5. What happens when a blocked visitor tries to access the widget?
6. Is there a whitelist/exception list?
7. How are blocklist changes persisted?
8. Are there rate limits on blocklist operations?
9. Can entire organizations be blocked?
10. How do blocklist rules stack/combine?

---

## Specific Edge Cases to Document

- Blocking an IP that's currently connected
- IP range conflicts (overlapping ranges)
- VPN/proxy detection and blocking
- IPv4 vs IPv6 handling
- Country detection accuracy issues
- Blocklist sync across server instances
- Bulk IP import
- Blocklist export/backup

---

## Output Requirements

1. Create: `docs/features/admin/blocklist-settings.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

