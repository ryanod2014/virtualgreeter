# Doc Agent: D5 - Widget Settings

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D5.md`

---

You are a Documentation Agent. Your job is to document **D5: Widget Settings** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** D5
**Feature Name:** Widget Settings
**Category:** admin
**Output File:** `docs/features/admin/widget-settings.md`

---

## Feature Description

Per-pool widget configuration including appearance, behavior, greeting messages, colors, and positioning. Controls how the widget appears and behaves on the customer's website.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/admin/pools/[id]/widget-settings/` | Widget settings UI |
| `apps/dashboard/src/app/admin/pools/[id]/page.tsx` | Pool detail page |
| `apps/widget/src/Widget.tsx` | Widget component that consumes settings |
| `apps/widget/src/constants.ts` | Widget default values |
| `apps/server/src/db/schema/pools.ts` | Pool schema with widget fields |
| `apps/dashboard/src/app/api/pools/[id]/route.ts` | Pool settings API |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. What widget settings are configurable?
2. How do settings sync to the live widget?
3. What is the preview mechanism for settings?
4. How are colors and branding customized?
5. What positioning options exist (corner, side, etc.)?
6. How do greeting messages work?
7. What defaults are applied to new pools?
8. How does the widget handle invalid/missing settings?
9. Are there pool-specific vs org-wide settings?
10. How do settings affect mobile vs desktop widget?

---

## Specific Edge Cases to Document

- Settings changed while visitor is on site
- Invalid color values entered
- Greeting message exceeds length limit
- Widget settings conflict with CSS on host page
- Preview doesn't match live behavior
- Multiple pools with different settings
- Settings reset to default behavior
- Widget settings for inactive pool

---

## Output Requirements

1. Create: `docs/features/admin/widget-settings.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

