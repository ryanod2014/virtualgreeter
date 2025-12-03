# Doc Agent: D12 - Sites Setup

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D12.md`

---

You are a Documentation Agent. Your job is to document **D12: Sites Setup** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D12
**Feature Name:** Sites Setup
**Category:** admin
**Output File:** `docs/features/admin/sites-setup.md`

---

## Feature Description

Widget installation wizard that guides admins through setting up the widget on their website. Includes domain verification, embed code generation, and installation testing.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Site setup wizard UI |
| `apps/dashboard/src/app/(app)/admin/sites/page.tsx` | Sites page |
| `apps/server/src/lib/embed-tracker.ts` | Embed tracking |
| `apps/widget/src/main.tsx` | Widget initialization |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What is the site setup wizard flow?
2. How is domain verification done?
3. What embed code options are provided?
4. How does the installation test work?
5. Can multiple sites/domains be configured?
6. Are there environment-specific settings (staging vs prod)?
7. How are subdomain patterns handled?
8. What happens if widget is installed on unauthorized domain?
9. How do allowed origins work?
10. Is there WordPress/Shopify/etc. integration guidance?

---

## Specific Edge Cases to Document

- Widget on localhost for testing
- Multiple domains for same pool
- Subdomain wildcard patterns
- Domain ownership transfer
- Embed on SPA (single page app)
- Widget blocked by CSP headers
- Cross-origin iframe issues
- Domain verification timeout

---

## Output Requirements

1. Create: `docs/features/admin/sites-setup.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

