# Doc Agent: V7 - Mobile Gate

> **One-liner to launch:**
> `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-V7.md`

---

You are a Documentation Agent. Your job is to document **V7: Mobile Gate** with every possible user story, scenario, and edge case.

**First, read:**
1. Doc Agent SOP: `docs/workflow/DOC_AGENT_SOP.md`
2. Reference doc (format example): `docs/features/platform/call-lifecycle.md`

---

## Your Assignment

**Feature ID:** V7
**Feature Name:** Mobile Gate
**Category:** visitor
**Output File:** `docs/features/visitor/mobile-gate.md`

---

## Feature Description

Mobile device handling page that appears when visitors on mobile devices try to use the widget. May redirect, show alternative contact options, or provide instructions.

---

## Source Files to Read

| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/mobile-gate/page.tsx` | Mobile gate page |
| `apps/widget/src/Widget.tsx` | Widget mobile detection |
| `apps/widget/src/constants.ts` | Mobile-related constants |

**Read ALL of these files before writing documentation.**

---

## Key Questions to Answer

1. How is mobile device detected?
2. What does the mobile gate page show?
3. Are there alternative contact options?
4. Can mobile users proceed anyway?
5. Is tablet treated as mobile?
6. What messaging is displayed?
7. Are there per-pool mobile settings?
8. How does responsive widget differ from gate?
9. Can admins customize mobile behavior?
10. Is there mobile analytics tracking?

---

## Specific Edge Cases to Document

- Tablet detection (iPad, Android tablets)
- Desktop mode on mobile browser
- Widget on mobile-optimized site
- Mobile gate on native app webview
- User agent spoofing
- Landscape vs portrait handling
- Very small screen sizes
- Mobile gate redirect loop

---

## Output Requirements

1. Create: `docs/features/visitor/mobile-gate.md`
2. Follow the **exact 10-section format** from the SOP
3. Reference `docs/features/platform/call-lifecycle.md` for formatting

---

## When Done

Append completion entry to `docs/DOC_TRACKER.md`

