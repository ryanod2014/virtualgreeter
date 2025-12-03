# Doc Agent: D6 - Embed Code

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D6.md`

---

You are a Documentation Agent. Your job is to document **D6: Embed Code** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D6
**Feature Name:** Embed Code
**Category:** admin
**Output File:** `docs/features/admin/embed-code.md`

---

## Feature Description

Widget installation instructions and embed code generation for customers to add the widget to their website. Includes copy-to-clipboard functionality and installation verification.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/admin/installation/page.tsx` | Installation instructions page |
| `apps/dashboard/src/app/admin/pools/[id]/embed/` | Pool-specific embed code |
| `apps/widget/src/embed.ts` | Widget embed script |
| `apps/widget/public/` | Widget bundle files |
| `apps/server/src/features/widget/widget-loader.ts` | Widget script serving |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What does the embed code snippet look like?
2. How is the pool ID included in the embed?
3. How does async loading work?
4. What configuration options are in the embed?
5. How does the widget bundle get loaded?
6. Is there installation verification?
7. What browsers/environments are supported?
8. How do GTM/tag manager integrations work?
9. What CSP headers are required?
10. Is there a test mode for installation?

---

## Specific Edge Cases to Document

- Embed code placed in wrong location (<head> vs <body>)
- Multiple embed codes on same page
- Widget loaded on SPA (React/Vue site)
- Cross-origin issues with embed
- Old embed code version after update
- Embed on localhost for testing
- Widget blocked by ad blockers
- Embed code copied incorrectly

---

## Output Requirements

1. Create: `docs/features/admin/embed-code.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

